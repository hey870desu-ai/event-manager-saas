// 📂 app/api/portal/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin'; // 💡 admin用の設定を使ってるか確認してな！

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const { tenantId } = await req.json();

    // 1. Firestoreから stripeCustomerId を持ってくるっぺ
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    const customerId = tenantDoc.data()?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({ error: 'Stripeの顧客情報が見つかりません' }, { status: 400 });
    }

    // 2. StripeのカスタマーポータルURLを発行するぞい！
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${new URL(req.url).origin}/dashboard`, // 終わったらダッシュボードに戻すっぺ
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}