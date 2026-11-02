// 配信の「届いたか」のさかのぼり（サーバーだけ・1回きり）
//   2026-11-02 9:00 より前に送ったメールは、送ったときの Resend の受付番号を残していない。
//   Resend は送った記録を30日残すので、宛先・件名・送った時刻で履歴と突き合わせて「届いたか」を入れる。
//   10分ごとの /api/cron/mail-status が、時間の許す分だけ進める（進み具合は mail_delivery_backfill/state・画面からは読めない）
//   Resend の一覧を新しい送信から古い送信へ100通ずつ読み、読み切れなければ次の回に続きから読む（境目の35分は読み直す）
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';
import { buildDeliveries, saveDeliveries, parseResendTime, type DeliveryItem, type DeliverySource } from '@/lib/mail-delivery';
import { fromResendEvent } from '@/lib/mail-delivery-status';

const DAY = 24 * 3600 * 1000;
const BEFORE_MS = 30 * 60 * 1000; // 1通目を送ってから履歴を書くまで（大きな配信は時間がかかる）
const AFTER_MS = 5 * 60 * 1000;   // 履歴を書いたあとに送った分（前は絆リストの「今すぐ」の履歴を画面が先に書いていた）
const PACE_MS = 250;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const toMs = (v: any) => (v?.toDate ? v.toDate().getTime() : v ? new Date(v).getTime() : NaN);
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();
const stateRef = () => adminDb.collection('mail_delivery_backfill').doc('state');

type REmail = { id: string; to: string; subject: string; at: number; ev: string; replyTo: string | null; from: string; used?: boolean };
type Hist = {
  source: DeliverySource; tenantId: string | null; id: string; subject: string; sentAt: number; ref: any;
  recipients: { email?: string; name?: string }[] | null; // 無いもの（今すぐ送ったメルマガ）は、Resend の記録から宛先を拾う
  fromName?: string;
};

// まだ「届いたか」の無い、送った履歴（since〜until に送ったもの）
async function loadHistories(since: number, until: number): Promise<Hist[]> {
  const out: Hist[] = [];
  const inRange = (t: number) => t >= since && t <= until;
  const mq = await adminDb.collection('mail_queue').where('status', '==', 'sent').get();
  for (const d of mq.docs) {
    const x: any = d.data();
    const t = toMs(x.sentAt ?? x.createdAt);
    if (x.delivery || !inRange(t)) continue;
    out.push({ source: 'mail_queue', tenantId: x.tenantId ?? null, id: d.id, subject: String(x.subject || ''), sentAt: t, ref: d.ref, recipients: Array.isArray(x.recipients) ? x.recipients : null });
  }
  const scheduledNl = new Map<string, any[]>(); // メルマガの履歴の番号 → 予約のときの宛先
  const tenantName = new Map<string, string>();
  const tenants = await adminDb.collection('tenants').get();
  for (const t of tenants.docs) {
    const td: any = t.data() || {};
    tenantName.set(t.id, String(td.orgName || td.name || ''));
    const s = await t.ref.collection('scheduled_emails').get();
    for (const d of s.docs) {
      const x: any = d.data();
      if (x.kind === 'newsletter') { if (x.archiveId && Array.isArray(x.recipients)) scheduledNl.set(String(x.archiveId), x.recipients); continue; }
      const at = toMs(x.sentAt ?? x.scheduledAt);
      if (x.status !== 'sent' || x.delivery || !inRange(at)) continue;
      out.push({ source: 'scheduled_emails', tenantId: t.id, id: d.id, subject: String(x.subject || ''), sentAt: at, ref: d.ref, recipients: Array.isArray(x.recipients) ? x.recipients : null });
    }
  }
  const na = await adminDb.collection('newsletter_archives').where('status', '==', 'sent').get();
  for (const d of na.docs) {
    const x: any = d.data();
    const t = toMs(x.sentAt ?? x.createdAt);
    if (x.delivery || !inRange(t)) continue;
    out.push({
      source: 'newsletter_archives', tenantId: x.tenantId ?? null, id: d.id, subject: String(x.subject || x.content?.subject || ''), sentAt: t, ref: d.ref,
      recipients: scheduledNl.get(d.id) || null, fromName: tenantName.get(String(x.tenantId)) || undefined,
    });
  }
  return out;
}

// 1件の履歴の宛先を、Resend の記録と突き合わせる（時刻がいちばん近いもの・1通は1回だけ使う）
function matchHistory(h: Hist, byKey: Map<string, REmail[]>, bySubject: Map<string, REmail[]>, optouts: Set<string>) {
  const lo = h.sentAt - BEFORE_MS, hi = h.sentAt + AFTER_MS;
  const items: DeliveryItem[] = [];
  let replyTo: string | null = null;
  let found = 0;
  const take = (e: REmail) => { e.used = true; found++; replyTo = replyTo ?? e.replyTo; };
  if (h.recipients) {
    for (const r of h.recipients) {
      const email = String(r?.email || '').trim();
      if (!email) continue;
      let best: REmail | undefined;
      for (const e of byKey.get(norm(email) + '\n' + h.subject) || []) {
        if (e.used || e.at < lo || e.at > hi) continue;
        if (!best || Math.abs(e.at - h.sentAt) < Math.abs(best.at - h.sentAt)) best = e;
      }
      if (best) { take(best); items.push({ email, name: r?.name, id: best.id, status: fromResendEvent(best.ev) }); }
      else items.push({ email, name: r?.name, status: optouts.has(norm(email)) ? 'skipped' : 'unknown' });
    }
  } else {
    for (const e of bySubject.get(h.subject) || []) {
      if (e.used || e.at < lo || e.at > hi || (h.fromName && !e.from.includes(h.fromName))) continue;
      take(e);
      items.push({ email: e.to, id: e.id, status: fromResendEvent(e.ev) });
    }
  }
  return { items, replyTo, found };
}

// budgetMs … Resend の一覧を読む時間・totalMs … 書き込みまで含めた時間（越えたら、その履歴から次の回に回す）
export async function runBackfill(opts: { budgetMs?: number; totalMs?: number; maxPages?: number; pageSize?: number } = {}) {
  const started = Date.now();
  const budget = opts.budgetMs ?? 15_000;
  const total = opts.totalMs ?? 35_000;
  const ref = stateRef();
  const snap = await ref.get();
  let st: any = snap.exists ? snap.data() : null;
  if (st?.done) return { done: true, filled: 0, pages: 0 };
  if (!process.env.RESEND_API_KEY) return { done: false, filled: 0, pages: 0 };
  if (!st) {
    // Resend は30日残す。端の分は消えかけなので29日前から。これより後に送った分は送ったときに記録している
    st = { since: new Date(started - 29 * DAY), until: new Date(started), after: null, coveredTo: null, pages: 0, filled: 0, done: false, startedAt: new Date(started) };
    await ref.set(st);
  }
  const since = toMs(st.since), until = toMs(st.until);
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Resend の一覧を新しい順に読む
  const emails: REmail[] = [];
  let after: string | undefined = st.after || undefined;
  let reachedEnd = false, pages = 0;
  while (pages < (opts.maxPages ?? 80) && Date.now() - started < budget) {
    const { data, error } = await resend.emails.list(after ? { limit: opts.pageSize ?? 100, after } : { limit: opts.pageSize ?? 100 });
    if (error || !data) { console.warn('さかのぼり：Resend の一覧を読めませんでした:', error?.message); break; }
    pages++;
    // 新しい順で返る前提（Resend の説明の例も新しい順）。古い順で返ってきたら、何もせずにやめる（「済んだ」にしない）
    const first = parseResendTime(data.data[0]?.created_at), last = parseResendTime(data.data[data.data.length - 1]?.created_at);
    if (first < last) { console.warn('さかのぼり：Resend の一覧が古い順で返ってきたので、やめました'); break; }
    for (const e of data.data) {
      const at = parseResendTime(e.created_at);
      if (at < since) { reachedEnd = true; break; }
      emails.push({ id: e.id, to: norm((e.to || [])[0]), subject: String(e.subject || ''), at, ev: e.last_event, replyTo: (e as any).reply_to?.[0] ?? null, from: String((e as any).from || '') });
    }
    if (reachedEnd || !data.has_more || !data.data.length) { reachedEnd = true; break; }
    after = data.data[data.data.length - 1].id;
    await sleep(PACE_MS);
  }
  if (!emails.length && !reachedEnd) return { done: false, filled: 0, pages };

  // この回で突き合わせられる履歴：送った時刻が [lo, hi]（その前後の送信をすべて読んである分）
  const tMin = emails.length ? Math.min(...emails.map(e => e.at)) : since;
  const lo = reachedEnd ? since : tMin + BEFORE_MS;
  const hi = st.coveredTo != null ? toMs(st.coveredTo) : until;
  const byKey = new Map<string, REmail[]>(), bySubject = new Map<string, REmail[]>();
  for (const e of emails) {
    const k = e.to + '\n' + e.subject;
    byKey.set(k, [...(byKey.get(k) || []), e]);
    bySubject.set(e.subject, [...(bySubject.get(e.subject) || []), e]);
  }
  const optouts = new Set<string>((await adminDb.collection('marketing_optouts').get()).docs.map((d: any) => norm(d.id)));
  const hists = (await loadHistories(since, until)).filter(h => h.sentAt >= lo && h.sentAt <= hi).sort((a, b) => b.sentAt - a.sentAt);
  let filled = 0;
  let doneTo = lo; // ここより後に送った履歴は、この回で済んだ
  const checkedAt = new Date();
  for (const h of hists) {
    if (Date.now() - started > total) { doneTo = h.sentAt; reachedEnd = false; break; }
    const m = matchHistory(h, byKey, bySubject, optouts);
    if (!m.found) continue; // Resend に1通も見つからない履歴は、記録の無いままにする
    const built = buildDeliveries({ tenantId: h.tenantId, source: h.source, sourceId: h.id, items: m.items, replyTo: m.replyTo, sentAt: new Date(h.sentAt), checkedAt });
    await h.ref.update({ delivery: { ...built.summary, backfilled: true } });
    await saveDeliveries(built);
    filled++;
  }

  // 次の回は、まだ突き合わせていない履歴（送った時刻が doneTo より前）に要る送信から読む
  let nextAfter: string | null = st.after || null;
  if (!reachedEnd && emails.length) {
    const i = emails.findIndex(e => e.at < doneTo + AFTER_MS);
    if (i > 0) nextAfter = emails[i - 1].id;
    else { nextAfter = emails[emails.length - 1].id; console.warn('さかのぼり：1回で読めた幅が35分より短いので、境目の履歴は一部だけ突き合わせました'); }
  }
  await ref.set({
    ...st, after: nextAfter, coveredTo: new Date(doneTo), pages: (st.pages || 0) + pages, filled: (st.filled || 0) + filled,
    done: reachedEnd, updatedAt: new Date(),
  });
  return { done: reachedEnd, filled, pages, covered: hists.length };
}
