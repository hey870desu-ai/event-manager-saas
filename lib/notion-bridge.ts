// ============================================================
// Notion → 絆太郎 メルマガ配信ブリッジ
// ============================================================
// Notion DXレターDBの「ステータス=配信準備完了」を拾って
// scheduled_emails に投入する処理。
// Notion API は NOTION_API_KEY を使う（Notion Integrationのトークン）。

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const DX_DATA_SOURCE_ID = '38cb4cb4-e535-49a1-8d78-0bcf4fed4274';

// Notion DB「ステータス」プロパティのオプション名（絵文字含む）
const STATUS_READY = '🟠 配信準備完了';
const STATUS_SCHEDULED = '🔵 配信予約済み';
const STATUS_FAILED = '🔴 配信失敗';

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

// 「配信準備完了」のページを取得
export async function fetchReadyDxPages(token: string): Promise<NotionPage[]> {
  const res = await fetch(`${NOTION_API}/databases/${DX_DATA_SOURCE_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(token),
    body: JSON.stringify({
      filter: {
        property: 'ステータス',
        select: { equals: STATUS_READY },
      },
      page_size: 5, // 念のため上限
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Notion query failed (${res.status}): ${errText}`);
  }
  const data: any = await res.json();
  return data.results || [];
}

// ページの本文ブロックを取得（最初の100ブロックまで・通常はこれで十分）
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
      if (r.href) {
        return `${text}（${r.href}）`;
      }
      return text;
    })
    .join('');
}

// ブロック配列をプレーンテキストに
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

// ページのタイトルを抽出
function extractTitle(page: NotionPage): string {
  const titleProp: any = page.properties?.['タイトル'] || page.properties?.title;
  const rt = titleProp?.title || [];
  return richTextToPlain(rt).trim();
}

// ページ全体（タイトル+本文）を取得
export async function fetchPagePlainText(token: string, page: NotionPage): Promise<{ title: string; body: string }> {
  const title = extractTitle(page);
  const blocks = await fetchPageBlocks(token, page.id);
  const body = blocksToPlainText(blocks);
  return { title, body };
}

// ページのステータスを更新
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
    // 末尾にコメント追記（block追加）
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

export const StatusValues = { READY: STATUS_READY, SCHEDULED: STATUS_SCHEDULED, FAILED: STATUS_FAILED };
