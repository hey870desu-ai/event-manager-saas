// カードの月額（毎月1日に決済）の Stripe まわり（サーバーだけ）
//   ・追加の管理者の価格（550円/月・税込）を Stripe に1つだけ持つ
//   ・管理の人の数が変わったら、Stripe の「追加の管理者」の数を合わせる（日割りなし＝次の1日の決済から）
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/mailer';
import { EXTRA_ADMIN_PRICE, INCLUDED_ADMINS, withTax, extraAdmins, cardMonthlyTotal, isCountedAdmin } from '@/lib/plans';

const EXTRA_ADMIN_LOOKUP_KEY = 'kizuna_taro_extra_admin_monthly';
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
};

// カードの月額のテナントごとに、Stripe の「追加の管理者」の数を、いまの管理の人の数に合わせる。
// 日割りはしない（proration_behavior: none）＝その月の決済は変わらず、次の1日の決済から新しい数になる
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
      if (d.plan !== 'standard') {
        r = { tenantId: t.id, name, result: 'skipped', note: `プランがスタンダードでない（${d.plan}）` };
      } else {
        const sub = await stripe.subscriptions.retrieve(d.stripeSubscriptionId);
        const base = sub.items.data.filter(i => i.price.id === basePriceId);
        const extras = sub.items.data.filter(i => i.price.id !== basePriceId);
        if (['canceled', 'incomplete_expired'].includes(sub.status)) {
          r = { tenantId: t.id, name, result: 'skipped', note: `Stripe の月額が終わっている（${sub.status}）` };
        } else if (!basePriceId || sub.items.has_more || base.length !== 1 || extras.length > 1 || extras.some(i => !isExtraAdminPrice(i.price))) {
          // 想定と違う中身には手を付けない（運営者が Stripe の画面で見る）
          r = { tenantId: t.id, name, result: 'error', note: 'Stripe の月額の中身が、スタンダード1つ＋追加の管理者の形になっていません' };
        } else {
          const adminCount = await countAdmins(t.id);
          const to = extraAdmins('standard', adminCount);
          const from = extras[0]?.quantity || 0;
          if (to === from) {
            r = { tenantId: t.id, name, result: 'same', adminCount, from, to };
          } else {
            if (extras[0] && to > 0) {
              await stripe.subscriptionItems.update(extras[0].id, { quantity: to, proration_behavior: 'none' });
            } else if (extras[0]) {
              await stripe.subscriptionItems.del(extras[0].id, { proration_behavior: 'none' });
            } else {
              await stripe.subscriptionItems.create({ subscription: sub.id, price: await extraAdminPriceId(stripe), quantity: to, proration_behavior: 'none' });
            }
            r = { tenantId: t.id, name, result: 'updated', adminCount, from, to };
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
          `【絆太郎】カードの月額の人数を合わせました: ${name}`,
          `${name}（${t.id}）の管理の人が ${r.adminCount}人 になったので、Stripe の追加の管理者を ${r.from}人 → ${r.to}人 にしました。\n次の1日の決済から 月 ${cardMonthlyTotal(r.adminCount!).toLocaleString()}円（税込）です。日割りはしません。`
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
