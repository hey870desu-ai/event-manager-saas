// 📂 app/api/send-email/route.ts (完全統合版)
import { NextResponse } from 'next/server';
import { Resend } from 'resend'; // 👈 nodemailerを消してこれに変更

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
      reservationId, planName,
      tenantName, tenantLogo, tenantUrl, themeColor, replyTo,
      contactName, contactEmail, contactPhone, eventPrice,
      inviteUrl,
      subject: customSubject // ★ ここに customSubject を追加
    } = body;

    const senderName = tenantName || "HANAHIRO CO.,LTD.";
    const brandColor = themeColor || "#0ea5e9";
    const homeUrl = tenantUrl || "#";
    
    const styles = {
      body: "font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 10px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
      header: "background: #1e293b; padding: 30px 15px; text-align: center; border-bottom: 4px solid " + brandColor + ";",
      headerTitle: "color: #94a3b8; margin: 0; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; margin-bottom: 15px;",
      logoText: "color: #ffffff; font-size: 22px; font-weight: bold; display: block; letter-spacing: 1px; text-decoration: none;",
      content: "padding: 25px 15px;",
      greeting: "font-size: 16px; margin-bottom: 25px; line-height: 1.8; color: #334155;",
      card: "background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative; overflow: hidden;",
      cardAccent: "position: absolute; top: 0; left: 0; width: 4px; height: 100%; background-color: " + brandColor + ";",
      label: "font-size: 11px; color: #64748b; letter-spacing: 1px; margin-bottom: 4px; font-weight: 700;",
      value: "font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 10px; line-height: 1.4;",
      contactBox: "margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0;",
      calendarLink: "display: inline-block; font-size: 11px; color: #0284c7; text-decoration: none; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 4px; background-color: #f0f9ff; margin-bottom: 15px; font-weight: bold;", 
      button: "background: " + brandColor + "; color: #ffffff; text-decoration: none; padding: 14px 25px; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 25px 15px; text-align: center; font-size: 11px; line-height: 1.6; border-top: 1px solid #e2e8f0;",
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
      subject = customSubject || `【重要】${planName || "スタンダード"}へのアップグレードが完了しました`;
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
          本日より、スタンダードプランの機能をご利用いただけます。<br>
          引き続き、よろしくお願いいたします。
        </p>
      `;
      } else if (type === 'cancellation_notice') {
      // ❌ 【新機能】キャンセル完了通知メール
      subject = `【重要】${eventTitle} キャンセル完了のお知らせ`;
      const formattedDate = formatToJapaneseDate(eventDate);
      
      mainHtml = `
        <p style="${styles.greeting}">
          <strong>${name} 様</strong><br><br>
          「${eventTitle}」のお申し込みキャンセルを承りました。<br>
          お手続きが完了しましたので、お知らせいたします。
        </p>
        <div style="${styles.card}">
          <div style="${styles.cardAccent}"></div>
          <div style="${styles.label}">キャンセル対象イベント</div>
          <div style="${styles.value}">${eventTitle}</div>
          <div style="${styles.label}">開催日時</div>
          <div style="${styles.value}">${formattedDate} ${eventTime}</div>
        </div>
        <p style="${styles.greeting}">
          またの機会のご参加を、心よりお待ちしております。<br>
          ${contactName || senderName} 事務局
        </p>
      `;
    } else {
      // 🎟️ 2. イベント受講票メール（既存ロジック）
      subject = customSubject || `【受講票】${eventTitle} 受付完了のお知らせ`;
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

            <p style="font-size: 13px; font-weight: bold; color: #334155; margin-bottom: 10px;">
              【当日の受付用QRコード】<br>
              会場受付にてこちらのQRコードをご提示ください。
            </p>

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
          
          
          ${eventPrice ? `
            <div style="${styles.label}">お支払い</div>
            <div style="${styles.value}">${eventPrice}</div>
          ` : ''}
          <a href="${calendarUrl}" target="_blank" style="${styles.calendarLink}">📅 カレンダーに追加</a>

          <div style="${styles.contactBox}">
            <div style="${styles.label}">イベントに関するお問い合わせ</div>
            <div style="${styles.value}" style="font-size: 14px;">
              ${contactName || senderName}<br>
              ${contactEmail ? `<span style="font-weight: normal; font-size: 12px;">✉️ ${contactEmail}</span><br>` : ''}
              ${contactPhone ? `<span style="font-weight: normal; font-size: 12px;">📞 ${contactPhone}</span>` : ''}
            </div>
          </div>
                    
          ${accessInfoHtml}
        </div>`;

        // 🏆 キャンセル用URLを生成（自分のドメインに合わせて調整してくんちぇ！）
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com";
const cancelUrl = `${baseUrl}/cancel?rid=${reservationId}&eid=${body.eventId || ''}`;

// 🏆 mainHtml の最後（contactBox の下あたり）にリンクを追加
mainHtml += `
  <div style="margin-top: 30px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
    <p style="font-size: 12px; color: #94a3b8;">
      ※万が一キャンセルされる場合は、以下のリンクよりお手続きをお願いいたします。
    </p>
    <a href="${cancelUrl}" style="font-size: 12px; color: #ef4444; text-decoration: underline;">
      お申し込みをキャンセルする
    </a>
  </div>
`;
        
    }

    const finalHtml = `
      <!DOCTYPE html>
      <html>
      <body style="${styles.body}">
        <div style="${styles.container}">
          <div style="${styles.header}">${logoHtml}</div>
          <div style="${styles.content}">${mainHtml}</div>
          
          <div style="${styles.footer}">
            <p style="margin: 0; font-weight: bold; font-size: 14px; color: #475569;">${senderName}</p>
            <p style="margin-top: 4px; color: #94a3b8;">${senderName} 事務局</p>
            
            ${tenantUrl ? `
              <p style="margin-top: 10px;">
                <a href="${tenantUrl}" style="${styles.footerLink}">公式サイトを見る &rarr;</a>
              </p>
            ` : ''}
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; opacity: 0.6; font-size: 10px; letter-spacing: 1px;">
                © ${new Date().getFullYear()} ${senderName}. All Rights Reserved.
              </p>
            </div>
          </div>
          </div>
      </body>
      </html>`;

    const { data, error } = await resend.emails.send({
      from: `${senderName} <info@event-manager.app>`, // 👈 ここが重要！
      to: email,
      replyTo: replyTo || "info@event-manager.app",
      subject: subject,
      html: finalHtml,
    });

    // 🏆 【追加】主催者（テナントさん）への「絆太郎通知」だばい！
    if (contactEmail && type !== 'upgrade_confirmation') {
      await resend.emails.send({
        from: `"絆太郎通知" <info@event-manager.app>`,
        to: contactEmail, // 👈 塙さんが設定した「問い合わせ先メール」に届くっぺ！
        subject: `【絆太郎】申し込み通知：${eventTitle}`,
        html: `
          <div style="font-family: sans-serif; color: #333; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0ea5e9; margin-top: 0;">🚀 新しいお申し込みだぞい！</h2>
            <p style="font-size: 16px;"><strong>イベント名:</strong> ${eventTitle}</p>
            <p><strong>参加者氏名:</strong> ${name} 様</p>
            <p><strong>メールアドレス:</strong> ${email}</p>
            ${company ? `<p><strong>会社名:</strong> ${company}</p>` : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b;">※このメールは絆太郎システムから自動送信されています。</p>
          </div>
        `,
      });
    }

    if (error) {
      console.error('Resend Error:', error);
      return NextResponse.json({ success: false, error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Email Send Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}