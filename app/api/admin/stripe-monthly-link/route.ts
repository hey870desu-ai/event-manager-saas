// 運営者だけ：スタンダードの月額をカードで払ってもらうための、Stripe の申し込みリンクを作る。
// 1回目の決済は、選んだ月の1日 9時（日本時間）。それまでは無料の期間（trial）にして、以降は毎月1日に決済する。
// 「申し込みのときに決済する分」を選ぶと、その月から1回目の月の前の月までの分（1か月ずつ同じ金額）を申し込みのときに1回だけ決済する
//   （1日に間に合わなかったとき・前の月の分もいただくとき）。
// 金額は 3,300円（スタンダード）＋ 550円 ×（4人目からの管理の人）。人数は admin_users で数える（運営のアカウントは数えない）
// 登録のあとに人数が変わったら、毎時の処理（/api/cron/stripe-seats）が Stripe の数を合わせる
// 年払い（cycle: 'year'・2026-11-02）：選んだ月の1日に1年分（10か月分）を決済し、以降は毎年その日に決済する。スタンダードとプロ
//   スタンダード 33,000円＋5,500円 ×（4人目からの管理の人）・プロ 110,000円（税込）。申し込みのときに決済する分は月払いの金額
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { PLANS, withTax, extraAdmins, cardMonthlyTotal, cardAnnualTotal, nextMonthJst, prevMonthOf, firstChargeUnix, signupChargeableMonths, signupChargeMonths, monthsLabel, type PaidPlan } from '@/lib/plans';
import { countAdmins, extraAdminPriceId, annualPriceId } from '@/lib/stripe-monthly';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const SUPER_ADMIN_EMAIL = 'hey870desu@gmail.com';
// Stripe は trial_end を48時間以上先にする決まり。1時間の余裕をみる
const MIN_LEAD_MS = 49 * 3600 * 1000;

export async function POST(request: Request) {
  // 1. 運営者か確かめる
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  let callerEmail = '';
  try {
    callerEmail = ((await adminAuth.verifyIdToken(token)).email || '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'ログインを確かめられませんでした' }, { status: 401 });
  }
  if (callerEmail !== SUPER_ADMIN_EMAIL) return NextResponse.json({ error: '運営者だけが作れます' }, { status: 403 });

  try {
    const { tenantId, startMonth: requestedMonth, chargeFromMonth, chargePrevMonth, cycle: requestedCycle } = await request.json();
    if (!tenantId || typeof tenantId !== 'string') return NextResponse.json({ error: 'テナントが分かりません' }, { status: 400 });
    const yearly = requestedCycle === 'year';

    // 2. テナントと1回目の月を確かめる
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
    const tenant = tenantSnap.data() || {};
    if (yearly ? tenant.plan !== 'standard' && tenant.plan !== 'pro' : tenant.plan !== 'standard') {
      return NextResponse.json({ error: yearly ? '年払いは、スタンダードとプロのテナントだけ作れます' : 'スタンダードのテナントだけ作れます' }, { status: 400 });
    }
    const plan: PaidPlan = tenant.plan === 'pro' ? 'pro' : 'standard';

    const startMonth = typeof requestedMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : nextMonthJst();
    const trialEnd = firstChargeUnix(startMonth);
    if (trialEnd * 1000 - Date.now() < MIN_LEAD_MS) {
      return NextResponse.json({ error: '1回目の決済日まで2日を切っています。次の月を選んでください' }, { status: 400 });
    }
    // 申し込みのときに先にいただく月（2026-10-31 塙さん「お金は早くもらいたい」「10月分からとは話している」）。
    //   chargeFromMonth の月から、1回目の決済の月の前の月まで。日本時間の先月・今月・来月の分だけ
    //   chargePrevMonth=true は前の月の1か月分（前の版の画面から）
    if (chargeFromMonth && !(typeof chargeFromMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(chargeFromMonth))) {
      return NextResponse.json({ error: '申し込みのときに決済する月が分かりません' }, { status: 400 });
    }
    const fromMonth: string | null = chargeFromMonth || (chargePrevMonth === true ? prevMonthOf(startMonth) : null);
    if (fromMonth && fromMonth >= startMonth) {
      return NextResponse.json({ error: '申し込みのときに決済する月は、1回目の決済の月より前の月にしてください' }, { status: 400 });
    }
    const nowMonths = fromMonth ? signupChargeMonths(fromMonth, startMonth) : [];
    const chargeable = signupChargeableMonths();
    if (nowMonths.some((m) => !chargeable.includes(m))) {
      return NextResponse.json({ error: '申し込みのときに決済できるのは、先月・今月・来月の分だけです' }, { status: 400 });
    }

    // 3. もう Stripe の月額があるなら作らない（二重に引き落とさない）
    if (tenant.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(tenant.stripeSubscriptionId);
        if (!['canceled', 'incomplete_expired'].includes(sub.status)) {
          return NextResponse.json({ error: `すでに Stripe の月額があります（状態: ${sub.status}）` }, { status: 409 });
        }
      } catch (e: any) {
        if (e?.code !== 'resource_missing') throw e;
      }
    }

    // 4. 価格：月払いはスタンダードの価格が 3,300円/月 か確かめる（違えば作らない）。年払いは年額の価格（無ければ作る）
    let basePriceId: string | undefined;
    if (yearly) {
      basePriceId = await annualPriceId(stripe, plan);
    } else {
      basePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD;
      if (!basePriceId) return NextResponse.json({ error: 'スタンダードの価格の設定がありません' }, { status: 500 });
      const basePrice = await stripe.prices.retrieve(basePriceId);
      if (basePrice.currency !== 'jpy' || basePrice.unit_amount !== withTax(PLANS.standard.price) || basePrice.recurring?.interval !== 'month' || basePrice.recurring?.interval_count !== 1) {
        return NextResponse.json({ error: 'Stripe のスタンダードの価格が 3,300円/月 になっていません' }, { status: 500 });
      }
    }

    // 5. 管理の人の数（運営のアカウントは数えない）。プロは人数で金額が変わらない
    const adminCount = await countAdmins(tenantId);
    const extra = extraAdmins(plan, adminCount);

    const month = Number(startMonth.slice(5));
    // 月払いの金額（申し込みのときに決済する月の分にも使う）と、年払いの金額
    const total = plan === 'pro' ? withTax(PLANS.pro.price) : cardMonthlyTotal(adminCount);
    const annualTotal = yearly ? cardAnnualTotal(plan, adminCount) : 0;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: basePriceId, quantity: 1 }];
    if (extra > 0) lineItems.push({ price: yearly ? await annualPriceId(stripe, 'extra') : await extraAdminPriceId(stripe), quantity: extra });
    // 1回だけの価格は、無料の期間（trial）でも申し込みのときの請求書に載って、その場で決済される。1か月ずつ1行にする
    for (const m of nowMonths) {
      lineItems.push({
        price_data: { currency: 'jpy', unit_amount: total, product_data: { name: `イベントシステム絆太郎 ${plan === 'pro' ? 'プロ' : 'スタンダード'} ${Number(m.slice(5))}月分` } },
        quantity: 1,
      });
    }
    const nowAmount = total * nowMonths.length;
    const prepaid = nowMonths.length ? `${monthsLabel(nowMonths)}（${nowAmount.toLocaleString('ja-JP')}円）は、お申し込みのときに決済します。` : '';
    const submitMessage = yearly
      ? `${prepaid}${month}月1日に1年分（${annualTotal.toLocaleString('ja-JP')}円）を決済します。以降は毎年${month}月1日に決済します。`
      : nowMonths.length
        ? `${prepaid}${month}月1日からは毎月1日に決済します。`
        : `1回目の決済は${month}月1日です。以降は毎月1日に決済します。`;

    // 6. Stripe の申し込みの画面を作る（24時間有効）
    //    前に作った Stripe のお客さまは使わない（メールが固定で出て直せないため。以前の登録は別の人のメールのことがある）。
    //    払う方が Stripe の画面でメールを入れ、領収などのメールはそこに届く
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      locale: 'ja',
      line_items: lineItems,
      subscription_data: {
        trial_end: trialEnd,
        metadata: { tenantId, billing: yearly ? 'yearly_first' : 'monthly_first' },
      },
      custom_text: {
        submit: { message: submitMessage },
      },
      metadata: {
        type: 'kizuna_taro_monthly',
        tenantId,
        startMonth,
        cycle: yearly ? 'year' : 'month',
        plan,
        adminCount: String(adminCount),
        extraAdmins: String(extra),
        ...(nowMonths.length ? { chargeNowMonths: nowMonths.join(','), chargeNowAmount: String(nowAmount) } : {}),
      },
      success_url: `${baseUrl}/billing/registered?start=${startMonth}${nowMonths.length ? `&now=${nowMonths.join(',')}` : ''}${yearly ? '&cycle=year' : ''}`,
      cancel_url: `${baseUrl}/billing/registered?canceled=1`,
    });

    return NextResponse.json({
      url: session.url,
      expiresAt: session.expires_at,
      startMonth,
      adminCount,
      extraAdmins: extra,
      monthlyTotal: total,
      cycle: yearly ? 'year' : 'month',
      plan,
      ...(yearly ? { annualTotal } : {}),
      chargeNowMonths: nowMonths,
      chargeNowAmount: nowAmount,
    });
  } catch (e: any) {
    console.error('❌ stripe-monthly-link error:', e);
    return NextResponse.json({ error: e?.message || 'リンクを作れませんでした' }, { status: 500 });
  }
}
