// 料金の決まり（LP・特定商取引法の表記と同じにする）。price は税抜で、表示は withTax で税込にする
//   スポット 5,500円/回・スタンダード 3,300円/月（管理の人3人まで。4人目から1人 550円/月）
//   プロ 11,000円/月（支部・拠点を増やせる。管理の人は何人でも同じ）
export const PLANS = {
  free: { name: "フリー", price: 0 },
  spot: { name: "スポット利用", price: 5000 },
  standard: { name: "スタンダードプラン", price: 3000 },
  pro: { name: "プロプラン", price: 10000 },
} as const;

export const INCLUDED_ADMINS = 3;     // スタンダードに込みの管理の人
export const EXTRA_ADMIN_PRICE = 500; // 4人目から1人あたり（税抜）

// 管理の人に数えないアカウント（運営のもの）。料金・請求・カードの月額の人数は、これ以外の admin_users を数える
//   saastukuruzo@gmail.com は塙さんのテスト用（ハッピー・チョイスに管理者として入っている・2026-10-24 塙さん「僕のテストアドレス」）
export const NOT_COUNTED_ADMINS = ["hey870desu@gmail.com", "saastukuruzo@gmail.com"];
export const isCountedAdmin = (email: string | undefined) =>
  !NOT_COUNTED_ADMINS.includes((email || "").trim().toLowerCase());

// 税込（InvoicePDF と同じく10%の切り捨て）
export const withTax = (price: number) => price + Math.floor(price * 0.1);

// 追加の管理者の人数（スタンダードだけ数える。プロは何人でも同じ）
export const extraAdmins = (plan: string | undefined, adminCount: number) =>
  plan === "standard" ? Math.max(0, adminCount - INCLUDED_ADMINS) : 0;

export type InvoiceItem = { name: string; detail?: string; price: number; quantity: number };

// 月の請求の明細（税抜）。フリー・スポットは月の請求なし＝空
export const monthlyInvoiceItems = (plan: string | undefined, adminCount: number, month: string): InvoiceItem[] => {
  if (plan !== "standard" && plan !== "pro") return [];
  const items: InvoiceItem[] = [{ name: `システム利用料（${PLANS[plan].name}）`, detail: `期間: ${month}分`, price: PLANS[plan].price, quantity: 1 }];
  const extra = extraAdmins(plan, adminCount);
  if (extra > 0) items.push({ name: `追加の管理者（${INCLUDED_ADMINS + 1}人目から）`, detail: `管理の人 ${adminCount}人`, price: EXTRA_ADMIN_PRICE, quantity: extra });
  return items;
};

// 明細の税込の合計（InvoicePDF と同じ：小計＋小計の10%の切り捨て）
export const totalWithTax = (items: InvoiceItem[]) => withTax(items.reduce((acc, i) => acc + i.price * i.quantity, 0));

// カードの月額（Stripe・税込）：スタンダード 3,300円＋4人目から1人 550円
export const cardMonthlyTotal = (adminCount: number) =>
  withTax(PLANS.standard.price) + withTax(EXTRA_ADMIN_PRICE) * extraAdmins("standard", adminCount);

// 日本時間で見た「次の月」を "YYYY-MM" で返す（毎月1日に決済する月額の、1回目の月の初期値）
export const nextMonthJst = (now: Date = new Date()) => {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const d = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// 日本時間で見た「今月」を "YYYY-MM" で返す
export const thisMonthJst = (now: Date = new Date()) => {
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
};

// "YYYY-MM" の前の月を "YYYY-MM" で返す（カードの月額で、申し込みのときに先にいただく月）
export const prevMonthOf = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// "YYYY-MM" の1日 9時（日本時間）＝1日 0時（UTC）を UNIX 秒で返す。カードの月額の1回目の決済の時刻
//   Stripe は毎月の決済日を UTC の日で数える（起点が30日なら毎月30日・31日なら月末）。
//   1日 0時（日本時間）は UTC では前の月の末日なので、11月30日 15時（UTC）が起点だと12月31日（日本時間）に決済されてしまう。
//   UTC でも1日になる時刻にすれば、どの月から始めても毎月1日になる
export const firstChargeUnix = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, 1) / 1000);
};
