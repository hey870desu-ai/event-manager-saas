// 📂 app/sitemap.xml/route.ts → /sitemap.xml
// 📝 役割：検索エンジンに知らせるページの一覧。トップ・使い方・ブログと記事・規約など。
//   お客様のイベントのページ（/t/…）は入れない（お客様のもので、終われば役目を終えるため）
//   ⚠ 2026-10-27 まで app/sitemap.ts（Next の sitemap の決まりの形）だったが、Vercel では出したときの1回だけ作られ、
//     revalidate を書いても読み直されなかった（新しい記事がサイトマップに出ない）。読み直しが効いている llms.txt と同じ作りにした
import { getPublishedPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export const revalidate = 600;

type Entry = { loc: string; lastmod?: string; changefreq: string; priority: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const iso = (d?: string) => {
  if (!d) return undefined;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? undefined : t.toISOString();
};

export async function GET() {
  const posts = await getPublishedPosts();
  const entries: Entry[] = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1" },
    { loc: `${SITE_URL}/guide`, changefreq: "monthly", priority: "0.9" },
    { loc: `${SITE_URL}/blog`, lastmod: iso(posts[0]?.updated || posts[0]?.date), changefreq: "weekly", priority: "0.8" },
    ...posts.map((p) => ({ loc: `${SITE_URL}/blog/${p.slug}`, lastmod: iso(p.updated || p.date), changefreq: "monthly", priority: "0.7" })),
    { loc: `${SITE_URL}/contact`, changefreq: "yearly", priority: "0.4" },
    { loc: `${SITE_URL}/legal`, changefreq: "yearly", priority: "0.3" },
    { loc: `${SITE_URL}/terms`, changefreq: "yearly", priority: "0.3" },
    { loc: `${SITE_URL}/privacy`, changefreq: "yearly", priority: "0.3" },
  ];
  const body = entries
    .map((e) => `<url>\n<loc>${esc(e.loc)}</loc>\n${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>\n` : ""}<changefreq>${e.changefreq}</changefreq>\n<priority>${e.priority}</priority>\n</url>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=600" },
  });
}
