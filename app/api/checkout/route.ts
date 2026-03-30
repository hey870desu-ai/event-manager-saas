import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    // 1. 画面から送られてきた情報をしっかり受け取る
    const { priceId, email, name, tenantId, mode, planType } = await request.json();
    

    console.log(`💳 決済処理開始: mode=${mode}, tenantId=${tenantId}`);

    // 3. 顧客（Customer）を特定・または作成する
    // これをやることで銀行振込ができるようになるぞい！
    let customerId;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      // すでに登録済みならそのIDを使う
      customerId = existingCustomers.data[0].id;
    } else {
      // 初めての人なら新しく作る
      const newCustomer = await stripe.customers.create({
        email,
        name: name || "名無し",
        metadata: { tenantId } 
      });
      customerId = newCustomer.id;
    }

    // 4. Stripe決済セッションを作成する
    // ここで注文内容や目印（metadata）をガチッと固めるっぺ！
    const session = await stripe.checkout.sessions.create({
      customer: customerId, // 準備した顧客IDをセット！
      
      // カード・コンビニ・銀行振込を全部使えるようにしたっぺ
      payment_method_types: ['card' ],

      line_items: [{
        price: priceId, // 3,300円か5,500円のID
        quantity: 1,
      }],
      mode: mode, // subscription か payment
      
      // 成功した時とキャンセルした時の戻り先URL
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      
      // 💡 Webhookが「絆太郎の決済だ！」と判別するための目印だっぺ！
      metadata: {
        type: 'kizuna_taro_service',
        tenantId: tenantId,
        plan_mode: mode,
        plan: planType
      }
    });

    // 5. Stripeの決済画面URLをフロントエンドに返す
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("❌ Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}