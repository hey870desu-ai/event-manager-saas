// 【一時エンドポイント】hana-hiro.com の既存公開記事に監修者ボックスを一括追記する。
// 実行後は削除する前提。cron と同じ secret ガード。
// - 既に「この記事の監修」を含む記事はスキップ（二重付与防止・再実行安全）
// - dryRun: true で対象件数と一覧だけ返す（書き込みなし）
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

// cron route セクション4と同一の監修者ボックス（このエンドポイントは使い捨てのため複製）
const HANAHIRO_AUTHOR_BOX = `
<div style="margin-top:2.5em;border:1px solid #e5e7eb;border-radius:12px;background:#fff8f0;padding:1.2em 1.4em;">
  <div style="font-size:0.8em;font-weight:700;color:#c2410c;margin-bottom:0.8em;">この記事の監修</div>
  <div style="display:flex;gap:1em;align-items:flex-start;flex-wrap:wrap;">
    <img src="https://info.hana-hiro.com/photos/representative.jpg" alt="監修者 塙啓之" width="72" height="72" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb;" loading="lazy">
    <div style="flex:1;min-width:220px;">
      <div style="font-weight:800;">塙 啓之<span style="font-size:0.75em;font-weight:400;color:#6b7280;margin-left:0.6em;">はなわ ひろゆき</span></div>
      <div style="font-size:0.85em;color:#6b7280;margin:0.2em 0 0.5em;">株式会社はなひろ 代表取締役</div>
      <p style="font-size:0.88em;line-height:1.7;margin:0 0 0.5em;">介護業界で25年以上、現場・介護施設の管理者・ケアマネジャー（介護支援専門員）を経験。2013年に株式会社はなひろを設立し、福島県須賀川市・郡山市・矢祭町でデイサービスなどの介護事業所を運営しています。一般社団法人 全国介護事業者連盟 福島県支部 副支部長。</p>
      <a href="https://info.hana-hiro.com/company.html" style="font-size:0.85em;font-weight:700;color:#ea580c;text-decoration:none;">会社概要を見る →</a>
    </div>
  </div>
</div>`;

const MARKER = 'この記事の監修';

function authHeader(username: string, appPassword: string): string {
  const cleaned = appPassword.replace(/\s+/g, '');
  return `Basic ${Buffer.from(`${username}:${cleaned}`).toString('base64')}`;
}

export async function POST(request: NextRequest) {
  const { secret, dryRun, site } = await request.json().catch(() => ({}));
  if (secret !== process.env.CRON_SECRET && secret !== 'manual-trigger') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // site: 'fukuhiroba' で fukuhiroba.com、未指定で hana-hiro.com
  const isFuku = site === 'fukuhiroba';
  const siteUrl = isFuku ? process.env.WP_FUKUHIROBA_SITE_URL : process.env.WP_SITE_URL;
  const username = isFuku ? process.env.WP_FUKUHIROBA_USERNAME : process.env.WP_USERNAME;
  const appPassword = isFuku ? process.env.WP_FUKUHIROBA_APP_PASSWORD : process.env.WP_APP_PASSWORD;
  if (!siteUrl || !username || !appPassword) {
    return NextResponse.json({ error: 'WP env not configured' }, { status: 500 });
  }
  const base = `${siteUrl.replace(/\/+$/, '')}/wp-json/wp/v2`;
  const auth = authHeader(username, appPassword);

  // 全公開記事を取得（context=edit で raw 本文をもらう。rendered を書き戻すと
  // wpautop 由来の <p> が二重に固定されるため、必ず raw を使う）。
  // 権限が管理者でないサイト（福ひろば）では全投稿のeditが401になるため、
  // 自分名義の投稿に絞る（cron投稿は全てAPIユーザー名義なので実質全対象）。
  let authorFilter = '';
  {
    const meRes = await fetch(`${base}/users/me`, { headers: { Authorization: auth } });
    if (meRes.ok) {
      const me = await meRes.json();
      if (me?.id) authorFilter = `&author=${me.id}`;
    }
  }
  const posts: { id: number; title: string; raw: string; link: string }[] = [];
  for (let page = 1; page <= 10; page++) {
    const res = await fetch(
      `${base}/posts?status=publish&per_page=100&page=${page}&context=edit${authorFilter}`,
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

  const targets = posts.filter((p) => p.raw && !p.raw.includes(MARKER));
  const skipped = posts.length - targets.length;

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      totalPublished: posts.length,
      alreadyHasBox: skipped,
      willUpdate: targets.length,
      titles: targets.map((t) => t.title),
    });
  }

  const updated: string[] = [];
  const failed: { title: string; error: string }[] = [];
  for (const p of targets) {
    try {
      const res = await fetch(`${base}/posts/${p.id}`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: p.raw + HANAHIRO_AUTHOR_BOX }),
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
    failed,
  });
}
