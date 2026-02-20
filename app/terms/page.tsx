import Link from "next/link";
import { Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";

export default function TermsPage() {
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
          <div className="bg-indigo-600 px-8 py-10 text-center">
            <ShieldCheck className="text-white/80 mx-auto mb-4" size={48} />
            <h1 className="text-2xl md:text-3xl font-bold text-white">利用規約</h1>
            <p className="text-indigo-100 mt-2 text-sm">Terms of Service</p>
          </div>
          
          <div className="p-8 md:p-12 space-y-10 text-sm md:text-base leading-relaxed">
            
            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第1条（適用）</h2>
              <p>本規約は、株式会社はなひろ（以下、「当社」）が提供するイベント管理システム「Event Manager」（以下、「本サービス」）の利用条件を定めるものです。利用者の皆様（以下、「ユーザー」）には、本規約に従って本サービスをご利用いただきます。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第2条（利用登録とアカウント管理）</h2>
              <p>1. 本サービスの利用を希望する者が本規約に同意し、当社の定める方法によって利用登録を申請し、当社がこれを承認することによって、利用登録が完了するものとします。<br />
              2. ユーザーは、自己の責任において、本サービスのアカウントおよびパスワードを適切に管理するものとします。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第3条（利用料金および支払方法）</h2>
              <p>1. ユーザーは、本サービスの有料プラン（プロプラン等）を利用する場合、当社が定める利用料金を、当社が指定する支払方法（クレジットカード決済等）により支払うものとします。<br />
              2. 有料プランは月額制であり、解約手続きが行われない限り、毎月自動的に更新されるものとします。<br />
              3. 利用料金の支払いを遅滞した場合、当社は本サービスの提供を停止することができるものとします。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第4条（禁止事項）</h2>
              <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。<br />
              ・法令または公序良俗に違反する行為<br />
              ・本サービスの運営を妨害するおそれのある行為<br />
              ・他のユーザーや第三者に成りすます行為<br />
              ・公序良俗に反する内容のイベント、または違法な勧誘を目的としたイベントの作成</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第5条（本サービスの提供の停止等）</h2>
              <p>当社は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。<br />
              ・本サービスにかかるシステム保守・点検を緊急に行う場合<br />
              ・停電、天災、通信回線の事故等により本サービスの提供が困難となった場合<br />
              ・その他、当社が本サービスの提供が困難と判断した場合</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第6条（著作権および知的財産権）</h2>
              <p>1. ユーザーが本サービスを利用して作成したイベント内容（テキスト、画像等）の著作権は、当該ユーザーに帰属します。<br />
              2. 本サービスを構成するプログラム、デザイン等の知的財産権は、当社に帰属します。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第7条（免責事項）</h2>
              <p>当社は、本サービスに関してユーザーに生じた損害について、当社の過失（重過失を除く）による場合は、ユーザーが過去1ヶ月間に当社に支払った利用代金を上限として賠償するものとします。ただし、不可抗力やユーザーの過失に起因する損害については一切の責任を負いません。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-indigo-600 pl-3 mb-4 text-slate-900">第8条（準拠法・裁判管轄）</h2>
              <p>本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当社の本店所在地を管轄する裁判所（福島地方裁判所または郡山簡易裁判所）を専属的合意管轄とします。</p>
            </section>

            <div className="pt-8 border-t border-slate-100 text-right text-slate-500 text-xs">
              <p>2026年2月20日 制定</p>
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