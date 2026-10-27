// 📂 app/blog/page.tsx
// 📝 役割：ブログの一覧。記事は Notion「📝 絆太郎ブログ」の🟢 公開だけ（lib/blog.ts）。10分ごとに読み直す
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Newspaper } from "lucide-react";
import { LightPage, ORANGE } from "@/components/site/SiteChrome";
import { BlogCta } from "@/components/blog/BlogCta";
import { getPublishedPosts, formatDate } from "@/lib/blog";
import { SITE_URL } from "@/lib/site";

export const revalidate = 600;

const TITLE = "絆太郎ブログ｜セミナー・研修会の主催の実務";
const DESCRIPTION =
  "セミナー・研修会・勉強会を開く方へ。申込フォームの作り方、当日の受付、アンケートの質問の立て方、お礼やリマインドのメール、参加費とキャンセルの決まりなど、主催の実務をまとめています。";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/blog`, type: "website", locale: "ja_JP", siteName: "イベントシステム絆太郎" },
};

export default async function BlogIndex() {
  const posts = await getPublishedPosts();

  return (
    <LightPage>
      <main className="max-w-5xl mx-auto px-4 pt-12 md:pt-16 pb-16">
        <p className="text-sm font-bold mb-3" style={{ color: ORANGE }}>ブログ</p>
        <h1 className="text-3xl md:text-[2.4rem] font-bold text-slate-900 leading-tight">セミナー・研修会の主催の実務</h1>
        <p className="mt-5 text-base md:text-lg text-slate-700 leading-[1.9] max-w-3xl">{DESCRIPTION}</p>

        {posts.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-200 bg-white flex flex-col items-center gap-3 px-6 py-16 text-center">
            <Newspaper className="h-10 w-10" style={{ color: ORANGE }} aria-hidden="true" />
            <p className="text-lg font-bold text-slate-900">記事は準備中です</p>
            <p className="max-w-md text-sm text-slate-600 leading-relaxed">セミナーや研修会を開く方に役立つ記事を、これから順にお届けします。</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col rounded-xl border border-slate-200 bg-white p-6 hover:border-orange-300 hover:shadow-md transition-all">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {post.date && <time dateTime={post.date} className="text-xs text-slate-500">{formatDate(post.date)}</time>}
                  {post.category && <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs text-[#9a3412]">{post.category}</span>}
                </div>
                <h2 className="mb-2 text-balance text-lg font-bold leading-snug text-slate-900 [word-break:auto-phrase] group-hover:text-[#c2410c]">{post.title}</h2>
                {post.excerpt && <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#c2410c]">
                  続きを読む <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        )}

        <BlogCta />
      </main>
    </LightPage>
  );
}
