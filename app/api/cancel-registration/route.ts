import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { reservationId, eventId } = await request.json();

    if (!reservationId || !eventId) {
      return NextResponse.json({ error: "必要なIDが足りねぇぞい！" }, { status: 400 });
    }

    // 1. まずは予約データを特定して取得するっぺ
    const resRef = adminDb.collection('events').doc(eventId).collection('reservations').doc(reservationId);
    const resSnap = await resRef.get();

    if (!resSnap.exists) {
      return NextResponse.json({ error: "その予約データは見つからねぇっぺ..." }, { status: 404 });
    }

    const resData = resSnap.data();
    
    // すでにキャンセルの場合は何もしない
    if (resData?.status === 'cancelled') {
      return NextResponse.json({ success: true, message: "すでにキャンセル済みだばい" });
    }

    // 2. Firestoreのステータスを更新（ここで枠が空く！）
    await resRef.update({
      status: 'cancelled',
      checkedIn: false,
      selfCancelledAt: new Date(), // 本人がいつキャンセルしたか記録
    });

    // 3. 主催者に「キャンセル出たぞい！」と通知メールを飛ばす（これ重要！）
    const eventSnap = await adminDb.collection('events').doc(eventId).get();
    const eventData = eventSnap.data();
    const contactEmail = eventData?.contactEmail || "";

    if (contactEmail) {
      await resend.emails.send({
        from: `"絆太郎・自動通知" <info@event-manager.app>`,
        to: contactEmail,
        subject: `【キャンセル発生】${eventData?.title}`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #ef4444;">⚠️ 本人によるキャンセルが発生したぞい！</h2>
            <p><strong>イベント名:</strong> ${eventData?.title}</p>
            <p><strong>キャンセルした人:</strong> ${resData?.name} 様</p>
            <hr />
            <p>これで1名分の「空き」が出たっぺ。管理画面を確認してくんちぇ！</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Self Cancel API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}