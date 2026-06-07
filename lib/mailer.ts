import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { adminDb } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

// AWS SES
const sesClient = process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY
  ? new SESClient({
      region: process.env.AWS_SES_REGION || 'ap-northeast-1',
      credentials: {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
      },
    })
  : null;

const SES_FROM = process.env.AWS_SES_FROM || 'noreply@event-manager.app';

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

// 優先順位: SES > Resend > Gmail
// SES承認後、Vercelに AWS_SES_ACCESS_KEY_ID / AWS_SES_SECRET_ACCESS_KEY を追加すればSESに切り替わる
const USE_SES = !!sesClient;

type EmailParams = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  text?: string; // 未指定ならHTMLから自動生成（multipart/alternative化で迷惑メール判定を軽減）
  headers?: Record<string, string>; // List-Unsubscribe等のカスタムヘッダー
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';

// マーケティング系メール用: Gmail/Yahoo一括送信者要件のワンクリック配信停止ヘッダー（RFC 8058）
export function buildUnsubscribeHeaders(email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${APP_URL}/api/optout?email=${encodeURIComponent(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// HTMLからtext/plainパートを生成（HTMLオンリーはスパムスコア悪化要因）
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|table|h[1-6]|li)>/gi, '\n')
    .replace(/<a\s[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, url, label) => {
      const t = label.replace(/<[^>]+>/g, '').trim();
      return t ? `${t} ( ${url} )` : url;
    })
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendEmail(params: EmailParams) {
  const text = params.text || htmlToText(params.html);
  // List-Unsubscribe等のカスタムヘッダーが必要なメールはSES v1経路に流さない（ヘッダーが黙って消えるため）
  const hasCustomHeaders = !!(params.headers && Object.keys(params.headers).length > 0);

  // SES優先
  if (USE_SES && sesClient && !hasCustomHeaders) {
    const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
    const senderName = extractName(params.from);
    // 注: SES v1 SendEmailCommandはカスタムヘッダー非対応（List-Unsubscribeを使うならSESv2移行が必要）
    await sesClient.send(new SendEmailCommand({
      Source: `${senderName} <${SES_FROM}>`,
      Destination: { ToAddresses: toAddresses },
      Message: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: params.html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
    }));
    return { provider: 'ses' };
  }

  // Resend
  try {
    const { error } = await resend.emails.send({
      from: params.from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text,
      replyTo: params.replyTo,
      headers: params.headers,
    });
    if (error) throw new Error(error.message);
    return { provider: 'resend' };
  } catch (err: any) {
    console.error('Resend送信エラー:', err?.message);
  }

  // Gmail フォールバック
  if (gmailTransport) {
    await gmailTransport.sendMail({
      from: `${extractName(params.from)} <${process.env.GMAIL_USER}>`,
      to: Array.isArray(params.to) ? params.to.join(',') : params.to,
      subject: params.subject,
      html: params.html,
      text,
      replyTo: params.replyTo,
      headers: params.headers,
    });
    return { provider: 'gmail' };
  }

  throw new Error('メール送信に失敗しました（全プロバイダー）');
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

  // List-Unsubscribe等のカスタムヘッダーが必要なバッチはSES v1経路に流さない（ヘッダーが黙って消えるため）
  const needsCustomHeaders = filtered.some(e => e.headers && Object.keys(e.headers).length > 0);

  // SES優先
  if (USE_SES && sesClient && !needsCustomHeaders) {
    for (const email of filtered) {
      try {
        const toAddresses = Array.isArray(email.to) ? email.to : [email.to];
        const senderName = extractName(email.from);
        await sesClient.send(new SendEmailCommand({
          Source: `${senderName} <${SES_FROM}>`,
          Destination: { ToAddresses: toAddresses },
          Message: {
            Subject: { Data: email.subject, Charset: 'UTF-8' },
            Body: {
              Html: { Data: email.html, Charset: 'UTF-8' },
              Text: { Data: email.text || htmlToText(email.html), Charset: 'UTF-8' },
            },
          },
          ReplyToAddresses: email.replyTo ? [email.replyTo] : undefined,
        }));
        successCount++;
        await new Promise(r => setTimeout(r, 100));
      } catch {
        errorCount++;
      }
    }
    return { successCount, errorCount, provider: 'ses' };
  }

  // Resend
  // 注: バッチはGmailへフォールバックしない。
  //     from が GMAIL_USER（gmail.com）に書き換わって到達性がむしろ悪化する上、
  //     1チャンク100件がGmailの1日送信上限を一気に消費するため。失敗は件数として返す。
  try {
    const { data, error } = await resend.batch.send(
      filtered.map(e => ({
        from: e.from,
        to: Array.isArray(e.to) ? e.to : [e.to],
        subject: e.subject,
        html: e.html,
        text: e.text || htmlToText(e.html),
        replyTo: e.replyTo,
        headers: e.headers,
      })),
      // permissive: 1件の不正アドレスでチャンク全体が拒否されるのを防ぎ、失敗分だけ errors で受け取る
      { batchValidation: 'permissive' }
    );
    if (error) throw new Error(error.message);
    const failures: { index: number; message: string }[] = (data as any)?.errors || [];
    if (failures.length > 0) {
      console.error('Resend Batch 部分失敗:', failures.map(f => `[${f.index}] ${f.message}`).join(' / '));
    }
    errorCount += failures.length;
    successCount = filtered.length - failures.length;
    return { successCount, errorCount, provider: 'resend' };
  } catch (err: any) {
    console.error('Resend Batch送信エラー:', err?.message);
    return { successCount, errorCount: errorCount + filtered.length, provider: 'resend-failed' };
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
