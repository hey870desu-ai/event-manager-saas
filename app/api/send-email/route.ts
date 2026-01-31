// 📂 app/api/send-email/route.ts (Resend対応版)
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// ★ Resendの初期化
const resend = new Resend(process.env.RESEND_API_KEY);

// 日付フォーマット
function formatToJapaneseDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  } catch (e) {
    return dateString;
  }
}

// GoogleカレンダーURL生成
function createGoogleCalendarUrl(title: string, dateStr: string, timeStr: string, details: string) {
  try {
    const cleanDate = dateStr.replace(/-/g, '');
    const times = timeStr.split('-').map(t => t.trim());
    const startTimeRaw = times[0]; 
    const endTimeRaw = times[1] || ""; 
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
      name, email, company, type, eventTitle, 
      eventDate, eventTime, venueName, 
      zoomUrl, zoomPasscode, meetingId,
      reservationId,
      tenantName, tenantLogo, tenantUrl, themeColor
    } = body;

    const senderName = tenantName || "イベント事務局";
    const brandColor = themeColor || "#3b82f6";
    const homeUrl = tenantUrl || "#";
    
    // ★ 送信元の設定 (重要)
    // テスト段階: "onboarding@resend.dev" 固定
    // 本番運用時: あなたが取得したドメイン (例: "noreply@event-saas.com")
    const fromAddress = "onboarding@resend.dev"; 

    const isOnline = type === 'online';
    const subject = `【受講票】${eventTitle} 受付完了のお知らせ`;
    const formattedDate = formatToJapaneseDate(eventDate);
    const qrCodeUrl = reservationId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}` : "";

    const calendarDetails = isOnline 
      ? `Zoom URL: ${zoomUrl}\nID: ${meetingId}\nPASS: ${zoomPasscode}\n\n※この予定はフォームから登録されました。` 
      : `会場: ${venueName}\n\n【受付用QRコード】\nメール内のQRコードを受付でご提示ください。\n\n※この予定はフォームから登録されました。`;

    const calendarUrl = createGoogleCalendarUrl(`【${senderName}】${eventTitle}`, eventDate, eventTime, calendarDetails);

    // デザインスタイル定義 (変更なし)
    const styles = {
      body: "font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 20px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
      header: "background: #1e293b; padding: 40px 20px; text-align: center; border-bottom: 4px solid " + brandColor + ";",
      headerTitle: "color: #94a3b8; margin: 0; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; margin-bottom: 15px;",
      logoText: "color: #ffffff; font-size: 22px; font-weight: bold; display: block; letter-spacing: 1px; text-decoration: none;",
      content: "padding: 40px 30px;",
      greeting: "font-size: 16px; margin-bottom: 30px; line-height: 1.8; color: #334155;",
      companyName: "font-size: 14px; color: #64748b; margin-bottom: 5px; display: block;",
      card: "background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 35px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative; overflow: hidden;",
      cardAccent: "position: absolute; top: 0; left: 0; width: 4px; height: 100%; background-color: " + brandColor + ";",
      label: "font-size: 11px; color: #64748b; letter-spacing: 1px; margin-bottom: 6px; font-weight: 700;",
      value: "font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 5px;",
      calendarLink: "display: inline-block; font-size: 11px; color: #0284c7; text-decoration: none; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 4px; background-color: #f0f9ff; margin-bottom: 20px; font-weight: bold;", 
      button: "display: inline-block; background: " + brandColor + "; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0, 0.2); transition: all 0.2s;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 30px; text-align: center; font-size: 11px; line-height: 1.6; border-top: 1px solid #e2e8f0;",
      footerLink: "color: " + brandColor + "; text-decoration: none; font-weight: bold;"
    };

    const companyHtml = company ? `<span style="${styles.companyName}">${company}</span>` : "";
    const logoHtml = tenantLogo 
      ? `<img src="${tenantLogo}" alt="${senderName}" style="max-width: 200px; max-height: 60px; object-fit: contain;">`
      : `<span style="${styles.logoText}">${senderName}</span>`;

    let accessInfo = "";
    if (isOnline) {
      accessInfo = `
        <div style="background-color: #f0f9ff; border: 1px dashed #bae6fd; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px;">
          <h3 style="color: #0284c7; margin: 0 0 10px 0; font-size: 16px;">💻 オンライン参加情報</h3>
          <p style="font-size: 13px; margin-bottom: 15px; color: #475569;">以下ボタンよりご入室ください（開始10分前〜）</p>
          <a href="${zoomUrl}" style="${styles.button}">Zoomミーティングに参加する</a>
          <div style="margin-top: 20px; text-align: left; background: #ffffff; padding: 15px; border-radius: 6px; font-size: 13px;">
             <div style="margin-bottom: 5px;"><span style="color: #64748b;">ミーティングID:</span> <strong style="color: #334155;">${meetingId || "-"}</strong></div>
             <div><span style="color: #64748b;">パスコード:</span> <strong style="color: #334155;">${zoomPasscode || "-"}</strong></div>
          </div>
        </div>
      `;
    } else {
      accessInfo = `
        <div style="background-color: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px;">
          <h3 style="color: #c2410c; margin: 0 0 10px 0; font-size: 16px;">🏢 会場のご案内</h3>
          <div style="font-size: 18px; font-weight: bold; color: #431407; margin-bottom: 8px;">${venueName || "詳細は別途ご案内"}</div>
          ${reservationId ? `
            <div style="margin-top: 25px; background: #ffffff; padding: 15px; border-radius: 8px; display: inline-block; border: 1px solid #fed7aa;">
               <p style="font-size: 12px; font-weight: bold; color: #ea580c; margin: 0 0 10px 0;">▼ 当日はこのQRコードをご提示ください ▼</p>
               <img src="${qrCodeUrl}" alt="Check-in QR" width="160" height="160" style="display: block; margin: 0 auto;">
               <p style="font-size: 10px; color: #9a3412; margin: 5px 0 0 0; font-family: monospace;">ID: ${reservationId}</p>
            </div>
          ` : ''}
          <p style="font-size: 12px; color: #9a3412; margin-top: 15px;">当日は受付にて上記QRコード、またはお名刺を1枚頂戴いたします。</p>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="${styles.body}">
        <div style="${styles.container}">
          <div style="${styles.header}">
            <p style="${styles.headerTitle}">OFFICIAL INVITATION</p>
            <a href="${homeUrl}" target="_blank" style="text-decoration: none;">
               ${logoHtml}
            </a>
          </div>

          <div style="${styles.content}">
            <p style="${styles.greeting}">
              ${companyHtml}
              <strong>${name} 様</strong><br><br>
              この度は、「${eventTitle}」にお申し込みいただき、誠にありがとうございます。<br>
              当日のご参加を心よりお待ちしております。
            </p>

            <div style="${styles.card}">
              <div style="${styles.cardAccent}"></div>
              <div style="${styles.label}">イベント名</div>
              <div style="${styles.value}">${eventTitle}</div>
              
              <div style="${styles.label}">開催日時</div>
              <div style="${styles.value}">${formattedDate} ${eventTime}</div>
              <a href="${calendarUrl}" target="_blank" style="${styles.calendarLink}">
                📅 Googleカレンダーに追加
              </a>
              
              <div style="margin-top: 10px; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                <div style="${styles.label}">参加形式</div>
                <div style="font-size: 15px; font-weight: bold; color: ${isOnline ? '#0ea5e9' : '#ea580c'}; display: flex; align-items: center; gap: 5px;">
                  ${isOnline ? '● オンライン参加' : '● 会場参加'}
                </div>
              </div>

              ${accessInfo}
            </div>
          </div>
          
          <div style="${styles.footer}">
            <p style="margin: 0; font-weight: bold;">${senderName}</p>
            ${tenantUrl ? `<p style="margin-top: 5px;"><a href="${tenantUrl}" style="${styles.footerLink}">公式サイトを見る &rarr;</a></p>` : ''}
            <p style="margin-top: 15px; opacity: 0.5;">© ${new Date().getFullYear()} Event System.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // ★ Resendで送信実行
    const data = await resend.emails.send({
      from: `${senderName} <${fromAddress}>`,
      to: [email],
      subject: subject,
      html: htmlContent,
      replyTo: "info@yourdomain.com", // 実際はお客様のメアドを入れる
    });

    if (data.error) {
      console.error("Resend Error:", data.error);
      return NextResponse.json({ success: false, error: data.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.data?.id });

  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}