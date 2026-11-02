// 📂 app/api/stripe/checkout-event/route.ts
// 申込のときにカード（・コンビニ）で参加費を払っていただく、Stripe の決済の画面を作る（ログインなし＝参加者が呼ぶ）
//   金額・宛先・送金先は記録から決める（画面から来た amount・stripeAccountId は使わない）
//   お金の流れ（2026-11-03 塙さん「それでお願いします」）：
//     運営の Stripe（イベントシステム絆太郎）で受け取り、主催者の受け取り口座（Express）へ自動で送る（destination charge）。
//     絆太郎は参加費の5%（決済の手数料を含む）を差し引く（application_fee_amount）。参加者からは取らない
//   塙さんの会社（caredesignworks）は前からの形：運営の Stripe に直接入る（送金なし）
//   コンビニ決済は、運営の Stripe で使えるようになったら（審査のあと）カードと選べる（期限3日・過ぎたら Webhook が申込を取り消す）
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { cardFeeFor } from '@/lib/plans';
import { cardPayModeFor, LEGACY_DIRECT_TENANT } from '@/lib/card-pay';
import { platformKonbiniActive, verifiedDestination } from '@/lib/stripe-express';

const domain = process.env.NEXT_PUBLIC_APP_URL || "https://www.event-manager.app";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

// カードの明細に出す主催者の名前（英字の名前のときだけ。日本語は明細の決まりで使えないので付けない）
const asciiSuffix = (name: string) =>
  /^[\x20-\x7E]*[A-Za-z][\x20-\x7E]*$/.test(name) ? name.replace(/[<>\\'"*]/g, '').trim().slice(0, 22) : '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const eventId = String(body.eventId || '');
    const reservationId = String(body.reservationId || '');
    if (!eventId || !reservationId || eventId.includes('/') || reservationId.includes('/')) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    const eventSnap = await adminDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 });
    const ev: any = eventSnap.data();
    const resRef = eventSnap.ref.collection('reservations').doc(reservationId);
    const resSnap = await resRef.get();
    const rsv: any = resSnap.exists ? resSnap.data() : null;
    if (!rsv || rsv.status !== 'payment_pending') return NextResponse.json({ error: 'お支払いを待っている申込が見つかりません' }, { status: 404 });
    const tickets: any[] = Array.isArray(ev.tickets) ? ev.tickets : [];
    const ticket = tickets.find(t => t?.name === rsv.selectedTicket) || (tickets.length === 1 ? tickets[0] : null);
    const amount = Math.round(Number(ticket?.price) || 0);
    if (!ticket || amount <= 0) return NextResponse.json({ error: 'チケットの金額が分かりません' }, { status: 400 });
    if (Number(rsv.price) !== amount) console.warn(`⚠️ 申込の金額 ${rsv.price} とチケットの金額 ${amount} が違うので、チケットの金額で決済します: ${eventId}/${reservationId}`);

    const tenantId = String(ev.tenantId || '');
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    const tenant: any = tenantSnap.data() || {};
    const tenantName = String(tenant.orgName || tenant.name || '');
    if (cardPayModeFor(ev, tenant, tenantId) === 'none') {
      return NextResponse.json({ error: 'このイベントは、申込のときのカードでのお支払いを受け付けていません' }, { status: 400 });
    }

    // 送金先：塙さんの会社は運営の Stripe に直接。ほかは受け取り口座を Stripe で確かめる
    const legacy = tenantId === LEGACY_DIRECT_TENANT;
    const destination = legacy ? null : await verifiedDestination(stripe, tenantId);
    if (!legacy && !destination) {
      return NextResponse.json({ error: 'いまはカードでのお支払いを受け付けられません。主催者にお問い合わせください' }, { status: 400 });
    }
    const fee = destination ? cardFeeFor(amount) : 0;
    const konbini = await platformKonbiniActive(stripe);
    const suffix = asciiSuffix(tenantName);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      locale: 'ja',
      payment_method_types: konbini ? ['card', 'konbini'] : ['card'],
      ...(konbini ? { payment_method_options: { konbini: { expires_after_days: 3 } } } : {}),
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: { name: `${ev.title || ''} (${ticket.name || ''})` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      customer_email: rsv.email,
      payment_intent_data: {
        ...(destination ? { application_fee_amount: fee, transfer_data: { destination } } : {}),
        ...(suffix ? { statement_descriptor_suffix: suffix } : {}),
        metadata: { tenantId, eventId, reservationId },
      },
      success_url: `${domain}/t/${tenantId}/e/${eventId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/t/${tenantId}/e/${eventId}`,
      metadata: { tenantId, eventId, reservationId, type: 'event_payment' },
    });

    // 申込に、決済の画面と手数料を残す（返金や確かめに使う）
    await resRef.update({
      stripeSessionId: session.id,
      cardFee: fee,
      cardRoute: destination ? 'express' : 'platform',
      checkoutCreatedAt: new Date(),
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ checkout-event error:", error);
    return NextResponse.json({ error: 'お支払いの画面を開けませんでした。時間をおいて、もう一度お試しください' }, { status: 500 });
  }
}
