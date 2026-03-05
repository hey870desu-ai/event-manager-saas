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

  // ============================================================
  // 🏆 0. 🆕 絆太郎サービス決済（3300円スタンダード / 5500円スポット）
  // ============================================================
  if (session.metadata?.type === 'kizuna_taro_service') {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      if (session.payment_status === 'paid') {
        const { tenantId, plan_mode } = session.metadata;

        if (tenantId) {
          try {
            // 💡 塙さんのプラン名に合わせて更新するっぺ！
            const planName = plan_mode === 'subscription' ? 'standard' : 'spot';

            await adminDb.collection('tenants').doc(tenantId).update({
              plan: planName, // 'standard' または 'spot' を入れるぞい
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription || null,
              updatedAt: new Date(),
            });

            // お礼メールも「スタンダードプラン」などの名称で送るっぺ
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';
            await fetch(`${baseUrl}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: session.customer_details?.email,
                name: "お客様",
                type: 'upgrade_confirmation',
                planName: planName === 'standard' ? 'スタンダードプラン' : 'スポット5500円プラン',
              }),
            });
            
            console.log(`✨ [KizunaTaro] Tenant ${tenantId} updated to ${planName}`);
          } catch (e) {
            console.error('❌ KizunaTaro Update Error:', e);
          }
        }
        return NextResponse.json({ received: true });
      }
    }
  }

  // ▼▼▼ 1. SaaSプランの更新（修正版） ▼▼▼
  // ▼▼▼ 1. SaaSプランの更新（修正版） ▼▼▼
if (event.type === 'checkout.session.completed' && session.metadata?.plan) {
    const tenantId = session.metadata.tenantId;
    const planType = session.metadata.plan; 

    if (tenantId) {
      try {
        // ① プランをFirestoreで更新
        await adminDb.collection('tenants').doc(tenantId).update({
          plan: planType,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription,
          updatedAt: new Date(),
        });

        // ② ★重要：ここでお礼メール送信APIを叩く！
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';
        await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.customer_details?.email || session.metadata?.email,
            name: "お客様", // 必要に応じてテナント名を取得して入れてください
            type: 'upgrade_confirmation', // メールの種類
            planName: planType === 'standard' ? 'スタンダードプラン' : 'プロプラン',
          }),
        });
        
        console.log("✅ Plan updated and Confirmation email sent.");

      } catch (e) {
        console.error('Update or Email failed:', e);
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

          // まだ「confirmed」になっておらず、かつ「メール送信済み」でもない場合のみ
          if (reservationSnap.exists && rData?.status !== 'confirmed' && !rData?.emailed) {
            
            // A. ステータスを「確定」に更新し、同時に「メール送信済み」フラグを立てる
            await reservationRef.update({
              status: 'confirmed',
              paymentStatus: 'paid',
              paidAt: new Date(),
              stripeSessionId: session.id,
              emailed: true, // ★ ここにこの1行を追加！
            });

            // B. メール送信に必要なデータを集める
            const eventSnap = await eventRef.get();
            const eData = eventSnap.data();
            
            let tenantName = "HANAHIRO CO.,LTD.";
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
            const baseUrl = "https://www.event-manager.app";

            // ★ 金額を見栄え良く整える（¥1,100 クレジットカード決済済）
            const displayPrice = eData?.price 
              ? `¥${Number(eData?.price).toLocaleString()} (クレジットカード決済済)` 
              : "無料";

            await fetch(`${baseUrl}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: `【受講票】${eData?.title} 受付完了`,
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
                replyTo: replyTo || rData?.email,
                contactName: eData?.contactName || tenantName,
                contactEmail: eData?.contactEmail || "",
                contactPhone: eData?.contactPhone || "",
                eventPrice: displayPrice // 👈 整えた金額を渡すようにしたぞい！
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

  // ============================================================
  // 🔚 3. サブスクリプション終了（解約確定）時の処理
  // ============================================================
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const tenantId = subscription.metadata?.tenantId;

    if (tenantId) {
      try {
        await adminDb.collection('tenants').doc(tenantId).update({
          plan: 'free', // 期間が終わったので無料プランに戻すぞい
          updatedAt: new Date(),
        });
        console.log(`📉 [Webhook] Tenant ${tenantId} has been returned to free plan.`);
      } catch (e) {
        console.error('❌ Failed to revert to free plan:', e);
      }
    }
  }

  return NextResponse.json({ received: true });
}