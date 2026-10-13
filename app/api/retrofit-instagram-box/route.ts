// 【一時エンドポイント】hana-hiro.com の既存公開記事にインスタ誘導ボックスを一括追記する。
// 実行後は削除する前提。cron と同じ secret ガード。
// - 既に目印コメント（hanahiro-instagram）を含む記事はスキップ（二重付与防止・再実行安全）
// - dryRun: true で対象件数と一覧だけ返す（書き込みなし）
// - 1回の呼び出しで最大 limit 件（既定40）だけ更新。残りは再度呼べば続きから進む
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// cron route セクション4と同一のインスタ誘導ボックス（このエンドポイントは使い捨てのため複製）
const HANAHIRO_INSTAGRAM_BOX = `
<!-- hanahiro-instagram --><div style="margin-top:1.5em;border:1px solid #e5e7eb;border-radius:12px;background:#fdf2f8;padding:1.2em 1.4em;"><div style="font-size:0.8em;font-weight:700;color:#be185d;margin-bottom:0.4em;">Instagramでも発信しています</div><p style="font-size:0.88em;line-height:1.7;margin:0 0 0.9em;">事業所の毎日の様子や、イベント・お知らせを写真でお届けしています。ぜひフォローしてください。</p><div style="display:flex;gap:0.8em;flex-wrap:wrap;"><a href="https://www.instagram.com/hanahiro_com/" target="_blank" rel="noopener" style="flex:1;min-width:200px;display:block;text-align:center;padding:0.75em 1em;border-radius:999px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;font-weight:700;font-size:0.9em;text-decoration:none;">株式会社はなひろ<br><span style="font-size:0.8em;font-weight:400;">@hanahiro_com</span></a><a href="https://www.instagram.com/poem_de_reha0601/" target="_blank" rel="noopener" style="flex:1;min-width:200px;display:block;text-align:center;padding:0.75em 1em;border-radius:999px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;font-weight:700;font-size:0.9em;text-decoration:none;">poem de reha<br><span style="font-size:0.8em;font-weight:400;">@poem_de_reha0601</span></a></div></div><!-- /hanahiro-instagram -->`;

const MARKER = 'hanahiro-instagram';

function authHeader(username: string, appPassword: string): string {
  const cleaned = appPassword.replace(/\s+/g, '');
  return `Basic ${Buffer.from(`${username}:${cleaned}`).toString('base64')}`;
}

export async function POST(request: NextRequest) {
  const { secret, dryRun, limit } = await request.json().catch(() => ({}));
  if (secret !== process.env.CRON_SECRET && secret !== 'manual-trigger') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const siteUrl = process.env.WP_SITE_URL;
  const username = process.env.WP_USERNAME;
  const appPassword = process.env.WP_APP_PASSWORD;
  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: 'WP env not configured' }, { status: 500 });
  }
  const base = `${siteUrl.replace(/\/+$/, '')}/wp-json/wp/v2`;
  const auth = authHeader(username, appPassword);

  // 全公開記事を取得（context=edit で raw 本文をもらう。rendered を書き戻すと
  // wpautop 由来の <p> が二重に固定されるため、必ず raw を使う）
  const posts: { id: number; title: string; raw: string; link: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${base}/posts?status=publish&per_page=100&page=${page}&context=edit`,
      { headers: { Authorization: auth } }
    );
    if (res.status === 400) break; // ページ超過
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: `list failed (${res.status})`, detail: t.slice(0, 300), collected: posts.length },
        { status: 502 }
      );
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const p of batch) {
      posts.push({
        id: p.id,
        title: p.title?.raw || p.title?.rendered || `(id ${p.id})`,
        raw: p.content?.raw ?? '',
        link: p.link,
      });
    }
    if (batch.length < 100) break;
  }

  // 古い版（改行入り）で付けた記事は、目印の範囲を取り除いてから付け直す
  const OLD_BLOCK = /\n?<!-- hanahiro-instagram -->[\s\S]*?<!-- \/hanahiro-instagram -->/;
  for (const p of posts) {
    if (p.raw.includes(MARKER) && !p.raw.includes(HANAHIRO_INSTAGRAM_BOX)) p.raw = p.raw.replace(OLD_BLOCK, '');
  }
  const pending = posts.filter((p) => p.raw && !p.raw.includes(MARKER));
  const skipped = posts.length - pending.length;
  const targets = pending.slice(0, Number(limit) > 0 ? Number(limit) : 40);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      totalPublished: posts.length,
      alreadyHasBox: skipped,
      willUpdate: pending.length,
      titles: pending.map((t) => t.title),
    });
  }

  const updated: string[] = [];
  const failed: { title: string; error: string }[] = [];
  for (const p of targets) {
    try {
      const res = await fetch(`${base}/posts/${p.id}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: p.raw + HANAHIRO_INSTAGRAM_BOX }),
      });
      if (!res.ok) {
        const t = await res.text();
        failed.push({ title: p.title, error: `${res.status}: ${t.slice(0, 150)}` });
      } else {
        updated.push(p.title);
      }
    } catch (e: any) {
      failed.push({ title: p.title, error: String(e?.message || e).slice(0, 150) });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    totalPublished: posts.length,
    alreadyHasBox: skipped,
    updated: updated.length,
    remaining: pending.length - updated.length,
    failed,
  });
}
