// カードの月額（毎月1日に決済）と年払い（毎年、始まりの月の1日に決済）の Stripe まわり（サーバーだけ）
//   ・追加の管理者の価格（550円/月・税込）を Stripe に1つだけ持つ。年払いの価格（スタンダード・プロ・追加の管理者）も1つずつ
//   ・管理の人の数が変わったら、Stripe の「追加の管理者」の数を合わせる
//     月払い：日割りなし＝次の1日の決済から。年払い：増えた分は残りの期間の分をその場で決済・減った分は返金しない
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/mailer';
import { EXTRA_ADMIN_PRICE, EXTRA_ADMIN_ANNUAL_PRICE, INCLUDED_ADMINS, PLANS, withTax, extraAdmins, annualPrice, cardMonthlyTotal, cardAnnualTotal, isCountedAdmin, type PaidPlan } from '@/lib/plans';

const EXTRA_ADMIN_LOOKUP_KEY = 'kizuna_taro_extra_admin_monthly';
// 年払いの価格（lookup_key で1つにまとめる）
const ANNUAL_LOOKUP_KEY = { standard: 'kizuna_taro_standard_annual', pro: 'kizuna_taro_pro_annual', extra: 'kizuna_taro_extra_admin_annual' } as const;
type AnnualKind = keyof typeof ANNUAL_LOOKUP_KEY;
const annualAmount = (kind: AnnualKind) => withTax(kind === 'extra' ? EXTRA_ADMIN_ANNUAL_PRICE : annualPrice(kind));
const isAnnualPrice = (p: Stripe.Price, kind: AnnualKind) =>
  p.currency === 'jpy' && p.unit_amount === annualAmount(kind) && p.recurring?.interval === 'year' && p.recurring?.interval_count === 1;
const OPERATOR_EMAIL = 'hey870desu@gmail.com';
const NOTIFY_FROM = '"絆太郎 通知" <info@event-manager.app>';
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

// 管理の人の数（運営のアカウントは数えない）
export async function countAdmins(tenantId: string) {
  const snap = await adminDb.collection('admin_users').where('tenantId', '==', tenantId).get();
  return snap.docs.filter((d: { id: string }) => isCountedAdmin(d.id)).length;
}

const isExtraAdminPrice = (p: Stripe.Price) =>
  p.currency === 'jpy' && p.unit_amount === withTax(EXTRA_ADMIN_PRICE) && p.recurring?.interval === 'month' && p.recurring?.interval_count === 1;

// 年払いの価格の ID。無ければ作る（金額や間隔が違うものは使わない）
export async function annualPriceId(stripe: Stripe, kind: AnnualKind) {
  const key = ANNUAL_LOOKUP_KEY[kind];
  const found = await stripe.prices.list({ lookup_keys: [key], active: true, limit: 1 });
  if (found.data[0] && isAnnualPrice(found.data[0], kind)) return found.data[0].id;
  const product = await stripe.products.create({
    name: kind === 'extra' ? `追加の管理者（${INCLUDED_ADMINS + 1}人目から・年払い）` : `イベントシステム絆太郎 ${PLANS[kind as PaidPlan].name}（年払い）`,
  });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'jpy',
    unit_amount: annualAmount(kind),
    recurring: { interval: 'year' },
    lookup_key: key,
    transfer_lookup_key: true,
  });
  return price.id;
}

// 追加の管理者の価格の ID。無ければ作る（lookup_key で1つにまとめる）
export async function extraAdminPriceId(stripe: Stripe) {
  const found = await stripe.prices.list({ lookup_keys: [EXTRA_ADMIN_LOOKUP_KEY], active: true, limit: 1 });
  if (found.data[0] && isExtraAdminPrice(found.data[0])) return found.data[0].id;
  const product = await stripe.products.create({ name: `追加の管理者（${INCLUDED_ADMINS + 1}人目から）` });
  const price = await stripe.prices.create({
    product: product.id,
    currency: 'jpy',
    unit_amount: withTax(EXTRA_ADMIN_PRICE),
    recurring: { interval: 'month' },
    lookup_key: EXTRA_ADMIN_LOOKUP_KEY,
    transfer_lookup_key: true,
  });
  return price.id;
}

export type SeatSyncResult = {
  tenantId: string;
  name: string;
  result: 'same' | 'updated' | 'skipped' | 'error';
  adminCount?: number;
  from?: number; // それまでの追加の管理者の数（Stripe）
  to?: number;   // 合わせたあとの数
  note?: string;
  yearly?: boolean; // 年払い
  renewal?: string; // 年払いの次の更新日（日本時間）
};

const jstDate = (unix: number) => {
  const d = new Date(unix * 1000 + 9 * 3600 * 1000);
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
};

// カードの月額・年払いのテナントごとに、Stripe の「追加の管理者」の数を、いまの管理の人の数に合わせる。
//   月払い：日割りはしない（proration_behavior: none）＝その月の決済は変わらず、次の1日の決済から新しい数になる
//   年払い：増えたら、次の更新日までの残りの期間の分をその場で決済（always_invoice）。減っても返金しない（none）
//   プロは管理の人の数で金額が変わらないので、払われていないかの知らせだけ
export async function syncMonthlySeats(stripe: Stripe): Promise<SeatSyncResult[]> {
  const basePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD;
  const tenants = await adminDb.collection('tenants').get();
  const results: SeatSyncResult[] = [];

  for (const t of tenants.docs) {
    const d = t.data();
    if (!d.stripeMonthly || !d.stripeSubscriptionId) continue;
    const name = d.name || t.id;
    let r: SeatSyncResult;
    try {
      if (d.plan !== 'standard' && d.plan !== 'pro') {
        r = { tenantId: t.id, name, result: 'skipped', note: `プランがスタンダード・プロでない（${d.plan}）` };
      } else {
        const sub = await stripe.subscriptions.retrieve(d.stripeSubscriptionId);
        const yearly = sub.items.data.some(i => i.price.recurring?.interval === 'year');
        const kind = yearly ? '年払い' : '月額';
        const isBase = (p: Stripe.Price) => (yearly ? isAnnualPrice(p, d.plan === 'pro' ? 'pro' : 'standard') : p.id === basePriceId);
        const base = sub.items.data.filter(i => isBase(i.price));
        const extras = sub.items.data.filter(i => !isBase(i.price));
        const ended = ['canceled', 'incomplete_expired'].includes(sub.status);
        // 決済ができず、Stripe がやり直している（past_due・unpaid）ときは運営者に1回だけ知らせる。払われたら、もう1回知らせる。
        // Webhook の知らせ（invoice.payment_failed）が届かない設定でも、ここで分かる
        const unpaid = ['past_due', 'unpaid'].includes(sub.status);
        if (!ended && unpaid !== !!d.stripeMonthly?.unpaidSince) {
          try {
            await notifyOperator(
              unpaid ? `【絆太郎】カードの${kind}が払われていません: ${name}` : `【絆太郎】カードの${kind}が払われました: ${name}`,
              unpaid
                ? `${name}（${t.id}）の Stripe の${kind}（${sub.id}）が「${sub.status}」になっています。1日の決済ができなかったため、Stripe が日を置いて決済をやり直します。\nお客さまに、カードの確かめをお願いしてください。`
                : `${name}（${t.id}）の Stripe の${kind}（${sub.id}）は払われて、「${sub.status}」に戻りました。`
            );
            await t.ref.update({ 'stripeMonthly.unpaidSince': unpaid ? new Date() : null });
          } catch (e) {
            console.error('❌ stripe-seats unpaid notify failed:', t.id, e);
          }
        }
        if (ended) {
          r = { tenantId: t.id, name, result: 'skipped', note: `Stripe の${kind}が終わっている（${sub.status}）` };
        } else if (d.plan === 'pro') {
          r = { tenantId: t.id, name, result: 'skipped', note: 'プロは管理の人の数で金額が変わらない' };
        } else if ((!yearly && !basePriceId) || sub.items.has_more || base.length !== 1 || extras.length > 1 || extras.some(i => !(yearly ? isAnnualPrice(i.price, 'extra') : isExtraAdminPrice(i.price)))) {
          // 想定と違う中身には手を付けない（運営者が Stripe の画面で見る）
          r = { tenantId: t.id, name, result: 'error', note: `Stripe の${kind}の中身が、スタンダード1つ＋追加の管理者の形になっていません` };
        } else {
          const adminCount = await countAdmins(t.id);
          const to = extraAdmins('standard', adminCount);
          const from = extras[0]?.quantity || 0;
          const periodEnd: number | undefined = (sub as any).current_period_end ?? (sub.items.data[0] as any)?.current_period_end;
          const renewal = yearly && periodEnd ? jstDate(periodEnd) : undefined;
          if (to === from) {
            r = { tenantId: t.id, name, result: 'same', adminCount, from, to, yearly };
          } else {
            const proration_behavior = yearly && to > from ? 'always_invoice' : 'none';
            if (extras[0] && to > 0) {
              await stripe.subscriptionItems.update(extras[0].id, { quantity: to, proration_behavior });
            } else if (extras[0]) {
              await stripe.subscriptionItems.del(extras[0].id, { proration_behavior: 'none' });
            } else {
              await stripe.subscriptionItems.create({ subscription: sub.id, price: yearly ? await annualPriceId(stripe, 'extra') : await extraAdminPriceId(stripe), quantity: to, proration_behavior });
            }
            r = { tenantId: t.id, name, result: 'updated', adminCount, from, to, yearly, renewal };
          }
        }
      }
    } catch (e: any) {
      r = { tenantId: t.id, name, result: 'error', note: e?.message || String(e) };
    }
    results.push(r);

    // 運営者に知らせる：数を変えたとき。直せないときは、中身が変わったときだけ（毎時同じ知らせを送らない）
    try {
      if (r.result === 'updated') {
        await notifyOperator(
          `【絆太郎】カードの${r.yearly ? '年払い' : '月額'}の人数を合わせました: ${name}`,
          r.yearly
            ? `${name}（${t.id}）の管理の人が ${r.adminCount}人 になったので、Stripe の追加の管理者（年払い）を ${r.from}人 → ${r.to}人 にしました。\n` +
              (r.to! > r.from!
                ? `増えた分は、次の更新日（${r.renewal ?? '不明'}）までの残りの期間の分を、いま決済しました。`
                : '減った分は返金しません。') +
              `\n次の更新日から 年 ${cardAnnualTotal('standard', r.adminCount!).toLocaleString()}円（税込）です。`
            : `${name}（${t.id}）の管理の人が ${r.adminCount}人 になったので、Stripe の追加の管理者を ${r.from}人 → ${r.to}人 にしました。\n次の1日の決済から 月 ${cardMonthlyTotal(r.adminCount!).toLocaleString()}円（税込）です。日割りはしません。`
        );
      }
      const prevError = d.stripeMonthly?.seatsError || null;
      const nowError = r.result === 'error' ? r.note || 'error' : null;
      if (nowError !== prevError) {
        await t.ref.update({ 'stripeMonthly.seatsError': nowError });
        if (nowError) {
          await notifyOperator(
            `【絆太郎】カードの月額の人数を合わせられません: ${name}`,
            `${name}（${t.id}）の Stripe の月額（${d.stripeSubscriptionId}）の人数を合わせられませんでした。\n${nowError}\nStripe の画面で月額の中身を見てください。直るまで、毎時の処理はこのテナントの数を変えません。`
          );
        }
      }
    } catch (e) {
      console.error('❌ stripe-seats notify/update failed:', t.id, e);
    }
  }
  return results;
}

// 運営者へのメール。text はそのままの文（改行は \n）。HTML にするときに < などを置き換える
export async function notifyOperator(subject: string, text: string) {
  await sendEmail({
    from: NOTIFY_FROM,
    to: OPERATOR_EMAIL,
    subject,
    html: `<div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#334155;font-size:14px;line-height:1.8;">${esc(text).replace(/\n/g, '<br>')}</div>`,
    text,
  });
}
