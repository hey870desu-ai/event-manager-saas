// 📂 app/api/stripe/verify/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // 余計な処理（メールやDB更新）は全部カットだっぺ！
    // 画面側には「支払い状況」だけを返してあげるぞい。
    return NextResponse.json({ 
      success: true,
      paymentStatus: session.payment_status, // 'paid' かどうか
      reservationId: session.metadata?.reservationId
    });

  } catch (error: any) {
    console.error("❌ Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}