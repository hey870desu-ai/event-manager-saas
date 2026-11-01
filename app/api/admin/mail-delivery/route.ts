import { NextResponse } from 'next/server';
import { verifyCaller, assertTenant, authErrorResponse } from '@/lib/admin-auth';
import { DELIVERY_SOURCES, historyRef, pollDeliveries, type DeliverySource } from '@/lib/mail-delivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// 配信履歴の詳細の「いま確かめる」：その1件の配信が相手のメールサーバーに届いたかを Resend に問い合わせ、まとめを返す。
// ログインした、その配信のテナントの管理者だけ（運営者はどのテナントも）
//   body: { source: 'mail_queue' | 'scheduled_emails' | 'newsletter_archives', sourceId, tenantId（scheduled_emails のとき） }
export async function POST(request: Request) {
  try {
    const caller = await verifyCaller(request);
    const body = await request.json().catch(() => ({} as any));
    const source = body.source as DeliverySource;
    const sourceId = String(body.sourceId || '');
    if (!DELIVERY_SOURCES.includes(source) || !/^[A-Za-z0-9_-]{1,64}$/.test(sourceId)) {
      return NextResponse.json({ success: false, error: '配信が指定されていません' }, { status: 400 });
    }
    // 履歴の記録の持ち主を確かめる（絆リストの記録はテナントの下にあるので、渡されたテナントを確かめる）
    const pathTenant = source === 'scheduled_emails' ? assertTenant(caller, body.tenantId) : null;
    const snap = await historyRef(source, pathTenant, sourceId).get();
    if (!snap.exists) return NextResponse.json({ success: false, error: '配信の記録が見つかりません' }, { status: 404 });
    const data: any = snap.data();
    const tenantId = pathTenant ?? (data.tenantId ? assertTenant(caller, data.tenantId) : (caller.isSuper ? null : assertTenant(caller, '')));

    const r = await pollDeliveries({ tenantId, source, sourceId, maxGets: 30 });
    if (!r.summary) return NextResponse.json({ success: true, delivery: data.delivery ?? null });
    return NextResponse.json({ success: true, delivery: { ...r.summary, replyTo: data.delivery?.replyTo ?? data.replyTo ?? null } });
  } catch (error: any) {
    const denied = authErrorResponse(error);
    if (denied) return denied;
    console.error('mail-delivery error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'error' }, { status: 500 });
  }
}
