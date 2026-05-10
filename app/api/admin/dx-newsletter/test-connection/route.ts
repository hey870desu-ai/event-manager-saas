import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { testNotionConnection } from '@/lib/notion-bridge';
import { getDxIntegration } from '@/lib/dx-newsletter';
import { decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

// 接続テスト：渡されたtoken/databaseId、または保存済みの設定でNotion APIを叩いてみる
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await verifyAdminRequest(request);
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized', detail: e?.message }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let token: string | undefined = body.notionApiKey;
    let databaseId: string | undefined = body.notionDatabaseId;

    // bodyに無ければ保存済みの設定から
    if (!token || !databaseId) {
      const integration = await getDxIntegration(ctx.tenantId);
      if (!integration) {
        return NextResponse.json({ error: '保存された設定もリクエストも空です' }, { status: 400 });
      }
      if (!token) {
        try { token = decrypt(integration.notionApiKey); }
        catch (e: any) { return NextResponse.json({ error: `保存トークンの復号失敗：${e?.message}` }, { status: 500 }); }
      }
      if (!databaseId) databaseId = integration.notionDatabaseId;
    }

    if (!token || !databaseId) {
      return NextResponse.json({ error: 'token または databaseId が空' }, { status: 400 });
    }

    const result = await testNotionConnection(token, databaseId);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
    }
    return NextResponse.json({ ok: true, databaseTitle: result.title });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'test error' }, { status: 500 });
  }
}
