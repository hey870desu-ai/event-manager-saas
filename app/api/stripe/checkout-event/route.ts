// 📂 app/api/stripe/checkout-event/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const domain = process.env.NEXT_PUBLIC_APP_URL || "https://www.event-manager.app";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 金額・送金先・宛先は記録から決める（以前は画面から来た amount・stripeAccountId をそのまま使い、1円でも払えた）
    const eventId = String(body.eventId || '');
    const reservationId = String(body.reservationId || '');
    if (!eventId || !reservationId || eventId.includes('/') || reservationId.includes('/')) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }
    const eventSnap = await adminDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) return NextResponse.json({ error: 'イベントが見つかりません' }, { status: 404 });
    const ev: any = eventSnap.data();
    const resSnap = await eventSnap.ref.collection('reservations').doc(reservationId).get();
    const rsv: any = resSnap.exists ? resSnap.data() : null;
    if (!rsv || rsv.status !== 'payment_pending') return NextResponse.json({ error: 'お支払いを待っている申込が見つかりません' }, { status: 404 });
    const tickets: any[] = Array.isArray(ev.tickets) ? ev.tickets : [];
    const ticket = tickets.find(t => t?.name === rsv.selectedTicket) || (tickets.length === 1 ? tickets[0] : null);
    const amount = Math.round(Number(ticket?.price) || 0);
    if (!ticket || amount <= 0) return NextResponse.json({ error: 'チケットの金額が分かりません' }, { status: 400 });
    if (Number(rsv.price) !== amount) console.warn(`⚠️ 申込の金額 ${rsv.price} とチケットの金額 ${amount} が違うので、チケットの金額で決済します: ${eventId}/${reservationId}`);
    const tenantId = ev.tenantId;
    const eventTitle = `${ev.title || ''} (${ticket.name || ''})`;
    const email = rsv.email;


    // --- 🛠️ ここから差し替え開始だっぺ！ ---

    // 1. 緊急フラグ：自分のテナントIDの時だけ「親（塙さん）の口座」に直接入れるぞい！
    const isEmergencyMode = (tenantId === "caredesignworks"); // ★ここを自分のテナントIDに合わせてくんちぇ！

    // テナント名を取得（カード明細に表示するため）
    let tenantName = "";
    let stripeAccountId = "";
    try {
      const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
      tenantName = tenantSnap.data()?.orgName || tenantSnap.data()?.name || "";
      stripeAccountId = tenantSnap.data()?.stripeConnectId || "";
    } catch (e) {
      console.warn("テナント名取得失敗:", e);
    }
    if (!isEmergencyMode && !stripeAccountId) return NextResponse.json({ error: 'このテナントはカード決済の準備ができていません' }, { status: 400 });

    // 通常時（子アカウント送金用）の手数料計算
    const applicationFeeAmount = Math.floor(Number(amount) * 0.02);

    // 2. 送金先設定の分岐
    const statementSuffix = tenantName ? tenantName.slice(0, 22) : undefined;
    const paymentIntentData: any = isEmergencyMode
      ? (statementSuffix ? { statement_descriptor_suffix: statementSuffix } : {})
      : {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: stripeAccountId,
          },
          ...(statementSuffix ? { statement_descriptor_suffix: statementSuffix } : {}),
        };

    // 3. 決済セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // ついでにコンビニ決済も選べるようにしたぞい！
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: eventTitle,
            },
            unit_amount: Number(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: email,
      
      // ★ 分岐させた設定を流し込むっぺ！
      payment_intent_data: paymentIntentData,

      success_url: `${domain}/t/${tenantId}/e/${eventId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/t/${tenantId}/e/${eventId}`,
      
      metadata: {
        tenantId,
        eventId,
        reservationId,
        type: 'event_payment'
      },
    }, isEmergencyMode ? undefined : { stripeAccount: stripeAccountId });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("❌ API内でエラー発生:", error); // ★ここが重要だばい！
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}