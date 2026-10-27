// 📂 components/site/SiteChrome.tsx
// 📝 役割：明るい色のページ（ブログ）の上の帯と下の帯。使い方のページ（app/guide）と同じ見た目
import Link from "next/link";
import type { ReactNode } from "react";

export const ORANGE = "#D97757";
export const PAGE_FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
          <img src="/icon.webp" alt="" className="h-7 w-7 object-contain" />
          <span>絆太郎</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3 text-sm">
          <Link href="/guide" className="hidden sm:inline px-2 text-slate-600 hover:text-slate-900">使い方</Link>
          <Link href="/blog" className="hidden sm:inline px-2 text-slate-600 hover:text-slate-900">ブログ</Link>
          <Link href="/#pricing" className="hidden sm:inline px-2 text-slate-600 hover:text-slate-900">料金</Link>
          <Link href="/login" className="px-2 text-slate-600 hover:text-slate-900">ログイン</Link>
          <Link href="/register" className="px-3 py-2 rounded-lg text-white font-bold" style={{ background: ORANGE }}>無料で始める</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-4 justify-between text-sm text-slate-500">
        <p>イベントシステム絆太郎（ばんたろう）</p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/" className="hover:text-slate-800">トップ</Link>
          <Link href="/guide" className="hover:text-slate-800">使い方</Link>
          <Link href="/blog" className="hover:text-slate-800">ブログ</Link>
          <Link href="/terms" className="hover:text-slate-800">利用規約</Link>
          <Link href="/privacy" className="hover:text-slate-800">プライバシーポリシー</Link>
          <Link href="/legal" className="hover:text-slate-800">特定商取引法</Link>
        </nav>
      </div>
    </footer>
  );
}

export function LightPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800" style={{ fontFamily: PAGE_FONT }}>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
