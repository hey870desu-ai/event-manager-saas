import Link from "next/link";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { monthsLabel } from "@/lib/plans";

// カードの月額（毎月1日に決済）・年払い（毎年、始まりの月の1日に決済）の、Stripe でカードを登録したあとの画面
//   now＝申し込みのときに先に決済した月（「2026-10,2026-11」のように並べる）・cycle=year＝年払い
export default async function BillingRegisteredPage({ searchParams }: { searchParams: Promise<{ start?: string; now?: string; canceled?: string; cycle?: string }> }) {
  const { start, now, canceled, cycle } = await searchParams;
  const yearly = cycle === "year";
  const month = start && /^\d{4}-(0[1-9]|1[0-2])$/.test(start) ? Number(start.slice(5)) : null;
  const nowMonths = (typeof now === "string" ? now : "").split(",").filter((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m));

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
                {yearly && month
                  ? `${nowMonths.length > 0 ? `${monthsLabel(nowMonths)}の決済が済みました。` : ""}${month}月1日に1年分を決済します。以降は毎年${month}月1日に決済します。`
                  : nowMonths.length > 0 && month
                    ? `${monthsLabel(nowMonths)}の決済が済みました。${month}月1日からは、毎月1日に決済します。`
                    : `${month ? `1回目の決済は${month}月1日です。` : ""}以降は毎月1日に決済します。`}
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
