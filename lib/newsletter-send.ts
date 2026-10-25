// メルマガを送る（サーバーだけ）。今すぐ送る（/api/send-newsletter）と、予約配信（cron）の両方で使う
import { adminDb } from '@/lib/firebase-admin';
import { sendBatchEmail, buildUnsubscribeHeaders } from '@/lib/mailer';
import { renderNewsletterHtml, type NlContent, type NlTenant } from '@/lib/newsletter-email';

const BATCH_SIZE = 100;

export type NlRecipient = { email: string; name?: string };

// テナントの記録から、メールに出す名前・住所・SNS と、返信先を作る
export async function newsletterTenant(tenantId: string): Promise<{ tenant: NlTenant; replyTo?: string }> {
  const snap = await adminDb.collection('tenants').doc(tenantId).get();
  const d: any = snap.exists ? snap.data() : {};
  return {
    tenant: {
      name: String(d.orgName || d.name || 'お知らせ'),
      address: d.address || '',
      homepage: d.homepage || '',
      instagramUrl: d.instagramUrl || '',
      lineUrl: d.lineUrl || '',
      facebookUrl: d.facebookUrl || '',
      themeColor: d.themeColor || '',
    },
    replyTo: d.contactEmail || d.ownerEmail || undefined,
  };
}

// 受け取った中身を、決まった形と大きさに整える（画面から来たものをそのまま信じない）
export function sanitizeContent(raw: any): NlContent | null {
  if (!raw || typeof raw !== 'object') return null;
  const str = (v: unknown, max: number) => String(v ?? '').slice(0, max);
  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
  const subject = str(raw.subject, 200).trim();
  if (!subject) return null;
  const snaps = (Array.isArray(raw.snaps) ? raw.snaps : []).slice(0, 30).map((b: any) => ({
    layout: str(b?.layout, 20) as any,
    title: str(b?.title, 300),
    comment: str(b?.comment, 5000),
    imageUrl: str(b?.imageUrl, 2000),
    buttonUrl: str(b?.buttonUrl, 2000),
    buttonColor: str(b?.buttonColor, 20),
    blockBgColor: str(b?.blockBgColor, 20),
    blockTextColor: str(b?.blockTextColor, 20),
    titleColor: str(b?.titleColor, 20),
    fontFamily: str(b?.fontFamily, 20),
    titleFontSize: num(b?.titleFontSize),
    bodyFontSize: num(b?.bodyFontSize),
  }));
  return {
    subject,
    mainFrameType: str(raw.mainFrameType, 20) as any,
    mainTitle: str(raw.mainTitle, 300),
    mainMessage: str(raw.mainMessage, 10000),
    mainImageUrl: str(raw.mainImageUrl, 2000),
    mainFontFamily: str(raw.mainFontFamily, 20),
    mainTitleFontSize: num(raw.mainTitleFontSize),
    mainBodyFontSize: num(raw.mainBodyFontSize),
    snaps,
  };
}

export function unsubscribeUrlFor(email: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';
  return `${appUrl}/unsubscribe?email=${encodeURIComponent(email)}`;
}

// 1人ずつ宛名を入れて送る（100通ずつまとめて Resend へ）
export async function sendNewsletter(opts: { tenantId: string; content: NlContent; recipients: NlRecipient[]; subjectPrefix?: string }) {
  const { tenant, replyTo } = await newsletterTenant(opts.tenantId);
  const fromName = tenant.name.replace(/["\r\n]/g, '');
  const subject = `${opts.subjectPrefix || ''}${opts.content.subject}`;
  let successCount = 0;
  let errorCount = 0;
  for (let i = 0; i < opts.recipients.length; i += BATCH_SIZE) {
    const chunk = opts.recipients.slice(i, i + BATCH_SIZE);
    const emails = chunk.map(r => ({
      from: `"${fromName}" <info@event-manager.app>`,
      to: r.email,
      subject,
      replyTo,
      headers: buildUnsubscribeHeaders(r.email),
      html: renderNewsletterHtml(opts.content, tenant, { recipientName: r.name, unsubscribeUrl: unsubscribeUrlFor(r.email) }),
    }));
    try {
      const result = await sendBatchEmail(emails);
      successCount += result.successCount;
      errorCount += result.errorCount;
    } catch (e: any) {
      console.error(`メルマガ ${Math.floor(i / BATCH_SIZE) + 1} 組目の送信エラー:`, e?.message || e);
      errorCount += chunk.length;
    }
    if (i + BATCH_SIZE < opts.recipients.length) await new Promise(r => setTimeout(r, 1500));
  }
  return { successCount, errorCount };
}
