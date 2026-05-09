import { adminDb } from '@/lib/firebase-admin';

export const INVALID_NAMES = new Set(['仮登録中', '仮登録', '仮', '名前なし', 'ユーザー', 'ゲスト', 'test', 'テスト']);

// JSTで本日8:00を返す（過去ならば翌日8:00）
export function todayAt8AMJST(): Date {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const target = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate(), 8, 0, 0));
  let scheduledUtc = new Date(target.getTime() - 9 * 60 * 60 * 1000);
  if (scheduledUtc <= now) {
    scheduledUtc = new Date(scheduledUtc.getTime() + 24 * 60 * 60 * 1000);
  }
  return scheduledUtc;
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

// scheduled_emails ドキュメント作成（または同日があれば更新）
export async function upsertScheduledDxNewsletter(opts: {
  tenantId: string;
  subject: string;
  body: string;
  scheduledAt?: Date;
  source?: string;
  notionPageId?: string;
}): Promise<{ scheduledId: string; recipientCount: number; scheduledAt: string; updated?: boolean; alreadySent?: boolean }> {
  const { tenantId, subject, body, source = 'dx-newsletter', notionPageId } = opts;
  const scheduledAt = opts.scheduledAt || todayAt8AMJST();

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
