import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin'; // ★あなたのファイルからインポート

// Stripe初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');      // 認証コード
  const tenantId = searchParams.get('state'); // 出発時に持たせたテナントID
  const error = searchParams.get('error');

  // エラーチェック
  if (error || !code || !tenantId) {
    console.error("Stripe Connect Error from callback:", error);
    return NextResponse.redirect(new URL('/admin/settings?error=stripe_connect_failed', request.url));
  }

  try {
    // 1. 認証コードを「StripeアカウントID」に交換する
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const stripeConnectId = response.stripe_user_id; // 例: acct_12345...

    // 2. Firestoreに保存する（adminDbを使用）
    // tenantsコレクションの該当ドキュメントを更新
    await adminDb.collection('tenants').doc(tenantId).update({
      stripeConnectId: stripeConnectId,
      stripeConnectEnabled: true,      // 連携済みフラグ
      stripeConnectUpdatedAt: new Date(),
    });

    console.log(`✅ Stripe Connected for tenant: ${tenantId}`);

    // 3. 成功したら管理画面の設定ページに戻す
    return NextResponse.redirect(new URL('/admin?success=stripe_connected', request.url));

  } catch (err: any) {
    console.error('❌ Stripe Connect Error:', err);
    return NextResponse.redirect(new URL('/admin?error=stripe_connect_error', request.url));
  }
}