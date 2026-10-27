// 📂 lib/blog.ts
// 📝 役割：ブログ（/blog）の記事を Notion「📝 絆太郎ブログ（event-manager.app）」から読む。
//   space-care.jp・kint-ai.jp と同じ作り（Notion の API を fetch で直接呼ぶ・ステータス「🟢 公開」だけを出す）。
//   記事は月水金の朝にルーチンが下書き（🟡）で書き、塙さんが読んで🟢にするとサイトに出る（10分ほどで）。
//   ⚠ 読むには、この DB に Notion の連携「絆太郎-DXメルマガ」（NOTION_API_KEY の持ち主）をつないでおくこと。
//     つないでいないと 404 になり、ブログは「記事は準備中です」と出る（ビルドは止まらない）。

const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
// Notion「👑 経営陣エリア」の下（2026-10-27 作成）。data source は collection://71cca0f5-33ed-4cc5-b20a-618a82ecf5db
const BLOG_DATABASE_ID = "19d4a8a5-ff3c-4d7c-b641-52fbe1dbba29";
const PUBLISHED = "🟢 公開";

export type PostMeta = {
  id: string;
  slug: string;
  title: string;
  date: string;      // 公開日（Notion の「日付」）
  updated: string;   // 最後に直した日時（Notion の last_edited_time）
  category: string;
  audience: string;
  excerpt: string;
  keywords: string;
};

export type RichText = {
  type?: string;
  plain_text?: string;
  href?: string | null;
  annotations?: { bold?: boolean; italic?: boolean; strikethrough?: boolean; underline?: boolean; code?: boolean; color?: string };
  text?: { content?: string; link?: { url?: string } | null };
};

export type NotionBlock = {
  id: string;
  type: string;
  has_children?: boolean;
  [key: string]: unknown;
};

export type PostWithBlocks = PostMeta & { blocks: NotionBlock[] };

type Json = Record<string, unknown>;

async function notionFetch(path: string, init?: RequestInit): Promise<Json | null> {
  const key = process.env.NOTION_API_KEY;
  if (!key) return null; // 鍵が無い（手元のビルドなど）ときは記事なしとして動く
  try {
    const res = await fetch(`${NOTION_API_BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Notion-Version": NOTION_VERSION, "Content-Type": "application/json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      console.error(`Notion API error ${res.status} on ${path}`);
      return null;
    }
    return (await res.json()) as Json;
  } catch (err) {
    console.error("Notion fetch failed:", err);
    return null;
  }
}

const plain = (arr: RichText[] | undefined) => (arr ?? []).map((t) => t.plain_text ?? "").join("").trim();
const getTitle = (p: unknown) => plain((p as { title?: RichText[] } | undefined)?.title);
const getText = (p: unknown) => plain((p as { rich_text?: RichText[] } | undefined)?.rich_text);
const getSelect = (p: unknown) => (p as { select?: { name?: string } | null } | undefined)?.select?.name ?? "";
const getDate = (p: unknown) => (p as { date?: { start?: string } | null } | undefined)?.date?.start ?? "";

const dashless = (id: string) => id.replace(/-/g, "");
function withDashes(id: string) {
  const c = dashless(id);
  if (c.length !== 32) return id;
  return `${c.slice(0, 8)}-${c.slice(8, 12)}-${c.slice(12, 16)}-${c.slice(16, 20)}-${c.slice(20)}`;
}

function toMeta(page: Json): PostMeta {
  const props = (page.properties ?? {}) as Json;
  const id = String(page.id ?? "");
  return {
    id,
    slug: getText(props["スラッグ"]) || dashless(id),
    title: getTitle(props["タイトル"]) || "無題",
    date: getDate(props["日付"]),
    updated: String(page.last_edited_time ?? ""),
    category: getSelect(props["カテゴリ"]),
    audience: getSelect(props["対象読者"]),
    excerpt: getText(props["抜粋"]),
    keywords: getText(props["SEOキーワード"]),
  };
}

// ⚠ Notion は1回に100件までしか返さない。続き（next_cursor）を辿らないと、古い記事が一覧とサイトマップから消える
//   （kint-ai.jp で 10/16 に起きた）
export async function getPublishedPosts(): Promise<PostMeta[]> {
  const posts: PostMeta[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    const data = await notionFetch(`/databases/${BLOG_DATABASE_ID}/query`, {
      method: "POST",
      body: JSON.stringify({
        filter: { property: "ステータス", select: { equals: PUBLISHED } },
        sorts: [{ property: "日付", direction: "descending" }],
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    });
    if (!data) break;
    posts.push(...((data.results as Json[]) ?? []).map(toMeta));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor as string;
  }
  return posts;
}

export async function getPostBySlug(slug: string): Promise<PostWithBlocks | null> {
  const data = await notionFetch(`/databases/${BLOG_DATABASE_ID}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: { and: [{ property: "ステータス", select: { equals: PUBLISHED } }, { property: "スラッグ", rich_text: { equals: slug } }] },
      page_size: 1,
    }),
  });
  let page = ((data?.results as Json[]) ?? [])[0];

  // スラッグが空の記事は、ページIDで開く。このブログの DB の「🟢 公開」の記事だけに絞る
  //   （space-care.jp では、絞っていなかったので下書きや別の DB のページまで開けた）
  if (!page && /^[0-9a-f-]{32,36}$/i.test(slug)) {
    const fetched = await notionFetch(`/pages/${withDashes(slug)}`);
    const parent = (fetched?.parent ?? {}) as { database_id?: string };
    const status = getSelect(((fetched?.properties ?? {}) as Json)["ステータス"]);
    if (fetched && fetched.object === "page" && withDashes(String(parent.database_id ?? "")) === BLOG_DATABASE_ID && status === PUBLISHED) {
      page = fetched;
    }
  }
  if (!page) return null;

  const meta = toMeta(page);
  return { ...meta, blocks: await getPageBlocks(meta.id) };
}

async function getPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 5; i++) {
    const q = new URLSearchParams({ page_size: "100" });
    if (cursor) q.set("start_cursor", cursor);
    const data = await notionFetch(`/blocks/${withDashes(pageId)}/children?${q.toString()}`);
    if (!data) break;
    blocks.push(...((data.results as NotionBlock[]) ?? []));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor as string;
  }
  return blocks;
}

// 日付の表示（2026年10月27日）
export function formatDate(date: string) {
  if (!date) return "";
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[1])}年${Number(m[2])}月${Number(m[3])}日` : date;
}
