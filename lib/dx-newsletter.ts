import { adminDb } from '@/lib/firebase-admin';

export const INVALID_NAMES = new Set(['仮登録中', '仮登録', '仮', '名前なし', 'ユーザー', 'ゲスト', 'test', 'テスト']);

// JSTで「本日 hh:mm」を返す。過去スロットでも当日中なら過去日時のまま返す
// （cron送信側が scheduledAt <= now で即送信するため、遅延でも当日中に配信される）。
// ただし JST 18:00 以降の遅延ピックアップは「営業時間外」とみなし翌日に繰り越す。
export function todayAtJST(timeHHMM: string = '08:00'): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeHHMM.trim());
  const hour = m ? Math.min(23, parseInt(m[1], 10)) : 8;
  const minute = m ? Math.min(59, parseInt(m[2], 10)) : 0;
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const target = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate(), hour, minute, 0));
  let scheduledUtc = new Date(target.getTime() - 9 * 60 * 60 * 1000);
  const CUTOFF_HOUR_JST = 18;
  if (scheduledUtc <= now && jstNow.getUTCHours() >= CUTOFF_HOUR_JST) {
    scheduledUtc = new Date(scheduledUtc.getTime() + 24 * 60 * 60 * 1000);
  }
  return scheduledUtc;
}

// 旧API互換
export function todayAt8AMJST(): Date {
  return todayAtJST('08:00');
}

export function dateKeyJST(date?: Date): string {
  const d = date || new Date();
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, '0')}-${String(jst.getUTCDate()).padStart(2, '0')}`;
}

export type Recipient = { email: string; name: string; company?: string; phone?: string };

export async function buildKizunaList(tenantId: string): Promise<Recipient[]> {
  const optOutSnap = await adminDb.collection('marketing_optouts').get();
  const blocked = new Set(optOutSnap.docs.map((d: any) => d.id));

  const map = new Map<string, Recipient & { _createdAt: number }>();

  // manual_contacts
  const manualSnap = await adminDb.collection('tenants').doc(tenantId).collection('manual_contacts').get();
  manualSnap.forEach((doc: any) => {
    const d = doc.data();
    if (d.email && !blocked.has(d.email)) {
      map.set(d.email, {
        email: d.email,
        name: d.name || '',
        company: d.company || '',
        phone: d.phone || '',
        _createdAt: 0,
      });
    }
  });

  // events → reservations
  const eventsSnap = await adminDb.collection('events').where('tenantId', '==', tenantId).get();
  for (const eventDoc of eventsSnap.docs) {
    const resSnap = await adminDb.collection('events').doc(eventDoc.id).collection('reservations').get();
    resSnap.forEach((rdoc: any) => {
      const data = rdoc.data();
      const email = data.email?.trim()?.toLowerCase();
      if (!email || blocked.has(email)) return;
      if (!data.name) return;
      const createdAt = data.createdAt?.toDate?.()?.getTime?.() || 0;
      const existing = map.get(email);
      if (!existing || createdAt > (existing._createdAt || 0)) {
        map.set(email, {
          email,
          name: data.name,
          company: data.company || data.department || existing?.company || '',
          phone: data.phone || existing?.phone || '',
          _createdAt: createdAt,
        });
      }
    });
  }

  return Array.from(map.values()).map(r => ({
    email: r.email,
    name: INVALID_NAMES.has((r.name || '').trim()) ? '' : r.name,
    company: r.company,
    phone: r.phone,
  }));
}

export async function upsertScheduledDxNewsletter(opts: {
  tenantId: string;
  subject: string;
  body: string;
  scheduledAt?: Date;
  scheduledTimeJST?: string; // "HH:MM"
  source?: string;
  notionPageId?: string;
}): Promise<{ scheduledId: string; recipientCount: number; scheduledAt: string; updated?: boolean; alreadySent?: boolean }> {
  const { tenantId, subject, body, source = 'dx-newsletter', notionPageId } = opts;
  const scheduledAt = opts.scheduledAt || todayAtJST(opts.scheduledTimeJST || '08:00');

  const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
  if (!tenantSnap.exists) throw new Error(`tenant not found: ${tenantId}`);
  const tenantData: any = tenantSnap.data();

  const recipients = await buildKizunaList(tenantId);
  if (recipients.length === 0) throw new Error('配信先が0件です');

  const dateKey = dateKeyJST(scheduledAt);
  const docId = `dx-newsletter-${dateKey}`;
  const docRef = adminDb.collection('tenants').doc(tenantId).collection('scheduled_emails').doc(docId);
  const existing = await docRef.get();

  const basePayload: any = {
    subject,
    body,
    recipients,
    recipientCount: recipients.length,
    senderName: tenantData?.name || '絆太郎',
    replyTo: tenantData?.contactEmail || tenantData?.ownerEmail || 'info@event-manager.app',
    themeColor: tenantData?.themeColor || '#3b82f6',
    scheduledAt: scheduledAt.toISOString(),
    status: 'scheduled',
    source,
    dateKey,
  };
  if (notionPageId) basePayload.notionPageId = notionPageId;

  if (existing.exists) {
    const data: any = existing.data();
    if (data?.status === 'sent') {
      return { scheduledId: docId, recipientCount: recipients.length, scheduledAt: scheduledAt.toISOString(), alreadySent: true };
    }
    await docRef.update({ ...basePayload, updatedAt: new Date().toISOString() });
    return { scheduledId: docId, recipientCount: recipients.length, scheduledAt: scheduledAt.toISOString(), updated: true };
  }

  await docRef.set({ ...basePayload, createdAt: new Date().toISOString() });
  return { scheduledId: docId, recipientCount: recipients.length, scheduledAt: scheduledAt.toISOString() };
}

// テナントの dx_newsletter integration 設定を取得
export type DxIntegration = {
  enabled: boolean;
  notionApiKey: string; // 暗号化されたまま
  notionDatabaseId: string;
  scheduledTime: string; // "HH:MM"
  status?: string;
  stripeSubscriptionItemId?: string;
};

export async function getDxIntegration(tenantId: string): Promise<DxIntegration | null> {
  const snap = await adminDb
    .collection('tenants').doc(tenantId)
    .collection('integrations').doc('dx_newsletter')
    .get();
  if (!snap.exists) return null;
  return snap.data() as DxIntegration;
}

export async function saveDxIntegration(tenantId: string, data: Partial<DxIntegration>): Promise<void> {
  await adminDb
    .collection('tenants').doc(tenantId)
    .collection('integrations').doc('dx_newsletter')
    .set({ ...data, updatedAt: new Date().toISOString() }, { merge: true });
}
