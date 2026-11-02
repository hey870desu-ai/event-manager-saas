// 📂 app/sample-event/route.ts
// トップページの「申込ページの見本」（2026-11-03）：参加者が申し込んで払うまでの流れを、トップページから見られるようにする
//   （Stripe のコンビニ決済の審査で「トップページから決済までの流れ」を求められた）。
//   塙さんの会社（caredesignworks）の公開中のイベントのうち、名前に「見本」が入った、日付のいちばん新しいものへ移る。無ければ使い方のページ
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const SAMPLE_TENANT = 'caredesignworks';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  try {
    const snap = await adminDb.collection('events').where('tenantId', '==', SAMPLE_TENANT).get();
    const sample = snap.docs
      .map((d: any) => ({ id: d.id, ...(d.data() as any) }))
      .filter((e: any) => e.status === 'published' && String(e.title || '').includes('見本'))
      .sort((a: any, b: any) => String(b.date || '').localeCompare(String(a.date || '')))[0];
    if (sample) return NextResponse.redirect(`${origin}/t/${SAMPLE_TENANT}/e/${sample.id}`, 307);
  } catch (e) {
    console.error('見本のイベントを探せませんでした:', e);
  }
  return NextResponse.redirect(`${origin}/guide`, 307);
}
