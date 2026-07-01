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

    // 全イベントを読み込み、タイトル→イベント のマップを作る（タイトル一致での復旧用）
    const evSnap = await adminDb.collection('events').get();
    const byTitle: Record<string, Array<{ id: string; tenantId: string }>> = {};
    const eventTenantCache: Record<string, string> = {};
    evSnap.forEach((e: any) => {
      const data = e.data() as any;
      eventTenantCache[e.id] = data.tenantId || '';
      const t = (data.title || '').trim();
      if (!t) return;
      (byTitle[t] = byTitle[t] || []).push({ id: e.id, tenantId: data.tenantId || '' });
    });

    const snap = await adminDb.collection('mail_queue').get();
    let fixed = 0, skippedHasBoth = 0, skippedUnresolved = 0;

    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data.tenantId && data.eventId) { skippedHasBoth++; continue; }

      const update: Record<string, any> = {};

      // 1) eventId があれば、そこから tenantId を引く
      if (data.eventId && !data.tenantId) {
        const tid = eventTenantCache[data.eventId];
        if (tid) update.tenantId = tid;
      }

      // 2) eventId が無ければ eventTitle でイベントを一意特定し eventId/tenantId を補完
      if (!data.eventId) {
        const title = (data.eventTitle || '').trim();
        const matches = title ? (byTitle[title] || []) : [];
        if (matches.length === 1 && matches[0].tenantId) {
          update.eventId = matches[0].id;
          if (!data.tenantId) update.tenantId = matches[0].tenantId;
        }
      }

      if (Object.keys(update).length === 0) { skippedUnresolved++; continue; }
      await d.ref.update(update);
      fixed++;
    }

    return NextResponse.json({
      success: true,
      total: snap.size,
      fixed,                 // tenantId/eventId を補完した件数
      skippedHasBoth,        // 既に両方あり
      skippedUnresolved,     // eventId も eventTitle一致も無く紐付け不能
    });
  } catch (error: any) {
    console.error('backfill-mailqueue error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
