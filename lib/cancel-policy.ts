// キャンセル・返金の決まり（イベントの cancelPolicy）。申込フォームに出す文と、取り消しのときの返金の計算で同じものを使う
//   cancelPolicy は [{ days: 開催日の何日前まで, rate: 返金の割合% }]（旧形式は { fullRefundDays, halfRefundDays }）
//   日数は日本時間の日付で数える（開催日の前日が1・当日が0）。
//   以前の取り消しの計算は、日本時間の時刻を UTC として扱っていたため9時間ずれ、「2日前まで100%」が3日前の15時で50%に変わっていた

export type PolicyTier = { days: number; rate: number };

export function policyTiers(raw: any): PolicyTier[] {
  let tiers: PolicyTier[];
  if (Array.isArray(raw)) tiers = raw.map((t: any) => ({ days: Number(t?.days) || 0, rate: Number(t?.rate) || 0 }));
  else if (raw) tiers = [{ days: raw.fullRefundDays ?? 2, rate: 100 }, { days: raw.halfRefundDays ?? 1, rate: 50 }];
  else tiers = [{ days: 2, rate: 100 }, { days: 1, rate: 50 }];
  return tiers.sort((a, b) => b.days - a.days);
}

const jstToday = (now: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(now);

// 今日（日本時間）から開催日まで何日か。日付が分からないときは null
export function daysUntilEventJst(eventDate: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate || "")) return null;
  return Math.round((Date.parse(eventDate) - Date.parse(jstToday(now))) / 86400000);
}

// 今日取り消したときの返金の割合（%）。開催日が分からないときは全額（今までどおり）
export function refundRateFor(raw: any, eventDate: string, now: Date = new Date()): number {
  const days = daysUntilEventJst(eventDate, now);
  if (days === null) return 100;
  for (const t of policyTiers(raw)) if (days >= t.days) return t.rate;
  return 0;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const dateLabel = (ymd: string, minusDays: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d - minusDays));
  return `${dt.getUTCMonth() + 1}月${dt.getUTCDate()}日（${WEEKDAYS[dt.getUTCDay()]}）`;
};

// 申込フォームに出す文：「開催日の2日前（11月6日（金））まで：参加費の100%を返金」…「それより後：返金なし」
export function policyLines(raw: any, eventDate: string): string[] {
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(eventDate || "");
  const tiers = policyTiers(raw);
  const lines = tiers.map(t => {
    const when = t.days === 0 ? "開催日" : `開催日の${t.days}日前`;
    const date = hasDate ? `（${dateLabel(eventDate, t.days)}）` : "";
    return `${when}${date}まで：${t.rate > 0 ? `参加費の${t.rate}%を返金` : "返金なし"}`;
  });
  if (tiers.length === 0 || tiers[tiers.length - 1].rate > 0) lines.push("それより後：返金なし");
  return lines;
}
