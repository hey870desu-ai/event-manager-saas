// メルマガ（写真入りのメール）の HTML を組み立てる。作る画面の見本と、送るメール（今すぐ・予約）で同じものを使う。
//   ・写真の切り抜き・明るさ・写真に重ねる見出しは、画面の側で写真に焼き込んでから渡す（lib/newsletter-image.ts）。
//     ここでは写真を幅だけ指定して置く（object-fit や transform は Gmail などで効かないため使わない）
//   ・文字はすべて < > & " ' を置き換え、改行は <br> にする（white-space が効かないメールがあるため）
//   ・{name} は宛名（無ければ「お客様」）
//   サーバーとブラウザの両方で動く（ほかの部品を読まない）

export type NlFrame = 'full' | 'side-text' | 'overlay' | 'split' | 'banner';
export type NlLayout = 'full' | 'grid' | 'triple' | 'text' | 'text-half' | 'highlight' | 'button' | 'divider';

export type NlBlock = {
  layout: NlLayout;
  title?: string;
  comment?: string;
  imageUrl?: string;      // 焼き込み済みの写真（4:3）
  buttonUrl?: string;
  buttonColor?: string;
  blockBgColor?: string;
  blockTextColor?: string;
  titleColor?: string;
  fontFamily?: string;
  titleFontSize?: number;
  bodyFontSize?: number;
};

export type NlContent = {
  subject: string;
  mainFrameType: NlFrame;
  mainTitle: string;
  mainMessage: string;
  mainImageUrl?: string;  // 焼き込み済み（枠の形に切り抜き済み。overlay は見出しも焼き込み済み）
  mainFontFamily?: string;
  mainTitleFontSize?: number;
  mainBodyFontSize?: number;
  snaps: NlBlock[];
};

export type NlTenant = {
  name: string;
  address?: string;
  homepage?: string;
  instagramUrl?: string;
  lineUrl?: string;
  facebookUrl?: string;
  themeColor?: string;
};

// 枠ごとの写真の縦横（作る画面の枠・見本・焼き込みで同じ値を使う）
export const MAIN_FRAME_ASPECT: Record<NlFrame, number> = { full: 16 / 9, 'side-text': 1, overlay: 16 / 9, split: 2, banner: 3 };
export const BLOCK_PHOTO_ASPECT = 4 / 3;

export const NL_FONTS: Record<string, string> = {
  sans: "'Hiragino Kaku Gothic ProN', 'Hiragino Sans', 'Noto Sans JP', Meiryo, sans-serif",
  serif: "'Hiragino Mincho ProN', 'Yu Mincho', 'Noto Serif JP', Georgia, serif",
  rounded: "'Hiragino Maru Gothic ProN', 'M PLUS Rounded 1c', 'Hiragino Sans', sans-serif",
};

const DEFAULT_THEME = '#3b82f6';

export const escHtml = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// 色は #rgb / #rrggbb だけ通す（style に入れるため）
const safeColor = (c: unknown, fallback: string) => (typeof c === 'string' && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c.trim()) ? c.trim() : fallback);
// リンクは http(s)・mailto・tel だけ
export const safeHref = (u: unknown) => {
  const s = String(u ?? '').trim();
  return /^(https?:\/\/|mailto:|tel:)/i.test(s) ? escHtml(s) : '';
};
// 写真は https（見本では blob: と data:image も）だけ
const safeImg = (u: unknown, preview: boolean) => {
  const s = String(u ?? '').trim();
  if (/^https:\/\//i.test(s)) return escHtml(s);
  if (preview && /^(blob:|data:image\/)/i.test(s)) return escHtml(s);
  return '';
};
const px = (n: unknown, d: number, min = 8, max = 72) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= min && v <= max ? v : d;
};
const font = (id?: string) => NL_FONTS[id || 'sans'] || NL_FONTS.sans;

// 宛名を差し込む（「{name} 様」で名前が無いときは「お客様」）
export function fillName(text: string, name?: string) {
  const n = (name || '').trim();
  return String(text ?? '')
    .replace(/\{name\}\s*様/g, n ? `${n} 様` : 'お客様')
    .replace(/\{name\}/g, n || 'お客様');
}

// 文を HTML に：置き換え → 改行を <br> → URL をリンクに
function richText(text: string, name: string | undefined, linkColor: string) {
  // linkColor は地の色と違うものを渡す（色の帯の上は白）
  const escaped = escHtml(fillName(text, name));
  return escaped
    .replace(/(https?:\/\/[^\s<>"']+)/g, (m) => `<a href="${m}" target="_blank" style="color:${linkColor};text-decoration:underline;word-break:break-all;">${m}</a>`)
    .replace(/\r?\n/g, '<br>');
}

type RenderOpts = {
  recipientName?: string;
  unsubscribeUrl: string;
  preview?: boolean;       // 作る画面の見本（blob: の写真を許す）
};

export function renderNewsletterHtml(c: NlContent, t: NlTenant, o: RenderOpts) {
  const theme = safeColor(t.themeColor, DEFAULT_THEME);
  const tenantName = escHtml(t.name || 'お知らせ');
  const mff = font(c.mainFontFamily);
  const mtfs = px(c.mainTitleFontSize, 26, 14, 48);
  const mbfs = px(c.mainBodyFontSize, 15, 11, 24);
  const title = escHtml(fillName(c.mainTitle, o.recipientName));
  const message = richText(c.mainMessage || '', o.recipientName, theme);
  const mainImg = safeImg(c.mainImageUrl, !!o.preview);
  const preheader = escHtml(fillName(c.mainMessage || c.mainTitle || '', o.recipientName).replace(/\s+/g, ' ').slice(0, 90));

  const titleHtml = (color: string, align = 'left') =>
    title ? `<h1 style="margin:0 0 14px;font-family:${mff};font-size:${mtfs}px;line-height:1.4;font-weight:900;color:${color};text-align:${align};word-break:break-word;">${title}</h1>` : '';
  const messageHtml = (color: string, extra = '', msg = message) =>
    msg ? `<div style="font-family:${mff};font-size:${mbfs}px;line-height:1.85;color:${color};word-break:break-word;${extra}">${msg}</div>` : '';
  const imgTag = (src: string, width: number, alt: string, radius = 0) =>
    `<img src="${src}" width="${width}" alt="${alt}" style="display:block;width:100%;max-width:${width}px;height:auto;border:0;outline:none;text-decoration:none;${radius ? `border-radius:${radius}px;` : ''}">`;

  // ---------- メインの写真と見出し ----------
  let mainHtml = '';
  const frame: NlFrame = (['full', 'side-text', 'overlay', 'split', 'banner'] as const).includes(c.mainFrameType) ? c.mainFrameType : 'full';
  if (frame === 'full') {
    mainHtml = `${mainImg ? `<tr><td style="padding:0;">${imgTag(mainImg, 600, escHtml(c.mainTitle || ''))}</td></tr>` : ''}
<tr><td class="nl-px" style="padding:28px 32px 8px;">${titleHtml('#1e293b')}${message ? messageHtml('#475569', `border-left:6px solid ${theme};background-color:#f8fafc;padding:10px 14px;`) : ''}</td></tr>`;
  } else if (frame === 'side-text') {
    mainHtml = `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${mainImg ? `<td class="nl-stack" width="50%" valign="top" style="padding:0;width:50%;">${imgTag(mainImg, 300, escHtml(c.mainTitle || ''))}</td>` : ''}
<td class="nl-stack" ${mainImg ? 'width="50%"' : ''} valign="middle" style="padding:24px;background-color:#f8fafc;">${titleHtml('#1e293b')}${messageHtml('#475569')}</td>
</tr></table></td></tr>`;
  } else if (frame === 'overlay') {
    // 見出しは写真に焼き込み済み（写真が出ないメールのために alt に見出しを入れる）。本文は写真の下に普通の文字で
    //   （本文まで写真に入れると、スマホでは字が小さすぎて読めない）
    mainHtml = mainImg
      ? `<tr><td style="padding:0;">${imgTag(mainImg, 600, escHtml(fillName(c.mainTitle || '', o.recipientName)))}</td></tr>
${message ? `<tr><td class="nl-px" style="padding:24px 32px 8px;">${messageHtml('#475569', `border-left:6px solid ${theme};background-color:#f8fafc;padding:10px 14px;`)}</td></tr>` : ''}`
      : `<tr><td class="nl-px" style="padding:40px 32px;background-color:#1e293b;">${titleHtml('#ffffff')}${messageHtml('#e2e8f0', '', richText(c.mainMessage || '', o.recipientName, '#93c5fd'))}</td></tr>`;
  } else if (frame === 'split') {
    mainHtml = `${mainImg ? `<tr><td style="padding:0;">${imgTag(mainImg, 600, escHtml(c.mainTitle || ''))}</td></tr>` : ''}
<tr><td class="nl-px" bgcolor="${theme}" style="padding:32px;background-color:${theme};text-align:center;">${titleHtml('#ffffff', 'center')}${messageHtml('#ffffff', 'opacity:0.92;', richText(c.mainMessage || '', o.recipientName, '#ffffff'))}</td></tr>`;
  } else {
    mainHtml = `${mainImg ? `<tr><td class="nl-px" style="padding:28px 32px 0;">${imgTag(mainImg, 536, escHtml(c.mainTitle || ''), 12)}</td></tr>` : ''}
<tr><td class="nl-px" style="padding:24px 32px 8px;">${titleHtml('#1e293b')}${messageHtml('#475569')}</td></tr>`;
  }

  // ---------- ブロック（写真2枚・3枚・文の2列はまとめて1行に） ----------
  type Row = { layout: NlLayout; items: NlBlock[] };
  const rows: Row[] = [];
  let cur: NlBlock[] = [];
  const flush = () => { if (cur.length) { rows.push({ layout: cur[0].layout, items: cur }); cur = []; } };
  for (const b of Array.isArray(c.snaps) ? c.snaps : []) {
    const layout = b?.layout || 'full';
    if (layout === 'grid' || layout === 'triple' || layout === 'text-half') {
      if (cur.length && cur[0].layout !== layout) flush();
      cur.push({ ...b, layout });
      if (cur.length === (layout === 'triple' ? 3 : 2)) flush();
    } else {
      flush();
      rows.push({ layout, items: [{ ...b, layout }] });
    }
  }
  flush();

  const caption = (b: NlBlock, tdef: number, bdef: number) => {
    const ff = font(b.fontFamily);
    const tt = escHtml(fillName(b.title || '', o.recipientName));
    const cc = richText(b.comment || '', o.recipientName, theme);
    return `${tt ? `<p style="margin:10px 0 0;font-family:${ff};font-size:${px(b.titleFontSize, tdef)}px;line-height:1.45;font-weight:900;color:${safeColor(b.titleColor, '#111827')};word-break:break-word;">${tt}</p>` : ''}${cc ? `<p style="margin:6px 0 0;font-family:${ff};font-size:${px(b.bodyFontSize, bdef)}px;line-height:1.75;color:#4b5563;word-break:break-word;">${cc}</p>` : ''}`;
  };
  const textCard = (b: NlBlock, tdef: number, bdef: number, pad: number, bar: number) => {
    const ff = font(b.fontFamily);
    const tt = escHtml(fillName(b.title || '', o.recipientName));
    const cc = richText(b.comment || '', o.recipientName, theme);
    return `<td style="padding:${pad}px;background-color:#f8fafc;border-left:${bar}px solid ${theme};">${tt ? `<p style="margin:0;font-family:${ff};font-size:${px(b.titleFontSize, tdef)}px;line-height:1.45;font-weight:900;color:${safeColor(b.titleColor, '#1e293b')};word-break:break-word;">${tt}</p>` : ''}${cc ? `<p style="margin:${tt ? 8 : 0}px 0 0;font-family:${ff};font-size:${px(b.bodyFontSize, bdef)}px;line-height:1.8;color:#4b5563;word-break:break-word;">${cc}</p>` : ''}</td>`;
  };

  const blocksHtml = rows.map((row) => {
    const b = row.items[0];
    if (row.layout === 'divider') {
      return `<tr><td class="nl-px" style="padding:12px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e2e8f0;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table></td></tr>`;
    }
    if (row.layout === 'button') {
      const href = safeHref(b.buttonUrl);
      const color = safeColor(b.buttonColor, theme);
      const label = escHtml(b.title || 'くわしくはこちら');
      if (!href) return '';
      return `<tr><td class="nl-px" align="center" style="padding:12px 32px 20px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${color}" style="border-radius:8px;background-color:${color};"><a href="${href}" target="_blank" style="display:inline-block;padding:15px 36px;font-family:${NL_FONTS.sans};font-size:16px;font-weight:900;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a></td></tr></table></td></tr>`;
    }
    if (row.layout === 'highlight') {
      const bg = safeColor(b.blockBgColor, '#eff6ff');
      const fg = safeColor(b.blockTextColor, '#1e40af');
      const ff = font(b.fontFamily);
      const tt = escHtml(fillName(b.title || '', o.recipientName));
      const cc = richText(b.comment || '', o.recipientName, fg);
      return `<tr><td class="nl-px" style="padding:8px 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${bg}" style="padding:22px 24px;background-color:${bg};border-radius:8px;">${tt ? `<p style="margin:0;font-family:${ff};font-size:${px(b.titleFontSize, 18)}px;line-height:1.45;font-weight:900;color:${fg};">${tt}</p>` : ''}${cc ? `<p style="margin:${tt ? 8 : 0}px 0 0;font-family:${ff};font-size:${px(b.bodyFontSize, 14)}px;line-height:1.8;color:${fg};">${cc}</p>` : ''}</td></tr></table></td></tr>`;
    }
    if (row.layout === 'text') {
      return `<tr><td class="nl-px" style="padding:8px 32px 16px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${textCard(b, 18, 14, 22, 6)}</tr></table></td></tr>`;
    }
    if (row.layout === 'text-half') {
      const cells = row.items.map(it => `<td class="nl-stack" width="50%" valign="top" style="padding:4px;width:50%;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${textCard(it, 16, 13, 16, 4)}</tr></table></td>`).join('');
      return `<tr><td class="nl-px" style="padding:4px 28px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${cells}${row.items.length < 2 ? '<td class="nl-stack" width="50%" style="width:50%;">&nbsp;</td>' : ''}</tr></table></td></tr>`;
    }
    // 写真（1枚・2枚・3枚）。写真は 4:3 に焼き込み済み＝幅だけ指定すれば崩れない
    const n = row.layout === 'triple' ? 3 : row.layout === 'grid' ? 2 : 1;
    const w = n === 3 ? 172 : n === 2 ? 262 : 536;
    const tdef = n === 1 ? 17 : n === 2 ? 14 : 12;
    const bdef = n === 1 ? 14 : n === 2 ? 13 : 12;
    const cells = row.items.map(it => {
      const src = safeImg(it.imageUrl, !!o.preview);
      return `<td width="${Math.round(100 / n)}%" valign="top" style="padding:0 ${n > 1 ? 5 : 0}px;width:${Math.round(100 / n)}%;">${src ? imgTag(src, w, escHtml(it.title || '写真')) : ''}${caption(it, tdef, bdef)}</td>`;
    }).join('');
    const empty = `<td width="${Math.round(100 / n)}%" style="width:${Math.round(100 / n)}%;">&nbsp;</td>`.repeat(n - row.items.length);
    return `<tr><td class="nl-px" style="padding:8px ${n > 1 ? 27 : 32}px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${cells}${empty}</tr></table></td></tr>`;
  }).join('\n');

  // ---------- SNS・フッター ----------
  const sns = [
    ['Instagram', t.instagramUrl], ['LINE', t.lineUrl], ['Facebook', t.facebookUrl],
  ].map(([label, url]) => { const h = safeHref(url); return h ? `<a href="${h}" target="_blank" style="display:inline-block;margin:4px 6px;padding:8px 16px;border:1px solid #cbd5e1;border-radius:999px;font-family:${NL_FONTS.sans};font-size:12px;font-weight:700;color:#334155;text-decoration:none;">${label}</a>` : ''; }).join('');
  const home = safeHref(t.homepage);
  const address = escHtml(t.address || '');
  const unsub = safeHref(o.unsubscribeUrl) || escHtml(o.unsubscribeUrl);
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escHtml(c.subject || '')}</title>
<style>
body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
img{-ms-interpolation-mode:bicubic;}
@media screen and (max-width:480px){
  .nl-px{padding-left:16px !important;padding-right:16px !important;}
  .nl-stack{display:block !important;width:100% !important;}
  .nl-stack img{width:100% !important;max-width:100% !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f5f9" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:16px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="padding:22px 24px;background-color:#1e293b;border-bottom:6px solid ${theme};text-align:center;">
<p style="margin:0;font-family:${NL_FONTS.sans};font-size:18px;line-height:1.4;font-weight:900;color:#ffffff;letter-spacing:2px;">${tenantName}</p>
<p style="margin:6px 0 0;font-family:${NL_FONTS.sans};font-size:11px;line-height:1.4;font-weight:700;color:#93c5fd;letter-spacing:3px;">ニュースレター</p>
</td></tr>
${mainHtml}
${blocksHtml}
<tr><td style="padding:8px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
${sns ? `<tr><td class="nl-px" align="center" style="padding:20px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;">${sns}</td></tr>` : ''}
<tr><td class="nl-px" align="center" style="padding:24px 32px 28px;background-color:#1e293b;">
<p style="margin:0;font-family:${NL_FONTS.sans};font-size:13px;line-height:1.6;font-weight:700;color:#ffffff;">${tenantName}</p>
${address ? `<p style="margin:6px 0 0;font-family:${NL_FONTS.sans};font-size:11px;line-height:1.6;color:#cbd5e1;">${address}</p>` : ''}
<p style="margin:14px 0 0;font-family:${NL_FONTS.sans};font-size:11px;line-height:1.8;color:#cbd5e1;">${home ? `<a href="${home}" target="_blank" style="color:#93c5fd;text-decoration:underline;">ホームページ</a>　｜　` : ''}<a href="${unsub}" target="_blank" style="color:#cbd5e1;text-decoration:underline;">配信停止はこちら</a></p>
<p style="margin:12px 0 0;font-family:${NL_FONTS.sans};font-size:10px;line-height:1.6;color:#94a3b8;">このメールは ${tenantName} からお送りしています。<br>&copy; ${year} ${tenantName}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
