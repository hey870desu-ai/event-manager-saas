// 📂 app/api/send-email/route.ts (完全統合版)
import { NextResponse } from 'next/server';
import type { DocumentReference, Transaction } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/mailer';
import { isPayLinkEvent, payLinkFor } from '@/lib/pay-link';

// 名前など、申し込んだ人が入れた文字を HTML に入れるときの置き換え
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// 申込フォーム（ログインなし）から呼ばれたとき：申込の確認メールだけを、申込とイベントの記録から作る。
// 画面から来た宛先・件名・本文の材料は使わない（以前は誰でも好きな宛先・件名でメールを出せた・2026-10-24）。
// 同じ申込で送るのは1回だけ（emailed）・申込から30分以内だけ
const REGISTRATION_WINDOW_MS = 30 * 60 * 1000;
async function registrationFromRecords(raw: any): Promise<{ body: Record<string, any>; ref: DocumentReference } | { error: string; status: number }> {
  const eventId = typeof raw?.eventId === 'string' ? raw.eventId : '';
  const reservationId = typeof raw?.reservationId === 'string' ? raw.reservationId : '';
  if (!eventId || !reservationId || eventId.includes('/') || reservationId.includes('/')) return { error: 'bad request', status: 400 };

  const eventSnap = await adminDb.collection('events').doc(eventId).get();
  if (!eventSnap.exists) return { error: 'not found', status: 404 };
  const ev: any = eventSnap.data();
  const ref: DocumentReference = eventSnap.ref.collection('reservations').doc(reservationId);
  const r: any = await adminDb.runTransaction(async (tx: Transaction) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const d: any = snap.data();
    const createdMs = d.createdAt?.toMillis?.() || 0;
    if (d.emailed === true || !['confirmed', 'on_site'].includes(d.status) || Date.now() - createdMs > REGISTRATION_WINDOW_MS) return null;
    tx.update(ref, { emailed: true, emailedAt: new Date() });
    return d;
  });
  if (!r) return { error: 'not allowed', status: 403 };

  const tenantId = ev.tenantId || '';
  const tenant: any = tenantId ? (await adminDb.collection('tenants').doc(tenantId).get()).data() || {} : {};
  const onSite = r.status === 'on_site'; // 有料で、カードの決済の連携がない＝当日会場で払う
  const price = Number(r.price) || 0;
  // 「申込のあと、事前に払っていただく」（主催者の決済のリンク・振込）のイベント：申し込んだチケットのリンクと案内を入れる
  const pay = onSite && price > 0 && isPayLinkEvent(ev) ? payLinkFor(ev, r.selectedTicket) : null;
  return {
    ref,
    body: {
      subject: pay ? `【受付完了・お支払いのお願い】${ev.title}` : onSite ? `【当日払い受付】${ev.title}` : `【受付完了】${ev.title}`,
      name: r.name,
      email: r.email,
      type: r.type,
      eventTitle: ev.title,
      eventDate: ev.date,
      eventTime: `${ev.startTime} - ${ev.endTime}`,
      venueName: ev.venueName,
      zoomUrl: ev.zoomUrl,
      meetingId: ev.meetingId,
      zoomPasscode: ev.zoomPasscode,
      reservationId,
      eventId,
      tenantId,
      tenantName: tenant.orgName || tenant.name,
      themeColor: tenant.themeColor || '#f97316',
      replyTo: ev.contactEmail || tenant.ownerEmail || '',
      contactName: ev.contactName || tenant.name || '運営事務局',
      contactEmail: ev.contactEmail || '',
      contactPhone: ev.contactPhone || '',
      replyMessage: ev.replyMessage || '',
      preSurveyUrl: ev.preSurveyUrl || '',
      hasPreSurveyFields: !!(ev.preSurveyFields?.length > 0),
      eventPrice: pay ? `${price.toLocaleString('ja-JP')}円（下の「参加費のお支払いのお願い」をご覧ください）`
        : onSite ? (price > 0 ? `${price.toLocaleString('ja-JP')}円（当日会場にてお支払い）` : '当日会場にてお支払い') : '無料',
      payUrl: pay?.url || '',
      payNote: pay ? (pay.note || (pay.url ? '' : 'お支払いの方法は、主催者からのご案内をお待ちください。')) : '',
    },
  };
}

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
  let claimedRef: DocumentReference | null = null; // 申込フォームからのとき、送ったしるしを付けた申込
  let mainSent = false;
  try {
    const raw = await request.json();
    // サーバーの中（Stripe の知らせの処理）からは合言葉（CRON_SECRET）つきで呼ぶ。渡された中身をそのまま使う
    const internalKey = process.env.CRON_SECRET;
    const trusted = !!internalKey && request.headers.get('authorization') === `Bearer ${internalKey}`;
    let body: any = raw;
    if (!trusted) {
      const built = await registrationFromRecords(raw);
      if ('error' in built) return NextResponse.json({ success: false, error: built.error }, { status: built.status });
      body = built.body;
      claimedRef = built.ref;
    }
    // メールの種類。申込フォームからは申込の確認メールだけ（type は参加の形＝online などとしても使われるため、種類は別に決める）
    const kind = trusted ? body.type : 'registration';
    const { 
      name, email, company, tenantId,type, eventTitle, 
      eventDate, eventTime, venueName, 
      zoomUrl, zoomPasscode, meetingId,
      reservationId,eventId, planName,
      tenantName, tenantLogo, tenantUrl, themeColor, replyTo,
      contactName, contactEmail, contactPhone, eventPrice,
      inviteUrl, replyMessage, preSurveyUrl, hasPreSurveyFields, payUrl, payNote,
      subject: customSubject
    } = body;
    const nameHtml = esc(name);

    // 差出人名は「渡された名前 → tenantId でテナント実データ参照」で確定（特定社名固定への誤フォールバックを防ぐ）
    let resolvedSender = (tenantName || "").trim();
    if (!resolvedSender && tenantId) {
      try {
        const tSnap = await adminDb.collection('tenants').doc(tenantId).get();
        if (tSnap.exists) { const td: any = tSnap.data(); resolvedSender = (td.orgName || td.name || "").trim(); }
      } catch (e) { console.warn('差出人テナント名の解決に失敗:', e); }
    }
    const senderName = resolvedSender || "イベント事務局";
    const brandColor = themeColor || "#0ea5e9";
    const homeUrl = tenantUrl || "#";
    
    const styles = {
      body: "font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 10px; width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;",
      container: "max-width: 600px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);",
      header: "background: #1e293b; padding: 30px 15px; text-align: center; border-bottom: 4px solid " + brandColor + ";",
      headerTitle: "color: #94a3b8; margin: 0; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; font-weight: 600; margin-bottom: 15px;",
      logoText: "color: #ffffff; font-size: 22px; font-weight: bold; display: block; letter-spacing: 1px; text-decoration: none;",
      content: "padding: 25px 15px; word-break: break-word; overflow-wrap: break-word;",
      greeting: "font-size: 16px; margin-bottom: 25px; line-height: 1.8; color: #334155; word-break: break-word; overflow-wrap: break-word;",
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
    if (kind === 'upgrade_confirmation') {
      // 💎 1. アップグレード完了メール
      subject = customSubject || `【重要】${planName || "スタンダード"}へのアップグレードが完了しました`;
      mainHtml = `
        <p style="${styles.greeting}">
          <strong>${nameHtml || "お客様"} 様</strong><br><br>
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
      } else if (kind === 'cancellation_notice') {
      // ❌ 【新機能】キャンセル完了通知メール
      subject = `【重要】${eventTitle} キャンセル完了のお知らせ`;
      const formattedDate = formatToJapaneseDate(eventDate);
      
      mainHtml = `
        <p style="${styles.greeting}">
          <strong>${nameHtml} 様</strong><br><br>
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
      const qrCodeUrl = reservationId ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}&bgcolor=ffffff&ecc=M` : "";
      
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
          <strong>${nameHtml} 様</strong><br>
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

        // 参加費のお支払いのお願い（主催者の決済のリンク・振込の案内）。リンクは https だけ（lib/pay-link）
        if (payUrl || payNote) {
          mainHtml += `
            <div style="background-color: #fff7ed; border: 2px solid #fdba74; border-radius: 8px; padding: 20px; margin-top: 20px;">
              <p style="font-size: 14px; font-weight: bold; color: #c2410c; margin: 0 0 10px 0;">💳 参加費のお支払いのお願い</p>
              ${payNote ? `<p style="font-size: 14px; color: #334155; margin: 0 0 14px 0; line-height: 1.8;">${esc(payNote).replace(/\n/g, '<br>')}</p>` : ''}
              ${payUrl ? `<div style="text-align: center;"><a href="${esc(payUrl)}" target="_blank" style="display: inline-block; background: #f97316; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">お支払いのページを開く</a></div>` : ''}
            </div>`;
        }

        // 追加メッセージ（テナントがカスタマイズした内容）
        if (replyMessage) {
          mainHtml += `
            <div style="background-color: #f0f9ff; border-left: 4px solid ${themeColor || '#3b82f6'}; border-radius: 0 8px 8px 0; padding: 16px 20px; margin-top: 20px;">
              <p style="font-size: 13px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">主催者からのお知らせ</p>
              <p style="font-size: 14px; color: #334155; margin: 0; white-space: pre-wrap; line-height: 1.8;">${replyMessage.replace(/</g, '&lt;')}</p>
            </div>`;
        }

        // 事前アンケートリンク
        const preSurveyLink = hasPreSurveyFields
          ? `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.event-manager.app'}/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}`
          : preSurveyUrl;
        if (preSurveyLink) {
          mainHtml += `
            <div style="background-color: #faf5ff; border: 1px dashed #c084fc; border-radius: 8px; padding: 20px; text-align: center; margin-top: 20px;">
              <p style="font-size: 14px; font-weight: bold; color: #7c3aed; margin: 0 0 12px 0;">📝 事前アンケートのお願い</p>
              <p style="font-size: 13px; color: #6b7280; margin: 0 0 16px 0;">イベントをより良いものにするため、事前アンケートにご協力ください。</p>
              <a href="${preSurveyLink}" target="_blank" style="display: inline-block; background: #7c3aed; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">アンケートに回答する</a>
            </div>`;
        }

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://your-domain.com";

// body.eventId ではなく、分割代入した eventId を使うんだっぺ！
// 申込フォームからの確認メール（当日払い・リンク払い・無料）は、まだ参加費をカードで受け取っていないので paid=1 を付けない
// （付けると取り消しの画面で「自動返金されます」→「返金処理に問題が発生しました」と出ていた）
const isPaidEvent = kind !== 'registration' && eventPrice && !eventPrice.includes('無料');
const cancelUrl = `${baseUrl}/cancel?rid=${reservationId || ''}&eid=${eventId || ''}${isPaidEvent ? '&paid=1' : ''}`;

// 🏆 mainHtml への合体（デザインも少し絆太郎風に！）
mainHtml += `
  <div style="margin-top: 30px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px;">
    <p style="font-size: 11px; color: #94a3b8; margin-bottom: 8px;">
      ※万が一キャンセルされる場合は、以下のリンクよりお手続きください。
    </p>
    <a href="${cancelUrl}" style="font-size: 12px; color: #ef4444; font-weight: bold; text-decoration: underline;">
      お申し込みをキャンセルする
    </a>
  </div>
`;
        
    }

    const finalHtml = `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <style>
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: #1e293b; padding: 15px 5px; text-align: center; border-bottom: 4px solid ${brandColor};">${logoHtml}</td>
          </tr>
          <tr>
            <td style="padding: 15px 5px;">
              <div style="font-size: 11px; line-height: 1.8; color: #334155; word-break: break-word; overflow-wrap: break-word;">${mainHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; color: #94a3b8; padding: 15px 5px; text-align: center; font-size: 10px; line-height: 1.6; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-weight: bold; font-size: 12px; color: #475569;">${senderName}</p>
              <p style="margin-top: 4px; color: #94a3b8;">${senderName} 事務局</p>
              ${tenantUrl ? `
                <p style="margin-top: 10px;">
                  <a href="${tenantUrl}" style="color: ${brandColor}; text-decoration: none; font-weight: bold;">公式サイトを見る &rarr;</a>
                </p>
              ` : ''}
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; opacity: 0.6; font-size: 10px; letter-spacing: 1px;">
                  © ${new Date().getFullYear()} ${senderName}. All Rights Reserved.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await sendEmail({
      from: `${senderName} <info@event-manager.app>`,
      to: email,
      replyTo: replyTo || "info@event-manager.app",
      subject: subject,
      html: finalHtml,
    });
    mainSent = true;

    // オーナーへの通知
    if (kind !== 'upgrade_confirmation') {
      let ownerEmail = "";
      if (tenantId) {
        const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
        ownerEmail = tenantSnap.data()?.email || "";
      }

      const adminRecipients: string[] = [];
      if (contactEmail) adminRecipients.push(contactEmail);
      if (ownerEmail && ownerEmail !== contactEmail) adminRecipients.push(ownerEmail);

      for (const recipient of adminRecipients) {
        await sendEmail({
          from: `"絆太郎通知" <info@event-manager.app>`,
          to: recipient,
          subject: `新規申し込み通知：${eventTitle}`,
          html: `
            <div style="font-family: sans-serif; color: #333; padding: 20px; border: 1px solid #0ea5e9; border-radius: 12px; background-color: #f0f9ff;">
              <h2 style="color: #0ea5e9; margin-top: 0;">新しいお申し込みがありました</h2>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
              <p><strong>イベント名:</strong> ${eventTitle}</p>
              <p><strong>参加者氏名:</strong> ${nameHtml} 様</p>
              <p><strong>メールアドレス:</strong> ${esc(email)}</p>
              ${company ? `<p><strong>会社名:</strong> ${esc(company)}</p>` : ''}
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
              <p style="font-size: 11px; color: #64748b;">※この通知は事務局およびテナントオーナーに自動送信されています。</p>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Email Send Error:', error);
    // 確認メールを送れなかったら、送ったしるしを戻す
    if (claimedRef && !mainSent) await claimedRef.update({ emailed: false }).catch(() => {});
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}