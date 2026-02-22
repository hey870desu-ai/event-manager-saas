// 📂 app/api/stripe/checkout-event/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// ⭕ ドメインを確実に固定
const domain = "https://event-manager.app";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // ★ 修正：フロントから送られてくる可能性のある名前をすべてカバーするっぺ
    const tenantId = body.tenantId || body.safeTenantId;
    const eventId = body.eventId || body.safeEventId;
    const amount = body.amount || body.price;
    const eventTitle = body.eventTitle || body.title;
    const email = body.email;
    const stripeAccountId = body.stripeAccountId || body.connectedAccountId;

    if (!tenantId || !eventId) {
      console.error("❌ 必要なIDが足りねぇぞい:", { tenantId, eventId });
      throw new Error("ID missing");
    }

    // 手数料 2.0% の計算
    // $$ \text{applicationFeeAmount} = \lfloor \text{amount} \times 0.02 \rfloor $$
    const applicationFeeAmount = Math.floor(Number(amount) * 0.02);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: eventTitle || "イベント参加費" },
          unit_amount: Number(amount),
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: stripeAccountId },
      },

      // ⭕ ここに正しい変数を流し込むっぺ！
      success_url: `${domain}/t/${tenantId}/e/${eventId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domain}/t/${tenantId}/e/${eventId}`,
      
      metadata: { tenantId, eventId, type: 'event_payment' },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}