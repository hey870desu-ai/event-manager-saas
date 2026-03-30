"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Shield, Mail, Phone, MapPin, Building, User, CreditCard, Clock, RefreshCcw, Globe, Lock, FileText, Monitor, BadgeCheck } from "lucide-react";

export default function LegalPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [tenantData, setTenantData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "tenants", tenantId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTenantData(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching tenant data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (tenantId) fetchData();
  }, [tenantId]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">読み込み中...</div>;
  if (!tenantData) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">情報が見つかりません。</div>;

  const orgName = tenantData.orgName || tenantData.name || "";
  const companyName = tenantData.legalCompanyName || orgName;

  const legalItems = [
    { label: "販売業者", value: companyName, icon: <Building size={18}/> },
    { label: "運営統括責任者", value: tenantData.representative, icon: <User size={18}/> },
    { label: "所在地", value: tenantData.address, icon: <MapPin size={18}/> },
    { label: "電話番号", value: tenantData.phone, icon: <Phone size={18}/>, note: "お問い合わせはメールにて承っております" },
    { label: "メールアドレス", value: tenantData.legalEmail || tenantData.ownerEmail || tenantData.contactEmail, icon: <Mail size={18}/> },
    { label: "ウェブサイト", value: tenantData.homepage, icon: <Globe size={18}/>, isLink: true },
    {
      label: "販売商品",
      value: "セミナー・イベント・講座等の参加権（オンラインまたは会場開催）",
      icon: <FileText size={18}/>,
    },
    {
      label: "販売価格",
      value: "各イベントページに記載の通り（税込表示）。表示価格以外の追加料金はかかりません。",
      icon: <CreditCard size={18}/>,
    },
    {
      label: "代金の支払方法",
      value: "クレジットカード決済（VISA / Mastercard / American Express / JCB）\n決済処理はStripe, Inc. の安全なシステムを通じて行われます。",
      icon: <CreditCard size={18}/>,
    },
    {
      label: "代金の支払時期",
      value: "お申し込み時に即時決済",
      icon: <Clock size={18}/>,
    },
    {
      label: "役務の提供時期",
      value: "お申し込み完了後、即時ご利用いただけます。イベント・セミナーは各ページに記載の開催日時に提供いたします。オンライン開催の場合は、参加に必要な情報をメールにてご案内いたします。",
      icon: <Clock size={18}/>,
    },
    {
      label: "返品・キャンセルについて",
      value: "お申し込み後のキャンセルは、各イベントの確認メールに記載のキャンセルリンクより手続きいただけます。有料イベントの場合、キャンセル時に参加費は全額返金いたします（クレジットカードへの返金処理には最大10日ほどかかる場合がございます）。なお、イベント当日以降のキャンセル・返金はお受けできない場合がございます。",
      icon: <RefreshCcw size={18}/>,
    },
    {
      label: "動作環境",
      value: "Google Chrome / Safari / Microsoft Edge 等の最新バージョン。オンライン参加にはインターネット接続環境が必要です。",
      icon: <Monitor size={18}/>,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* ヘッダー */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-bold px-4 py-2 rounded-full border border-indigo-100 mb-6">
            <Shield size={14} />
            法令に基づく表示
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-3">特定商取引法に基づく表記</h1>
          <p className="text-slate-500 text-sm">
            {orgName} が運営するイベント・セミナー申し込みサービスについての法的表示です。
          </p>
        </div>

        {/* メインテーブル */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {legalItems.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row p-5 md:p-6 hover:bg-slate-50/50 transition-colors">
                <div className="md:w-1/3 flex items-start gap-2.5 text-slate-500 font-bold mb-2 md:mb-0 pt-0.5">
                  <span className="text-indigo-500 flex-shrink-0">{item.icon}</span>
                  <span className="text-xs uppercase tracking-wider leading-snug">{item.label}</span>
                </div>
                <div className="md:w-2/3 text-slate-800 text-sm leading-relaxed">
                  {item.value ? (
                    <>
                      {(item as any).isLink ? (
                        <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500 underline underline-offset-2">{item.value}</a>
                      ) : (
                        <span className="whitespace-pre-line">{item.value}</span>
                      )}
                      {(item as any).note && !item.value.includes("@") && (
                        <span className="block text-xs text-slate-400 mt-1">※ {(item as any).note}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-300 text-xs">（管理画面から入力してください）</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* セキュリティ・信頼性セクション */}
        <div className="mt-8 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Lock size={16} className="text-indigo-500" />
            お客様情報の安全性について
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <BadgeCheck size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700">SSL暗号化通信</p>
                <p className="text-xs text-slate-500 mt-0.5">すべてのページでSSL（TLS 1.3）による暗号化通信を行っています。</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <BadgeCheck size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700">Stripe決済</p>
                <p className="text-xs text-slate-500 mt-0.5">クレジットカード情報は当社サーバーを経由せず、PCI DSS Level 1準拠のStripeが安全に処理します。</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <BadgeCheck size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700">個人情報の取り扱い</p>
                <p className="text-xs text-slate-500 mt-0.5">お預かりした個人情報はイベント運営のみに使用し、第三者への提供は行いません。</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl">
              <BadgeCheck size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700">返金保証</p>
                <p className="text-xs text-slate-500 mt-0.5">有料イベントのキャンセル時は、お支払い済みの参加費を全額返金いたします。</p>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-10 text-center space-y-2">
          <p className="text-slate-400 text-xs">
            本ページに記載の内容は、特定商取引に関する法律（昭和51年法律第57号）第11条に基づくものです。
          </p>
          <p className="text-slate-300 text-[11px]">
            &copy; {new Date().getFullYear()} {orgName} &mdash; Powered by 絆太郎 Event Manager
          </p>
        </div>
      </div>
    </div>
  );
}
