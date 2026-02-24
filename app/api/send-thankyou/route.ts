// 📂 app/api/send-thankyou/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// カレンダーURL生成 (変更なし)
function createGoogleCalendarUrl(title: string, dateStr: string, timeStr: string, details: string) {
  try {
    const cleanDate = dateStr.replace(/-/g, ''); 
    const startTimeRaw = timeStr ? timeStr.split('-')[0].trim() : "13:00";
    const endTimeRaw = timeStr && timeStr.includes('-') ? timeStr.split('-')[1].trim() : "";
    const toTimeCode = (t: string) => { const [hh, mm] = t.split(':'); return `${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`; };
    const startDateTime = `${cleanDate}T${toTimeCode(startTimeRaw)}`;
    let endDateTime = "";
    if (endTimeRaw) { endDateTime = `${cleanDate}T${toTimeCode(endTimeRaw)}`; } 
    else { const [hh, mm] = startTimeRaw.split(':'); const endHour = (parseInt(hh) + 2).toString().padStart(2, '0'); endDateTime = `${cleanDate}T${endHour}${mm}00`; }
    const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${startDateTime}/${endDateTime}`, details: details, ctz: 'Asia/Tokyo' });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  } catch (e) { return "https://calendar.google.com/"; }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
       recipients, subject, body: baseBody, 
       eventTitle, eventDate, venueName,
       tenantName, senderName,
       scheduledAt 
    } = body;

    // 🅰️ 予約配信 (変更なし)
    if (scheduledAt) {
      const safeTenantName = tenantName || senderName || null;
      const safeSenderName = senderName || "イベント事務局";
      await adminDb.collection('mail_queue').add({
        recipients, subject, body: baseBody, senderName: safeSenderName, tenantName: safeTenantName,
        eventTitle: eventTitle || null, eventDate: eventDate || null, venueName: venueName || null,
        scheduledAt: new Date(scheduledAt), status: 'pending', createdAt: new Date(),
      });
      return NextResponse.json({ success: true, message: 'Reservation saved' });
    }

    // 🅱️ 即時配信
    const displaySender = senderName || tenantName || "イベント事務局";
    const calendarUrl = createGoogleCalendarUrl(`【${displaySender}】${eventTitle}`, eventDate || "", "13:00", `会場: ${venueName}\n\n※詳細はメール本文をご確認ください。`);

    const styles = {
      body: "font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 20px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);",
      header: "background: #1e293b; padding: 30px 20px; text-align: center; border-bottom: 4px solid #3b82f6;",
      logoText: "color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 1px;",
      content: "padding: 40px 30px;",
      messageBox: "font-size: 16px; line-height: 1.8; color: #334155; white-space: pre-wrap;", 
      card: "background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 30px; margin-bottom: 20px;",
      label: "font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px;",
      value: "font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px;",
      calendarLink: "display: inline-block; font-size: 12px; color: #0284c7; text-decoration: none; border: 1px solid #bfdbfe; padding: 8px 16px; border-radius: 6px; background-color: #f0f9ff; font-weight: bold;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 30px; text-align: center; font-size: 11px; line-height: 1.6; border-top: 1px solid #e2e8f0;",
    };


    for (const recipient of recipients) {
      let personalBody = baseBody;

      // 1. 基本的な置換
      personalBody = personalBody.replace(/{email}/g, recipient.email);
      if (personalBody.includes("参加者各位")) {
        personalBody = personalBody.replace(/参加者各位/g, `${recipient.name} 様`);
      } else {
        personalBody = `${recipient.name} 様\n\n${personalBody}`;
      }

      // 2. ★QRコード生成ロジック★
      // 受信者データに id が含まれていて、かつ本文に {qr} がある場合
      if (recipient.id && personalBody.includes("{qr}")) {
         const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${recipient.id}&bgcolor=ffffff`;
         const qrHtml = `
           <div style="text-align: center; margin: 20px 0; padding: 15px; background: #fff; border: 2px dashed #cbd5e1; border-radius: 8px; display: inline-block;">
             <p style="margin: 0 0 10px; font-size: 12px; font-weight: bold; color: #64748b;">▼ 受付用QRコード ▼</p>
             <img src="${qrUrl}" alt="Check-in QR" width="150" height="150" style="display: block; margin: 0 auto;" />
             <p style="margin: 5px 0 0; font-size: 10px; color: #94a3b8; font-family: monospace;">ID: ${recipient.id}</p>
           </div>
         `;
         // {qr} を画像HTMLに書き換え
         personalBody = personalBody.replace(/{qr}/g, qrHtml);
      } else {
         // IDがない、またはタグがない場合は {qr} を消す
         personalBody = personalBody.replace(/{qr}/g, "");
      }

      // ★1. まず、カードを出すかどうかの判定を直前に入れる
      const showEventCard = venueName && venueName !== "―" && venueName !== "オンライン";

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="${styles.body}">
          <div style="${styles.container}">
            <div style="${styles.header}"><span style="${styles.logoText}">${displaySender}</span></div>
            <div style="${styles.content}">
              <div style="${styles.messageBox}">${personalBody}</div>
              
              
              ${showEventCard ? `
                <div style="${styles.card}">
                  <div style="border-left: 4px solid #3b82f6; padding-left: 15px;">
                    <div style="${styles.label}">イベント名</div><div style="${styles.value}">${eventTitle}</div>
                    <div style="${styles.label}">開催日</div><div style="${styles.value}">${eventDate}</div>
                    <div style="${styles.label}">会場</div><div style="${styles.value}">${venueName}</div>
                    <a href="${calendarUrl}" target="_blank" style="${styles.calendarLink}">📅 Googleカレンダーに追加</a>
                  </div>
                </div>
              ` : ''}

            </div>
            <div style="${styles.footer}"><p style="margin: 0;">${displaySender}</p></div>
          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
    from: `${displaySender} <info@event-manager.app>`,
    to: recipient.email, 
    subject: subject,
    replyTo: body.replyTo || 'hey870desu@gmail.com', // 送信元の混乱を防ぐために reply_to (アンダーバー) を使うぞい
    html: htmlContent,
  });
}
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}