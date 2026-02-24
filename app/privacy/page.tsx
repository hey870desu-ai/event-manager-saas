import Link from "next/link";
import { Sparkles, ArrowLeft, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-12 md:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* ▼ ロゴ・戻るリンク（修正版だっぺ！） */}
<div className="flex justify-between items-center mb-12">
  <Link href="/" className="flex items-center gap-2.5 group">
    {/* 1. 星マークを icon.webp に差し替え */}
    <img 
      src="/icon.webp" 
      alt="絆太郎" 
      className="h-9 w-9 object-contain group-hover:scale-105 transition-transform" 
    />
    {/* 2. 名前を「絆太郎」だけに。Event Manager は卒業だっぺ！ */}
    <span className="font-black text-2xl tracking-tighter text-slate-900">
      絆太郎 Event Manager
    </span>
  </Link>
  
  <Link href="/" className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">
    <ArrowLeft size={16} /> TOPへ戻る
  </Link>
</div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-emerald-600 px-8 py-10 text-center">
            <Lock className="text-white/80 mx-auto mb-4" size={48} />
            <h1 className="text-2xl md:text-3xl font-bold text-white">プライバシーポリシー</h1>
            <p className="text-emerald-100 mt-2 text-sm">Privacy Policy</p>
          </div>
          
          <div className="p-8 md:p-12 space-y-10 text-sm md:text-base leading-relaxed">
            
            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第1条（個人情報の定義）</h2>
              <p>「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，生年月日，住所，電話番号，連絡先その他の記述等により特定の個人を識別できる情報（個人識別情報）を指します。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第2条（個人情報の収集方法）</h2>
              <p>当社は，ユーザーが本サービスを利用する際、氏名，会社名，部署名，メールアドレス，電話番号などの個人情報を取得することがあります。また、ユーザーが主催するイベントの参加者が入力した情報についても、本サービスの提供・運営および主催者への提供のために取得します。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第3条（個人情報を収集・利用する目的）</h2>
              <p>当社が個人情報を収集・利用する目的は，以下のとおりです。<br />
              ・本サービスの提供・運営のため<br />
              ・ユーザーおよびイベント参加者からのお問い合わせに対応するため<br />
              ・本サービスの新機能，更新情報等の送付のため<br />
              ・有料サービスにおいて，ユーザーに利用料金を請求するため<br />
              <strong>・イベント主催者（以下「主催者」）によるイベント運営、受付管理、および主催者が実施するサービス・イベントに関する案内のため</strong></p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第4条（主催者への個人情報の提供）</h2>
              <p>1. 本サービスはイベント管理プラットフォームであり、参加者がイベントに申し込んだ際、入力された個人情報は当該イベントの主催者に提供されます。<br />
              2. 提供された個人情報は、各主催者の責任において管理されます。主催者による個人情報の取り扱いについては、各主催者へ直接お問い合わせください。<br />
              3. 当社は、主催者に対し、個人情報保護法を遵守し、参加者のプライバシーに配慮した適切な管理を行うよう求めております。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第5条（第三者提供の制限）</h2>
              <p>当社は，前条（主催者への提供）および次に掲げる場合を除いて，あらかじめユーザーの同意を得ることなく，第三者に個人情報を提供することはありません。<br />
              ・法令に基づく場合<br />
              ・決済処理を委託する場合（Stripe等、決済代行会社への提供）<br />
              ・人の生命，身体または財産の保護のために必要がある場合であって，本人の同意を得ることが困難であるとき</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第6条（安全管理措置）</h2>
              <p>当社は、個人情報の漏洩、滅失または毀損の防止その他の個人情報の安全管理のために、SSL（Secure Socket Layer）による通信の暗号化や、厳重なアクセス制限など、最新のセキュリティ対策を講じています。決済情報については、当社サーバーを通過することなく、国際的なセキュリティ基準（PCI DSS）に準拠した決済代行会社（Stripe）に直接送信・管理されます。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第7条（個人情報の開示・訂正・削除）</h2>
              <p>ユーザーおよび参加者は，当社の保有する自己の個人情報の訂正，追加または削除を請求することができます。当社は，これらの請求を受けた場合，遅滞なく調査を行い，適切に対応いたします。</p>
            </section>

            <section>
              <h2 className="text-lg font-bold border-l-4 border-emerald-600 pl-3 mb-4 text-slate-900">第8条（お問い合わせ窓口）</h2>
              <p>本ポリシーに関するお問い合わせは，下記の窓口までお願いいたします。<br /><br />
              住所：福島県須賀川市日向町22サンディアスB102<br />
              社名：株式会社はなひろ<br />
              担当：塙 啓之<br />
              Eメールアドレス：info@hana-hiro.com</p>
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