import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY);

// Gmail Nodemailer（フォールバック用）
const gmailTransport = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

type EmailParams = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

// Resendで送信、失敗時はGmailにフォールバック
export async function sendEmail(params: EmailParams) {
  try {
    await resend.emails.send({
      from: params.from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    } as any);
    return { provider: 'resend' };
  } catch (resendErr: any) {
    console.warn('⚠️ Resend送信失敗、Gmailにフォールバック:', resendErr?.message);
    if (!gmailTransport) throw new Error('Resend停止中かつGmail未設定');

    await gmailTransport.sendMail({
      from: `${extractName(params.from)} <${process.env.GMAIL_USER}>`,
      to: Array.isArray(params.to) ? params.to.join(',') : params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    return { provider: 'gmail' };
  }
}

// Resend Batch送信、失敗時はGmailで1件ずつ
export async function sendBatchEmail(emails: EmailParams[]) {
  let successCount = 0;
  let errorCount = 0;

  try {
    await resend.batch.send(
      emails.map(e => ({
        from: e.from,
        to: Array.isArray(e.to) ? e.to : [e.to],
        subject: e.subject,
        html: e.html,
        reply_to: e.replyTo,
      })) as any
    );
    successCount = emails.length;
    return { successCount, errorCount, provider: 'resend' };
  } catch (resendErr: any) {
    console.warn('⚠️ Resend Batch送信失敗、Gmailにフォールバック:', resendErr?.message);
    if (!gmailTransport) throw new Error('Resend停止中かつGmail未設定');

    for (const email of emails) {
      try {
        await gmailTransport.sendMail({
          from: `${extractName(email.from)} <${process.env.GMAIL_USER}>`,
          to: Array.isArray(email.to) ? email.to.join(',') : email.to,
          subject: email.subject,
          html: email.html,
          replyTo: email.replyTo,
        });
        successCount++;
        await new Promise(r => setTimeout(r, 500));
      } catch {
        errorCount++;
      }
    }
    return { successCount, errorCount, provider: 'gmail' };
  }
}

// "送信者名" <email> → 送信者名 を抽出
function extractName(from: string): string {
  const match = from.match(/"([^"]+)"/);
  return match ? match[1] : '絆太郎';
}
