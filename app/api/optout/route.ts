import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    // marketing_optouts コレクションにメールアドレスをIDとして保存
    // (すでに存在していても上書きOK)
    await adminDb.collection('marketing_optouts').doc(email).set({
      email: email,
      stoppedAt: new Date(),
      reason: "User requested via unsubscribe link"
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Optout Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}