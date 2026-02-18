import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    if (!endpointSecret) throw new Error('Webhook Secret is missing');
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // ▼▼▼ 1. SaaSプランの更新（既存機能） ▼▼▼
  // 条件：メタデータに「plan: pro」があり、かつイベントが「完了」のとき
  if (event.type === 'checkout.session.completed' && session.metadata?.plan === 'pro') {
    const tenantId = session.metadata.tenantId;
    if (tenantId) {
      console.log(`✅ SaaS Subscription Payment success! Updating tenant: ${tenantId}`);
      try {
        await adminDb.collection('tenants').doc(tenantId).update({
          plan: 'pro',
          stripeSubscriptionId: session.subscription, // サブスクIDも保存しておくと便利
          updatedAt: new Date(),
        });
      } catch (e) {
        console.error('Tenant update failed:', e);
      }
    }
    return NextResponse.json({ received: true });
  }

  // ▼▼▼ 2. セミナーチケットの決済（ここが追加機能！） ▼▼▼
  // 条件：メタデータに「reservationId」がある
  if (session.metadata?.reservationId && session.metadata?.eventId) {
    
    // 監視するイベント：
    // - checkout.session.completed : カード決済（即時）またはコンビニ申込完了（未払い）
    // - checkout.session.async_payment_succeeded : コンビニ・銀行振込の支払い完了（重要！）
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      
      // ★支払いステータスが「paid（支払い済み）」になった時だけ処理する
      if (session.payment_status === 'paid') {
        const { eventId, reservationId, tenantId } = session.metadata;
        console.log(`🎟️ Ticket Payment Succeeded for Reservation: ${reservationId} (Event: ${eventId})`);

        try {
          // Firestore参照
          const eventRef = adminDb.collection('events').doc(eventId);
          const reservationRef = eventRef.collection('reservations').doc(reservationId);
          
          // 現在のステータスを確認（二重送信防止）
          const reservationSnap = await reservationRef.get();
          const rData = reservationSnap.data();

          // まだ「confirmed」になっていない場合のみ処理を実行
          if (reservationSnap.exists && rData?.status !== 'confirmed') {
            
            // A. ステータスを「確定」に更新
            await reservationRef.update({
              status: 'confirmed',
              paymentStatus: 'paid',
              paidAt: new Date(),
              stripeSessionId: session.id,
            });

            // B. メール送信に必要なデータを集める
            const eventSnap = await eventRef.get();
            const eData = eventSnap.data();
            
            let tenantName = "イベント事務局";
            let themeColor = "";
            let replyTo = "";

            if (tenantId) {
              const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
              const tData = tenantSnap.data();
              tenantName = tData?.orgName || tData?.name || tenantName;
              themeColor = tData?.themeColor || "";
              replyTo = tData?.ownerEmail || "";
            }

            // C. メール送信APIを叩く
            // （Webhookはサーバー側で動くので、自分のAPIをfetchで叩きます）
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            await fetch(`${baseUrl}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: rData?.name,
                email: rData?.email,
                type: rData?.type,
                customAnswers: rData?.customAnswers,
                reservationId: reservationId,
                eventTitle: eData?.title,
                eventDate: eData?.date,
                eventTime: `${eData?.startTime} - ${eData?.endTime}`,
                venueName: eData?.venueName,
                zoomUrl: eData?.zoomUrl,
                meetingId: eData?.meetingId,
                zoomPasscode: eData?.zoomPasscode,
                tenantName: tenantName,
                themeColor: themeColor,
                replyTo: replyTo || rData?.email
              }),
            });
            console.log("📧 Async payment email sent via Webhook");
          } else {
            console.log("ℹ️ Already confirmed. Skipping update.");
          }

        } catch (err) {
          console.error('Ticket update failed:', err);
          return NextResponse.json({ error: 'Ticket update failed' }, { status: 500 });
        }
      } else {
        // まだ未払い（コンビニ申込直後など）の場合は何もしない（画面側で案内済み）
        console.log(`⏳ Payment pending for reservation: ${session.metadata.reservationId}`);
      }
    }
  }

  return NextResponse.json({ received: true });
}