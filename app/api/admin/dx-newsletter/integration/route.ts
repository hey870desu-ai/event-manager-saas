import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { getDxIntegration, saveDxIntegration } from '@/lib/dx-newsletter';
import { encrypt, maskToken, decrypt } from '@/lib/encryption';

export const dynamic = 'force-dynamic';

// GET: 現在の設定を取得（API tokenはマスク）
export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await verifyAdminRequest(request);
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized', detail: e?.message }, { status: 401 });
  }

  try {
    const integration = await getDxIntegration(ctx.tenantId);
    if (!integration) {
      return NextResponse.json({
        configured: false,
        enabled: false,
        notionApiKeyMasked: '',
        notionDatabaseId: '',
        scheduledTime: '08:00',
        status: 'inactive',
      });
    }
    let masked = '';
    try {
      masked = maskToken(decrypt(integration.notionApiKey));
    } catch {
      masked = '(復号失敗)';
    }
    return NextResponse.json({
      configured: true,
      enabled: !!integration.enabled,
      notionApiKeyMasked: masked,
      notionDatabaseId: integration.notionDatabaseId || '',
      scheduledTime: integration.scheduledTime || '08:00',
      status: integration.status || 'active',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'load error' }, { status: 500 });
  }
}

// PUT: 設定保存（API tokenが渡されたら暗号化して保存、空なら既存維持）
export async function PUT(request: Request) {
  let ctx;
  try {
    ctx = await verifyAdminRequest(request);
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized', detail: e?.message }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled, notionApiKey, notionDatabaseId, scheduledTime } = body;

    const update: any = {};
    if (typeof enabled === 'boolean') update.enabled = enabled;
    if (notionApiKey && typeof notionApiKey === 'string' && notionApiKey.trim()) {
      update.notionApiKey = encrypt(notionApiKey.trim());
    }
    if (typeof notionDatabaseId === 'string') {
      update.notionDatabaseId = notionDatabaseId.trim();
    }
    if (typeof scheduledTime === 'string' && /^\d{1,2}:\d{2}$/.test(scheduledTime.trim())) {
      update.scheduledTime = scheduledTime.trim();
    }
    if (typeof body.status === 'string') update.status = body.status;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    update.enabledBy = ctx.email;
    if (update.enabled && !update.enabledAt) update.enabledAt = new Date().toISOString();

    await saveDxIntegration(ctx.tenantId, update);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'save error' }, { status: 500 });
  }
}
