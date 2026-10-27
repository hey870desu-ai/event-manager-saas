// 📂 components/blog/BlogCta.tsx
// 📝 役割：ブログの一覧と記事の下に出す、絆太郎の案内（売り込みは本文に書かず、ここだけにする）
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ORANGE } from "@/components/site/SiteChrome";

export function BlogCta() {
  return (
    <aside className="mt-14 rounded-xl border border-orange-200 bg-white p-7 sm:p-8 text-center">
      <p className="text-xs font-bold tracking-wider" style={{ color: ORANGE }}>イベントシステム絆太郎</p>
      <h2 className="mt-2 text-xl font-bold text-slate-900 text-balance [word-break:auto-phrase]">申込から当日の受付、アンケートまでを1つで</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-700">
        <span className="inline-block">告知のページと申込フォーム、</span>
        <span className="inline-block">受付のメール、当日のQR受付、</span>
        <span className="inline-block">事前・事後アンケートまで。</span>
        <span className="inline-block">イベント1件までは無料で使えます。</span>
      </p>
      <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
        <Link href="/guide" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-800 hover:border-orange-300">
          できること・使い方を見る
        </Link>
        <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold text-white" style={{ background: ORANGE }}>
          無料で始める <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </aside>
  );
}
