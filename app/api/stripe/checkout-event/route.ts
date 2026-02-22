// 📂 app/api/stripe/checkout-event/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const domain = "https://event-manager.app";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      tenantId, 
      eventId, 
      eventTitle, 
      amount,       // セミナー作成画面で入力された金額（例：5000）
      email,        // 参加者のメールアドレス
      stripeAccountId // テナント側のStripeアカウントID
    } = body;

    // 手数料 2.0% の計算（あなたの利益）
    // Math.floor で端数を切り捨てて整数にします
    const applicationFeeAmount = Math.floor(Number(amount) * 0.02);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // ここに 'konbini' を足せばコンビニ決済も可能です
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: eventTitle,
            },
            unit_amount: Number(amount),
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // 単発決済
      customer_email: email,
      
      // ★ 手数料徴収の設定
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount, // あなたの取り分 (2%)
        transfer_data: {
          destination: stripeAccountId, // 残りをテナントへ送金
        },
      },

      // 決済成功時とキャンセル時の戻り先URL
      success_url: `${domain}/t/${tenantId}/e/${eventId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/t/${tenantId}/e/${eventId}`,
      
      metadata: {
        tenantId,
        eventId,
        type: 'event_payment'
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}