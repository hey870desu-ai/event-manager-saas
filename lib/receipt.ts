// 📂 lib/receipt.ts
// 📝 役割：参加者への領収証の決まり（画面とサーバーで同じものを使う・2026-10-28）
//   塙さん「PayPayだと領収証が出せないみたいなので、現金でもそうなんだけど、領収証発行機能も欲しい。メールでも送れるといいな」
//   番号は会社ごと・年ごとの通し番号（2026-0001）。発行した時の主催者の名前・住所などを領収証の記録に残し、あとで設定を変えても前の領収証は変わらない
//   インボイスの登録番号（T＋13けた）を設定した会社は、登録番号と 10% の消費税の額も載せる（参加費は税込として、うち消費税を出す）

export const RECEIPT_METHODS = ["現金", "PayPay", "銀行振込", "クレジットカード", "その他"];

export type ReceiptIssuer = { name: string; address: string; phone: string; regNo: string };

export type ReceiptData = {
  no: string;          // 2026-0001
  name: string;        // 宛名（「様」は付けずに持つ）
  amount: number;      // 税込の円
  note: string;        // 但し書き
  method: string;      // お支払い方法
  issueDate: string;   // YYYY-MM-DD
  issuer: ReceiptIssuer;
  previousNo?: string; // 作り直したときの、無効にした前の番号
  eventTitle?: string; // イベントの名前・開催日・チケット（2026-10-29 から記録に残す。前の記録には無い）
  eventDate?: string;  // YYYY-MM-DD
  ticket?: string;
};

export const isRegNo = (s: unknown) => /^T\d{13}$/.test(String(s || ""));

// 税込の額のうち 10% の消費税（1円未満は切り捨て）
export const taxIn10 = (amount: number) => Math.floor((amount * 10) / 110);

export const jpDate = (ymd: string) => {
  const m = String(ymd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : String(ymd || "");
};

export const yenText = (n: number) => `¥${Math.round(n).toLocaleString("ja-JP")}-`;

export const defaultReceiptNote = (eventTitle: string) => `「${String(eventTitle || "").slice(0, 80)}」参加費として`;

// お支払い方法のはじめの値：カードで払った申込はクレジットカード、当日払いのイベントは現金、事前払い（リンク・振込）は選んでもらう
export function defaultReceiptMethod(ev: any, r: any) {
  if (r?.stripeSessionId) return "クレジットカード";
  if (ev?.payMode === "link") return "";
  return "現金";
}

// 入れた値を確かめる。おかしければ理由の文、よければ ""
export function receiptInputError(x: { name?: string; amount?: number; note?: string; method?: string; issueDate?: string }) {
  if (!String(x.name || "").trim() || String(x.name).length > 100) return "宛名を100字までで入れてください。";
  if (!Number.isInteger(x.amount) || (x.amount as number) < 1 || (x.amount as number) > 10000000) return "金額は1円から1,000万円までの数字で入れてください。";
  if (!String(x.note || "").trim() || String(x.note).length > 120) return "但し書きを120字までで入れてください。";
  if (!RECEIPT_METHODS.includes(String(x.method || ""))) return "お支払い方法を選んでください。";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(x.issueDate || ""))) return "発行日を入れてください。";
  return "";
}

// ファイルの名前（日本語を含む）
export const receiptFileName = (no: string) => `領収証_${no}.pdf`;
