// 📂 app/blog/[slug]/page.tsx
// 📝 役割：ブログの記事。本文は Notion のブロック（components/blog/NotionBlocks）。下に「この記事の監修」と絆太郎の案内
//   検索とAIのために、正式なアドレス（canonical）・公開日と更新日・構造化データ（記事・パンくず・監修者）を出す
//   更新日（Notion の最後に直した日時）は画面には出さない。ステータスを🟢にしただけでも変わるので
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { LightPage } from "@/components/site/SiteChrome";
import { NotionBlocks } from "@/components/blog/NotionBlocks";
import AuthorBox, { supervisorJsonLd } from "@/components/blog/AuthorBox";
import { BlogCta } from "@/components/blog/BlogCta";
import { getPublishedPosts, getPostBySlug, formatDate } from "@/lib/blog";
import { COMPANY, SITE_NAME, SITE_URL } from "@/lib/site";

export const revalidate = 600;

type Params = { slug: string };

export async function generateStaticParams() {
  return (await getPublishedPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "記事が見つかりません", robots: { index: false } };
  const url = `${SITE_URL}/blog/${post.slug}`;
  const description = post.excerpt || "セミナー・研修会・勉強会を開く方へ、主催の実務をまとめています。";
  return {
    title: post.title,
    description,
    keywords: post.keywords ? post.keywords.split(/[,、\s]+/).filter(Boolean) : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description,
      url,
      type: "article",
      locale: "ja_JP",
      siteName: "イベントシステム絆太郎",
      publishedTime: post.date || undefined,
      modifiedTime: post.updated || undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const url = `${SITE_URL}/blog/${post.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt || undefined,
      keywords: post.keywords || undefined,
      articleSection: post.category || undefined,
      inLanguage: "ja",
      datePublished: post.date || undefined,
      dateModified: post.updated || post.date || undefined,
      author: { "@type": "Organization", name: COMPANY.name, url: COMPANY.url },
      reviewedBy: supervisorJsonLd(),
      publisher: { "@type": "Organization", name: `${SITE_NAME}（${COMPANY.name}）`, url: `${SITE_URL}/`, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.webp` } },
      mainEntityOfPage: url,
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "トップ", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "ブログ", item: `${SITE_URL}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];

  return (
    <LightPage>
      <main className="max-w-3xl mx-auto px-4 pt-8 md:pt-10 pb-16">
        <nav aria-label="現在地" className="flex flex-wrap items-center gap-1 text-xs text-slate-600">
          <Link href="/" className="hover:text-slate-800">トップ</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <Link href="/blog" className="hover:text-slate-800">ブログ</Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-slate-600 line-clamp-1">{post.title}</span>
        </nav>

        <article className="mt-8 text-[1.02rem] text-slate-800">
          <header className="mb-10 border-b border-slate-200 pb-8">
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
              {post.date && <time dateTime={post.date}>{formatDate(post.date)}</time>}
              {post.category && <span className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs text-[#9a3412]">{post.category}</span>}
            </div>
            <h1 className="text-balance text-[1.75rem] sm:text-[2.1rem] font-bold leading-tight text-slate-900 [word-break:auto-phrase]">{post.title}</h1>
          </header>
          <NotionBlocks blocks={post.blocks} />
        </article>

        <AuthorBox />
        <BlogCta />

        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> ブログの一覧へ
          </Link>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      </main>
    </LightPage>
  );
}
