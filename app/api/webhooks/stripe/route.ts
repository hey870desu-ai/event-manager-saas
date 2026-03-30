import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// オーナーへのアップグレード通知
async function notifyOwnerUpgrade(tenantId: string, planName: string, customerEmail: string | null) {
  try {
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    const tenantName = tenantSnap.data()?.name || tenantId;

    await resend.emails.send({
      from: `"絆太郎 通知" <info@event-manager.app>`,
      to: ['hey870desu@gmail.com'],
      subject: `【絆太郎】有料プランアップグレード: ${tenantName}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155; padding: 20px; background-color: #f8fafc;">
          <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px; text-align: center;">
              <span style="color: #fff; font-size: 18px; font-weight: bold;">有料プランアップグレード通知</span>
            </div>
            <div style="padding: 28px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; width: 110px;">組織名</td>
                  <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${tenantName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">テナントID</td>
                  <td style="padding: 10px 0; font-weight: bold; color: #0f172a; font-family: monospace;">${tenantId}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">プラン</td>
                  <td style="padding: 10px 0; font-weight: bold; color: #4f46e5;">${planName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">顧客メール</td>
                  <td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;">${customerEmail || '不明'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">日時</td>
                  <td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;">${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
                </tr>
              </table>
            </div>
          </div>
        </div>
      `
    });
  } catch (e) {
    console.warn("オーナー通知メール送信失敗:", e);
  }
}

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

            // オーナーに通知
            await notifyOwnerUpgrade(tenantId, planName === 'standard' ? 'スタンダードプラン' : 'スポット5500円プラン', session.customer_details?.email || null);
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

        // オーナーに通知
        await notifyOwnerUpgrade(tenantId, planType === 'standard' ? 'スタンダードプラン' : 'プロプラン', session.customer_details?.email || session.metadata?.email || null);
      } catch (e) {
        console.error('Update or Email failed:', e);
      }
    }
    return NextResponse.json({ received: true });
  }

  // ▼▼▼ 2. セミナーチケットの決済 ▼▼▼
  if (session.metadata?.reservationId && session.metadata?.eventId) {

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {

      if (session.payment_status === 'paid') {
        const { eventId, reservationId, tenantId } = session.metadata;
        console.log(`🎟️ Ticket Payment Succeeded for Reservation: ${reservationId} (Event: ${eventId})`);

        try {
          const eventRef = adminDb.collection('events').doc(eventId);
          const reservationRef = eventRef.collection('reservations').doc(reservationId);

          // 予約データ取得 & 存在チェック
          const reservationSnap = await reservationRef.get();
          if (!reservationSnap.exists) {
            console.error(`❌ Reservation ${reservationId} not found`);
            return NextResponse.json({ received: true });
          }
          const rData = reservationSnap.data();

          // 二重処理防止
          if (rData?.status === 'confirmed' || rData?.emailed) {
            console.log("ℹ️ Already confirmed. Skipping update.");
            return NextResponse.json({ received: true });
          }

          // 【高優先】金額検証: Stripeの決済金額とイベント価格を照合
          const eventSnap = await eventRef.get();
          const eData = eventSnap.data();

          if (!eData) {
            console.error(`❌ Event ${eventId} not found. Reservation confirmed but event data missing.`);
            // イベントが削除されていても決済は完了しているので、予約は確定する
          }

          const paidAmount = session.amount_total; // Stripeが実際に徴収した金額
          const expectedPrice = Number(eData?.price || 0);
          if (eData && paidAmount !== null && paidAmount !== undefined && expectedPrice > 0) {
            if (paidAmount < expectedPrice) {
              console.error(`🚨 金額不一致! Stripe=${paidAmount}円, イベント価格=${expectedPrice}円 (reservation: ${reservationId})`);
              // 金額不足でも決済自体は成功しているので予約は確定するが、ログで警告
            }
          }

          // A. ステータスを「確定」に更新
          await reservationRef.update({
            status: 'confirmed',
            paymentStatus: 'paid',
            paidAt: new Date(),
            paidAmount: paidAmount || null,
            stripeSessionId: session.id,
            emailed: true,
          });

          // B. メール送信に必要なデータを集める
          let tenantName = "イベント事務局";
          let themeColor = "";
          let replyTo = "";

          if (tenantId) {
            try {
              const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
              const tData = tenantSnap.data();
              tenantName = tData?.orgName || tData?.name || tenantName;
              themeColor = tData?.themeColor || "";
              replyTo = tData?.ownerEmail || "";
            } catch (e) {
              console.warn("テナント情報取得失敗:", e);
            }
          }

          // C. メール送信（失敗してもWebhook自体は成功扱い）
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';

          const displayPrice = eData?.price
            ? `¥${Number(eData.price).toLocaleString()} (クレジットカード決済済)`
            : "無料";

          try {
            await fetch(`${baseUrl}/api/send-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subject: `【受講票】${eData?.title || 'イベント'} 受付完了`,
                name: rData?.name,
                email: rData?.email,
                type: rData?.type,
                customAnswers: rData?.customAnswers,
                reservationId: reservationId,
                eventId: eventId,
                eventTitle: eData?.title || 'イベント',
                eventDate: eData?.date || '',
                eventTime: eData?.startTime ? `${eData.startTime} - ${eData.endTime}` : '',
                venueName: eData?.venueName || '',
                zoomUrl: eData?.zoomUrl || '',
                meetingId: eData?.meetingId || '',
                zoomPasscode: eData?.zoomPasscode || '',
                tenantName: tenantName,
                themeColor: themeColor,
                replyTo: replyTo || rData?.email,
                contactName: eData?.contactName || tenantName,
                contactEmail: eData?.contactEmail || "",
                contactPhone: eData?.contactPhone || "",
                eventPrice: displayPrice,
              }),
            });
            console.log("📧 Confirmation email sent via Webhook");
          } catch (emailErr) {
            console.error("❌ メール送信失敗（決済・予約確定は完了済み）:", emailErr);
          }

        } catch (err) {
          console.error('Ticket update failed:', err);
          return NextResponse.json({ error: 'Ticket update failed' }, { status: 500 });
        }
      } else {
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