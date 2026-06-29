// 📂 app/api/pre-survey-status/route.ts
// 事前アンケートの「回答済み」判定用。pre_feedbacks は個人情報のため未認証 read を許可せず、
// このAPI(adminSDK)が回答有無(true/false)だけを返す。回答内容は一切返さない。
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const rid = searchParams.get('rid');
    if (!eventId || !rid) {
      return NextResponse.json({ answered: false });
    }

    const col = adminDb.collection('events').doc(eventId).collection('pre_feedbacks');

    // 新方式: ドキュメントID = 予約ID
    const byId = await col.doc(rid).get();
    if (byId.exists) {
      return NextResponse.json({ answered: true });
    }
    // 旧方式: 自動IDで reservationId フィールドに保存されている分も拾う
    const q = await col.where('reservationId', '==', rid).limit(1).get();
    return NextResponse.json({ answered: !q.empty });
  } catch (e: any) {
    console.error('pre-survey-status error:', e);
    // 失敗時は未回答扱い（フォームを出す）
    return NextResponse.json({ answered: false });
  }
}
