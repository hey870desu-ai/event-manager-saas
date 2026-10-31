import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { notifyOperator } from '@/lib/stripe-monthly';

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
  // 💳 カードの月額（毎月1日に決済）のカード登録が済んだ
  //    運営者の画面で作ったリンク（/api/admin/stripe-monthly-link）から。1回目の決済は1日なので、いまは支払いなし（trial）
  //    ただし「前の月の分も」のリンクは、その月の分だけ申し込みのときに決済されている（metadata.chargeNowMonth）
  //    テナントに Stripe の月額を結びつけるだけで、プランは変えない
  // ============================================================
  if (event.type === 'checkout.session.completed' && session.metadata?.type === 'kizuna_taro_monthly') {
    const { tenantId, startMonth, chargeNowMonth, chargeNowAmount } = session.metadata;
    // 「前の月の分も」のリンクなら、その月の分は申し込みのときに決済されている
    const nowMonthNum = Number((chargeNowMonth || '').slice(5)) || 0;
    const paidNow = nowMonthNum ? `${nowMonthNum}月分（${Number(chargeNowAmount || 0).toLocaleString('ja-JP')}円）` : '';
    if (tenantId) {
      try {
        // 2本のリンクの両方で登録された（二重の月額）ときは、あとの方を止めて運営者に知らせる。前の月額はそのまま
        const before = (await adminDb.collection('tenants').doc(tenantId).get()).data() || {};
        if (before.stripeSubscriptionId && before.stripeSubscriptionId !== session.subscription) {
          let beforeStatus = 'canceled';
          try {
            beforeStatus = (await stripe.subscriptions.retrieve(before.stripeSubscriptionId)).status;
          } catch (e: any) {
            if (e?.code !== 'resource_missing') throw e;
          }
          if (!['canceled', 'incomplete_expired'].includes(beforeStatus)) {
            await stripe.subscriptions.cancel(session.subscription as string);
            await notifyOperator(
              `【絆太郎】カードの月額が二重に登録されたので、あとの方を止めました: ${tenantId}`,
              `テナント ${tenantId} には続いている Stripe の月額（${before.stripeSubscriptionId}・${beforeStatus}）があるので、いま登録された月額（${session.subscription}）を止めました` +
                (paidNow ? `。申し込みのときに ${paidNow} が決済されています。Stripe の画面で返金してください。` : '（決済の前なので、お金は動いていません）。')
            );
            return NextResponse.json({ received: true });
          }
        }
        await adminDb.collection('tenants').doc(tenantId).update({
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          stripeMonthly: { startMonth: startMonth || null, registeredAt: new Date(), ...(chargeNowMonth ? { paidAtSignup: chargeNowMonth } : {}) },
          updatedAt: new Date(),
        });
        const month = Number((startMonth || '').slice(5)) || '';
        await notifyOwnerUpgrade(tenantId, `スタンダードプラン（カード登録・${paidNow ? `${paidNow}は申し込みのときに決済・` : ''}${month}月1日から毎月1日に決済）`, session.customer_details?.email || null);
      } catch (e) {
        console.error('❌ Monthly card registration update failed:', e);
        return NextResponse.json({ error: 'update failed' }, { status: 500 }); // Stripe にやり直してもらう
      }
    }
    return NextResponse.json({ received: true });
  }

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
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` }, // メール送信の入口はサーバーの中からの呼び出しだけ中身をそのまま使う
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
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` }, // メール送信の入口はサーバーの中からの呼び出しだけ中身をそのまま使う
          body: JSON.stringify({
            email: session.customer_details?.email || session.metadata?.email,
            name: "お客様", // 必要に応じてテナント名を取得して入れてください
            type: 'upgrade_confirmation', // メールの種類
            planName: planType === 'standard' ? 'スタンダードプラン' : planType === 'spot' ? 'スポット5500円プラン' : 'プロプラン',
          }),
        });
        
        console.log("✅ Plan updated and Confirmation email sent.");

        // オーナーに通知
        await notifyOwnerUpgrade(tenantId, planType === 'standard' ? 'スタンダードプラン' : planType === 'spot' ? 'スポット5500円プラン' : 'プロプラン', session.customer_details?.email || session.metadata?.email || null);
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
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.CRON_SECRET}` }, // メール送信の入口はサーバーの中からの呼び出しだけ中身をそのまま使う
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
        // テナントがいま使っている月額と違うもの（二重の登録で止めた方など）が終わっても、プランは変えない
        const current = (await adminDb.collection('tenants').doc(tenantId).get()).data()?.stripeSubscriptionId;
        if (current && current !== subscription.id) {
          console.log(`ℹ️ [Webhook] ${subscription.id} is not the current subscription of ${tenantId}. Plan unchanged.`);
        } else {
          await adminDb.collection('tenants').doc(tenantId).update({
            plan: 'free', // 期間が終わったので無料プランに戻すぞい
            updatedAt: new Date(),
          });
          console.log(`📉 [Webhook] Tenant ${tenantId} has been returned to free plan.`);
        }
      } catch (e) {
        console.error('❌ Failed to revert to free plan:', e);
      }
    }
  }

  // ============================================================
  // 💳 4. 月額のカードの決済ができなかった（毎月1日の決済など）→ 運営者に知らせる
  //    Stripe は日を置いて決済をやり直す。やり直しても払えないと、Stripe の設定によっては月額が終わり、上の 3. でフリーに戻る
  //    お客さまで探す（Stripe の版で invoice の中の月額の書き方が変わるため）
  // ============================================================
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
    if (customerId) {
      try {
        const snap = await adminDb.collection('tenants').where('stripeCustomerId', '==', customerId).limit(1).get();
        const tenant = snap.docs[0];
        const next = invoice.next_payment_attempt
          ? `次は ${new Date(invoice.next_payment_attempt * 1000).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} にやり直します。`
          : 'Stripe はこれ以上やり直しません。';
        await notifyOperator(
          `【絆太郎】カードの決済ができませんでした: ${tenant?.data().name || customerId}`,
          `${tenant ? `${tenant.data().name}（${tenant.id}）` : `Stripe のお客さま ${customerId}`} の ${(invoice.amount_due || 0).toLocaleString()}円 の決済ができませんでした（${invoice.attempt_count || 1}回目）。${next}\n` +
          `${invoice.hosted_invoice_url ? `請求書: ${invoice.hosted_invoice_url}\n` : ''}カードの確かめを、お客さまにお願いしてください。`
        );
      } catch (e) {
        console.error('❌ payment_failed notify failed:', e);
      }
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}