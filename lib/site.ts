// 📂 lib/site.ts
// 📝 役割：検索とAIに向けて出すサイトの決まり（正式なアドレス・名前・会社・料金）。サイトマップ・robots・llms.txt・構造化データで使う
//   ⚠ 正式なアドレスは www つき。event-manager.app（www なし）は Vercel で www へ転送している
import { PLANS, INCLUDED_ADMINS, EXTRA_ADMIN_PRICE, withTax } from "@/lib/plans";

export const SITE_URL = "https://www.event-manager.app";
export const SITE_NAME = "イベントシステム絆太郎（ばんたろう）";
export const SITE_DESCRIPTION =
  "セミナー・研修会・勉強会の告知ページと申込フォームを作り、受付のメール、当日のQR受付、事前・事後アンケート、参加者の名簿とお知らせのメールまでを1つで行えるイベント管理システムです。";

export const COMPANY = {
  name: "株式会社はなひろ",
  url: "https://www.hana-hiro.com/",
  profileUrl: "https://info.hana-hiro.com/company.html",
};

const yen = (n: number) => n.toLocaleString("ja-JP");

// 料金（税込）。lib/plans.ts から作るので、料金を変えればここも変わる
export const PRICE_LINES = [
  { name: PLANS.free.name, price: 0, unit: "", note: "イベント1件まで" },
  { name: PLANS.spot.name, price: withTax(PLANS.spot.price), unit: "1回", note: "1回のイベントごと" },
  { name: PLANS.standard.name, price: withTax(PLANS.standard.price), unit: "月", note: `管理者${INCLUDED_ADMINS}人まで。${INCLUDED_ADMINS + 1}人目から1人につき月${yen(withTax(EXTRA_ADMIN_PRICE))}円` },
  { name: PLANS.pro.name, price: withTax(PLANS.pro.price), unit: "月", note: "支部・拠点を増やせる。管理者の人数は数えない" },
];

export const priceText = (p: (typeof PRICE_LINES)[number]) =>
  p.price === 0 ? "0円" : `${p.unit === "月" ? "月" : "1回"} ${yen(p.price)}円`;

// トップページの構造化データ（ソフトウェアと料金・提供する会社）
export function softwareJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    alternateName: ["絆太郎", "イベントの絆太郎"],
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "ja",
    offers: PRICE_LINES.map((p) => ({
      "@type": "Offer",
      name: p.name,
      price: String(p.price),
      priceCurrency: "JPY",
      description: `${priceText(p)}（税込）。${p.note}`,
      ...(p.unit === "月"
        ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.price, priceCurrency: "JPY", unitText: "月", valueAddedTaxIncluded: true } }
        : {}),
    })),
    publisher: { "@type": "Organization", name: COMPANY.name, url: COMPANY.url },
  };
}
