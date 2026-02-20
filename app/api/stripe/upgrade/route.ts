// 📂 app/api/stripe/upgrade/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const { email, tenantId } = await request.json();

    // 💡 プラットフォーム（あなた）のサブスク決済を作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_PRO, // Vercelに登録済みのIDを使用
          quantity: 1,
        },
      ],
      mode: 'subscription',
      // 成功時とキャンセル時の戻り先（環境に合わせて調整してください）
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
      customer_email: email,
      metadata: {
  tenantId: tenantId,
  plan: 'standard', // 💡 ここが standard なら、上の Webhook で standard に更新される
},
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Upgrade Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}