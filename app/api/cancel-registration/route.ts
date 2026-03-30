import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import Stripe from 'stripe';

const resend = new Resend(process.env.RESEND_API_KEY);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const { reservationId, eventId } = await request.json();

    if (!reservationId || !eventId) {
      return NextResponse.json({ error: "必要なIDが足りません" }, { status: 400 });
    }

    // 1. 予約データとイベントデータを取得
    const resRef = adminDb.collection('events').doc(eventId).collection('reservations').doc(reservationId);
    const eventRef = adminDb.collection('events').doc(eventId);

    const [resSnap, eventSnap] = await Promise.all([
      resRef.get(),
      eventRef.get()
    ]);

    if (!resSnap.exists || !eventSnap.exists) {
      return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });
    }

    const resData = resSnap.data();
    const eventData = eventSnap.data();

    // すでにキャンセルの場合は何もしない
    if (resData?.status === 'cancelled') {
      return NextResponse.json({ success: true, message: "すでにキャンセル済みです", refunded: false });
    }

    // テナント情報を取得
    const tenantId = eventData?.tenantId;
    let ownerEmail = "";
    let stripeConnectId = "";
    if (tenantId) {
      const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
      if (tenantSnap.exists) {
        const tData = tenantSnap.data();
        ownerEmail = tData?.email || tData?.ownerEmail || "";
        stripeConnectId = tData?.stripeConnectId || "";
      }
    }

    // 2. 有料イベントの場合、キャンセルポリシーに基づくStripe返金処理
    let refunded = false;
    let refundAmount = 0;
    let refundRate = 0; // 0, 50, 100
    const isPaid = resData?.paymentStatus === 'paid' && resData?.stripeSessionId;

    if (isPaid) {
      // キャンセルポリシーから返金率を計算
      const eventDate = eventData?.date; // "YYYY-MM-DD"
      const policy = eventData?.cancelPolicy || { fullRefundDays: 2, halfRefundDays: 1 };

      if (eventDate) {
        const eventDay = new Date(eventDate + "T00:00:00+09:00"); // JST
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const diffMs = eventDay.getTime() - now.getTime();
        const daysUntilEvent = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysUntilEvent >= policy.fullRefundDays) {
          refundRate = 100;
        } else if (daysUntilEvent >= policy.halfRefundDays) {
          refundRate = 50;
        } else {
          refundRate = 0;
        }
        console.log(`📅 イベントまで${daysUntilEvent}日 → 返金率: ${refundRate}%`);
      } else {
        // 日付不明の場合は全額返金
        refundRate = 100;
      }

      if (refundRate > 0) {
        try {
          const isEmergencyMode = (tenantId === "caredesignworks");
          const sessionOptions = isEmergencyMode ? undefined : { stripeAccount: stripeConnectId };

          const checkoutSession = await stripe.checkout.sessions.retrieve(
            resData.stripeSessionId,
            sessionOptions ? sessionOptions : undefined
          );

          const paymentIntentId = checkoutSession.payment_intent as string;
          const paidTotal = checkoutSession.amount_total || 0;
          const refundTarget = refundRate === 100 ? paidTotal : Math.floor(paidTotal * refundRate / 100);

          if (paymentIntentId && refundTarget > 0) {
            const refund = await stripe.refunds.create(
              { payment_intent: paymentIntentId, amount: refundTarget },
              sessionOptions ? sessionOptions : undefined
            );
            refunded = true;
            refundAmount = refund.amount || 0;
            console.log(`💰 返金完了: ¥${refundAmount} (${refundRate}%, PaymentIntent: ${paymentIntentId})`);
          }
        } catch (refundErr: any) {
          console.error("❌ Stripe返金処理エラー:", refundErr.message);
        }
      } else {
        console.log("🚫 キャンセルポリシーにより返金なし（当日/期限切れ）");
      }
    }

    // 3. Firestoreのステータスを更新
    const updateData: any = {
      status: 'cancelled',
      checkedIn: false,
      selfCancelledAt: new Date(),
    };
    if (isPaid) {
      updateData.paymentStatus = refunded ? 'refunded' : (refundRate === 0 ? 'no_refund' : 'refund_failed');
      updateData.refundedAt = refunded ? new Date() : null;
      updateData.refundAmount = refundAmount;
    }
    await resRef.update(updateData);

    const participantEmail = resData?.email;
    const participantName = resData?.name || "お客様";
    const contactEmail = eventData?.contactEmail || "";

    // 4. 参加者本人にキャンセル完了メール
    if (participantEmail) {
      let refundMessage = '';
      if (isPaid) {
        if (refunded) {
          refundMessage = `<p style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px; border-radius: 8px; color: #166534; font-weight: bold;">お支払い済みの参加費のうち ¥${refundAmount.toLocaleString()}（${refundRate}%）を、ご利用のカードへ返金処理いたしました。反映まで数日かかる場合がございます。</p>`;
        } else if (refundRate === 0) {
          refundMessage = `<p style="background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; color: #991b1b;">キャンセルポリシーに基づき、返金対象外となります。ご了承ください。</p>`;
        } else {
          refundMessage = `<p style="background: #fef9c3; border: 1px solid #fde68a; padding: 12px; border-radius: 8px; color: #854d0e;">返金処理に問題が発生しました。事務局より別途ご連絡いたします。</p>`;
        }
      }

      try {
        await resend.emails.send({
          from: `"${eventData?.title} 事務局" <info@event-manager.app>`,
          to: participantEmail,
          subject: `【キャンセル完了】${eventData?.title}`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
              <h2 style="color: #475569; border-bottom: 2px solid #eee; padding-bottom: 10px;">キャンセル手続きが完了しました</h2>
              <p><strong>${participantName} 様</strong></p>
              <p>「${eventData?.title}」のお申し込みキャンセルを承りました。</p>
              ${refundMessage}
              <p>またのご参加を心よりお待ちしております。</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #666;">※本メールはシステムによる自動送信です。</p>
            </div>
          `,
        });
      } catch (e) { console.error("Participant email failed:", e); }
    }

    // 5. 事務局・オーナーに通知
    const adminRecipients: string[] = [];
    if (contactEmail) adminRecipients.push(contactEmail);
    if (ownerEmail && ownerEmail !== contactEmail) adminRecipients.push(ownerEmail);

    if (adminRecipients.length > 0) {
      let refundInfo = '';
      if (isPaid) {
        if (refunded) {
          refundInfo = `<p><strong>決済状況:</strong> ✅ 返金済み（¥${refundAmount.toLocaleString()} / ${refundRate}%返金）</p>`;
        } else if (refundRate === 0) {
          refundInfo = `<p><strong>決済状況:</strong> キャンセルポリシーにより返金なし（0%）</p>`;
        } else {
          refundInfo = `<p><strong>決済状況:</strong> ⚠️ 返金失敗（要手動対応 / ${refundRate}%返金予定）</p>`;
        }
      }

      try {
        await resend.emails.send({
          from: `"絆太郎・自動通知" <info@event-manager.app>`,
          to: adminRecipients,
          subject: `【キャンセル発生${isPaid ? '・返金処理' : ''}】${eventData?.title}`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 2px solid #ef4444; padding: 20px; border-radius: 10px;">
              <h2 style="color: #ef4444; margin-top: 0;">キャンセルが発生しました</h2>
              <p><strong>イベント名:</strong> ${eventData?.title}</p>
              <p><strong>キャンセルした方:</strong> ${participantName} 様</p>
              <p><strong>メールアドレス:</strong> ${participantEmail}</p>
              ${refundInfo}
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p>1名分の空きが出ました。新しい方が申し込めるようになっています。</p>
              <p style="font-size: 12px; color: #999;">※この通知は事務局およびテナントオーナーに送信されています。</p>
            </div>
          `,
        });
      } catch (e) { console.error("Admin/Owner email failed:", e); }
    }

    return NextResponse.json({ success: true, refunded, refundRate, refundAmount });

  } catch (error: any) {
    console.error('Self Cancel API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
