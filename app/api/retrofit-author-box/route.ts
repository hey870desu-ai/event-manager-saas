// 【一時エンドポイント】hana-hiro.com の既存公開記事に監修者ボックスを一括追記する。
// 実行後は削除する前提。cron と同じ secret ガード。
// - 既に「この記事の監修」を含む記事はスキップ（二重付与防止・再実行安全）
// - dryRun: true で対象件数と一覧だけ返す（書き込みなし）
import { NextRequest, NextResponse } from 'next/server';
import { testWpXmlRpcConnection } from '@/lib/wordpress-xmlrpc';

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

// ===== XML-RPC（福ひろば用: REST Basic認証が通らないサイト） =====
// lib/wordpress-xmlrpc.ts と同じ方式の最小複製（このエンドポイントは使い捨て）
function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function xmlUnescape(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
async function callRpc(endpoint: string, method: string, params: string[]): Promise<string> {
  const body = `<?xml version="1.0"?>\n<methodCall>\n  <methodName>${method}</methodName>\n  <params>\n${params.join('\n')}\n  </params>\n</methodCall>`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`XML-RPC HTTP ${res.status}: ${text.slice(0, 200)}`);
  if (text.includes('<fault>')) {
    const f = text.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
    throw new Error(`XML-RPC fault: ${f?.[1] || text.slice(0, 200)}`);
  }
  return text;
}
const pStr = (v: string) => `    <param><value><string>${xmlEscape(v)}</string></value></param>`;
const pInt = (v: number) => `    <param><value><int>${v}</int></value></param>`;

async function retrofitViaXmlRpc(
  siteUrl: string, username: string, password: string, dryRun: boolean,
  batchOffset: number, batchLimit: number
) {
  const endpoint = `${siteUrl.replace(/\/+$/, '')}/wp/xmlrpc.php`;
  // 1) このバッチ分のIDだけを直接取得（全件一覧を毎回取るとmaxDurationを超えるため）
  const filter = `    <param><value><struct><member><name>number</name><value><int>${batchLimit}</int></value></member><member><name>offset</name><value><int>${batchOffset}</int></value></member><member><name>post_status</name><value><string>publish</string></value></member></struct></value></param>`;
  const idFields = `    <param><value><array><data><value><string>post_id</string></value></data></array></value></param>`;
  const listRes = await callRpc(endpoint, 'wp.getPosts', [pInt(1), pStr(username), pStr(password), filter, idFields]);
  const slice = Array.from(listRes.matchAll(/<name>post_id<\/name>\s*<value>\s*<string>(\d+)<\/string>/g)).map((m) => parseInt(m[1], 10));

  // 2) バッチ分だけ raw 本文を取り、マーカーが無ければ末尾にボックスを付けて更新
  const updated: number[] = [];
  const skipped: number[] = [];
  const failed: { id: number; error: string }[] = [];
  const wouldUpdate: number[] = [];
  for (const id of slice) {
    try {
      const fields = `    <param><value><array><data><value><string>post_content</string></value></data></array></value></param>`;
      const res = await callRpc(endpoint, 'wp.getPost', [pInt(1), pStr(username), pStr(password), pInt(id), fields]);
      const m = res.match(/<name>post_content<\/name>\s*<value>\s*<string>([\s\S]*?)<\/string>/);
      const raw = m ? xmlUnescape(m[1]) : '';
      if (!raw || raw.includes(MARKER)) { skipped.push(id); continue; }
      if (dryRun) { wouldUpdate.push(id); continue; }
      const struct = `    <param><value><struct><member><name>post_content</name><value><string>${xmlEscape(raw + HANAHIRO_AUTHOR_BOX)}</string></value></member></struct></value></param>`;
      await callRpc(endpoint, 'wp.editPost', [pInt(1), pStr(username), pStr(password), pInt(id), struct]);
      updated.push(id);
    } catch (e: any) {
      failed.push({ id, error: String(e?.message || e).slice(0, 150) });
    }
  }
  return {
    ok: failed.length === 0,
    dryRun,
    batchOffset,
    processed: slice.length,
    alreadyOrEmpty: skipped.length,
    ...(dryRun ? { willUpdate: wouldUpdate.length } : { updated: updated.length }),
    failed,
    hasMore: slice.length === batchLimit,
  };
}

export async function POST(request: NextRequest) {
  const { secret, dryRun, site, debug, offset, limit } = await request.json().catch(() => ({}));
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
  // 福ひろばは REST Basic認証が通らない（Application Password非対応・cronもXML-RPC投稿）
  // → XML-RPC経由で取得・更新する
  if (isFuku) {
    if (debug) {
      // cronが実際に使っている lib の実装そのままで接続・認証を確認
      const t = await testWpXmlRpcConnection({ siteUrl, username, appPassword });
      return NextResponse.json({ site: siteUrl, xmlrpcTest: t });
    }
    try {
      const result = await retrofitViaXmlRpc(siteUrl, username, appPassword, !!dryRun, Number(offset) || 0, Math.min(Number(limit) || 20, 30));
      return NextResponse.json(result);
    } catch (e: any) {
      const cause = e?.cause ? ` cause=${String(e.cause?.code || e.cause?.message || e.cause).slice(0, 120)}` : '';
      return NextResponse.json({ error: String(e?.message || e).slice(0, 300) + cause }, { status: 502 });
    }
  }

  const base = `${siteUrl.replace(/\/+$/, '')}/wp-json/wp/v2`;
  const auth = authHeader(username, appPassword);

  // debug: true → 権限まわりの診断だけ返して終了（書き込みなし）
  if (debug) {
    const out: Record<string, unknown> = { site: siteUrl };
    const me = await fetch(`${base}/users/me?context=edit`, { headers: { Authorization: auth } });
    out.me = { status: me.status, body: (await me.text()).slice(0, 250) };
    const pub = await fetch(`${base}/posts?per_page=1`, { headers: { Authorization: auth } });
    out.listPublic = { status: pub.status };
    let firstId: number | null = null;
    if (pub.ok) {
      const arr = await pub.json();
      firstId = Array.isArray(arr) && arr[0] ? arr[0].id : null;
    }
    const listEdit = await fetch(`${base}/posts?per_page=1&context=edit`, { headers: { Authorization: auth } });
    out.listEdit = { status: listEdit.status, body: (await listEdit.text()).slice(0, 200) };
    if (firstId) {
      const single = await fetch(`${base}/posts/${firstId}?context=edit`, { headers: { Authorization: auth } });
      out.singleEdit = { id: firstId, status: single.status, body: (await single.text()).slice(0, 200) };
    }
    return NextResponse.json(out);
  }

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
