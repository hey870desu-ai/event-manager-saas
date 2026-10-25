import { NextResponse } from 'next/server';
import { verifyCaller, assertTenant, authErrorResponse } from '@/lib/admin-auth';
import { buildAudience } from '@/lib/kizuna-list';

// メルマガの宛先（絆リスト）。ログインした管理者が自分のテナントの分だけ見られる
export async function GET(request: Request) {
  try {
    const caller = await verifyCaller(request);
    const tenantId = assertTenant(caller, new URL(request.url).searchParams.get('tenantId'));
    return NextResponse.json(await buildAudience(tenantId));
  } catch (e: any) {
    const denied = authErrorResponse(e);
    if (denied) return denied;
    console.error('kizuna-list error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
