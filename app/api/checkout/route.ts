import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { verifyCaller, assertTenant, authErrorResponse } from '@/lib/admin-auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    // 1. ログインした管理者が、自分のテナントの申し込みをする。料金（price）と決済の形はサーバーが決める
    //    （以前は画面から来た priceId・mode をそのまま使っていて、安い価格でスタンダードになれた）
    const caller = await verifyCaller(request);
    const body = await request.json();
    const tenantId = assertTenant(caller, body.tenantId);
    const planType = body.planType === 'standard' ? 'standard' : body.planType === 'spot' ? 'spot' : null;
    if (!planType) return NextResponse.json({ error: 'プランが指定されていません' }, { status: 400 });
    const priceId = planType === 'standard' ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SPOT;
    if (!priceId) return NextResponse.json({ error: '料金の設定がありません' }, { status: 500 });
    const mode: 'subscription' | 'payment' = planType === 'standard' ? 'subscription' : 'payment';
    const tenantSnap = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantSnap.exists) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
    const name = tenantSnap.data()?.name;
    const email = caller.email;


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
    const denied = authErrorResponse(error);
    if (denied) return denied;
    console.error("❌ Checkout Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}