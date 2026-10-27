// 📂 app/sitemap.ts → /sitemap.xml
// 📝 役割：検索エンジンに知らせるページの一覧。トップ・使い方・ブログと記事・規約など。
//   お客様のイベントのページ（/t/…）は入れない（お客様のもので、終われば役目を終えるため）
import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export const revalidate = 600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getPublishedPosts();
  const latest = posts[0]?.updated || posts[0]?.date;

  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/guide`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: latest ? new Date(latest) : undefined, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: p.updated || p.date ? new Date(p.updated || p.date) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE_URL}/legal`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
