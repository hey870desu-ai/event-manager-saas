// 運営者だけ：スタンダードの月額をカードで払ってもらうための、Stripe の申し込みリンクを作る。
// 1回目の決済は、選んだ月の1日 0時（日本時間）。それまでは無料の期間（trial）にして、以降は毎月1日に決済する。
// 金額は 3,300円（スタンダード）＋ 550円 ×（4人目からの管理の人）。人数は admin_users で数える（運営のアカウントは数えない）
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { PLANS, EXTRA_ADMIN_PRICE, INCLUDED_ADMINS, withTax, extraAdmins, cardMonthlyTotal, nextMonthJst, firstOfMonthJstUnix } from '@/lib/plans';

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
    const { tenantId, startMonth: requestedMonth } = await request.json();
    if (!tenantId || typeof tenantId !== 'string') return NextResponse.json({ error: 'テナントが分かりません' }, { status: 400 });

    // 2. テナントと1回目の月を確かめる
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
    const tenant = tenantSnap.data() || {};
    if (tenant.plan !== 'standard') return NextResponse.json({ error: 'スタンダードのテナントだけ作れます' }, { status: 400 });

    const startMonth = typeof requestedMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : nextMonthJst();
    const trialEnd = firstOfMonthJstUnix(startMonth);
    if (trialEnd * 1000 - Date.now() < MIN_LEAD_MS) {
      return NextResponse.json({ error: '1回目の決済日まで2日を切っています。次の月を選んでください' }, { status: 400 });
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

    // 4. スタンダードの価格が 3,300円/月 か確かめる（違えば作らない）
    const basePriceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD;
    if (!basePriceId) return NextResponse.json({ error: 'スタンダードの価格の設定がありません' }, { status: 500 });
    const basePrice = await stripe.prices.retrieve(basePriceId);
    if (basePrice.currency !== 'jpy' || basePrice.unit_amount !== withTax(PLANS.standard.price) || basePrice.recurring?.interval !== 'month' || basePrice.recurring?.interval_count !== 1) {
      return NextResponse.json({ error: 'Stripe のスタンダードの価格が 3,300円/月 になっていません' }, { status: 500 });
    }

    // 5. 管理の人の数（運営のアカウントは数えない）
    const adminSnap = await adminDb.collection('admin_users').where('tenantId', '==', tenantId).get();
    const adminCount = adminSnap.docs.filter((d: { id: string }) => d.id.trim().toLowerCase() !== SUPER_ADMIN_EMAIL).length;
    const extra = extraAdmins('standard', adminCount);

    // 6. 前に作った Stripe のお客さまがあれば使う（無い・消えていれば Stripe の画面で新しく作られる）
    let customerId: string | undefined;
    if (tenant.stripeCustomerId) {
      try {
        const c = await stripe.customers.retrieve(tenant.stripeCustomerId);
        if (!(c as any).deleted) customerId = c.id;
      } catch (e: any) {
        if (e?.code !== 'resource_missing') throw e;
      }
    }

    const month = Number(startMonth.slice(5));
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price: basePriceId, quantity: 1 }];
    if (extra > 0) {
      lineItems.push({
        price_data: {
          currency: 'jpy',
          unit_amount: withTax(EXTRA_ADMIN_PRICE),
          recurring: { interval: 'month' },
          product_data: { name: `追加の管理者（${INCLUDED_ADMINS + 1}人目から）` },
        },
        quantity: extra,
      });
    }

    // 7. Stripe の申し込みの画面を作る（24時間有効）
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      locale: 'ja',
      ...(customerId ? { customer: customerId } : {}),
      line_items: lineItems,
      subscription_data: {
        trial_end: trialEnd,
        metadata: { tenantId, billing: 'monthly_first' },
      },
      custom_text: {
        submit: { message: `1回目の決済は${month}月1日です。以降は毎月1日に決済します。` },
      },
      metadata: {
        type: 'kizuna_taro_monthly',
        tenantId,
        startMonth,
        adminCount: String(adminCount),
        extraAdmins: String(extra),
      },
      success_url: `${baseUrl}/billing/registered?start=${startMonth}`,
      cancel_url: `${baseUrl}/billing/registered?canceled=1`,
    });

    return NextResponse.json({
      url: session.url,
      expiresAt: session.expires_at,
      startMonth,
      adminCount,
      extraAdmins: extra,
      monthlyTotal: cardMonthlyTotal(adminCount),
    });
  } catch (e: any) {
    console.error('❌ stripe-monthly-link error:', e);
    return NextResponse.json({ error: e?.message || 'リンクを作れませんでした' }, { status: 500 });
  }
}
