import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

async function registerOptout(email: string, reason: string) {
  // marketing_optouts コレクションにメールアドレスをIDとして保存
  // (すでに存在していても上書きOK)
  await adminDb.collection('marketing_optouts').doc(email).set({
    email: email,
    stoppedAt: new Date(),
    reason: reason,
  });
}

// POST: (1) /unsubscribe ページからのJSON、(2) List-Unsubscribeヘッダー経由の
// ワンクリック解除（RFC 8058: クエリにemail、bodyは List-Unsubscribe=One-Click）の両対応
export async function POST(request: Request) {
  try {
    // ワンクリック解除はメールプロバイダーがクエリパラメータ付きURLへPOSTしてくる
    const url = new URL(request.url);
    let email = url.searchParams.get('email') || '';
    let reason = 'One-Click unsubscribe (List-Unsubscribe header)';

    if (!email) {
      const contentType = request.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const body = await request.json().catch(() => ({} as any));
        email = body?.email || '';
        reason = 'User requested via unsubscribe link';
      }
    }

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    await registerOptout(email, reason);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Optout Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET: ワンクリック非対応クライアントがヘッダーのURLを直接開いた場合は確認ページへ誘導
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || '';
  // url.origin はVercelプロキシ内部でhttpになりうるため、APP_URL固定でHTTPSを保証
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';
  const redirectUrl = new URL('/unsubscribe', appUrl);
  if (email) redirectUrl.searchParams.set('email', email);
  return NextResponse.redirect(redirectUrl, 302);
}
