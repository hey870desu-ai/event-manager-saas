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
