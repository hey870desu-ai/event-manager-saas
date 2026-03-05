// 📂 app/api/stripe/checkout-event/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const domain = "https://www.event-manager.app";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      tenantId, 
      eventId,
      reservationId, 
      eventTitle, 
      amount,       // セミナー作成画面で入力された金額（例：5000）
      email,        // 参加者のメールアドレス
      stripeAccountId // テナント側のStripeアカウントID
    } = body;


    // --- 🛠️ ここから差し替え開始だっぺ！ ---

    // 1. 緊急フラグ：自分のテナントIDの時だけ「親（塙さん）の口座」に直接入れるぞい！
    const isEmergencyMode = (tenantId === "caredesignworks"); // ★ここを自分のテナントIDに合わせてくんちぇ！

    // 通常時（子アカウント送金用）の手数料計算
    const applicationFeeAmount = Math.floor(Number(amount) * 0.02);

    // 2. 送金先設定の分岐（ここが「くるくる」を回避するキモだばい！）
    const paymentIntentData = isEmergencyMode 
      ? {} // 親口座に直接入れる場合は、送金先を指定しない！
      : {
          application_fee_amount: applicationFeeAmount,
          transfer_data: {
            destination: stripeAccountId,
          },
        };

    // 3. 決済セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'konbini'], // ついでにコンビニ決済も選べるようにしたぞい！
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
      mode: 'payment',
      customer_email: email,
      
      // ★ 分岐させた設定を流し込むっぺ！
      payment_intent_data: paymentIntentData,

      success_url: `${domain}/t/${tenantId}/e/${eventId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/t/${tenantId}/e/${eventId}`,
      
      metadata: {
        tenantId,
        eventId,
        reservationId,
        type: 'event_payment'
      },
    });


    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}