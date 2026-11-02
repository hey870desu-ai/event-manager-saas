// 📂 lib/card-pay.ts
// 📝 役割：申込のときに参加費をカード（・コンビニ）で払っていただくかの決まり（画面とサーバーで同じものを使う）
//   event.payMode === "card" … 申込のときにカードで払っていただく。主催者の受け取り口座（Stripe の Express）が使えるときだけ（2026-11-03〜）
//   payMode が空で、塙さんの会社（caredesignworks）が前から Stripe をつないでいる … 前からの形（運営の Stripe に直接入る）
//   payMode === "link" … 申込のあと、事前に（お金は絆太郎を通らない・lib/pay-link.ts）
//   それ以外の空 … 当日、会場で
import { isPayLinkEvent } from "@/lib/pay-link";

export const LEGACY_DIRECT_TENANT = "caredesignworks";

export type CardPayMode = "card" | "none" | "unavailable";

export function cardPayModeFor(event: any, tenant: any, tenantId?: string): CardPayMode {
  if (isPayLinkEvent(event)) return "none";
  if (event?.payMode === "card") return tenant?.cardPayment?.ready ? "card" : "unavailable";
  if (!event?.payMode && (tenantId || tenant?.id) === LEGACY_DIRECT_TENANT && tenant?.stripeConnectId) return "card";
  return "none";
}
