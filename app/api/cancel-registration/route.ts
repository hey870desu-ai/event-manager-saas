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

    // 1. 予約データとイベントデータを取得
    const resRef = adminDb.collection('events').doc(eventId).collection('reservations').doc(reservationId);
    const eventRef = adminDb.collection('events').doc(eventId);
    
    const [resSnap, eventSnap] = await Promise.all([
      resRef.get(),
      eventRef.get()
    ]);

    if (!resSnap.exists || !eventSnap.exists) {
      return NextResponse.json({ error: "データが見つからねぇっぺ..." }, { status: 404 });
    }

    const resData = resSnap.data();
    const eventData = eventSnap.data();
    
    // 🏆 テナント情報を取得して「オーナーのメアド（email）」を特定するぞい！
    const tenantId = eventData?.tenantId;
    let ownerEmail = "";
    if (tenantId) {
      const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
      if (tenantSnap.exists) {
        // 塙さんのFirestoreデータに合わせて「.email」から取得するっぺ！
        ownerEmail = tenantSnap.data()?.email || "";
      }
    }

    // すでにキャンセルの場合は何もしない
    if (resData?.status === 'cancelled') {
      return NextResponse.json({ success: true, message: "すでにキャンセル済みだばい" });
    }

    // 2. Firestoreのステータスを更新（ここで枠が空く！）
    await resRef.update({
      status: 'cancelled',
      checkedIn: false,
      selfCancelledAt: new Date(),
    });

    const participantEmail = resData?.email;
    const participantName = resData?.name || "お客様";
    const contactEmail = eventData?.contactEmail || ""; // 事務局メアド

    // 3. 参加者本人に「キャンセル完了メール」を飛ばすっぺ！
    if (participantEmail) {
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
              <p>またのご参加を心よりお待ちしております。</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 11px; color: #666;">※本メールはシステムによる自動送信です。</p>
            </div>
          `,
        });
      } catch (e) { console.error("Participant email failed:", e); }
    }

    // 4. 事務局（担当者）とオーナー（親分）に通知を飛ばすぞい！
    const adminRecipients: string[] = [];
    if (contactEmail) adminRecipients.push(contactEmail);
    if (ownerEmail && ownerEmail !== contactEmail) adminRecipients.push(ownerEmail);

    if (adminRecipients.length > 0) {
      try {
        await resend.emails.send({
          from: `"絆太郎・自動通知" <info@event-manager.app>`,
          to: adminRecipients, // 👈 🏆 配列で渡せば全員に届くんだばい！！
          subject: `【キャンセル発生】${eventData?.title}`,
          html: `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; border: 2px solid #ef4444; padding: 20px; border-radius: 10px;">
              <h2 style="color: #ef4444; margin-top: 0;">⚠️ キャンセルが発生したぞい！</h2>
              <p><strong>イベント名:</strong> ${eventData?.title}</p>
              <p><strong>キャンセルした人:</strong> ${participantName} 様</p>
              <p><strong>本人のメール:</strong> ${participantEmail}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p>これで1名分の「空き」が出たっぺ。自動で枠が空いたから、新しい人が申し込めるようになってるぞい！</p>
              <p style="font-size: 12px; color: #999;">※この通知は事務局およびテナントオーナーに送信されています。</p>
            </div>
          `,
        });
      } catch (e) { console.error("Admin/Owner email failed:", e); }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Self Cancel API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}