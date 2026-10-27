// 📂 app/robots.ts → /robots.txt
// 📝 役割：検索とAIのクローラーへの案内。公開のページは誰でも読める（ChatGPT・Claude・Perplexity・Google の AI も含めて止めない＝AIの答えに出るため）
//   管理画面・API・申込者だけが使うページ（キャンセル・配信停止・支払い）は読ませない
//   お客様のイベントは告知のページだけを読ませ、申込・申込のあと・アンケート・チラシ（印刷用）は読ませない（2026-10-28）
import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin", "/super-admin", "/dashboard", "/api/", "/billing", "/onboarding", "/subscribe", "/cancel", "/unsubscribe",
        "/t/*/e/*/apply", "/t/*/e/*/thanks", "/t/*/e/*/survey", "/t/*/e/*/pre-survey", "/t/*/e/*/flyer",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
