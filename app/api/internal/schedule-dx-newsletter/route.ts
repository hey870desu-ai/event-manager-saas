import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const DEFAULT_TENANT_ID = 'caredesignworks';
const INVALID_NAMES = new Set(['仮登録中', '仮登録', '仮', '名前なし', 'ユーザー', 'ゲスト', 'test', 'テスト']);

// 「JSTで本日8:00」を返す（既に過ぎていたら翌日8:00）
function todayAt8AMJST(): Date {
  const now = new Date();
  const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const target = new Date(Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate(), 8, 0, 0));
  // target は「JSTの8:00」を表す数値 → そのままUTCで保持してDBに入れるとズレるので-9hする
  let scheduledUtc = new Date(target.getTime() - 9 * 60 * 60 * 1000);
  if (scheduledUtc <= now) {
    scheduledUtc = new Date(scheduledUtc.getTime() + 24 * 60 * 60 * 1000);
  }
  return scheduledUtc;
}

type Recipient = { email: string; name: string; company?: string; phone?: string };

async function buildKizunaList(tenantId: string): Promise<Recipient[]> {
  // 配信停止リスト
  const optOutSnap = await adminDb.collection('marketing_optouts').get();
  const blocked = new Set(optOutSnap.docs.map((d: any) => d.id));

  const map = new Map<string, Recipient & { _createdAt: number }>();

  // manual_contacts（手動登録）
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

  // 不正名クリーニング & _createdAt 除去
  return Array.from(map.values()).map(r => ({
    email: r.email,
    name: INVALID_NAMES.has((r.name || '').trim()) ? '' : r.name,
    company: r.company,
    phone: r.phone,
  }));
}

export async function POST(request: Request) {
  // 認証
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const expected = process.env.INTERNAL_API_KEY;
  if (!expected || !token || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const subject = (payload?.subject || '').trim();
  const body = (payload?.body || '').trim();
  const tenantId = (payload?.tenantId || DEFAULT_TENANT_ID).trim();
  const scheduledAtOverride = payload?.scheduledAt; // ISO文字列（任意）

  if (!subject || !body) {
    return NextResponse.json({ error: 'subject と body は必須です' }, { status: 400 });
  }

  try {
    // テナント取得（senderName 等）
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: `tenant not found: ${tenantId}` }, { status: 404 });
    }
    const tenantData: any = tenantSnap.data();

    // 配信先構築
    const recipients = await buildKizunaList(tenantId);
    if (recipients.length === 0) {
      return NextResponse.json({ error: '配信先が0件です' }, { status: 400 });
    }

    // 配信時刻
    const scheduledAt = scheduledAtOverride
      ? new Date(scheduledAtOverride)
      : todayAt8AMJST();

    // 重複防止：同じ tenant で同日同件名の scheduled が既にあれば作らない
    const dupSnap = await adminDb
      .collection('tenants').doc(tenantId).collection('scheduled_emails')
      .where('subject', '==', subject)
      .where('status', '==', 'scheduled')
      .get();
    if (!dupSnap.empty) {
      const existingId = dupSnap.docs[0].id;
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'same-subject scheduled already exists',
        scheduledId: existingId,
      });
    }

    // scheduled_emails 作成
    const docRef = await adminDb
      .collection('tenants').doc(tenantId).collection('scheduled_emails')
      .add({
        subject,
        body,
        recipients,
        recipientCount: recipients.length,
        senderName: tenantData?.name || '絆太郎',
        replyTo: tenantData?.contactEmail || tenantData?.ownerEmail || 'info@event-manager.app',
        themeColor: tenantData?.themeColor || '#3b82f6',
        scheduledAt: scheduledAt.toISOString(),
        status: 'scheduled',
        source: 'dx-newsletter-routine',
        createdAt: new Date().toISOString(),
      });

    return NextResponse.json({
      ok: true,
      scheduledId: docRef.id,
      recipientCount: recipients.length,
      scheduledAt: scheduledAt.toISOString(),
    });
  } catch (err: any) {
    console.error('schedule-dx-newsletter error:', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
