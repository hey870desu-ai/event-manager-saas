import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const BATCH_SIZE = 100;

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: 最大60秒

// 手動実行用（管理画面から呼ぶ）
export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({}));
  if (secret !== process.env.CRON_SECRET && secret !== 'manual-trigger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return processCron();
}

// Vercel Cron自動実行用
export async function GET() {
  return processCron();
}

async function processCron() {
  try {
    const now = new Date();
    console.log("🤖 CRON: 配信チェック開始...", now.toISOString());

    let totalProcessed = 0;

    // ============================================================
    // 1. 旧形式: mail_queue コレクション（既存の予約メール）
    // ============================================================
    const mailQueueSnap = await adminDb.collection('mail_queue')
      .where('status', '==', 'pending')
      .where('scheduledAt', '<=', now)
      .get();

    for (const queueDoc of mailQueueSnap.docs) {
      const data = queueDoc.data();
      const result = await sendEventMail(data);
      await queueDoc.ref.update({
        status: 'sent',
        sentAt: new Date(),
        result,
      });
      totalProcessed++;
    }

    // ============================================================
    // 2. 新形式: tenants/{tenantId}/scheduled_emails（絆リスト予約配信）
    // ============================================================
    const tenantsSnap = await adminDb.collection('tenants').get();

    for (const tenantDoc of tenantsSnap.docs) {
      const scheduledSnap = await adminDb
        .collection('tenants')
        .doc(tenantDoc.id)
        .collection('scheduled_emails')
        .where('status', '==', 'scheduled')
        .get();

      for (const schedDoc of scheduledSnap.docs) {
        const data = schedDoc.data();
        const scheduledAt = data.scheduledAt;

        // 文字列/Date/Timestamp どれでも比較できるように
        let schedDate: Date;
        if (typeof scheduledAt === 'string') {
          schedDate = new Date(scheduledAt);
        } else if (scheduledAt?.toDate) {
          schedDate = scheduledAt.toDate();
        } else {
          schedDate = new Date(scheduledAt);
        }

        // まだ時間が来ていなければスキップ
        if (schedDate > now) continue;

        console.log(`📧 予約配信を実行: ${data.subject} (${tenantDoc.id})`);

        const result = await sendBatch(data);

        await schedDoc.ref.update({
          status: 'sent',
          sentAt: new Date(),
          result,
        });
        totalProcessed++;
      }
    }

    console.log(`✅ CRON完了: ${totalProcessed}件処理`);
    return NextResponse.json({ success: true, processed: totalProcessed });

  } catch (error: any) {
    console.error("🔥 CRON Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Resend Batch API で一括送信
async function sendBatch(data: any) {
  const {
    recipients,
    subject,
    body: emailBody,
    senderName,
    replyTo,
    themeColor,
  } = data;

  const displaySender = senderName || "イベント事務局";
  const brandColor = themeColor || "#3b82f6";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const emails = batch.map((recipient: any) => {
      let personalBody = emailBody || '';
      personalBody = personalBody.replace(
        /(参加者各位|ご利用者様各位|お客様各位|お取引先様各位)/g,
        `${recipient.name || 'お客様'} 様`
      );
      personalBody = personalBody.replace(/{email}/g, recipient.email);
      // 改行を<br>に変換（メールクライアントのwhite-space非対応対策）
      personalBody = personalBody.replace(/\n/g, '<br>');

      return {
        from: `"${displaySender}" <info@event-manager.app>`,
        to: [recipient.email],
        reply_to: replyTo || "info@event-manager.app",
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="background: #1e293b; padding: 25px; text-align: center; border-bottom: 4px solid ${brandColor};">
                  <span style="color: #ffffff; font-size: 20px; font-weight: bold;">${displaySender}</span>
                </div>
                <div style="padding: 40px 30px;">
                  <div style="font-size: 15px; line-height: 1.8; color: #334155; white-space: pre-wrap;">${personalBody}</div>
                </div>
                <div style="background-color: #f8fafc; color: #94a3b8; padding: 30px 20px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0;">
                  <p style="margin: 0; font-weight: bold;">${displaySender}</p>
                  <p style="margin-top: 15px;">
                    <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color: #94a3b8; text-decoration: underline; font-size: 11px;">配信停止はこちら</a>
                  </p>
                  <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} ${displaySender}</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };
    });

    try {
      await resend.batch.send(emails);
      successCount += batch.length;
    } catch (err: any) {
      console.error(`Batch送信エラー:`, err.message);
      // フォールバック: 1件ずつ送信
      for (const email of emails) {
        try {
          await resend.emails.send(email);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 700));
        } catch (e) {
          errorCount++;
        }
      }
    }

    // バッチ間待機
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log(`📊 送信結果: 成功=${successCount}, 失敗=${errorCount}`);
  return { success: successCount, failed: errorCount };
}

// セミナー参加者向けメール（mail_queue用）- send-thankyouと同等のHTML
async function sendEventMail(data: any) {
  const { recipients, subject, body: baseBody, senderName, tenantName, eventTitle, eventDate, venueName, replyTo } = data;
  const displaySender = tenantName || senderName || "イベント事務局";
  const headerName = senderName || `${displaySender} 事務局`;

  let successCount = 0;
  let errorCount = 0;

  for (const recipient of recipients) {
    let personalBody = baseBody || '';
    personalBody = personalBody.replace(/{email}/g, recipient.email);
    if (personalBody.includes("参加者各位")) {
      personalBody = personalBody.replace(/参加者各位/g, `${recipient.name} 様`);
    } else {
      personalBody = `${recipient.name} 様\n\n${personalBody}`;
    }

    // QRコード
    if (recipient.id && personalBody.includes("{qr}")) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${recipient.id}&bgcolor=ffffff`;
      const qrHtml = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 35px 0;">
          <tr><td align="center">
            <table role="presentation" width="280" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);">
              <tr><td align="center" style="padding: 30px;">
                <div style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">Check-in Pass</div>
                <img src="${qrUrl}" width="160" height="160" style="display: block; border: 1px solid #f1f5f9; border-radius: 12px;" />
                <p style="margin: 15px 0 0; font-size: 10px; color: #94a3b8; font-family: monospace;">ID: ${recipient.id}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>`;
      personalBody = personalBody.replace(/{qr}/g, qrHtml);
    } else {
      personalBody = personalBody.replace(/{qr}/g, "");
    }
    // 改行を<br>に変換（メールクライアントのwhite-space非対応対策）
    personalBody = personalBody.replace(/\n/g, '<br>');

    const showEventCard = venueName && venueName !== "―" && venueName !== "オンライン";

    const html = `
      <!DOCTYPE html><html><body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background-color: #1e293b; padding: 30px 20px; text-align: center; border-bottom: 4px solid #3b82f6;">
            <span style="color: #ffffff; font-size: 20px; font-weight: bold;">${headerName}</span>
          </div>
          <div style="padding: 40px 30px;">
            <div style="font-size: 16px; line-height: 1.8; color: #334155; white-space: pre-wrap;">${personalBody}</div>
            ${showEventCard ? `
              <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <div style="border-left: 4px solid #3b82f6; padding-left: 15px;">
                  <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px;">イベント名</div>
                  <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px;">${eventTitle}</div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 700; margin-bottom: 4px;">開催日</div>
                  <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${eventDate}</div>
                </div>
              </div>` : ''}
          </div>
          <div style="background-color: #f8fafc; color: #94a3b8; padding: 30px; text-align: center; font-size: 11px; border-top: 1px solid #e2e8f0;">
            © ${new Date().getFullYear()} ${headerName} All rights reserved.
          </div>
        </div>
      </body></html>`;

    try {
      await resend.emails.send({
        from: `"${displaySender}" <info@event-manager.app>`,
        to: recipient.email,
        subject,
        replyTo: replyTo || "info@event-manager.app",
        html,
      });
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 700));
    } catch {
      errorCount++;
    }
  }

  console.log(`📊 イベントメール送信結果: 成功=${successCount}, 失敗=${errorCount}`);
  return { success: successCount, failed: errorCount };
}
