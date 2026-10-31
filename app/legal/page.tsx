import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";

// お問い合わせの受付時間（Stripe のコンビニ決済の審査で「サポートの対応時間」を求められた・2026-03-11）
const SUPPORT_HOURS = "平日 9:00〜18:00（土日祝日・年末年始を除く）";

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
                  <td className="py-5 px-6 font-medium">024-954-5586</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">メールアドレス</th>
                  <td className="py-5 px-6 font-medium">info@hana-hiro.com</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">お問い合わせの<br/>受付時間</th>
                  <td className="py-5 px-6 leading-relaxed">{SUPPORT_HOURS}<br /><span className="text-sm text-slate-600">メールは24時間受け付け、受付時間内に順にお返事します。</span></td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">販売価格</th>
                  <td className="py-5 px-6">
                    スポット利用：1イベント 5,500円<br />
                    スタンダード：月額 3,300円<br />
                    <span className="text-sm text-slate-600 [word-break:auto-phrase]">（管理の人3人まで。4人目から1人につき月額 550円）</span><br />
                    プロプラン：月額 11,000円<br />
                    （いずれも税込）
                  </td>
                </tr>
                {/* 追加手数料と送料（Stripe のコンビニ決済の審査で「送料は無くても書く」と求められた・2026-10-29） */}
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">追加手数料等の<br/>追加料金</th>
                  <td className="py-5 px-6 text-slate-600 leading-relaxed">
                    ご利用料金・イベントの参加費のほかに、手数料はいただきません。<br />
                    クレジットカード決済・コンビニ決済の手数料もかかりません。<br />
                    インターネット接続料金、通信料金等はお客様のご負担となります。
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">送料</th>
                  <td className="py-5 px-6 text-slate-600">
                    サービスの性質上、送料は発生いたしません（商品の発送はありません）。
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">お支払方法</th>
                  <td className="py-5 px-6 leading-relaxed">
                    クレジットカード決済<br />
                    コンビニ決済（イベントの参加費のみ。対応しているイベントだけ。ファミリーマート・ローソン・ミニストップ・セイコーマート）
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">代金の支払時期</th>
                  <td className="py-5 px-6 text-slate-600 leading-relaxed">
                    ご利用料金：初回お申込み時、及び以降毎月自動更新時に決済されます。<br />
                    イベントの参加費：クレジットカードはお申込みの時。コンビニ決済はお申込みのあと3日以内（期限は決済の画面に表示します）。
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">役務の提供時期</th>
                  <td className="py-5 px-6 leading-relaxed">
                    ご利用料金：お申込み完了後、直ちにご利用いただけます。<br />
                    イベント：各イベントのページに記載の開催日時に提供します。
                  </td>
                </tr>
                <tr>
                  <th className="py-5 px-6 text-left bg-slate-50/50 font-bold text-slate-500">返品・キャンセル</th>
                  <td className="py-5 px-6 text-slate-600 leading-relaxed">
                    ご利用料金：デジタルコンテンツの性質上、決済完了後の返金・返品はお受けできません。解約は随時可能ですが、次回の決済予定日までに解約手続きを行ってください。<br />
                    イベントの参加費：受付のメールのキャンセルのリンクから手続きいただけます。返金の有無と割合は、各イベントの申込フォームに記載のキャンセル・返金の決まりによります。コンビニ決済の返金は、Stripe からお送りするメールで返金先の口座をご指定いただき、お振込みでお返しします。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* イベントの参加費のお支払いの流れ */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
          <div className="bg-slate-900 px-8 py-6">
            <h2 className="text-lg md:text-xl font-bold text-white">イベントの参加費のお支払いの流れ</h2>
          </div>
          <div className="p-6 md:p-8 text-sm md:text-base leading-relaxed space-y-5">
            <p>イベントのページの申込フォームに入力して送ったあと、イベントごとに主催者が決めた方法でお支払いいただきます（当日会場でのお支払い、主催者が案内する方法での事前のお支払い、クレジットカード、コンビニ決済）。クレジットカードとコンビニ決済は、決済の画面（Stripe）でお支払いいただきます。イベントの参加費の販売業者は各イベントの主催者で、イベントのページから主催者の「特定商取引法に基づく表記」をご覧いただけます。</p>
            <div>
              <p className="font-bold mb-1">クレジットカード</p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>決済の画面でカードの情報を入れます。</li>
                <li>その場で決済され、お申込みが確定します。</li>
                <li>受付のメールが届きます。</li>
              </ol>
            </div>
            <div>
              <p className="font-bold mb-1">コンビニ決済（対応しているイベントだけ）</p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>決済の画面で「コンビニ決済」を選び、お名前とメールアドレスを入れます。</li>
                <li>支払番号と確認番号、お支払いの期限（3日以内）が表示されます。</li>
                <li>期限までに、ファミリーマート・ローソン・ミニストップ・セイコーマートのいずれかで、現金でお支払いください。</li>
                <li>お支払いが確認されると、お申込みが確定し、受付のメールが届きます。</li>
                <li>期限までにお支払いがない場合、お申込みは取り消しになります。</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-xs">
          © {new Date().getFullYear()} Hanahiro Inc. CARE DESIGN WORKS.
        </div>
      </div>
    </div>
  );
}