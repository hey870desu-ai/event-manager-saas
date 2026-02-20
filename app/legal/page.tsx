import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 md:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* ロゴ・戻るリンク */}
        <div className="flex justify-between items-center mb-12">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <Sparkles className="text-indigo-600" size={24} />
            Event Manager
          </Link>
          <Link href="/" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={16} /> TOPへ戻る
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 px-8 py-6">
            <h1 className="text-xl md:text-2xl font-bold text-white">特定商取引法に基づく表記</h1>
          </div>
          
          <div className="p-0">
            <table className="w-full border-collapse text-sm md:text-base">
              <tbody>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left w-1/3 bg-slate-50/50 font-bold text-slate-500">販売業者</th>
                  <td className="py-5 px-6 font-medium">株式会社はなひろ</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">運営責任者</th>
                  <td className="py-5 px-6 font-medium">塙 啓之</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">所在地</th>
                  <td className="py-5 px-6 leading-relaxed">
                    〒962-0015<br />
                    福島県須賀川市日向町22サンディアスB102
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">電話番号</th>
                  <td className="py-5 px-6 font-medium">024-973-8701</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">メールアドレス</th>
                  <td className="py-5 px-6 font-medium">info@hana-hiro.com</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">販売価格</th>
                  <td className="py-5 px-6">
                    各プラン詳細ページに表示された価格に基づきます。<br />
                    （プロプラン：月額3,300円 税込）
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">商品代金以外に<br/>必要な料金</th>
                  <td className="py-5 px-6 text-slate-600">
                    インターネット接続料金、通信料金等はお客様のご負担となります。
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">お支払方法</th>
                  <td className="py-5 px-6">クレジットカード決済</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">代金の支払時期</th>
                  <td className="py-5 px-6 text-slate-600 leading-relaxed">
                    初回お申込み時、及び以降毎月自動更新時に決済されます。
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">役務の提供時期</th>
                  <td className="py-5 px-6">お申込み完了後、直ちにご利用いただけます。</td>
                </tr>
                <tr>
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">返品・キャンセル</th>
                  <td className="py-5 px-6 text-slate-600 leading-relaxed">
                    デジタルコンテンツの性質上、決済完了後の返金・返品はお受けできません。<br />
                    解約は随時可能ですが、次回の決済予定日までに解約手続きを行ってください。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-xs">
          © {new Date().getFullYear()} Hanahiro Inc. CARE DESIGN WORKS.
        </div>
      </div>
    </div>
  );
}