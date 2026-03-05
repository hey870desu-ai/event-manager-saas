// 📂 app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

// Stripeの初期化
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // ★修正: email, name も受け取る（顧客作成のため）
    const { eventId, tenantId, price, title, origin, reservationId, email, name } = body;

    console.log("💳 Checkout Start:", { eventId, tenantId, price, reservationId, email });

    // 1. テナント（主催者）のStripe IDを取得
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    const connectedAccountId = tenantData?.stripeConnectId;
    const isEmergencyMode = (tenantId === "caredesignworks");

    if (!connectedAccountId && !isEmergencyMode) {
      console.error("❌ No Stripe Connect ID found for tenant:", tenantId);
      return NextResponse.json({ error: 'この主催者は決済設定が完了していません' }, { status: 400 });
    }

    const stripeOptions = isEmergencyMode ? undefined : { stripeAccount: connectedAccountId };

    // 2. プラットフォーム手数料を計算（例: 10%）
    const priceAmount = parseInt(price);
    const platformFee = Math.round(priceAmount * 0.1);
    const safeTenantId = tenantId || "demo";
    const safeEventId = eventId || "unknown"; 

    // ▼▼▼ 追加：Stripe顧客（Customer）を作成または取得 ▼▼▼
    // 銀行振込には「誰が振り込むか」を特定するためのCustomer IDが必須です！
    let customerId;
    
    // 同じメールアドレスの顧客がいないか検索
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      // 既にいればそのIDを使う
      customerId = existingCustomers.data[0].id;
    } else {
      // いなければ新規作成
      const newCustomer = await stripe.customers.create({
        email: email,
        name: name || "名無し",
        metadata: {
          tenantId: tenantId, 
        }
      });
      customerId = newCustomer.id;
    }
    // ▲▲▲ 追加ここまで ▲▲▲

    // 3. Stripeの決済セッションを作成（最後の方に注目だっぺ！）
    const session = await stripe.checkout.sessions.create({
      customer: customerId, 
      payment_method_types: ['card', 'konbini', 'customer_balance'],
      payment_method_options: {
        konbini: { expires_after_days: 3 },
        customer_balance: {
          funding_type: 'bank_transfer',
          bank_transfer: { type: 'jp_bank_transfer' },
        },
      },
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: { name: title },
          unit_amount: priceAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/t/${safeTenantId}/e/${safeEventId}/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/t/${safeTenantId}/e/${safeEventId}`,
      metadata: {
        eventId,
        tenantId,
        reservationId 
      }
    }, stripeOptions); // 👈 ここ！この「, stripeOptions」を忘れずに足してくんちぇ！

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("❌ Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}