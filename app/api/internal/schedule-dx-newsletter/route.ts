import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// このエンドポイントは「DXメルマガ自動配信ルーチン用」の専用入口。
// 配信対象テナントは env で固定する（multi-tenantのうち、この機能を使うテナントだけ）。
// 他テナントは env が未設定なら何も起きない＝完全に影響なし。
const TARGET_TENANT_ID = process.env.DX_NEWSLETTER_TENANT_ID || '';
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
  const scheduledAtOverride = payload?.scheduledAt; // ISO文字列（任意）

  if (!subject || !body) {
    return NextResponse.json({ error: 'subject と body は必須です' }, { status: 400 });
  }

  // 配信対象テナントは env で完全に固定。request body の tenantId は無視。
  // env が未設定ならこの機能はオフ（他テナントには絶対影響しない）。
  const tenantId = TARGET_TENANT_ID;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'DX_NEWSLETTER_TENANT_ID is not configured. This feature is disabled.' },
      { status: 503 }
    );
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

    // 1日1通ルール：JST日付をキーに deterministic docId
    // 同日の修正版が来たら上書き、既に送信済みなら拒否
    const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateKey = `${jstNow.getUTCFullYear()}-${String(jstNow.getUTCMonth() + 1).padStart(2, '0')}-${String(jstNow.getUTCDate()).padStart(2, '0')}`;
    const docId = `dx-newsletter-${dateKey}`;
    const docRef = adminDb.collection('tenants').doc(tenantId).collection('scheduled_emails').doc(docId);
    const existing = await docRef.get();

    const basePayload = {
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
      dateKey,
    };

    if (existing.exists) {
      const data: any = existing.data();
      if (data?.status === 'sent') {
        // 既に送信済み → 触らない
        return NextResponse.json({
          ok: true,
          skipped: true,
          reason: 'already sent today',
          scheduledId: docId,
        });
      }
      // 同日のscheduledが残っていたら上書き（修正版対応）
      await docRef.update({
        ...basePayload,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({
        ok: true,
        updated: true,
        scheduledId: docId,
        recipientCount: recipients.length,
        scheduledAt: scheduledAt.toISOString(),
      });
    }

    // 新規作成
    await docRef.set({
      ...basePayload,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      scheduledId: docId,
      recipientCount: recipients.length,
      scheduledAt: scheduledAt.toISOString(),
    });
  } catch (err: any) {
    console.error('schedule-dx-newsletter error:', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
