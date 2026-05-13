// 📂 app/api/send-marketing/route.ts
import { NextResponse } from 'next/server';
import { sendBatchEmail } from '@/lib/mailer';

const BATCH_SIZE = 100;
const BATCH_DELAY_MS = 1500;

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

    // メール本文のHTML生成関数（tableベース：Android Gmail対応）
    const buildHtml = (recipient: any, personalizedBody: string) => `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <style>
    body, table, td { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }
    @media screen and (min-width: 600px) {
      .email-body { font-size: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: sans-serif; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff;">
          <tr>
            <td style="background: #1e293b; padding: 15px 5px; text-align: center; border-bottom: 4px solid ${brandColor};">
              <span style="color: #ffffff; font-size: 16px; font-weight: bold;">${senderName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 15px 5px;">
              <div class="email-body" style="font-size: 14px; line-height: 1.8; color: #334155; word-break: break-word; overflow-wrap: break-word;">${personalizedBody}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8fafc; color: #94a3b8; padding: 15px 5px; text-align: center; font-size: 10px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-weight: bold; color: #94a3b8;">${senderName}</p>
              <p style="margin-top: 10px; opacity: 0.6; color: #94a3b8;">
                ※このメールは ${senderName} より大切なお知らせとしてお届けしています。
              </p>
              <p style="margin-top: 15px;">
                <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color: #94a3b8; text-decoration: underline; font-size: 11px;">配信停止はこちら</a>
              </p>
              <p style="margin-top: 10px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} ${senderName} All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    let successCount = 0;
    let errorCount = 0;

    // バッチに分割して送信
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);

      const emails = batch.map((recipient: any) => {
        let personalizedBody = emailBody.replace(
          /(参加者各位|ご利用者様各位|お客様各位|お取引先様各位)/g,
          `${recipient.name} 様`
        );
        personalizedBody = personalizedBody.replace(/\n/g, '<br>');

        return {
          from: `"${senderName}" <info@event-manager.app>`,
          to: recipient.email,
          replyTo: replyTo || "info@event-manager.app",
          subject: subject,
          html: buildHtml(recipient, personalizedBody),
        };
      });

      try {
        const result = await sendBatchEmail(emails);
        successCount += result.successCount;
        errorCount += result.errorCount;
        console.log(`📧 バッチ ${Math.floor(i / BATCH_SIZE) + 1} 送信完了: ${result.successCount}件 (${result.provider})`);
      } catch (err: any) {
        console.error(`バッチ ${Math.floor(i / BATCH_SIZE) + 1} エラー:`, err.message);
        errorCount += batch.length;
      }

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
