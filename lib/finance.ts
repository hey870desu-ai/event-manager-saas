// 📂 lib/finance.ts
// 📝 役割：収支の画面（/admin/finance）と分析の「売上」で、同じ数え方をするための計算（画面に依らない・2026-10-28）
//   受け取り済み＝①支払い済みの印（カードで決済した申込・事前払いで主催者が印を付けた申込）
//               ②当日払いのイベントで、受付を済ませた申込（会場で参加費を受け取った）
//   取り消し：カードで受け取った申込は、返金した残り（キャンセル料）を受け取り済みに入れる。
//            事前払い（リンク・振込）で支払い済みのまま取り消した申込は、返金したかの記録が無いので「確かめが要る」に分ける
//   支払いを待っている申込（カードの決済の画面に進んで払っていないもの）は数えない
//   経費・その他の収入は、主催者が手で入れる（tenants/{tenantId}/finance_entries）
import { isPayLinkEvent } from "./pay-link";

export type FinanceEntry = {
  id: string;
  type: "expense" | "income";
  category: string;
  amount: number;
  date: string;      // "YYYY-MM-DD"（イベントの経費は開催日。月ごとの表はこの日付の月に入る）
  eventId: string;   // "" はイベントに結びつかないもの（広告・年会費など）
  note: string;
};

export const EXPENSE_CATEGORIES = ["会場費", "講師への謝礼", "交通費", "印刷・資料", "飲食", "広告", "その他"];
export const INCOME_CATEGORIES = ["協賛金", "物販", "キャンセル料", "その他"];

const yen = (v: any) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export type ReservationMoney = {
  counted: boolean;   // 申込として数える（取り消し・支払い待ちは数えない）
  expected: number;   // 売上予定
  collected: number;  // 受け取り済み（取り消しのキャンセル料を含む）
  refund: number;     // カードで返金した額
  cancelKept: number; // カードで受け取って、返金しなかった額（キャンセル料）
  needsCheck: number; // 返金したかを確かめる必要がある額
};

// 1件の申込のお金
export function reservationMoney(ev: any, r: any): ReservationMoney {
  const none = { counted: false, expected: 0, collected: 0, refund: 0, cancelKept: 0, needsCheck: 0 };
  const price = yen(r?.price);
  const status = String(r?.status || "");
  const paidMark = r?.paymentStatus === "paid";
  const paidAmount = r?.paidAmount != null ? yen(r.paidAmount) : price;
  if (status === "payment_pending") return none;
  if (status === "cancelled") {
    if (r?.stripeSessionId) {
      // カードで受け取った申込：返金した残りがキャンセル料。返金に失敗したもの・返金の処理をしていないものは確かめが要る
      if (r?.paymentStatus === "refunded" || r?.paymentStatus === "no_refund") {
        const refund = Math.min(paidAmount, yen(r?.refundAmount));
        return { ...none, collected: paidAmount - refund, refund, cancelKept: paidAmount - refund };
      }
      if (paidMark || r?.paymentStatus === "refund_failed") return { ...none, needsCheck: paidAmount };
      return none;
    }
    // 事前払い（リンク・振込）で支払い済みの印のまま取り消した：返金したかは記録が無い
    return paidMark ? { ...none, needsCheck: price } : none;
  }
  const onSite = !isPayLinkEvent(ev) && !r?.stripeSessionId && (r?.checkedIn === true || status === "attended");
  return { ...none, counted: true, expected: price, collected: paidMark ? paidAmount : onSite ? price : 0 };
}

export type MoneyTotals = {
  applicants: number;
  expected: number;
  collected: number;
  uncollected: number;
  refund: number;
  cancelKept: number;
  needsCheck: number;
  needsCheckCount: number;
  otherIncome: number;
  expense: number;
  net: number;        // 受け取り済み＋その他の収入−経費
};

const zero = (): MoneyTotals => ({ applicants: 0, expected: 0, collected: 0, uncollected: 0, refund: 0, cancelKept: 0, needsCheck: 0, needsCheckCount: 0, otherIncome: 0, expense: 0, net: 0 });

function finish(t: MoneyTotals): MoneyTotals {
  return { ...t, uncollected: Math.max(0, t.expected - (t.collected - t.cancelKept)), net: t.collected + t.otherIncome - t.expense };
}

export type TicketMoney = { name: string; count: number; expected: number; collected: number };
export type EventMoney = MoneyTotals & { eventId: string; title: string; date: string; payLink: boolean; tickets: TicketMoney[] };

// 1つのイベントのお金（申込と、そのイベントに結びつけた経費・その他の収入）
export function eventMoney(ev: any, reservations: any[], entries: FinanceEntry[]): EventMoney {
  const t = zero();
  const tickets = new Map<string, TicketMoney>();
  for (const r of reservations) {
    const m = reservationMoney(ev, r);
    t.collected += m.collected; t.refund += m.refund; t.cancelKept += m.cancelKept;
    if (m.needsCheck > 0) { t.needsCheck += m.needsCheck; t.needsCheckCount += 1; }
    if (!m.counted) continue;
    t.applicants += 1; t.expected += m.expected;
    const name = String(r?.selectedTicket || "") || (m.expected > 0 ? "参加費" : "無料");
    const k = tickets.get(name) || { name, count: 0, expected: 0, collected: 0 };
    k.count += 1; k.expected += m.expected; k.collected += m.collected;
    tickets.set(name, k);
  }
  for (const e of entries) {
    if (e.eventId !== ev?.id) continue;
    if (e.type === "expense") t.expense += yen(e.amount); else t.otherIncome += yen(e.amount);
  }
  return { ...finish(t), eventId: String(ev?.id || ""), title: String(ev?.title || ""), date: String(ev?.date || ""), payLink: isPayLinkEvent(ev), tickets: Array.from(tickets.values()) };
}

export type MonthMoney = MoneyTotals & { month: string };

// 月ごと（イベントは開催日の月、イベントに結びつかない経費・収入はその日付の月）。year は "2026" など
export function monthlyMoney(events: EventMoney[], entries: FinanceEntry[], year: string): MonthMoney[] {
  const months = new Map<string, MoneyTotals>();
  const add = (month: string) => { if (!months.has(month)) months.set(month, zero()); return months.get(month)!; };
  for (const e of events) {
    if (!e.date.startsWith(`${year}-`)) continue;
    const m = add(e.date.slice(0, 7));
    for (const k of ["applicants", "expected", "collected", "refund", "cancelKept", "needsCheck", "needsCheckCount", "otherIncome", "expense"] as const) m[k] += e[k];
  }
  for (const x of entries) {
    if (x.eventId || !x.date.startsWith(`${year}-`)) continue;
    const m = add(x.date.slice(0, 7));
    if (x.type === "expense") m.expense += yen(x.amount); else m.otherIncome += yen(x.amount);
  }
  return Array.from(months.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, t]) => ({ ...finish(t), month }));
}

// 合計（月ごとの行を足したもの）
export function sumMoney(rows: MoneyTotals[]): MoneyTotals {
  const t = zero();
  for (const r of rows) for (const k of Object.keys(t) as (keyof MoneyTotals)[]) t[k] += r[k];
  return finish(t);
}

// Excel で開ける CSV（先頭に BOM）。数字はそのまま、文字は " で囲む
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => (typeof v === "number" ? String(v) : `"${String(v ?? "").replace(/"/g, '""')}"`);
  return "﻿" + rows.map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";
}
