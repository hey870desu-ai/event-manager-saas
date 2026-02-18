import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Stripeの準備（秘密鍵を使う）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: '2023-10-16' as any, // これで波線が消えます！
});

export async function POST(request: Request) {
  try {
    // 画面から送られてくるデータを受け取る
    const { tenantId, userId, email } = await request.json();

    if (!tenantId || !email) {
      return NextResponse.json({ error: 'Tenant ID and Email are required' }, { status: 400 });
    }

    // Stripeの「支払い画面（セッション）」を作る
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          // 環境変数に入れたID（Proプラン）を使う
          price: process.env.STRIPE_PRICE_ID_PRO,
          quantity: 1,
        },
      ],
      mode: 'subscription', // 毎月課金モード
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`, // 成功したらここに戻る
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?canceled=true`,  // キャンセルしたらここに戻る
      customer_email: email, // メールアドレスを最初から入れておく
      
      // ★超重要：あとで「誰が払ったか」を確認するためのメモ
      metadata: {
        tenantId: tenantId,
        userId: userId,
        plan: 'pro',
      },
    });

    // 作成されたURL（Stripeの画面）を返す
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}