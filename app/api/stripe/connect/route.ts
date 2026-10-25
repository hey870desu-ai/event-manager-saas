import { NextResponse } from 'next/server';
import { verifyCaller, assertTenant, authErrorResponse } from '@/lib/admin-auth';
import { signConnectState } from '@/lib/stripe-connect-state';

// Stripe の連携の入口。ログインした管理者が自分のテナントの連携だけを始められる。
// 戻り（/api/stripe/callback）でテナントを取り違えないよう、state にテナントIDと期限と署名を入れる
// （以前は GET ?tenantId= で state にテナントIDをそのまま入れていたので、他人のテナントに自分の Stripe をつなげた）
export async function POST(request: Request) {
  try {
    const caller = await verifyCaller(request);
    const tenantId = assertTenant(caller, (await request.json()).tenantId);

    // 環境変数のチェック
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
    if (!clientId) {
      console.error("❌ STRIPE_CONNECT_CLIENT_ID is missing");
      return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
    }

    // リダイレクト先（あなたの環境に合わせて自動調整）
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/stripe/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: 'read_write',
      redirect_uri: redirectUri,
      state: signConnectState(tenantId),
    });
    return NextResponse.json({ url: `https://connect.stripe.com/oauth/authorize?${params.toString()}` });
  } catch (e: any) {
    const denied = authErrorResponse(e);
    if (denied) return denied;
    console.error('❌ Stripe Connect start error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
