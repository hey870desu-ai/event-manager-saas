// 配信の1通ずつの記録と、相手のメールサーバーに届いたかの確かめ（サーバーだけ）
//   送ったとき … Resend の受付番号を mail_deliveries に1通ずつ残し、履歴の記録（イベントのメール＝mail_queue・
//               絆リスト＝tenants/{id}/scheduled_emails・メルマガ＝newsletter_archives）に「届いたか」のまとめ（delivery）を書く
//   あとで     … 10分ごと（/api/cron/mail-status）と、詳細の「いま確かめる」（/api/admin/mail-delivery）で Resend に問い合わせ、
//               mail_deliveries と履歴の delivery を書き直す
//   mail_deliveries はルールに無い＝画面からは読めない（画面は履歴の記録の delivery を見る）
//   Resend の設定（webhook など）は使わない。問い合わせは1秒に4回まで（Resend はチーム全体で1秒に10回まで）
import { Resend } from 'resend';
import { adminDb } from '@/lib/firebase-admin';
import type { BatchItemResult, SendEmailResult } from '@/lib/mailer';
import {
  type DeliveryStatus, type DeliverySummary,
  fromResendEvent, isFinalStatus, summarizeDeliveries,
} from '@/lib/mail-delivery-status';

export type DeliverySource = 'mail_queue' | 'scheduled_emails' | 'newsletter_archives';
export const DELIVERY_SOURCES: DeliverySource[] = ['mail_queue', 'scheduled_emails', 'newsletter_archives'];

// 1通の送った結果（宛先の順に並べて渡す）
// status は、あとから Resend の記録で入れるとき（さかのぼり）に決まっている言い方
export type DeliveryItem = { email: string; name?: string; id?: string; provider?: string; error?: string; skipped?: string; status?: DeliveryStatus };

const COL = 'mail_deliveries';
const GIVE_UP_MS = 3 * 24 * 3600 * 1000; // 3日たっても決まらなければ「分からない」にしてやめる
const PACE_MS = 250;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Resend の時刻（"2026-11-01T11:00:03.123+00:00" や "2026-11-01 11:00:03.123+00"）をミリ秒に。読めなければ NaN
export const parseResendTime = (s: unknown): number => {
  const t = String(s ?? '').trim().replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(t).getTime();
};

// sendEmail・sendBatchEmail の結果を、1通の記録の形にする
export const itemFromSend = (to: { email: string; name?: string }, r: SendEmailResult): DeliveryItem =>
  ({ email: to.email, name: to.name, id: r.id, provider: r.provider });
export const itemFromError = (to: { email: string; name?: string }, e: unknown): DeliveryItem =>
  ({ email: to.email, name: to.name, error: String((e as any)?.message || e || 'error') });
export const itemsFromBatch = (to: { email: string; name?: string }[], results: BatchItemResult[] | undefined, provider?: string): DeliveryItem[] =>
  to.map((t, i) => {
    const r = results?.[i];
    if (!r) return { email: t.email, name: t.name, error: '送った結果が分かりません' };
    return { email: t.email, name: t.name, id: r.id, provider, error: r.error, skipped: r.skipped };
  });

const initialStatus = (it: DeliveryItem): DeliveryStatus =>
  it.status ? it.status : it.skipped ? 'skipped' : it.error ? 'failed' : it.id ? 'sent' : 'untracked';

// 履歴の記録の場所
export function historyRef(source: DeliverySource, tenantId: string | null, sourceId: string) {
  if (source === 'scheduled_emails') return adminDb.collection('tenants').doc(String(tenantId)).collection('scheduled_emails').doc(sourceId);
  return adminDb.collection(source).doc(sourceId);
}

export type BuiltDeliveries = {
  summary: DeliverySummary;
  docs: { ref: any; data: Record<string, any> }[];
};

// 記録を作る（まだ書かない）。履歴の記録に summary を書いてから saveDeliveries で書く
//   （先に1通ずつの記録を書くと、確かめの処理が先に走ったときに、履歴の記録が無くてまとめを書けないため）
export function buildDeliveries(opts: {
  tenantId: string | null; source: DeliverySource; sourceId: string; items: DeliveryItem[]; replyTo?: string | null;
  sentAt?: Date; checkedAt?: Date | null; // さかのぼりのときは、送った時刻と確かめた時刻を渡す
}): BuiltDeliveries {
  const now = opts.sentAt ?? new Date();
  const col = adminDb.collection(COL);
  const docs = opts.items.map((it, seq) => {
    const status = initialStatus(it);
    return {
      ref: it.id ? col.doc(it.id) : col.doc(),
      data: {
        tenantId: opts.tenantId ?? null, source: opts.source, sourceId: opts.sourceId, seq,
        email: String(it.email || ''), name: String(it.name || ''),
        resendId: it.id ?? null, provider: it.provider ?? null,
        error: it.error ? String(it.error).slice(0, 300) : null,
        status, final: isFinalStatus(status), sentAt: now, checkedAt: opts.checkedAt ?? null,
      },
    };
  });
  return { docs, summary: summarizeDeliveries(docs.map(d => d.data as any), { replyTo: opts.replyTo ?? null, checkedAt: opts.checkedAt ?? null }) };
}

export async function saveDeliveries(built: BuiltDeliveries) {
  for (let i = 0; i < built.docs.length; i += 400) {
    const batch = adminDb.batch();
    for (const d of built.docs.slice(i, i + 400)) batch.set(d.ref, d.data);
    await batch.commit();
  }
}

type Key = { source: DeliverySource; tenantId: string | null; sourceId: string };
const keyOf = (x: any): Key => ({ source: x.source, tenantId: x.tenantId ?? null, sourceId: x.sourceId });
const keyStr = (k: Key) => `${k.source}/${k.tenantId}/${k.sourceId}`;

// 履歴の記録のまとめを書き直す（返信先はそのまま残す）。履歴が消されていたら何もしない
async function writeSummary(k: Key, rows: any[], checkedAt: Date) {
  const summary = summarizeDeliveries(rows, { checkedAt });
  try {
    await historyRef(k.source, k.tenantId, k.sourceId).update({
      'delivery.total': summary.total,
      'delivery.counts': summary.counts,
      'delivery.items': summary.items,
      'delivery.done': summary.done,
      'delivery.checkedAt': checkedAt,
    });
  } catch (e: any) {
    if (e?.code !== 5 && !/NOT_FOUND|No document/i.test(String(e?.message))) console.warn('配信のまとめを書けませんでした:', keyStr(k), e?.message || e);
  }
  return summary;
}

// Resend に問い合わせて、まだ決まっていない記録を書き直す
//   sourceId を渡したとき … その1件の履歴の分だけ（詳細の「いま確かめる」）。書き直したまとめを返す
//   渡さないとき         … まだ決まっていない記録すべて（10分ごと）
export async function pollDeliveries(opts: {
  tenantId?: string | null; source?: DeliverySource; sourceId?: string; maxGets?: number; listPages?: number;
} = {}): Promise<{ checked: number; changed: number; summary?: DeliverySummary }> {
  const maxGets = opts.maxGets ?? 40;
  const listPages = opts.listPages ?? 3;
  const now = new Date();
  const col = adminDb.collection(COL);
  const one = !!opts.sourceId;
  const snap = one
    ? await col.where('tenantId', '==', opts.tenantId ?? null).where('sourceId', '==', opts.sourceId).get()
    : await col.where('final', '==', false).limit(500).get();
  const all = snap.docs.filter((d: any) => !opts.source || d.data().source === opts.source);
  const pending = all.filter((d: any) => d.data().final === false);

  const toSentMs = (v: any) => (v?.toDate ? v.toDate() : new Date(v)).getTime();
  const byId = new Map<string, any>();
  const giveUp: any[] = [];
  for (const d of pending) {
    const x = d.data();
    if (!x.resendId || now.getTime() - toSentMs(x.sentAt) > GIVE_UP_MS) giveUp.push(d);
    else byId.set(x.resendId, d);
  }

  // Resend に問い合わせる（まず最近の送信を100通ずつ、見つからなかった分は1通ずつ）
  const found = new Map<string, string>();
  if (byId.size && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const oldest = Math.min(...Array.from(byId.values()).map(d => toSentMs(d.data().sentAt)));
    let after: string | undefined;
    for (let page = 0; page < listPages && found.size < byId.size; page++) {
      const { data, error } = await resend.emails.list(after ? { limit: 100, after } : { limit: 100 });
      if (error) console.warn('Resend の送信の一覧を読めませんでした:', error.message);
      if (error || !data?.data?.length) break;
      for (const e of data.data) if (byId.has(e.id)) found.set(e.id, e.last_event);
      const last = data.data[data.data.length - 1];
      if (!data.has_more || parseResendTime(last.created_at) < oldest - 60_000) break;
      after = last.id;
      await sleep(PACE_MS);
    }
    let gets = 0;
    for (const [id, d] of Array.from(byId)) {
      if (found.has(id)) continue;
      if (gets >= maxGets) break;
      gets++;
      await sleep(PACE_MS);
      const { data, error } = await resend.emails.get(id);
      const code = (error as any)?.statusCode;
      if (data) found.set(id, data.last_event);
      else if (code === 401 || code === 403) { console.warn('Resend の鍵に、送ったメールを読む権限がありません（届いたかを確かめられない）:', error?.message); break; }
      else if (code === 429) break;
      else if (code === 404 && now.getTime() - toSentMs(d.data().sentAt) > 3600_000) giveUp.push(d);
    }
  }

  // 書き直す
  const updates: { ref: any; patch: Record<string, any>; x: any }[] = [];
  for (const [id, ev] of Array.from(found)) {
    const d = byId.get(id);
    const x = d.data();
    const status = fromResendEvent(ev);
    if (status !== x.status || isFinalStatus(status)) {
      updates.push({ ref: d.ref, x, patch: { status, final: isFinalStatus(status), checkedAt: now } });
    }
  }
  for (const d of giveUp) updates.push({ ref: d.ref, x: d.data(), patch: { status: 'unknown', final: true, checkedAt: now } });
  for (let i = 0; i < updates.length; i += 400) {
    const batch = adminDb.batch();
    for (const u of updates.slice(i, i + 400)) batch.update(u.ref, u.patch);
    await batch.commit();
  }

  // 履歴の記録のまとめを書き直す
  if (one) {
    const patched = new Map(updates.map(u => [u.ref.id, u.patch]));
    const rows = all.map((d: any) => ({ ...d.data(), ...(patched.get(d.id) || {}) }));
    if (!rows.length) return { checked: found.size, changed: updates.length };
    const summary = await writeSummary(keyOf(rows[0]), rows, now);
    return { checked: found.size, changed: updates.length, summary };
  }
  const touched = new Map<string, Key>();
  for (const u of updates) { const k = keyOf(u.x); touched.set(keyStr(k), k); }
  for (const k of Array.from(touched.values())) {
    const s = await col.where('tenantId', '==', k.tenantId).where('sourceId', '==', k.sourceId).get();
    await writeSummary(k, s.docs.map((d: any) => d.data()).filter((x: any) => x.source === k.source), now);
  }
  return { checked: found.size, changed: updates.length };
}
