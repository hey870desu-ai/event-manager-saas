import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { syncMonthlySeats } from '@/lib/stripe-monthly';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// カードの月額（毎月1日に決済）の人数合わせ。Vercel Cron が毎時に呼ぶ（CRON_SECRET を「Authorization: Bearer …」で付ける）
// 管理の人が増えた・減ったら、Stripe の「追加の管理者」の数を合わせる。日割りなし＝次の1日の決済から
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' as any });
    const results = await syncMonthlySeats(stripe);
    console.log('💳 stripe-seats:', JSON.stringify(results));
    return NextResponse.json({ results });
  } catch (e: any) {
    console.error('🔥 stripe-seats error:', e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
