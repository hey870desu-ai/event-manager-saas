import Link from "next/link";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

// カードの月額（毎月1日に決済）の、Stripe でカードを登録したあとの画面
export default async function BillingRegisteredPage({ searchParams }: { searchParams: Promise<{ start?: string; canceled?: string }> }) {
  const { start, canceled } = await searchParams;
  const month = start && /^\d{4}-(0[1-9]|1[0-2])$/.test(start) ? Number(start.slice(5)) : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 md:py-20 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter mb-12">
          <Sparkles className="text-indigo-600" size={24} />
          Event Manager
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 md:p-10">
          {canceled ? (
            <>
              <AlertCircle className="text-slate-400 mb-4" size={40} />
              <h1 className="text-xl md:text-2xl font-bold mb-4">カードの登録は済んでいません</h1>
              <p className="text-slate-600 leading-relaxed [word-break:auto-phrase] text-pretty">
                もう一度登録するときは、担当者にお知らせください。
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="text-emerald-500 mb-4" size={40} />
              <h1 className="text-xl md:text-2xl font-bold mb-4">カードの登録が済みました</h1>
              <p className="text-slate-600 leading-relaxed [word-break:auto-phrase] text-pretty">
                {month ? `1回目の決済は${month}月1日です。` : ""}以降は毎月1日に決済します。
              </p>
            </>
          )}
          <p className="text-sm text-slate-500 leading-relaxed mt-6 [word-break:auto-phrase] text-pretty">
            ご不明な点は、株式会社はなひろ（info@hana-hiro.com）までお知らせください。
          </p>
        </div>
      </div>
    </div>
  );
}
