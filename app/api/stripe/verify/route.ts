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

    // ⭕ TypeScriptに「中身は文字列だっぺ！」と教えることで波線を消すぞい
    const metadata = session.metadata || {};

    return NextResponse.json({ 
      success: true,
      paymentStatus: session.payment_status,
      reservationId: metadata.reservationId || "",
      eventId: metadata.eventId || "",   // ✅ これで赤い波線は消えるっぺ！
      tenantId: metadata.tenantId || ""   // ✅ これも消えるっぺ！
    });

  } catch (error: any) {
    console.error("❌ Verify Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}