import { NextResponse } from 'next/server';
import { pollDeliveries } from '@/lib/mail-delivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// 送った配信メールが相手のメールサーバーに届いたかを、Resend に問い合わせて履歴に書く（10分ごと・送る処理の5分あと）。
// Vercel は CRON_SECRET を「Authorization: Bearer …」で付けて呼ぶ。付いていない呼び出しは断る
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const r = await pollDeliveries({ maxGets: 40 });
    return NextResponse.json({ success: true, ...r });
  } catch (e: any) {
    console.error('❌ 配信の確かめに失敗:', e?.message || e);
    return NextResponse.json({ error: e?.message || 'error' }, { status: 500 });
  }
}
