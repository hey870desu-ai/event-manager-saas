// ============================================================
// Notion → 絆太郎 メルマガ配信ブリッジ
// ============================================================
// テナントごとに渡される Notion API token / database ID を使って
// 「ステータス=配信準備完了」のページを拾って scheduled_emails に投入する。

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const STATUS_READY = '🟠 配信準備完了';
const STATUS_SCHEDULED = '🔵 配信予約済み';
const STATUS_FAILED = '🔴 配信失敗';
const STATUS_SENT = '配信済み';

type NotionRichText = { plain_text?: string; href?: string | null };

type NotionPage = {
  id: string;
  properties: any;
};

function notionHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

// 指定ステータスのページを取得（汎用版）
export async function fetchPagesByStatus(token: string, databaseId: string, statusName: string, pageSize = 5): Promise<NotionPage[]> {
  const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({
      filter: {
        property: 'ステータス',
        select: { equals: statusName },
      },
      page_size: pageSize,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion query failed (${res.status}): ${errText}`);
  }
  const data: any = await res.json();
  return data.results || [];
}

// 旧API互換：DXメルマガ用
export async function fetchReadyDxPages(token: string, databaseId: string): Promise<NotionPage[]> {
  return fetchPagesByStatus(token, databaseId, STATUS_READY);
}

async function fetchPageBlocks(token: string, pageId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined = undefined;
  for (let i = 0; i < 5; i++) {
    const url: string = `${NOTION_API}/blocks/${pageId}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`;
    const res: Response = await fetch(url, { headers: notionHeaders(token) });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Notion blocks fetch failed (${res.status}): ${errText}`);
    }
    const data: any = await res.json();
    blocks.push(...(data.results || []));
    if (!data.has_more) break;
    cursor = data.next_cursor;
  }
  return blocks;
}

function richTextToPlain(rt: NotionRichText[] | undefined): string {
  if (!rt || rt.length === 0) return '';
  return rt
    .map((r) => {
      const text = r.plain_text || '';
      if (r.href) return `${text}（${r.href}）`;
      return text;
    })
    .join('');
}

// rich textをHTMLに変換（リンク・太字・斜体・コード等を維持）
function richTextToHtml(rt: NotionRichText[] | undefined): string {
  if (!rt || rt.length === 0) return '';
  return rt
    .map((r: any) => {
      let text = (r.plain_text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const ann = r.annotations || {};
      if (ann.code) text = `<code>${text}</code>`;
      if (ann.bold) text = `<strong>${text}</strong>`;
      if (ann.italic) text = `<em>${text}</em>`;
      if (ann.underline) text = `<u>${text}</u>`;
      if (ann.strikethrough) text = `<s>${text}</s>`;
      if (r.href) text = `<a href="${r.href}">${text}</a>`;
      return text;
    })
    .join('');
}

// Notionブロック配列をHTMLに変換（WordPress投稿用）
export function blocksToHtml(blocks: any[]): string {
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const block of blocks) {
    const type = block.type;
    const data = block[type] || {};
    const html = richTextToHtml(data.rich_text);

    if (type === 'bulleted_list_item') {
      if (listType !== 'ul') { closeList(); out.push('<ul>'); listType = 'ul'; }
      out.push(`<li>${html}</li>`);
      continue;
    }
    if (type === 'numbered_list_item') {
      if (listType !== 'ol') { closeList(); out.push('<ol>'); listType = 'ol'; }
      out.push(`<li>${html}</li>`);
      continue;
    }
    closeList();

    switch (type) {
      case 'paragraph':
        if (html.trim()) out.push(`<p>${html}</p>`);
        break;
      case 'heading_1':
        out.push(`<h1>${html}</h1>`);
        break;
      case 'heading_2':
        out.push(`<h2>${html}</h2>`);
        break;
      case 'heading_3':
        out.push(`<h3>${html}</h3>`);
        break;
      case 'quote':
        out.push(`<blockquote>${html}</blockquote>`);
        break;
      case 'divider':
        out.push('<hr/>');
        break;
      case 'callout':
        out.push(`<aside class="callout">${html}</aside>`);
        break;
      case 'code':
        out.push(`<pre><code>${html}</code></pre>`);
        break;
      case 'to_do':
        out.push(`<p>${data.checked ? '☑' : '☐'} ${html}</p>`);
        break;
      default:
        if (html.trim()) out.push(`<p>${html}</p>`);
        break;
    }
  }
  closeList();
  return out.join('\n');
}

// updatePageStatus がページ本文末尾に追記する「システムメモ」段落の接頭辞。
// 公開失敗→再公開のときに、過去のエラーメモが記事本文に混入するのを防ぐため除外する。
const SYSTEM_NOTE_PREFIXES = [
  '⚠ 投稿失敗', '⚠ 公開失敗', '⚠ 配信',
  '🌐 WordPress公開済み', '📝 WordPress下書き',
  '🌐 fukuhiroba.com', '📝 fukuhiroba.com',
  '🔁 既に', '✅ 配信予約',
];

function isSystemNoteBlock(block: any): boolean {
  if (block?.type !== 'paragraph') return false;
  const text = richTextToPlain(block.paragraph?.rich_text).trim();
  return SYSTEM_NOTE_PREFIXES.some((p) => text.startsWith(p));
}

// ページのHTML本文を取得（WordPress投稿用）。システムメモ段落は除外する。
export async function fetchPageHtml(token: string, page: NotionPage): Promise<{ title: string; html: string }> {
  const title = extractTitle(page);
  const blocks = (await fetchPageBlocks(token, page.id)).filter((b) => !isSystemNoteBlock(b));
  const html = blocksToHtml(blocks);
  return { title, html };
}

function blocksToPlainText(blocks: any[]): string {
  const lines: string[] = [];
  let numberedCounter = 0;

  for (const block of blocks) {
    const type = block.type;
    const data = block[type] || {};
    const text = richTextToPlain(data.rich_text);

    switch (type) {
      case 'paragraph':
        lines.push(text);
        numberedCounter = 0;
        break;
      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
        lines.push('');
        lines.push(text);
        numberedCounter = 0;
        break;
      case 'bulleted_list_item':
        lines.push(`- ${text}`);
        numberedCounter = 0;
        break;
      case 'numbered_list_item':
        numberedCounter++;
        lines.push(`${numberedCounter}. ${text}`);
        break;
      case 'quote':
        lines.push(`> ${text}`);
        numberedCounter = 0;
        break;
      case 'divider':
        lines.push('---');
        numberedCounter = 0;
        break;
      case 'callout':
        lines.push(text);
        numberedCounter = 0;
        break;
      case 'to_do':
        lines.push(`${data.checked ? '[x]' : '[ ]'} ${text}`);
        numberedCounter = 0;
        break;
      case 'code':
        lines.push(text);
        numberedCounter = 0;
        break;
      default:
        if (text) {
          lines.push(text);
          numberedCounter = 0;
        }
        break;
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function extractTitle(page: NotionPage): string {
  const titleProp: any = page.properties?.['タイトル'] || page.properties?.title;
  const rt = titleProp?.title || [];
  return richTextToPlain(rt).trim();
}

export async function fetchPagePlainText(token: string, page: NotionPage): Promise<{ title: string; body: string }> {
  const title = extractTitle(page);
  const blocks = await fetchPageBlocks(token, page.id);
  const body = blocksToPlainText(blocks);
  return { title, body };
}

// ステータス更新＋本文末尾にコメント追記
export async function updatePageStatus(token: string, pageId: string, status: string, note?: string): Promise<void> {
  await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(token),
    body: JSON.stringify({
      properties: {
        'ステータス': { select: { name: status } },
      },
    }),
  });

  if (note) {
    await fetch(`${NOTION_API}/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: notionHeaders(token),
      body: JSON.stringify({
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: note } }],
            },
          },
        ],
      }),
    });
  }
}

// データベース接続テスト（管理画面の「接続テスト」ボタン用）
export async function testNotionConnection(token: string, databaseId: string): Promise<{ ok: boolean; title?: string; error?: string }> {
  try {
    const res = await fetch(`${NOTION_API}/databases/${databaseId}`, {
      headers: notionHeaders(token),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }
    const data: any = await res.json();
    const title = (data.title || []).map((t: any) => t.plain_text || '').join('') || '(無題)';
    return { ok: true, title };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export const StatusValues = { READY: STATUS_READY, SCHEDULED: STATUS_SCHEDULED, FAILED: STATUS_FAILED, SENT: STATUS_SENT };
