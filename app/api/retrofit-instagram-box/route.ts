// 【一時エンドポイント】hana-hiro.com の既存公開記事の末尾に、インスタ誘導と福ひろばラーニングの記事案内を一括で付ける。
// 実行後は削除する前提。cron と同じ secret ガード。
// - 付ける中身は cron（app/api/cron/route.ts セクション4）と同じ。並びも新しい記事と同じ（監修→インスタ→福ひろばラーニング）
// - 古い形（改行入り）のインスタ枠は取り除いて付け直す。両方そろっている記事は飛ばす（二重に付かない・再実行しても安全）
// - dryRun: true で件数と一覧だけ返す（書き込みなし）
// - 1回の呼び出しで最大 limit 件（既定40）だけ更新。残りは再度呼べば続きから進む（新しい記事から順に）
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// cron route セクション4と同一のインスタ誘導ボックス（このエンドポイントは使い捨てのため複製）
const HANAHIRO_INSTAGRAM_BOX = `
<!-- hanahiro-instagram --><div style="margin-top:1.5em;border:1px solid #e5e7eb;border-radius:12px;background:#fdf2f8;padding:1.2em 1.4em;"><div style="font-size:0.8em;font-weight:700;color:#be185d;margin-bottom:0.4em;">Instagramでも発信しています</div><p style="font-size:0.88em;line-height:1.7;margin:0 0 0.9em;">事業所の毎日の様子や、イベント・お知らせを写真でお届けしています。ぜひフォローしてください。</p><div style="display:flex;gap:0.8em;flex-wrap:wrap;"><a href="https://www.instagram.com/hanahiro_com/" target="_blank" rel="noopener" style="flex:1;min-width:200px;display:block;text-align:center;padding:0.75em 1em;border-radius:999px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;font-weight:700;font-size:0.9em;text-decoration:none;">株式会社はなひろ<br><span style="font-size:0.8em;font-weight:400;">@hanahiro_com</span></a><a href="https://www.instagram.com/poem_de_reha0601/" target="_blank" rel="noopener" style="flex:1;min-width:200px;display:block;text-align:center;padding:0.75em 1em;border-radius:999px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;font-weight:700;font-size:0.9em;text-decoration:none;">poem de reha<br><span style="font-size:0.8em;font-weight:400;">@poem_de_reha0601</span></a></div></div><!-- /hanahiro-instagram -->`;

const IG_MARKER = 'hanahiro-instagram';
const LEARNING_MARKER = 'class="hanahiro-learning"';
// 古い版（改行入り）のインスタ枠。目印の範囲ごと取り除いてから付け直す
const OLD_IG_BLOCK = /\n?<!-- hanahiro-instagram -->[\s\S]*?<!-- \/hanahiro-instagram -->/;

// cron route セクション4の getLearningBox と同じ中身（記事が取れないときは書き込まずに止める点だけ違う）
async function buildLearningBox(): Promise<string | null> {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const r = await fetch('https://learning.hana-hiro.com/blog/popular.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!r.ok) return null;
  const list = await r.json();
  const items = (Array.isArray(list) ? list : [])
    .filter((p: any) => p && typeof p.slug === 'string' && typeof p.title === 'string' && p.slug && p.title)
    .slice(0, 3)
    .map((p: any) => `<p style="margin:0 0 0.35em;font-size:0.88em;line-height:1.6;"><a href="https://learning.hana-hiro.com/blog/${encodeURIComponent(p.slug)}" style="color:#0369a1;">${esc(p.title)}</a></p>`)
    .join('');
  if (!items) return null;
  return `
<div class="hanahiro-learning" style="margin-top:1.5em;border:1px solid #e5e7eb;border-radius:12px;background:#f0f9ff;padding:1.2em 1.4em;word-break:auto-phrase;"><div style="font-size:0.8em;font-weight:700;color:#0369a1;margin-bottom:0.4em;">福ひろばラーニングのブログ</div><p style="font-size:0.88em;line-height:1.7;margin:0 0 0.8em;">株式会社はなひろが運営する、介護・障がい福祉の事業所向けのeラーニングです。ブログでは、法定研修の回数や加算の研修要件、記録の残し方を解説しています。</p><p style="font-size:0.8em;color:#4b5563;margin:0 0 0.3em;">よく読まれている記事</p>${items}<p style="margin:0.6em 0 0;font-size:0.85em;"><a href="https://learning.hana-hiro.com/blog" style="color:#0369a1;text-decoration:none;">記事の一覧を見る →</a></p></div>`;
}

// 記事の末尾をどう変えるか（変えないなら raw のまま返す）
function nextContent(raw: string, learningBox: string): string {
  let next = raw;
  if (next.includes(IG_MARKER) && !next.includes(HANAHIRO_INSTAGRAM_BOX)) next = next.replace(OLD_IG_BLOCK, '');
  if (!next.includes(IG_MARKER)) next += HANAHIRO_INSTAGRAM_BOX;
  if (!next.includes(LEARNING_MARKER)) next += learningBox;
  return next;
}

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

  // 記事案内が作れないとき（learning の popular.json が取れない）は、何も書き込まずに止める
  let learningBox: string | null = null;
  try {
    learningBox = await buildLearningBox();
  } catch (e: any) {
    return NextResponse.json({ error: `popular.json failed: ${String(e?.message || e).slice(0, 150)}` }, { status: 502 });
  }
  if (!learningBox) {
    return NextResponse.json({ error: 'popular.json に記事がありません' }, { status: 502 });
  }

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

  const plans = posts
    .filter((p) => p.raw)
    .map((p) => ({ ...p, next: nextContent(p.raw, learningBox as string) }));
  const pending = plans.filter((p) => p.next !== p.raw);
  const targets = pending.slice(0, Number(limit) > 0 ? Number(limit) : 40);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      totalPublished: posts.length,
      emptyContent: posts.length - plans.length,
      oldInstagramBox: plans.filter((p) => p.raw.includes(IG_MARKER) && !p.raw.includes(HANAHIRO_INSTAGRAM_BOX)).length,
      noInstagramBox: plans.filter((p) => !p.raw.includes(IG_MARKER)).length,
      noLearningBox: plans.filter((p) => !p.raw.includes(LEARNING_MARKER)).length,
      willUpdate: pending.length,
      learningBox,
      first: pending.slice(0, 5).map((t) => ({ id: t.id, title: t.title, link: t.link })),
    });
  }

  const updated: { id: number; link: string }[] = [];
  const failed: { id: number; title: string; error: string }[] = [];
  for (const p of targets) {
    try {
      const res = await fetch(`${base}/posts/${p.id}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: p.next }),
      });
      if (!res.ok) {
        const t = await res.text();
        failed.push({ id: p.id, title: p.title, error: `${res.status}: ${t.slice(0, 150)}` });
      } else {
        updated.push({ id: p.id, link: p.link });
      }
    } catch (e: any) {
      failed.push({ id: p.id, title: p.title, error: String(e?.message || e).slice(0, 150) });
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    totalPublished: posts.length,
    updated: updated.length,
    updatedPosts: updated,
    remaining: pending.length - updated.length,
    failed,
  });
}
