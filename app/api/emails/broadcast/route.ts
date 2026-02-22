import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase-admin';

// 🗓️ GoogleカレンダーURL生成
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
      tenantId, 
      eventId, 
      targetStatus, 
      subject, 
      message, 
    } = body;

    if (!tenantId || !eventId || !subject || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. データ取得
    const eventRef = adminDb.collection('events').doc(eventId);
    const tenantRef = adminDb.collection('tenants').doc(tenantId);
    
    const [eventSnap, tenantSnap] = await Promise.all([
      eventRef.get(),
      tenantRef.get()
    ]);

    if (!eventSnap.exists || !tenantSnap.exists) {
      return NextResponse.json({ error: 'Event or Tenant not found' }, { status: 404 });
    }

    // ★修正ポイント: "as any" をつけてエラーを消す！
    const eData = eventSnap.data() as any;
    const tData = tenantSnap.data() as any;

    // 2. 送信対象の絞り込み
    let reservationsQuery = eventRef.collection('reservations');
    
    if (targetStatus && targetStatus !== 'all') {
      reservationsQuery = reservationsQuery.where('status', '==', targetStatus);
    }

    const reservationsSnap = await reservationsQuery.get();
    
    if (reservationsSnap.empty) {
      return NextResponse.json({ success: true, count: 0, message: '対象者がいませんでした' });
    }

    // 3. 送信設定
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // テナント情報の整備（ここが calendarUrl より先にないとダメ！）
    const senderName = tData?.orgName || tData?.name || "イベント事務局";
    const brandColor = tData?.themeColor || "#3b82f6";
    const logoUrl = tData?.logoUrl || "";
    const homeUrl = tData?.url || "#";
    const replyTo = tData?.ownerEmail || process.env.GMAIL_USER;

    // カレンダー用情報の準備
    const eventTitle = eData?.title || "イベント";
    const eventDate = eData?.date || "";
    const eventTime = eData?.time || "13:00"; 
    const venueName = eData?.venueName || "詳細は本文をご確認ください";
    
    // カレンダーリンク生成
    const calendarUrl = createGoogleCalendarUrl(
      `【${senderName}】${eventTitle}`,
      eventDate,
      eventTime,
      `会場: ${venueName}\n\n※この予定は ${senderName} からの案内メールより登録されました。`
    );

    // 追加：イベント専用のお問い合わせ情報
    const contactName = eData?.contactName || senderName; // 入力がない場合はテナント名
    const contactEmail = eData?.contactEmail || "";
    const contactPhone = eData?.contactPhone || "";

    const styles = {
      // 外側の余白を 20px -> 8px に削って、画面を広く使うっぺ
      body: "font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 8px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
      header: "background: #1e293b; padding: 30px 15px; text-align: center; border-bottom: 4px solid " + brandColor + ";",
      logoText: "color: #ffffff; font-size: 20px; font-weight: bold; display: block; text-decoration: none;",
      
      // メインの余白を 30px -> 15px にスリム化
      content: "padding: 30px 15px;",
      greeting: "font-size: 16px; margin-bottom: 25px; line-height: 1.6; color: #334155; font-weight: bold;",
      messageBody: "font-size: 15px; line-height: 1.8; color: #334155; white-space: pre-wrap;",
      
      // ★ カードのデザインは維持！余白だけ 20px -> 15px に調整
      card: "background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-top: 25px;",
      label: "font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px; text-transform: uppercase;",
      value: "font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; line-height: 1.4;",
      
      contactBox: "margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0;",
      calendarLink: "display: inline-block; font-size: 11px; color: #0284c7; text-decoration: none; border: 1px solid #bfdbfe; padding: 8px 14px; border-radius: 6px; background-color: #f0f9ff; font-weight: bold; margin-top: 10px;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 25px 15px; text-align: center; font-size: 11px; line-height: 1.6; border-top: 1px solid #e2e8f0;",
      footerLink: "color: " + brandColor + "; text-decoration: none; font-weight: bold;"
    };

    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" alt="${senderName}" style="max-width: 180px; max-height: 50px; object-fit: contain;">`
      : `<span style="${styles.logoText}">${senderName}</span>`;

    // 5. ループ送信
    let sentCount = 0;
    const errors: any[] = [];

    // ★修正: reservationsSnap.docs を any[] として扱う
    const docs = reservationsSnap.docs as any[];

    const sendPromises = docs.map(async (doc) => {
      const rData = doc.data();
      const userEmail = rData.email;
      const userName = rData.name || "お客様";

      if (!userEmail) return;

      // 変数置換
      const personalizedMessage = message
        .replace(/{{name}}/g, userName)
        .replace(/{email}/g, userEmail);

      // 改行を <br> に
      const htmlMessage = personalizedMessage.replace(/\n/g, '<br>');

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="${styles.body}">
          <div style="${styles.container}">
            <div style="${styles.header}">
              <a href="${homeUrl}" target="_blank" style="text-decoration: none;">
                 ${logoHtml}
              </a>
            </div>

            <div style="${styles.content}">
              <div style="${styles.greeting}">
                ${userName} 様
              </div>
              <div style="${styles.messageBody}">
                ${htmlMessage}
              </div>

              <div style="${styles.card}">
                <div style="border-left: 4px solid ${brandColor}; padding-left: 15px;">
                  <div style="${styles.label}">イベント名</div>
                  <div style="${styles.value}">${eventTitle}</div>
                  <div style="${styles.label}">日時</div>
                  <div style="${styles.value}">${eventDate} ${eventTime}</div>
                  <div style="${styles.label}">会場</div>
                  <div style="${styles.value}">${venueName}</div>
                  {/* --- ここから追加：お問い合わせ窓口 --- */}
                  <div style="${styles.contactBox}">
                    <div style="${styles.label}">イベントに関するお問い合わせ</div>
                    <div style="${styles.value}">
                      ${contactName}<br>
                      ${contactEmail ? `<span style="font-weight: normal; font-size: 13px;">✉️ ${contactEmail}</span><br>` : ''}
                      ${contactPhone ? `<span style="font-weight: normal; font-size: 13px;">📞 ${contactPhone}</span>` : ''}
                    </div>
                  </div>
                  {/* --- ここまで追加 --- */}
                  <a href="${calendarUrl}" target="_blank" style="${styles.calendarLink}">
                    📅 Googleカレンダーに追加
                  </a>
                </div>
              </div>
            </div>
            
            <div style="${styles.footer}">
              <p style="margin: 0; font-weight: bold;">${senderName}</p>
              ${homeUrl !== '#' ? `<p style="margin-top: 10px;"><a href="${homeUrl}" style="${styles.footerLink}">公式サイト</a></p>` : ''}
              <p style="margin-top: 20px; opacity: 0.5;">© ${new Date().getFullYear()} Event System.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: `"${senderName}" <${process.env.GMAIL_USER}>`,
          replyTo: replyTo,
          to: userEmail,
          subject: subject,
          html: htmlContent,
        });
        sentCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${userEmail}:`, err);
        errors.push({ email: userEmail, error: err.message });
      }
    });

    await Promise.all(sendPromises);

    // 6. ログ保存
    await eventRef.collection('broadcast_logs').add({
      subject,
      message,
      targetStatus,
      sentCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : null,
      sentAt: new Date(),
      sentBy: "admin"
    });

    return NextResponse.json({ 
      success: true, 
      sentCount, 
      errorCount: errors.length,
      message: `${sentCount}件の送信が完了しました` 
    });

  } catch (error: any) {
    console.error('Broadcast Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}