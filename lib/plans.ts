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

// 参加費をカード・コンビニで受け取るときの手数料（2026-11-03 塙さん「それでお願いします」）：
//   参加費の5%（Stripe の決済の手数料 3.6% を含む）を、主催者へ送る前に差し引く。参加者からは取らない
export const CARD_FEE_RATE = 0.05;
export const cardFeeFor = (amount: number) => Math.floor(Math.max(0, Number(amount) || 0) * CARD_FEE_RATE);

// 年払い（2026-11-02 塙さん「それで行こう」）：10か月分で1年（2か月分おトク）。追加の管理者も同じ割引
//   スタンダード 33,000円/年・4人目から1人 5,500円/年・プロ 110,000円/年（税込）
//   年の途中で管理の人が増えたら、残りの期間の分をその場で決済する。減っても、途中でやめても返金しない
export const ANNUAL_MONTHS = 10;
export type PaidPlan = 'standard' | 'pro';
export const annualPrice = (plan: PaidPlan) => PLANS[plan].price * ANNUAL_MONTHS; // 税抜
export const EXTRA_ADMIN_ANNUAL_PRICE = EXTRA_ADMIN_PRICE * ANNUAL_MONTHS;        // 税抜

// カードの年額（税込）
export const cardAnnualTotal = (plan: PaidPlan, adminCount: number) =>
  withTax(annualPrice(plan)) + (plan === 'standard' ? withTax(EXTRA_ADMIN_ANNUAL_PRICE) * extraAdmins('standard', adminCount) : 0);

// 年払いの1年の終わりの月（始まりの月から数えて12か月目）
export const annualEndMonth = (startMonth: string) => {
  const [y, m] = startMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + 11, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
// "YYYY-MM" の月の末日（"YYYY-MM-DD"）
export const lastDayOfMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
};
const jpDate = (ymd: string) => { const [y, m, d] = ymd.split("-").map(Number); return `${y}年${m}月${d}日`; };
// 年払いの期間の書き方（例：2026年12月1日〜2027年11月30日）
export const annualPeriodText = (startMonth: string) => `${jpDate(`${startMonth}-01`)}〜${jpDate(lastDayOfMonth(annualEndMonth(startMonth)))}`;

// 年払いの請求書の明細（税抜）。支払期限は始まりの月の末日（請求の記録の dueDate）
export const annualInvoiceItems = (plan: string | undefined, adminCount: number, startMonth: string): InvoiceItem[] => {
  if (plan !== "standard" && plan !== "pro") return [];
  const items: InvoiceItem[] = [{ name: `システム利用料（${PLANS[plan].name}・年払い）`, detail: `期間: ${annualPeriodText(startMonth)}（12か月）`, price: annualPrice(plan), quantity: 1 }];
  const extra = extraAdmins(plan, adminCount);
  if (extra > 0) items.push({ name: `追加の管理者（${INCLUDED_ADMINS + 1}人目から・年払い）`, detail: `管理の人 ${adminCount}人`, price: EXTRA_ADMIN_ANNUAL_PRICE, quantity: extra });
  return items;
};

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

// "YYYY-MM" の次の月を "YYYY-MM" で返す
export const nextMonthOf = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

// カードの月額で、申し込みのときに先にいただける月（日本時間の先月・今月・来月）
export const signupChargeableMonths = (now: Date = new Date()) => {
  const t = thisMonthJst(now);
  return [prevMonthOf(t), t, nextMonthJst(now)];
};

// 申し込みのときにいただく月の並び（from の月から、1回目の決済の月の前の月まで）。from が1回目の月より後なら空
export const signupChargeMonths = (from: string, startMonth: string) => {
  const months: string[] = [];
  for (let m = from; m < startMonth && months.length < 12; m = nextMonthOf(m)) months.push(m);
  return months;
};

// 月の並びを「11月分」「10月分と11月分」「9月分〜11月分」と書く
export const monthsLabel = (months: string[]) => {
  const n = (ym: string) => `${Number(ym.slice(5))}月分`;
  if (months.length <= 1) return months.length ? n(months[0]) : "";
  if (months.length === 2) return `${n(months[0])}と${n(months[1])}`;
  return `${n(months[0])}〜${n(months[months.length - 1])}`;
};

// "YYYY-MM" の1日 9時（日本時間）＝1日 0時（UTC）を UNIX 秒で返す。カードの月額の1回目の決済の時刻
//   Stripe は毎月の決済日を UTC の日で数える（起点が30日なら毎月30日・31日なら月末）。
//   1日 0時（日本時間）は UTC では前の月の末日なので、11月30日 15時（UTC）が起点だと12月31日（日本時間）に決済されてしまう。
//   UTC でも1日になる時刻にすれば、どの月から始めても毎月1日になる
export const firstChargeUnix = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, 1) / 1000);
};
