// 事後アンケートのQRコードを、画像（PNG）にして保存する（管理画面の「QR表示」から）。
// QRの絵は画面に出しているものと同じ api.qrserver.com で作る。
// このサービスは CORS を許しているので、canvas に描いてもそのまま保存できる。

export function surveyUrl(origin: string, tenantId: string | undefined, eventId: string) {
  return `${origin}/t/${tenantId || "default"}/e/${eventId}/survey`;
}

// margin=0 で、指定の大きさいっぱいに描かれる（白黒の2色・ぼかしなし）。余白はこちらで付ける
export function qrImageUrl(data: string, size: number) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=0&ecc=M&format=png&data=${encodeURIComponent(data)}`;
}

const FONT = `"Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", YuGothic, Meiryo, "Noto Sans JP", sans-serif`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("QRコードの画像を読み込めませんでした"));
    img.src = src;
  });
}

function saveCanvas(canvas: HTMLCanvasElement, fileName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("画像を作れませんでした"));
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
      resolve();
    }, "image/png");
  });
}

// ファイル名に使えない文字を除き、長いイベント名は切る
function fileTitle(title: string) {
  const t = (title || "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(t).slice(0, 40).join("") || "イベント";
}

// 行の頭に来てはいけない字（句読点・閉じかっこ・小さい字など）と、行の終わりに来てはいけない字（開きかっこ）
const NO_LINE_START = "、。，．,.)）」』】〕〉》］!！?？・：；ー〜…ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ";
const NO_LINE_END = "(（「『【〔〈《［";

// 日本語は1文字ずつ折り返す（上の禁則は守る）。maxLines を超える分は最後の行を「…」で切る
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text.replace(/\s+/g, " ").trim())) {
    if (line && ctx.measureText(line + ch).width > maxWidth && !NO_LINE_START.includes(ch)) {
      // 開きかっこで終わる行は、そのかっこごと次の行へ送る
      let carry = "";
      while (line.length > 1 && NO_LINE_END.includes(line.slice(-1))) {
        carry = line.slice(-1) + carry;
        line = line.slice(0, -1);
      }
      lines.push(line);
      line = ch === " " ? carry : carry + ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && ctx.measureText(last + "…").width > maxWidth) last = Array.from(last).slice(0, -1).join("");
  kept[maxLines - 1] = last + "…";
  return kept;
}

// QRコードだけ（1200px の正方形・まわりに白い余白）。スライドや配布資料に貼る用
export async function downloadSurveyQr(url: string, title: string) {
  const img = await loadImage(qrImageUrl(url, 1000));
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1200;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 100, 100, 1000, 1000);
  await saveCanvas(canvas, `アンケートのQR_${fileTitle(title)}.png`);
}

// 案内の文つき（1920×1080 の横長＝スライドの形）。そのまま会場のスクリーンに映したり、スライドの最後に入れたりできる
export async function downloadSurveySlide(url: string, title: string) {
  const W = 1920;
  const H = 1080;
  const side = 130;
  const qrSize = 700;
  const img = await loadImage(qrImageUrl(url, qrSize));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#f97316";
  ctx.fillRect(0, 0, W, 16);

  // 右に QR、左に文（QR との間を 90px あける）。文のかたまりは上下のまん中に置く
  const qrX = W - side - qrSize;
  const textWidth = qrX - 90 - side;
  ctx.textBaseline = "top";
  ctx.font = `bold 44px ${FONT}`;
  const titleLines = wrapText(ctx, title || "", textWidth, 2);
  let y = (H - (92 + 40 + titleLines.length * 60 + 70 + 160)) / 2;

  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 92px ${FONT}`;
  ctx.fillText("アンケートのお願い", side, y);
  y += 92 + 40;

  ctx.fillStyle = "#475569";
  ctx.font = `bold 44px ${FONT}`;
  for (const l of titleLines) {
    ctx.fillText(l, side, y);
    y += 60;
  }
  y += 70;

  ctx.fillStyle = "#0f172a";
  ctx.font = `bold 56px ${FONT}`;
  ctx.fillText("こちらのQRコードを読み取って", side, y);
  ctx.fillText("回答にご協力ください", side, y + 80);

  ctx.drawImage(img, qrX, (H - qrSize) / 2, qrSize, qrSize);

  ctx.fillStyle = "#64748b";
  ctx.font = `28px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(url, W / 2, H - 48);

  await saveCanvas(canvas, `アンケートのQR_スライド用_${fileTitle(title)}.png`);
}
