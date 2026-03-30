import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const BATCH_SIZE = 100;

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: 最大60秒

export async function GET() {
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

    for (const doc of mailQueueSnap.docs) {
      const data = doc.data();
      const result = await sendBatch(data);
      await doc.ref.update({
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
