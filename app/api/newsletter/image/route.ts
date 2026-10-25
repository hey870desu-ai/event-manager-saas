import { verifyCaller, authErrorResponse } from '@/lib/admin-auth';

// メルマガの写真を、作る画面で切り抜き直すときの中継。
// Storage の写真をそのまま canvas に描くと、別のサイトの画像として扱われて JPEG にできないため、同じサイトから返す。
// 絆太郎の Storage の newsletters/・uploads/ の写真だけ
const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'event-manager-saas-ff82d.firebasestorage.app';

export async function GET(request: Request) {
  try {
    await verifyCaller(request);
    const u = new URL(request.url).searchParams.get('u') || '';
    let target: URL;
    try { target = new URL(u); } catch { return new Response('bad url', { status: 400 }); }
    const path = decodeURIComponent(target.pathname);
    const ok = target.protocol === 'https:'
      && target.hostname === 'firebasestorage.googleapis.com'
      && path.startsWith(`/v0/b/${BUCKET}/o/`)
      && /^(newsletters|uploads)\//.test(path.slice(`/v0/b/${BUCKET}/o/`.length));
    if (!ok) return new Response('not allowed', { status: 400 });
    const res = await fetch(target.toString());
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) return new Response('not found', { status: 404 });
    return new Response(await res.arrayBuffer(), { headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=600' } });
  } catch (e: any) {
    const denied = authErrorResponse(e);
    if (denied) return denied;
    return new Response('error', { status: 500 });
  }
}
