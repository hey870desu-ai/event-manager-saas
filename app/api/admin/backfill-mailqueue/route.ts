// 📂 app/api/admin/backfill-mailqueue/route.ts
// 一度だけ実行する保守用API（運営者のみ）。
// テナント分離対応より前に作られた mail_queue（配信履歴）は tenantId を持たないため、
// 新ルール下ではテナント管理者から読めなくなる。各docの eventId からイベントの tenantId を
// 引いて mail_queue に書き戻し、履歴を復活＆新ルール互換にする。冪等（既にtenantId有りはスキップ）。
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const SUPER_ADMIN_EMAIL = 'hey870desu@gmail.com';

export async function POST(request: Request) {
  try {
    // 🔐 運営者トークン必須
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    let decoded: any;
    try { decoded = await adminAuth.verifyIdToken(token); }
    catch { return NextResponse.json({ error: 'トークンが無効です' }, { status: 401 }); }
    const callerEmail: string = (decoded.email || '').trim().toLowerCase();
    if (callerEmail !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: '運営者のみ実行できます' }, { status: 403 });
    }

    const snap = await adminDb.collection('mail_queue').get();
    const eventTenantCache: Record<string, string> = {};
    let fixed = 0, skippedHasTenant = 0, skippedNoEvent = 0, skippedNoTenant = 0;

    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data.tenantId) { skippedHasTenant++; continue; }
      const eventId = data.eventId;
      if (!eventId) { skippedNoEvent++; continue; }

      let tid = eventTenantCache[eventId];
      if (tid === undefined) {
        const ev = await adminDb.collection('events').doc(eventId).get();
        tid = ev.exists ? ((ev.data() as any)?.tenantId || '') : '';
        eventTenantCache[eventId] = tid;
      }
      if (!tid) { skippedNoTenant++; continue; }

      await d.ref.update({ tenantId: tid });
      fixed++;
    }

    return NextResponse.json({
      success: true,
      total: snap.size,
      fixed,                 // tenantId を書き込んだ件数
      skippedHasTenant,      // 既に tenantId 有り
      skippedNoEvent,        // eventId が無く紐付け不能
      skippedNoTenant,       // イベントが見つからず tenantId 不明
    });
  } catch (error: any) {
    console.error('backfill-mailqueue error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
