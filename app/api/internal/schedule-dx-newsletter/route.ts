import { NextResponse } from 'next/server';
import { upsertScheduledDxNewsletter } from '@/lib/dx-newsletter';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// このエンドポイントは「DXメルマガ自動配信ルーチン用」の専用入口。
// 配信対象テナントは env で固定する（multi-tenantのうち、この機能を使うテナントだけ）。
// 他テナントは env が未設定なら何も起きない＝完全に影響なし。
const TARGET_TENANT_ID = process.env.DX_NEWSLETTER_TENANT_ID || '';

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
  const scheduledAtOverride = payload?.scheduledAt;

  if (!subject || !body) {
    return NextResponse.json({ error: 'subject と body は必須です' }, { status: 400 });
  }

  const tenantId = TARGET_TENANT_ID;
  if (!tenantId) {
    return NextResponse.json(
      { error: 'DX_NEWSLETTER_TENANT_ID is not configured. This feature is disabled.' },
      { status: 503 }
    );
  }

  try {
    const result = await upsertScheduledDxNewsletter({
      tenantId,
      subject,
      body,
      scheduledAt: scheduledAtOverride ? new Date(scheduledAtOverride) : undefined,
      source: 'dx-newsletter-routine',
    });

    if (result.alreadySent) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already sent today', scheduledId: result.scheduledId });
    }
    return NextResponse.json({
      ok: true,
      ...(result.updated ? { updated: true } : {}),
      scheduledId: result.scheduledId,
      recipientCount: result.recipientCount,
      scheduledAt: result.scheduledAt,
    });
  } catch (err: any) {
    console.error('schedule-dx-newsletter error:', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
