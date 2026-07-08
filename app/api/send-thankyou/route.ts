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
       scheduledAt, contactEmail, replyTo,
       tenantId, eventId,
    } = body;

    // 事後アンケートのURL（本文に {survey} があれば回答ボタンに置換）
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.event-manager.app';
    // アンケートページは eventId だけで解決するため、tenantId 欠落時も 'default' で有効なURLになる
    const surveyUrl = eventId
      ? `${baseUrl}/t/${tenantId || 'default'}/e/${eventId}/survey`
      : '';
    const surveyHtml = surveyUrl ? `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
<tr><td align="center">
<a href="${surveyUrl}" target="_blank" style="display: inline-block; background: #3b82f6; color: #ffffff; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">アンケートに回答する</a>
<p style="margin: 12px 0 0; font-size: 11px; color: #94a3b8;">ボタンが押せない場合は次のURLをご利用ください<br>${surveyUrl}</p>
</td></tr>
</table>` : '';
    // {survey} を全受信者共通で置換（予約配信・即時配信どちらにも反映）
    const bodyWithSurvey = String(baseBody || '').replace(/\{survey\}/g, surveyHtml);

    // 🏆 差出人名は「呼び出し元が渡した名前 → tenantId からテナント実データ参照」の順で確定。
    //    以前は未指定時に "CARE DESIGN WORKS" 固定へ落ちており、全テナントのメールが
    //    その名前で送られてしまっていた（マルチテナント事故）ため、特定テナント名の固定を廃止。
    let resolvedName = (tenantName || senderName || "").trim();
    if (!resolvedName && tenantId) {
      try {
        const tSnap = await adminDb.collection('tenants').doc(tenantId).get();
        if (tSnap.exists) { const td: any = tSnap.data(); resolvedName = (td.orgName || td.name || "").trim(); }
      } catch (e) { console.warn('差出人テナント名の解決に失敗:', e); }
    }
    const rawName = resolvedName || "イベント事務局";
    const cleanName = (rawName.replace(/[\s　]*事務局$/, "").trim()) || "イベント事務局"; // 「事務局」のダブり掃除

    const senderForInbox = cleanName;                // 差出人：テナントの実名
    const headerForEmail = `${cleanName} 事務局`;      // ヘッダー：〇〇 事務局

    // 🅰️ 予約配信ロジック（そのまま維持）
    if (scheduledAt) {
      await adminDb.collection('mail_queue').add({
        tenantId: tenantId || null, eventId: eventId || null,  // ★テナント分離用（配信履歴の絞り込みに必須）
        recipients, subject, body: bodyWithSurvey, senderName: headerForEmail, tenantName: senderForInbox,
        eventTitle: eventTitle || null, eventDate: eventDate || null, venueName: venueName || null,
        scheduledAt: new Date(scheduledAt), status: 'pending', createdAt: new Date(),
      });
      return NextResponse.json({ success: true, message: 'Reservation saved' });
    }

    // 🅱️ 即時配信ロジック
    const calendarUrl = createGoogleCalendarUrl(`【${headerForEmail}】${eventTitle}`, eventDate || "", "13:00", venueName || "");

    for (const recipient of recipients) {
      let personalBody = bodyWithSurvey;

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

      const htmlContent = `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting"><style>body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}</style></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background-color:#1e293b;padding:15px 5px;text-align:center;border-bottom:4px solid #3b82f6;">
            <span style="color:#ffffff;font-size:16px;font-weight:bold;letter-spacing:1px;">${headerForEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:15px 5px;">
            <div style="font-size:11px;line-height:1.8;color:#334155;word-break:break-word;overflow-wrap:break-word;">${personalBody}</div>
            ${showEventCard ? `
              <div style="background-color:#f1f5f9;border-radius:8px;padding:20px;margin-top:30px;">
                <div style="border-left:4px solid #3b82f6;padding-left:15px;">
                  <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">イベント名</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">${eventTitle}</div>
                  <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">開催日</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">${eventDate}</div>
                  <a href="${calendarUrl}" target="_blank" style="color:#0284c7;font-size:12px;font-weight:bold;text-decoration:none;">📅 Googleカレンダーに追加</a>
                </div>
              </div>
            ` : ''}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;color:#94a3b8;padding:15px 5px;text-align:center;font-size:10px;border-top:1px solid #e2e8f0;">
            © ${new Date().getFullYear()} ${headerForEmail} All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`;

      await sendEmail({
        from: `"${senderForInbox}" <info@event-manager.app>`,
        to: recipient.email,
        subject: subject,
        replyTo: replyTo || contactEmail || "info@event-manager.app",
        html: htmlContent,
      });

      await new Promise(resolve => setTimeout(resolve, 700));
    }

    // 📥 送信履歴として保存：即時送信も配信履歴(mail_queue)に残す（予約配信と同じ形・status='sent'）
    //    ※これが無かったため「今すぐ送信」したお礼・リマインドは履歴に出ていなかった
    try {
      await adminDb.collection('mail_queue').add({
        tenantId: tenantId || null, eventId: eventId || null,
        recipients, subject, body: bodyWithSurvey, senderName: headerForEmail, tenantName: senderForInbox,
        eventTitle: eventTitle || null, eventDate: eventDate || null, venueName: venueName || null,
        status: 'sent', sentAt: new Date(), createdAt: new Date(),
      });
    } catch (e) {
      console.warn('mail_queue(sent) 記録に失敗（メール送信自体は成功しています）:', e);
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