import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/mailer';

// 📅 カレンダーURL生成（既存機能を完全維持）
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
       scheduledAt, contactEmail, replyTo 
    } = body;

    // 🏆 【名前の修正ロジック】Firestoreのデータ（CARE DESIGN WORKS）を最優先にするぞい
    const rawName = tenantName || senderName || "CARE DESIGN WORKS";
    const cleanName = rawName.replace(/[\s　]*事務局$/, "").trim(); // 「事務局」のダブりを掃除
    
    const senderForInbox = cleanName;                // 差出人：CARE DESIGN WORKS
    const headerForEmail = `${cleanName} 事務局`;      // ヘッダー：CARE DESIGN WORKS 事務局

    // 🅰️ 予約配信ロジック（そのまま維持）
    if (scheduledAt) {
      await adminDb.collection('mail_queue').add({
        recipients, subject, body: baseBody, senderName: headerForEmail, tenantName: senderForInbox,
        eventTitle: eventTitle || null, eventDate: eventDate || null, venueName: venueName || null,
        scheduledAt: new Date(scheduledAt), status: 'pending', createdAt: new Date(),
      });
      return NextResponse.json({ success: true, message: 'Reservation saved' });
    }

    // 🅱️ 即時配信ロジック
    const calendarUrl = createGoogleCalendarUrl(`【${headerForEmail}】${eventTitle}`, eventDate || "", "13:00", venueName || "");

    const styles = {
      body: "font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);",
      header: "background-color: #1e293b; padding: 30px 20px; text-align: center; border-bottom: 4px solid #3b82f6;",
      logoText: "color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 1px;",
      content: "padding: 40px 30px;",
      message: "font-size: 16px; line-height: 1.8; color: #334155; white-space: pre-wrap;", 
      card: "background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-top: 30px;",
      label: "font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px;",
      value: "font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 30px; text-align: center; font-size: 11px; border-top: 1px solid #e2e8f0;",
    };

    for (const recipient of recipients) {
      let personalBody = baseBody;

      // 1. 本文置換
      personalBody = personalBody.replace(/{email}/g, recipient.email);
      if (personalBody.includes("参加者各位")) {
        personalBody = personalBody.replace(/参加者各位/g, `${recipient.name} 様`);
      } else {
        personalBody = `${recipient.name} 様\n\n${personalBody}`;
      }

      // 2. 🏆 【QRデザイン修正】メールソフトで崩れない「Table固定デザイン」だっぺ！
      if (recipient.id && personalBody.includes("{qr}")) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${recipient.id}&bgcolor=ffffff`;
        const qrHtml = `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 35px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="280" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);">
                  <tr>
                    <td align="center" style="padding: 30px;">
                      <div style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">Check-in Pass</div>
                      <img src="${qrUrl}" width="160" height="160" style="display: block; border: 1px solid #f1f5f9; border-radius: 12px;" />
                      <p style="margin: 15px 0 0; font-size: 10px; color: #94a3b8; font-family: monospace;">ID: ${recipient.id}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `;
        personalBody = personalBody.replace(/{qr}/g, qrHtml);
      } else {
        personalBody = personalBody.replace(/{qr}/g, "");
      }
      // 改行を<br>に変換（メールクライアントのwhite-space非対応対策）
      personalBody = personalBody.replace(/\n/g, '<br>');

      const showEventCard = venueName && venueName !== "―" && venueName !== "オンライン";

      const htmlContent = `
        <!DOCTYPE html><html><body style="${styles.body}"><div style="${styles.container}">
          <div style="${styles.header}"><span style="${styles.logoText}">${headerForEmail}</span></div>
          <div style="${styles.content}">
            <div style="${styles.message}">${personalBody}</div>
            ${showEventCard ? `
              <div style="${styles.card}">
                <div style="border-left: 4px solid #3b82f6; padding-left: 15px;">
                  <div style="${styles.label}">イベント名</div><div style="${styles.value}">${eventTitle}</div>
                  <div style="${styles.label}">開催日</div><div style="${styles.value}">${eventDate}</div>
                  <a href="${calendarUrl}" target="_blank" style="color: #0284c7; font-size: 12px; font-weight: bold; text-decoration: none;">📅 Googleカレンダーに追加</a>
                </div>
              </div>
            ` : ''}
          </div>
          <div style="${styles.footer}">© ${new Date().getFullYear()} ${headerForEmail} All rights reserved.</div>
        </div></body></html>
      `;

      await sendEmail({
        from: `"${senderForInbox}" <info@event-manager.app>`,
        to: recipient.email,
        subject: subject,
        replyTo: replyTo || contactEmail || "info@event-manager.app",
        html: htmlContent,
      });

      await new Promise(resolve => setTimeout(resolve, 700));
    }

    if (contactEmail) {
      await sendEmail({
        from: `"【絆太郎】申し込み通知" <info@event-manager.app>`,
        to: contactEmail,
        subject: `【新規申込】${eventTitle} に新しい参加者だぞい！`,
        html: `
          <div style="font-family: sans-serif; color: #333;">
            <h2 style="color: #3b82f6;">新しいお申し込みが入りました</h2>
            <p><strong>イベント名:</strong> ${eventTitle}</p>
            <p><strong>参加者数:</strong> ${recipients.length} 名</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p>管理画面で詳細を確認してください。</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}