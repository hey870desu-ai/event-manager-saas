// 📂 lib/inbound-mail.ts
// 📝 役割：絆太郎のアドレス（info@event-manager.app など）に届いたメールを、送り主の主催者へ回す（サーバーだけ・2026-11-04）
//   11/2 より前の配信は、返信先が info@event-manager.app で、受け取る箱が無かった（返信がだれにも届かず、返信した人に「配信未完了」が返る）。
//   event-manager.app の MX → Resend の受け取り → webhook（email.received）→ /api/webhooks/inbound-mail → ここ
//   主催者の決め方：返信した人のアドレスで配信の1通ずつの記録（mail_deliveries）を探し、件名（Re: などを外す）が合う配信の主催者。
//     件名が合わなくても、その人に送った主催者が1つだけならそこ。決まらなければ運営（塙さん）へ
//   回す先：その配信の返信先 → イベントの問い合わせ先 → 会社の連絡先 → 代表の管理者（reply-to.ts と同じ順）
//   回すメール：差出人は「絆太郎」、返信先は返信した人＝主催者がそのまま返信すると相手に届く
import { adminDb } from '@/lib/firebase-admin';
import { historyRef, type DeliverySource } from '@/lib/mail-delivery';
import { givenReplyTo, fallbackReplyTo } from '@/lib/reply-to';

export const OUR_DOMAIN = 'event-manager.app';
export const INBOUND_COL = 'inbound_mails';
export const OPERATOR_DAILY_LIMIT = 20;                 // 運営へ回すのは1日20通まで（宛先の分からない広告で埋もれないよう）
export const MAX_ATTACH_BYTES = 10 * 1024 * 1024;       // 添付は合計10MBまで回す（それより大きいものは名前だけ知らせる）

// "山田 <a@b.jp>" → "a@b.jp"
export const addressOf = (v: unknown): string => {
  const s = String(v ?? '').trim();
  const m = s.match(/<([^<>\s]+@[^<>\s]+)>/);
  return (m ? m[1] : s).trim();
};
export const nameOf = (v: unknown): string => {
  const s = String(v ?? '').trim();
  const m = s.match(/^\s*"([^"]*)"\s*</) || s.match(/^\s*([^"<]*?)\s*</);
  return m ? m[1].trim() : '';
};
export const isOurAddress = (a: string) => a.toLowerCase().endsWith('@' + OUR_DOMAIN);

// 件名の頭の「Re:」「RE[2]:」「Fwd:」「返信:」などを外して比べる
export function normalizeSubject(s: unknown): string {
  let t = String(s ?? '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 10; i++) {
    const next = t.replace(/^(?:(?:re|fw|fwd|aw|sv|vs)(?:\[\d+\])?\s*[:：]|返信\s*[:：]|転送\s*[:：])\s*/i, '');
    if (next === t) break;
    t = next;
  }
  return t;
}

// 自動の返事・配信の失敗の知らせ・自分たちから は回さない
export function skipReason(fromAddr: string, headers: Record<string, unknown> | null | undefined): string | null {
  const a = fromAddr.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a)) return '差出人が分からない';
  if (isOurAddress(a)) return '絆太郎から';
  if (/^(mailer-daemon|postmaster)@/i.test(a)) return '配信の失敗の知らせ';
  const h: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers || {})) h[k.toLowerCase()] = String(Array.isArray(v) ? v[0] : v ?? '');
  const auto = (h['auto-submitted'] || '').toLowerCase();
  if (auto && auto !== 'no') return '自動の返事';
  if (/^(bulk|junk|list|auto_reply)$/i.test((h['precedence'] || '').trim())) return '一斉配信・自動の返事';
  if (h['x-autoreply'] || h['x-autorespond']) return '自動の返事';
  return null;
}

export type SentMail = {
  source: DeliverySource; tenantId: string | null; sourceId: string;
  sentAt: Date | null; subject: string; replyTo: string | null; eventId: string | null;
};
export type Found =
  | { kind: 'match'; how: 'subject' | 'only'; mail: SentMail }
  | { kind: 'unknown'; candidates: SentMail[] }
  | { kind: 'none' };

const toDate = (v: any): Date | null => (v?.toDate ? v.toDate() : v instanceof Date ? v : null);

// 返信した人に送った配信を探す
export async function findSentMail(fromAddr: string, subject: unknown): Promise<Found> {
  const variants = Array.from(new Set([fromAddr, fromAddr.toLowerCase()]));
  const groups = new Map<string, { source: DeliverySource; tenantId: string | null; sourceId: string; sentAt: Date | null }>();
  for (const v of variants) {
    const snap = await adminDb.collection('mail_deliveries').where('email', '==', v).limit(300).get();
    for (const d of snap.docs) {
      const r: any = d.data();
      if (!r?.source || !r?.sourceId) continue;
      const key = `${r.source}/${r.tenantId ?? ''}/${r.sourceId}`;
      const at = toDate(r.sentAt);
      const cur = groups.get(key);
      if (!cur || (at && (!cur.sentAt || at > cur.sentAt))) groups.set(key, { source: r.source, tenantId: r.tenantId ?? null, sourceId: r.sourceId, sentAt: at });
    }
  }
  if (!groups.size) return { kind: 'none' };
  const recent = Array.from(groups.values()).sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0)).slice(0, 30);
  const list: SentMail[] = await Promise.all(recent.map(async (g) => {
    let h: any = {};
    try { h = (await historyRef(g.source, g.tenantId, g.sourceId).get()).data() || {}; } catch { h = {}; }
    return {
      ...g,
      tenantId: g.tenantId ?? (h.tenantId || null),
      subject: String(h.subject || h.title || h.content?.subject || ''),
      replyTo: h.replyTo || h.delivery?.replyTo || null,
      eventId: h.eventId || null,
    };
  }));
  const want = normalizeSubject(subject);
  if (want) {
    const hit = list.find((x) => {
      const s = normalizeSubject(x.subject);
      return !!s && (s === want || (s.length >= 6 && want.includes(s)) || (want.length >= 6 && s.includes(want)));
    });
    if (hit) return { kind: 'match', how: 'subject', mail: hit };
  }
  const tenants = new Set(list.map((x) => x.tenantId || ''));
  if (tenants.size === 1 && !tenants.has('')) return { kind: 'match', how: 'only', mail: list[0] };
  return { kind: 'unknown', candidates: list };
}

// 回す先（主催者のアドレス）
export async function organizerAddress(mail: SentMail): Promise<string | undefined> {
  return givenReplyTo(mail.replyTo) || await fallbackReplyTo(mail.tenantId, mail.eventId);
}

// 運営へ回した数（この24時間）
export async function operatorCountToday(now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - 24 * 3600 * 1000);
  const snap = await adminDb.collection(INBOUND_COL).where('at', '>=', since).limit(500).get();
  return snap.docs.filter((d: any) => d.data()?.status === 'operator').length;
}

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const jst = (d: Date | null) => (d ? d.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

// 回すメールの件名と本文
export function buildForward(opts: {
  fromAddr: string; fromName: string; subject: string; html?: string | null; text?: string | null;
  mail?: SentMail | null; toOperator?: { why: string; candidates?: SentMail[] } | null;
  attachNote?: string | null;
}) {
  const who = opts.fromName ? `${esc(opts.fromName)} &lt;${esc(opts.fromAddr)}&gt;` : esc(opts.fromAddr);
  const lines: string[] = [];
  if (opts.toOperator) {
    lines.push(`<p style="margin:0 0 6px;font-weight:bold">絆太郎のアドレスにメールが届きました（どの主催者あてか分かりませんでした）</p>`);
    lines.push(`<p style="margin:0">わけ：${esc(opts.toOperator.why)}</p>`);
    for (const c of (opts.toOperator.candidates || []).slice(0, 5)) {
      lines.push(`<p style="margin:0;color:#475569">送った記録：${esc(c.tenantId || '-')}「${esc(c.subject)}」${esc(jst(c.sentAt))}</p>`);
    }
  } else {
    lines.push(`<p style="margin:0 0 6px;font-weight:bold">絆太郎で送ったメールに、返信がありました</p>`);
    if (opts.mail) lines.push(`<p style="margin:0">送ったメール：「${esc(opts.mail.subject)}」${esc(jst(opts.mail.sentAt))}</p>`);
  }
  lines.push(`<p style="margin:0">返信した方：${who}</p>`);
  lines.push(`<p style="margin:6px 0 0">このメールに返信すると、${esc(opts.fromAddr)} に届きます。</p>`);
  if (opts.attachNote) lines.push(`<p style="margin:6px 0 0;color:#b45309">${esc(opts.attachNote)}</p>`);
  const original = opts.html && opts.html.trim()
    ? opts.html
    : `<div style="white-space:pre-wrap">${esc(opts.text || '（本文なし）')}</div>`;
  const html = `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#1e293b">`
    + `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;background:#f8fafc;margin-bottom:16px">${lines.join('')}</div>`
    + `<div>${original}</div></div>`;
  const subject = `【返信】${opts.subject || '（件名なし）'}`.slice(0, 200);
  return { subject, html };
}
