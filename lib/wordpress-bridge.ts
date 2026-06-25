// WordPress REST API ブリッジ
// Application Password による Basic Auth で /wp-json/wp/v2/posts に投稿する

type WpConfig = {
  siteUrl: string;     // 例: https://www.hana-hiro.com（末尾スラッシュなし）
  username: string;    // WPログインユーザー名
  appPassword: string; // 24文字のApplication Password（スペース込みOK）
};

function authHeader(config: WpConfig): string {
  // base64(username:app-password) （スペースは除去）
  const cleaned = config.appPassword.replace(/\s+/g, '');
  const token = Buffer.from(`${config.username}:${cleaned}`).toString('base64');
  return `Basic ${token}`;
}

function apiBase(siteUrl: string): string {
  // WordPressがサブディレクトリ /wp/ にあるケースもあるので、/wp-json で終わるパスを許容
  // env で /wp/wp-json などを直接渡してもいい
  if (siteUrl.endsWith('/wp-json')) return siteUrl;
  return `${siteUrl.replace(/\/+$/, '')}/wp-json`;
}

export type WpPostInput = {
  title: string;
  content: string; // HTML
  status?: 'publish' | 'draft' | 'pending' | 'private';
  categories?: number[]; // カテゴリID（事前にWPで作成）
  tags?: number[];
  excerpt?: string;
  meta?: Record<string, any>;
};

export type WpPostResult = {
  id: number;
  link: string;
  status: string;
  title: { rendered: string };
};

export async function createWpPost(config: WpConfig, post: WpPostInput): Promise<WpPostResult> {
  const url = `${apiBase(config.siteUrl)}/wp/v2/posts`;
  const body = {
    title: post.title,
    content: post.content,
    status: post.status || 'draft',
    ...(post.categories ? { categories: post.categories } : {}),
    ...(post.tags ? { tags: post.tags } : {}),
    ...(post.excerpt ? { excerpt: post.excerpt } : {}),
    ...(post.meta ? { meta: post.meta } : {}),
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader(config),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`WordPress post failed (${res.status}): ${errText}`);
  }
  return await res.json();
}

// カテゴリ名 → カテゴリID 変換（slugで一致検索 or 名前で部分一致）
export async function findCategoryIdBySlug(config: WpConfig, slug: string): Promise<number | null> {
  const url = `${apiBase(config.siteUrl)}/wp/v2/categories?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(config) } });
  if (!res.ok) return null;
  const data: any[] = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].id;
}

// slug → カテゴリ「名前」変換。XML-RPC は terms_names で名前指定するため、
// 既存カテゴリの正式名称を REST GET（書き込みと違い 403 されない）で引く。
// 該当なしの場合に勝手な名前で新規カテゴリを作らないよう null を返す。
export async function findCategoryNameBySlug(config: WpConfig, slug: string): Promise<string | null> {
  const url = `${apiBase(config.siteUrl)}/wp/v2/categories?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { headers: { Authorization: authHeader(config) } });
  if (!res.ok) return null;
  const data: any[] = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].name || null;
}

// 接続テスト：認証が通ってサイト情報が取れるか
export async function testWpConnection(config: WpConfig): Promise<{ ok: boolean; siteName?: string; error?: string }> {
  try {
    const url = apiBase(config.siteUrl);
    const res = await fetch(url, { headers: { Authorization: authHeader(config) } });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }
    const data: any = await res.json();
    return { ok: true, siteName: data.name || data.description || '(unknown)' };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
