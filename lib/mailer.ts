import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { adminDb } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// Gmail Nodemailer
const gmailTransport = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null;

// GMAIL_APP_PASSWORDが設定されていればGmail優先
// Resend復旧後、Vercelの環境変数からGMAIL_APP_PASSWORDを削除すればResendに戻る
const USE_GMAIL = !!process.env.GMAIL_APP_PASSWORD;

type EmailParams = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(params: EmailParams) {
  if (USE_GMAIL && gmailTransport) {
    await gmailTransport.sendMail({
      from: `${extractName(params.from)} <${process.env.GMAIL_USER}>`,
      to: Array.isArray(params.to) ? params.to.join(',') : params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    return { provider: 'gmail' };
  }

  await resend.emails.send({
    from: params.from,
    to: Array.isArray(params.to) ? params.to : [params.to],
    subject: params.subject,
    html: params.html,
    replyTo: params.replyTo,
  } as any);
  return { provider: 'resend' };
}

export async function sendBatchEmail(emails: EmailParams[]) {
  let successCount = 0;
  let errorCount = 0;

  // オプトアウト済みアドレスを除外
  const allEmails = emails.map(e => Array.isArray(e.to) ? e.to[0] : e.to);
  const optedOut = await filterOptedOut(allEmails);
  const filtered = emails.filter(e => {
    const addr = Array.isArray(e.to) ? e.to[0] : e.to;
    if (optedOut.has(addr)) {
      console.log(`⏭️ オプトアウト済みスキップ: ${addr}`);
      return false;
    }
    return true;
  });
  if (filtered.length === 0) return { successCount: 0, errorCount: 0, provider: 'skipped' };

  if (USE_GMAIL && gmailTransport) {
    for (const email of filtered) {
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

  try {
    await resend.batch.send(
      filtered.map(e => ({
        from: e.from,
        to: Array.isArray(e.to) ? e.to : [e.to],
        subject: e.subject,
        html: e.html,
        reply_to: e.replyTo,
      })) as any
    );
    successCount = filtered.length;
    return { successCount, errorCount, provider: 'resend' };
  } catch (err: any) {
    console.error('Resend Batch送信エラー:', err?.message);
    throw err;
  }
}

// オプトアウト済みのメールアドレスをフィルタリング
async function filterOptedOut(emails: string[]): Promise<Set<string>> {
  const optedOut = new Set<string>();
  // 10件ずつチェック（Firestoreのinクエリ上限対策）
  for (let i = 0; i < emails.length; i += 10) {
    const batch = emails.slice(i, i + 10);
    for (const email of batch) {
      const doc = await adminDb.collection('marketing_optouts').doc(email).get();
      if (doc.exists) optedOut.add(email);
    }
  }
  return optedOut;
}

function extractName(from: string): string {
  const match = from.match(/"([^"]+)"/);
  return match ? match[1] : '絆太郎';
}
