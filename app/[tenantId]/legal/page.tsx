"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import { Shield, Mail, Phone, MapPin, Building, User } from "lucide-react";

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

  if (loading) return <div className="min-h-screen flex items-center justify-center">読み込み中だっぺ...</div>;
  if (!tenantData) return <div className="min-h-screen flex items-center justify-center">情報が見つからないぞい。</div>;

  const legalItems = [
    { label: "販売業者", value: tenantData.legalCompanyName || tenantData.orgName, icon: <Building size={18}/> },
    { label: "運営責任者", value: tenantData.representative, icon: <User size={18}/> },
    { label: "所在地", value: tenantData.address, icon: <MapPin size={18}/> },
    { label: "電話番号", value: tenantData.phone, icon: <Phone size={18}/> },
    { label: "メールアドレス", value: tenantData.contactEmail || "各イベントページのお問い合わせ先をご確認ください", icon: <Mail size={18}/> },
    { label: "販売価格", value: "各イベントページに記載の通り（税込表示）", icon: <Shield size={18}/> },
    { label: "代金の支払方法", value: "クレジットカード決済、当日現金払い", icon: <Shield size={18}/> },
    { label: "役務の提供時期", value: "お申し込み完了後、即時（当日会場にて提供）", icon: <Shield size={18}/> },
    { label: "返品・キャンセル", value: "イベントの性質上、お申し込み後のキャンセルは各イベント詳細ページのキャンセルポリシーに従います。", icon: <Shield size={18}/> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">特定商取引法に基づく表記</h1>
          <p className="text-slate-500 font-medium">「{tenantData.orgName}」が運営するサービスについての法的表示</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {legalItems.map((item, idx) => (
              <div key={idx} className="flex flex-col md:flex-row p-6 md:p-8 hover:bg-slate-50 transition-colors">
                <div className="md:w-1/3 flex items-center gap-3 text-slate-500 font-bold mb-2 md:mb-0">
                  <span className="text-indigo-500">{item.icon}</span>
                  <span className="text-sm uppercase tracking-wider">{item.label}</span>
                </div>
                <div className="md:w-2/3 text-slate-800 font-medium leading-relaxed">
                  {item.value || <span className="text-red-400 text-xs italic">未登録だっぺ（管理画面から入力してくんちぇ）</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center text-slate-400 text-xs">
          © 2026 {tenantData.orgName} - Powered by 絆太郎
        </div>
      </div>
    </div>
  );
}