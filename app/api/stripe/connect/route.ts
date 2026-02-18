import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId'); // どのテナントが連携するか

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
  }

  // 環境変数のチェック
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  if (!clientId) {
    console.error("❌ STRIPE_CONNECT_CLIENT_ID is missing");
    return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
  }

  // リダイレクト先（あなたの環境に合わせて自動調整）
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectUri = `${baseUrl}/api/stripe/callback`;

  // Stripeの連携画面URLを作成
  // stateにtenantIdを入れて、帰ってきた時に誰か分かるようにする
  const stripeUrl = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${redirectUri}&state=${tenantId}`;

  return NextResponse.redirect(stripeUrl);
}