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
  attachments?: { filename: string; content: Buffer }[]; // 添付（領収証の PDF など）。SES v1 経路は添付できないので通さない
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

// id は Resend の受付番号（相手のサーバーに届いたかを、あとで Resend に問い合わせるときに使う）。SES・Gmail で送ったときは無い
export type SendEmailResult = { provider: 'ses' | 'resend' | 'gmail'; id?: string };

export async function sendEmail(params: EmailParams): Promise<SendEmailResult> {
  const text = params.text || htmlToText(params.html);
  // List-Unsubscribe等のカスタムヘッダーが必要なメールはSES v1経路に流さない（ヘッダーが黙って消えるため）
  const hasCustomHeaders = !!(params.headers && Object.keys(params.headers).length > 0);
  const hasAttachments = !!(params.attachments && params.attachments.length > 0);

  // SES優先
  if (USE_SES && sesClient && !hasCustomHeaders && !hasAttachments) {
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
    const { data, error } = await resend.emails.send({
      from: params.from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      text,
      replyTo: params.replyTo,
      headers: params.headers,
      ...(hasAttachments ? { attachments: params.attachments!.map(a => ({ filename: a.filename, content: a.content })) } : {}),
    });
    if (error) throw new Error(error.message);
    return { provider: 'resend', id: data?.id };
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
      ...(hasAttachments ? { attachments: params.attachments!.map(a => ({ filename: a.filename, content: a.content })) } : {}),
    });
    return { provider: 'gmail' };
  }

  throw new Error('メール送信に失敗しました（全プロバイダー）');
}

// 1通ずつの結果（emails と同じ順）。id は Resend の受付番号・skipped は配信停止の人で送らなかった
export type BatchItemResult = { to: string; id?: string; error?: string; skipped?: 'optout' };

export async function sendBatchEmail(emails: EmailParams[]) {
  let successCount = 0;
  let errorCount = 0;
  const results: BatchItemResult[] = emails.map(e => ({ to: Array.isArray(e.to) ? e.to[0] : e.to }));

  // オプトアウト済みアドレスを除外（sendIdx＝送る分の、元の並びの番号）
  const optedOut = await filterOptedOut(results.map(r => r.to));
  const sendIdx: number[] = [];
  results.forEach((r, i) => {
    if (optedOut.has(r.to)) {
      console.log(`⏭️ オプトアウト済みスキップ: ${r.to}`);
      r.skipped = 'optout';
    } else {
      sendIdx.push(i);
    }
  });
  const filtered = sendIdx.map(i => emails[i]);
  if (filtered.length === 0) return { successCount: 0, errorCount: 0, provider: 'skipped', results };

  // List-Unsubscribe等のカスタムヘッダーが必要なバッチはSES v1経路に流さない（ヘッダーが黙って消えるため）
  const needsCustomHeaders = filtered.some(e => e.headers && Object.keys(e.headers).length > 0);

  // SES優先
  if (USE_SES && sesClient && !needsCustomHeaders) {
    for (let j = 0; j < filtered.length; j++) {
      const email = filtered[j];
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
      } catch (err: any) {
        errorCount++;
        results[sendIdx[j]].error = String(err?.message || 'error');
      }
    }
    return { successCount, errorCount, provider: 'ses', results };
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
    // data は受け付けた分だけ、送った順に並ぶ（失敗した番号は飛ばす）。数が合わないときは受付番号を付けない
    const failed = new Map(failures.map(f => [f.index, String(f.message || 'error')]));
    const ids: (string | undefined)[] = ((data as any)?.data || []).map((d: any) => d?.id);
    const aligned = ids.length === filtered.length - failed.size;
    let k = 0;
    filtered.forEach((_, j) => {
      const r = results[sendIdx[j]];
      if (failed.has(j)) r.error = failed.get(j);
      else if (aligned) r.id = ids[k++];
    });
    errorCount += failures.length;
    successCount = filtered.length - failures.length;
    return { successCount, errorCount, provider: 'resend', results };
  } catch (err: any) {
    console.error('Resend Batch送信エラー:', err?.message);
    for (const i of sendIdx) results[i].error = String(err?.message || 'error');
    return { successCount, errorCount: errorCount + filtered.length, provider: 'resend-failed', results };
  }
}

// オプトアウト済みのメールアドレスをフィルタリング
async function filterOptedOut(emails: string[]): Promise<Set<string>> {
  // marketing_optouts を全件読み、ドキュメントIDを小文字Setに正規化してから照合する。
  // （旧データは大文字混じりIDで登録されている場合があり、doc()のpoint-lookupだと
  //   小文字宛先↔大文字IDがヒットせず配信停止がすり抜けるため、全件読み込み方式にする）
  const snap = await adminDb.collection('marketing_optouts').get();
  const blocked = new Set(snap.docs.map((d: any) => d.id.trim().toLowerCase()));
  const optedOut = new Set<string>();
  for (const email of emails) {
    if (blocked.has((email || '').trim().toLowerCase())) optedOut.add(email); // 元アドレスを格納（呼び出し側 has(addr) と整合）
  }
  return optedOut;
}

function extractName(from: string): string {
  const match = from.match(/"([^"]+)"/);
  return match ? match[1] : '絆太郎';
}
