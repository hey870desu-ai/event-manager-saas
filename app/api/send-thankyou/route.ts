// 📂 app/api/send-thankyou/route.ts
// 📝 役割: 管理画面からの個別差し込み送信 (Resend対応版)

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// ★ Resendの初期化 (ここが変わりました)
const resend = new Resend(process.env.RESEND_API_KEY);

// GoogleカレンダーURL生成 (便利な機能なのでそのまま残します)
function createGoogleCalendarUrl(title: string, dateStr: string, timeStr: string, details: string) {
  try {
    const cleanDate = dateStr.replace(/-/g, ''); 
    const startTimeRaw = timeStr ? timeStr.split('-')[0].trim() : "13:00";
    const endTimeRaw = timeStr && timeStr.includes('-') ? timeStr.split('-')[1].trim() : "";
    
    const toTimeCode = (t: string) => {
       const [hh, mm] = t.split(':');
       return `${hh.padStart(2, '0')}${mm.padStart(2, '0')}00`;
    };

    const startDateTime = `${cleanDate}T${toTimeCode(startTimeRaw)}`;
    let endDateTime = "";
    if (endTimeRaw) {
      endDateTime = `${cleanDate}T${toTimeCode(endTimeRaw)}`;
    } else {
      const [hh, mm] = startTimeRaw.split(':');
      const endHour = (parseInt(hh) + 2).toString().padStart(2, '0');
      endDateTime = `${cleanDate}T${endHour}${mm}00`;
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${startDateTime}/${endDateTime}`,
      details: details,
      ctz: 'Asia/Tokyo'
    });

    return `https://www.google.com/calendar/render?${params.toString()}`;
  } catch (e) {
    return "https://calendar.google.com/";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
       recipients, subject, body: baseBody, 
       eventTitle, eventDate, venueName,
       tenantName, senderName
    } = body;

    // 表示用の差出人名を決定
    const displaySender = senderName || tenantName || "イベント事務局";
    
    // ★ 送信元の設定
    // Resendでドメイン認証するまでは "onboarding@resend.dev" しか使えません
    // 本番運用時は "noreply@your-domain.com" などに変更してください
    const fromAddress = "onboarding@resend.dev"; 

    // カレンダーURL生成
    const calendarUrl = createGoogleCalendarUrl(
      `【${displaySender}】${eventTitle}`, 
      eventDate || "", 
      "13:00", 
      `会場: ${venueName}\n\n※詳細はメール本文をご確認ください。`
    );

    // 共通スタイル (デザインはそのまま維持)
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

    // ★ 個別送信ループ処理 (Resend版)
    // 順番に送っていきます
    for (const recipient of recipients) {
      
      // 宛名差し込みロジック
      let personalBody = baseBody;
      if (personalBody.includes("参加者各位")) {
        personalBody = personalBody.replace(/参加者各位/g, `${recipient.name} 様`);
      } else {
        personalBody = `${recipient.name} 様\n\n${personalBody}`;
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="${styles.body}">
          <div style="${styles.container}">
            <div style="${styles.header}">
              <span style="${styles.logoText}">${displaySender}</span>
            </div>

            <div style="${styles.content}">
              <div style="${styles.messageBox}">
                ${personalBody}
              </div>

              <div style="${styles.card}">
                <div style="border-left: 4px solid #3b82f6; padding-left: 15px;">
                  <div style="${styles.label}">イベント名</div>
                  <div style="${styles.value}">${eventTitle}</div>
                  <div style="${styles.label}">開催日</div>
                  <div style="${styles.value}">${eventDate}</div>
                  <div style="${styles.label}">会場</div>
                  <div style="${styles.value}">${venueName}</div>
                  <a href="${calendarUrl}" target="_blank" style="${styles.calendarLink}">📅 Googleカレンダーに追加</a>
                </div>
              </div>
            </div>

            <div style="${styles.footer}">
              <p style="margin: 0;">${displaySender}</p>
              <p style="margin-top: 5px; opacity: 0.7;">本メールは送信専用アドレスより配信されています。</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // ★ Resendで送信実行
      await resend.emails.send({
        from: `${displaySender} <${fromAddress}>`,
        to: recipient.email, 
        subject: subject,
        html: htmlContent,
      });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Resend Email Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}