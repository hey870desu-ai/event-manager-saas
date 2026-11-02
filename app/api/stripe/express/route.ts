// 📂 app/api/stripe/express/route.ts
// 主催者の「参加費の受け取り口座」（Stripe Connect の Express）の入口（2026-11-03）。ログインした、そのテナントの管理者だけ
//   action: 'onboard'   … 口座がまだ無ければ作り、Stripe の登録の画面（口座・本人確認）のリンクを返す
//           'status'    … Stripe に聞いて、tenants/{id}.cardPayment を書き直して返す
//           'dashboard' … 入金の記録を見る Stripe の画面（Express のダッシュボード）のリンクを返す
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';
import { verifyCaller, assertTenant, authErrorResponse } from '@/lib/admin-auth';
import { ensureExpressAccount, expressAccountId, refreshCardPayment } from '@/lib/stripe-express';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const caller = await verifyCaller(request);
    const body = await request.json().catch(() => ({} as any));
    const tenantId = assertTenant(caller, body.tenantId);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';

    if (body.action === 'status') {
      const cardPayment = await refreshCardPayment(stripe, tenantId);
      return NextResponse.json({ success: true, cardPayment });
    }

    if (body.action === 'dashboard') {
      const id = await expressAccountId(tenantId);
      const st = id ? await refreshCardPayment(stripe, tenantId) : null;
      if (!id || !st?.detailsSubmitted) return NextResponse.json({ error: '先に受け取り口座の登録を済ませてください' }, { status: 400 });
      const link = await stripe.accounts.createLoginLink(id);
      return NextResponse.json({ url: link.url });
    }

    if (body.action === 'onboard') {
      const t: any = (await adminDb.collection('tenants').doc(tenantId).get()).data() || {};
      const id = await ensureExpressAccount(stripe, tenantId, {
        email: caller.email,
        name: String(t.orgName || t.name || ''),
        createdBy: caller.email,
      });
      const link = await stripe.accountLinks.create({
        account: id,
        type: 'account_onboarding',
        refresh_url: `${baseUrl}/admin?cardpay=refresh`, // リンクの期限が切れたら、画面がもう一度ここを呼ぶ
        return_url: `${baseUrl}/admin?cardpay=return`,   // 戻ったら、画面が status で様子を確かめる
      });
      return NextResponse.json({ url: link.url });
    }

    return NextResponse.json({ error: '何をするかが分かりません' }, { status: 400 });
  } catch (e: any) {
    const denied = authErrorResponse(e);
    if (denied) return denied;
    console.error('❌ stripe express error:', e);
    return NextResponse.json({ error: e?.message || '受け取り口座の処理でエラーが起きました' }, { status: 500 });
  }
}
