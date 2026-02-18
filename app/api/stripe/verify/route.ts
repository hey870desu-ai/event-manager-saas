// 📂 app/api/stripe/verify/route.ts
// Stripe決済後の検証API：カード決済（即時）とコンビニ・銀行振込（支払い待ち）の両方に対応したバージョン
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    // 1. Stripeセッションを取得して、支払い状況を確認
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // ★ここが重要：'paid'(支払い済) か 'unpaid'(コンビニ等の支払い待ち) かを取得
    const paymentStatus = session.payment_status; 

    const reservationId = session.metadata?.reservationId;
    const eventId = session.metadata?.eventId;
    const tenantId = session.metadata?.tenantId;
    
    if (!reservationId || !eventId || !tenantId) {
      return NextResponse.json({ error: 'Metadata missing' }, { status: 400 });
    }

    // 2. Firestoreからデータを取得
    const eventRef = adminDb.collection('events').doc(eventId);
    const reservationRef = eventRef.collection('reservations').doc(reservationId);
    const tenantRef = adminDb.collection('tenants').doc(tenantId);

    const [eventSnap, reservationSnap, tenantSnap] = await Promise.all([
      eventRef.get(),
      reservationRef.get(),
      tenantRef.get()
    ]);

    if (!reservationSnap.exists || !eventSnap.exists) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    // 3. 支払い状況に応じて処理を分岐
    if (paymentStatus === 'paid') {
      // ■ パターンA：カード決済完了（即時OK）
      const rData = reservationSnap.data();
      const eData = eventSnap.data();
      const tData = tenantSnap.exists ? tenantSnap.data() : null;
      const tenantName = tData?.orgName || tData?.name || "イベント事務局";

      // ステータスを「確定」に更新
      await reservationRef.update({
        status: 'confirmed',
        paidAt: new Date(),
        stripeSessionId: sessionId,
        paymentStatus: 'paid'
      });
      
      // サンクスメールを送信
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      try {
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
            themeColor: tData?.themeColor,
            replyTo: tData?.ownerEmail || rData?.email 
          }),
        });
        console.log("📧 Payment success email sent");
      } catch (mailError) {
        console.error("❌ Failed to send email:", mailError);
      }

    } else {
      // ■ パターンB：コンビニ・銀行振込（まだ払ってない）
      // ステータスを「支払い待ち」として記録（メールは送らない）
      // ※後で本当に支払われたら、Webhookが検知して「confirmed」に変える必要があります
      await reservationRef.update({
        status: 'pending_payment', // まだ確定させない
        paymentStatus: 'unpaid',
        stripeSessionId: sessionId
      });
      console.log("⏳ Konbini/Bank payment pending");
    }

    // 4. 画面側に結果を返す（ここで paymentStatus を渡すのがキモ！）
    return NextResponse.json({ 
      success: true,
      reservationId: reservationId,
      eventId: eventId,
      tenantId: tenantId,
      paymentStatus: paymentStatus // ★これを画面が受け取ってQRを隠す判断に使います
    });

  } catch (error: any) {
    console.error("❌ Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}