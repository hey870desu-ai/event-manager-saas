// 📂 app/api/send-marketing/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Resend Batch APIは1回最大100件まで
const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1500; // バッチ間の待機時間

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      recipients,
      subject,
      body: emailBody,
      senderName,
      replyTo,
      themeColor
    } = body;

    const brandColor = themeColor || "#3b82f6";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';

    const styles = {
      body: "font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 20px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);",
      header: `background: #1e293b; padding: 25px; text-align: center; border-bottom: 4px solid ${brandColor};`,
      logoText: "color: #ffffff; font-size: 20px; font-weight: bold; text-decoration: none;",
      content: "padding: 40px 30px;",
      messageBody: "font-size: 15px; line-height: 1.8; color: #334155; white-space: pre-wrap;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 30px 20px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0;"
    };

    // メール本文のHTML生成関数
    const buildHtml = (recipient: any, personalizedBody: string) => `
      <!DOCTYPE html>
      <html>
        <body style="${styles.body}">
          <div style="${styles.container}">
            <div style="${styles.header}">
              <span style="${styles.logoText}">${senderName}</span>
            </div>
            <div style="${styles.content}">
              <div style="${styles.messageBody}">${personalizedBody}</div>
            </div>
            <div style="${styles.footer}">
              <p style="margin: 0; font-weight: bold;">${senderName}</p>
              <p style="margin-top: 10px; opacity: 0.6;">
                ※このメールは ${senderName} より大切なお知らせとしてお届けしています。
              </p>
              <p style="margin-top: 15px;">
                <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color: #94a3b8; text-decoration: underline; font-size: 11px;">配信停止はこちら</a>
              </p>
              <p style="margin-top: 10px;">
                &copy; ${new Date().getFullYear()} ${senderName} All rights reserved.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    let successCount = 0;
    let errorCount = 0;

    // バッチに分割して送信
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      // Resend Batch API用のメール配列を作成
      const emails = batch.map((recipient: any) => {
        const personalizedBody = emailBody.replace(
          /(参加者各位|ご利用者様各位|お客様各位|お取引先様各位)/g,
          `${recipient.name} 様`
        );

        return {
          from: `"${senderName}" <info@event-manager.app>`,
          to: [recipient.email],
          reply_to: replyTo || "info@event-manager.app",
          subject: subject,
          html: buildHtml(recipient, personalizedBody),
        };
      });

      try {
        // Resend Batch API（1回で最大100件を一括送信）
        const result = await resend.batch.send(emails);
        successCount += batch.length;
        console.log(`📧 バッチ ${Math.floor(i / BATCH_SIZE) + 1} 送信完了: ${batch.length}件`);
      } catch (err: any) {
        console.error(`バッチ ${Math.floor(i / BATCH_SIZE) + 1} エラー:`, err.message);

        // Batch APIが失敗した場合、1件ずつフォールバック
        for (const email of emails) {
          try {
            await resend.emails.send(email);
            successCount++;
            await new Promise(resolve => setTimeout(resolve, 700));
          } catch (e) {
            errorCount++;
            console.error(`${email.to[0]} 送信失敗:`, e);
          }
        }
      }

      // 次のバッチまで待機（レート制限対策）
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`📊 送信結果: 成功=${successCount}, 失敗=${errorCount}, 合計=${recipients.length}`);
    return NextResponse.json({ success: true, successCount, errorCount, total: recipients.length });

  } catch (error: any) {
    console.error('Marketing Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
