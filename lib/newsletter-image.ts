// メルマガの写真を、見本と同じ形に「焼き込む」（ブラウザだけ）。
//   作る画面の見本は CSS（object-fit: cover・transform: scale・transform-origin・filter）で写真を見せていたが、
//   メールではそれが効かない。同じ計算を canvas で行い、できた JPEG を置く＝どのメールでも見本どおりに出る。
//   overlay の枠は、下からの暗いぼかしと見出しを写真に描く（本文は写真の下に普通の文字で出す＝スマホで読める大きさ）
import { NL_FONTS } from '@/lib/newsletter-email';

export type BakeOptions = {
  aspect: number;                    // 横 / 縦
  width?: number;                    // できる写真の横の画素（既定 1200＝メールの 600px の2倍）
  scale?: number;                    // 拡大（1 以上）
  position?: { x: number; y: number }; // 拡大の中心（%）
  filter?: string;                   // CSS の filter と同じ書き方（brightness(1.1) など）
  overlay?: { title: string; fontFamily?: string; titlePx: number };
  quality?: number;
};

// 画像を読む。http(s) の画像は canvas が汚れないよう、同じサイトの中継（/api/newsletter/image）から読む
export async function loadImage(src: string, idToken?: string): Promise<HTMLImageElement> {
  let url = src;
  let revoke = false;
  if (/^https?:\/\//i.test(src)) {
    const res = await fetch(`/api/newsletter/image?u=${encodeURIComponent(src)}`, { headers: idToken ? { Authorization: `Bearer ${idToken}` } : {} });
    if (!res.ok) throw new Error('写真を読み込めませんでした');
    url = URL.createObjectURL(await res.blob());
    revoke = true;
  }
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('写真を読み込めませんでした'));
      img.src = url;
    });
  } finally {
    if (revoke) setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

// 文字を幅に収まるように折る（日本語は1文字ずつ、英数字は語の切れ目を優先）
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const out: string[] = [];
  for (const para of String(text || '').split(/\r?\n/)) {
    let line = '';
    for (const ch of Array.from(para)) {
      const next = line + ch;
      if (line && ctx.measureText(next).width > maxWidth) {
        // 英数字の語の途中なら、語の頭まで戻して折る
        const m = /[A-Za-z0-9]+$/.exec(line);
        if (m && /[A-Za-z0-9]/.test(ch) && m.index > 0) {
          out.push(line.slice(0, m.index));
          line = m[0] + ch;
        } else {
          out.push(line);
          line = ch;
        }
      } else {
        line = next;
      }
    }
    out.push(line);
  }
  return out;
}

export async function bakeImage(img: HTMLImageElement, o: BakeOptions): Promise<Blob> {
  const W = Math.round(o.width || 1200);
  const H = Math.round(W / o.aspect);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  // object-fit: cover（真ん中に、枠いっぱいに）→ transform: scale(s)（transform-origin が中心）
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const cover = Math.max(W / iw, H / ih);
  const dw = iw * cover;
  const dh = ih * cover;
  const s = Math.max(1, Number(o.scale) || 1);
  const ox = ((o.position?.x ?? 50) / 100) * W;
  const oy = ((o.position?.y ?? 50) / 100) * H;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(s, s);
  ctx.translate(-ox, -oy);
  if (o.filter) ctx.filter = o.filter;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.restore();
  ctx.filter = 'none';

  if (o.overlay && o.overlay.title) {
    // 下から黒 70% → 20% → 透明、余白 40px（600px の幅で）＝この写真では幅に合わせて大きくする
    const k = W / 600;
    const g = ctx.createLinearGradient(0, H, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.7)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.2)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const pad = 40 * k;
    const ff = NL_FONTS[o.overlay.fontFamily || 'sans'] || NL_FONTS.sans;
    const tpx = o.overlay.titlePx * k;
    ctx.font = `900 ${tpx}px ${ff}`;
    const lines = wrapLines(ctx, o.overlay.title, W - pad * 2).slice(0, 3);
    const lh = tpx * 1.35;
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8 * k;
    ctx.fillStyle = '#ffffff';
    let y = H - pad - lines.length * lh;
    for (const l of lines) { y += lh; ctx.fillText(l, pad, y - (lh - tpx) / 2 - tpx * 0.12); }
  }

  return await new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('写真を作れませんでした'))), 'image/jpeg', o.quality ?? 0.85));
}

// ---------- 見本と送信で同じ焼き込みを使い回す（同じ写真・同じ切り抜きなら1回だけ作る） ----------
type Baked = { blob: Blob; url: string };
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const bakedCache = new Map<string, Promise<Baked>>();
const MAX_BAKED = 80;

export function bakeKey(src: string, o: BakeOptions) {
  return JSON.stringify([src, o.aspect, o.width || 1200, o.scale || 1, o.position?.x ?? 50, o.position?.y ?? 50, o.filter || '', o.overlay || null]);
}

export function bakeCached(src: string, o: BakeOptions, getToken: () => Promise<string | undefined>): { key: string; promise: Promise<Baked> } {
  const key = bakeKey(src, o);
  let p = bakedCache.get(key);
  if (!p) {
    let ip = imageCache.get(src);
    if (!ip) {
      ip = getToken().then(t => loadImage(src, t));
      imageCache.set(src, ip);
      ip.catch(() => imageCache.delete(src));
    }
    p = ip.then(img => bakeImage(img, o)).then(blob => ({ blob, url: URL.createObjectURL(blob) }));
    bakedCache.set(key, p);
    p.catch(() => bakedCache.delete(key));
    // 古いものから捨てる（作った見本の URL も返す）
    while (bakedCache.size > MAX_BAKED) {
      const [oldKey, old] = bakedCache.entries().next().value as [string, Promise<Baked>];
      bakedCache.delete(oldKey);
      old.then(b => setTimeout(() => URL.revokeObjectURL(b.url), 60_000)).catch(() => {});
    }
  }
  return { key, promise: p };
}
