// 📂 app/api/event-capacity/route.ts
// 公開申込フォームの満席判定用。reservations は個人情報のため未認証 read を許可せず、
// このAPI(adminSDK)が「件数だけ」を返す。氏名・メール等は一切返さない。
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    const snap = await adminDb
      .collection('events').doc(eventId)
      .collection('reservations').get();

    // キャンセル以外（payment_pending / confirmed / on_site）を有効席として数える
    const count = snap.docs.filter((d: any) => d.data().status !== 'cancelled').length;

    return NextResponse.json({ count });
  } catch (e: any) {
    console.error('event-capacity count error:', e);
    return NextResponse.json({ error: e.message || 'Server Error' }, { status: 500 });
  }
}
