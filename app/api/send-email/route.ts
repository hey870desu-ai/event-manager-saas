// 📂 app/api/send-email/route.ts (完全統合版)
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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
      reservationId, planName,
      tenantName, tenantLogo, tenantUrl, themeColor, replyTo
    } = body;

    const senderName = tenantName || "事務局";
    const brandColor = themeColor || "#3b82f6";
    const homeUrl = tenantUrl || "#";
    
    // スタイル定義
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

    const logoHtml = tenantLogo 
      ? `<img src="${tenantLogo}" alt="${senderName}" style="max-width: 200px; max-height: 60px; object-fit: contain;">`
      : `<span style="${styles.logoText}">${senderName}</span>`;

    let subject = "";
    let mainHtml = "";

    // 🔄 メールの種類による条件分岐
    if (type === 'upgrade_confirmation') {
      // 💎 1. アップグレード完了メール
      subject = `【重要】${planName || "スタンダード"}へのアップグレードが完了しました`;
      mainHtml = `
        <p style="${styles.greeting}">
          <strong>${name || "お客様"} 様</strong><br><br>
          いつも本システムをご利用いただき、誠にありがとうございます。<br>
          この度、<strong>${planName || "スタンダードプラン"}</strong> へのアップグレードのお手続きが完了いたしました。
        </p>
        <div style="${styles.card}">
          <div style="${styles.cardAccent}"></div>
          <div style="${styles.label}">ご契約プラン</div>
          <div style="${styles.value}">${planName || "スタンダード"}</div>
          <div style="${styles.label}">月額利用料</div>
          <div style="${styles.value}">3,300円（税込）</div>
          <div style="${styles.label}">ステータス</div>
          <div style="${styles.value}">✅ 決済完了（有効）</div>
        </div>
        <p style="${styles.greeting}">
          本日より、すべてのプレミアム機能をご利用いただけます。<br>
          引き続き、よろしくお願いいたします。
        </p>
      `;
    } else {
      // 🎟️ 2. イベント受講票メール（既存ロジック）
      subject = `【受講票】${eventTitle} 受付完了のお知らせ`;
      const isOnline = type === 'online';
      const formattedDate = formatToJapaneseDate(eventDate);
      const qrCodeUrl = reservationId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&amp;data=${reservationId}&amp;bgcolor=ffffff` : "";
      
      const calendarDetails = isOnline 
        ? `Zoom URL: ${zoomUrl}\nID: ${meetingId}\nPASS: ${zoomPasscode}` 
        : `会場: ${venueName}\n\n【受付用QRコード】\nメール内のQRコードを受付でご提示ください。`;
      const calendarUrl = createGoogleCalendarUrl(`【${senderName}】${eventTitle}`, eventDate, eventTime, calendarDetails);

      let accessInfoHtml = "";
      if (isOnline) {
        accessInfoHtml = `
          <div style="background-color: #f0f9ff; border: 1px dashed #bae6fd; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px;">
            <h3 style="color: #0284c7; margin: 0 0 10px 0; font-size: 16px;">💻 オンライン参加情報</h3>
            <a href="${zoomUrl}" style="${styles.button}">Zoomに参加する</a>
            <div style="margin-top: 15px; text-align: left; background: #ffffff; padding: 10px; border-radius: 6px; font-size: 13px;">
              ID: ${meetingId || "-"} / PW: ${zoomPasscode || "-"}
            </div>
          </div>`;
      } else {
        accessInfoHtml = `
          <div style="background-color: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px;">
            <h3 style="color: #c2410c; margin: 0 0 10px 0; font-size: 16px;">🏢 会場案内: ${venueName}</h3>
            ${reservationId ? `<img src="${qrCodeUrl}" width="160" height="160" style="display: block; margin: 15px auto;">` : ''}
          </div>`;
      }

      mainHtml = `
        <p style="${styles.greeting}">
          <strong>${name} 様</strong><br>
          「${eventTitle}」にお申し込みいただき、ありがとうございます。
        </p>
        <div style="${styles.card}">
          <div style="${styles.cardAccent}"></div>
          <div style="${styles.label}">イベント</div>
          <div style="${styles.value}">${eventTitle}</div>
          <div style="${styles.label}">日時</div>
          <div style="${styles.value}">${formattedDate} ${eventTime}</div>
          <a href="${calendarUrl}" target="_blank" style="${styles.calendarLink}">📅 カレンダーに追加</a>
          ${accessInfoHtml}
        </div>`;
    }

    const finalHtml = `
      <!DOCTYPE html>
      <html>
      <body style="${styles.body}">
        <div style="${styles.container}">
          <div style="${styles.header}">${logoHtml}</div>
          <div style="${styles.content}">${mainHtml}</div>
          <div style="${styles.footer}"><p>${senderName}</p></div>
        </div>
      </body>
      </html>`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"${senderName}" <${process.env.GMAIL_USER}>`,
      replyTo: replyTo || process.env.GMAIL_USER,
      to: email,
      subject: subject,
      html: finalHtml,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}