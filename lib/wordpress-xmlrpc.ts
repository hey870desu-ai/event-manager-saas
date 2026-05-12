// WordPress XML-RPC ブリッジ
// REST API が制限されている WordPress 環境向けのフォールバック。
// 認証は Application Password または通常パスワード（XML-RPCはBasic Authではなく
// メソッド引数で username/password を渡す方式）。

type WpXmlRpcConfig = {
  siteUrl: string;     // 例: https://www.fukuhiroba.com（末尾スラなし）
  username: string;
  appPassword: string; // スペース込みでOK（XML-RPCはスペース有無どちらも受け入れる）
};

export type WpXmlRpcPostInput = {
  title: string;
  content: string; // HTML
  status?: 'publish' | 'draft' | 'pending' | 'private';
  categoryNames?: string[]; // カテゴリ名（slugでなく名前。XML-RPCはterms_namesで指定）
  tagNames?: string[];
  excerpt?: string;
};

export type WpXmlRpcPostResult = {
  id: number;
  link: string;
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function rpcEndpoint(siteUrl: string): string {
  // siteUrl が /wp-json 終わりなら、wp ディレクトリの xmlrpc.php に書き換え
  const base = siteUrl.replace(/\/wp-json\/?$/, '').replace(/\/+$/, '');
  // /wp/wp-admin/profile.php がある構成なら /wp/xmlrpc.php、なければ /xmlrpc.php
  // 福ひろばのように /wp/ サブディレクトリ運用かどうかは env でハンドルする方が確実なので、
  // ここでは siteUrl にすでに /wp が含まれていればそれを使い、なければ /wp/xmlrpc.php を試す
  // → 実運用では env で `WP_FUKUHIROBA_XMLRPC_URL` を直接指定するパターンも許容したい
  return `${base}/wp/xmlrpc.php`;
}

async function callXmlRpc(endpoint: string, methodName: string, params: string[]): Promise<string> {
  const xmlBody =
    `<?xml version="1.0"?>\n` +
    `<methodCall>\n` +
    `  <methodName>${methodName}</methodName>\n` +
    `  <params>\n${params.join('\n')}\n  </params>\n` +
    `</methodCall>`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
    body: xmlBody,
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`XML-RPC HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  // XML-RPC自体は HTTP 200 でエラーを返すことがある
  if (text.includes('<fault>')) {
    const codeMatch = text.match(/<name>faultCode<\/name>\s*<value>\s*<int>(-?\d+)<\/int>/);
    const stringMatch = text.match(/<name>faultString<\/name>\s*<value>\s*<string>([^<]*)<\/string>/);
    throw new Error(`XML-RPC fault ${codeMatch?.[1] || '?'}: ${stringMatch?.[1] || text.slice(0, 300)}`);
  }
  return text;
}

function buildStringParam(value: string): string {
  return `    <param><value><string>${xmlEscape(value)}</string></value></param>`;
}

function buildIntParam(value: number): string {
  return `    <param><value><int>${value}</int></value></param>`;
}

function buildStructParam(struct: Record<string, any>): string {
  const members = Object.entries(struct).map(([key, val]) => {
    let valueXml: string;
    if (typeof val === 'string') {
      valueXml = `<value><string>${xmlEscape(val)}</string></value>`;
    } else if (typeof val === 'number') {
      valueXml = `<value><int>${val}</int></value>`;
    } else if (typeof val === 'boolean') {
      valueXml = `<value><boolean>${val ? '1' : '0'}</boolean></value>`;
    } else if (Array.isArray(val)) {
      const items = val.map(v => {
        if (typeof v === 'string') return `<value><string>${xmlEscape(v)}</string></value>`;
        if (typeof v === 'number') return `<value><int>${v}</int></value>`;
        return `<value><string>${xmlEscape(String(v))}</string></value>`;
      }).join('');
      valueXml = `<value><array><data>${items}</data></array></value>`;
    } else if (typeof val === 'object' && val !== null) {
      // ネストstruct（terms_namesなど）
      const nestedMembers = Object.entries(val).map(([k, v]) => {
        if (Array.isArray(v)) {
          const items = v.map(item =>
            typeof item === 'string'
              ? `<value><string>${xmlEscape(item)}</string></value>`
              : `<value><string>${xmlEscape(String(item))}</string></value>`
          ).join('');
          return `<member><name>${xmlEscape(k)}</name><value><array><data>${items}</data></array></value></member>`;
        }
        return `<member><name>${xmlEscape(k)}</name><value><string>${xmlEscape(String(v))}</string></value></member>`;
      }).join('');
      valueXml = `<value><struct>${nestedMembers}</struct></value>`;
    } else {
      valueXml = `<value><string>${xmlEscape(String(val))}</string></value>`;
    }
    return `<member><name>${xmlEscape(key)}</name>${valueXml}</member>`;
  }).join('');
  return `    <param><value><struct>${members}</struct></value></param>`;
}

export async function createWpPostXmlRpc(
  config: WpXmlRpcConfig,
  post: WpXmlRpcPostInput
): Promise<WpXmlRpcPostResult> {
  const endpoint = rpcEndpoint(config.siteUrl);
  const struct: Record<string, any> = {
    post_type: 'post',
    post_status: post.status || 'draft',
    post_title: post.title,
    post_content: post.content,
  };
  if (post.excerpt) struct.post_excerpt = post.excerpt;

  // terms_names で カテゴリ名/タグ名を直接指定（categoryNames は WPカテゴリの「名前」フィールド）
  const termsNames: Record<string, string[]> = {};
  if (post.categoryNames && post.categoryNames.length > 0) {
    termsNames.category = post.categoryNames;
  }
  if (post.tagNames && post.tagNames.length > 0) {
    termsNames.post_tag = post.tagNames;
  }
  if (Object.keys(termsNames).length > 0) {
    struct.terms_names = termsNames;
  }

  const params = [
    buildIntParam(1), // blog_id（マルチサイトでなければ常に1）
    buildStringParam(config.username),
    buildStringParam(config.appPassword),
    buildStructParam(struct),
  ];
  const response = await callXmlRpc(endpoint, 'wp.newPost', params);
  const idMatch = response.match(/<value>\s*<string>(\d+)<\/string>\s*<\/value>/);
  if (!idMatch) {
    throw new Error(`XML-RPC newPost: post_id を解析できませんでした: ${response.slice(0, 300)}`);
  }
  const id = parseInt(idMatch[1], 10);
  // 公開URLを取得（wp.getPostでlinkを引く）
  const link = await fetchPostLinkXmlRpc(config, id).catch(() => `${config.siteUrl}/?p=${id}`);
  return { id, link };
}

async function fetchPostLinkXmlRpc(config: WpXmlRpcConfig, postId: number): Promise<string> {
  const endpoint = rpcEndpoint(config.siteUrl);
  const params = [
    buildIntParam(1),
    buildStringParam(config.username),
    buildStringParam(config.appPassword),
    buildIntParam(postId),
    // fields指定（linkだけ取れば軽い）
    `    <param><value><array><data><value><string>link</string></value></data></array></value></param>`,
  ];
  const response = await callXmlRpc(endpoint, 'wp.getPost', params);
  const linkMatch = response.match(/<name>link<\/name>\s*<value>\s*<string>([^<]+)<\/string>/);
  if (linkMatch) return linkMatch[1];
  return `${config.siteUrl}/?p=${postId}`;
}

export async function testWpXmlRpcConnection(config: WpXmlRpcConfig): Promise<{ ok: boolean; user?: string; error?: string }> {
  try {
    const endpoint = rpcEndpoint(config.siteUrl);
    const params = [
      buildIntParam(1),
      buildStringParam(config.username),
      buildStringParam(config.appPassword),
    ];
    const response = await callXmlRpc(endpoint, 'wp.getProfile', params);
    const nicenameMatch = response.match(/<name>display_name<\/name>\s*<value>\s*<string>([^<]+)<\/string>/);
    return { ok: true, user: nicenameMatch?.[1] };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}
