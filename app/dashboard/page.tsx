"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { LogOut, Building2, Download, FileText, Calendar, AlertCircle, ArrowLeft, CreditCard, Sparkles, CheckCircle2 } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/InvoicePDF";

type TenantData = { id: string; name: string; plan: string; status: string; };
type InvoiceData = { id: string; month: string; amount: number; status: string; };

export default function TenantBillingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/login"); return; }
      setUser(currentUser);
      
      try {
        const adminRef = doc(db, "admin_users", currentUser.email!);
        const adminSnap = await getDoc(adminRef);

        if (adminSnap.exists()) {
          const adminData = adminSnap.data();
          const targetTenantId = adminData.tenantId;

          if (targetTenantId) {
            const tenantRef = doc(db, "tenants", targetTenantId);
            const tenantSnap = await getDoc(tenantRef);

            if (tenantSnap.exists()) {
              const tenantData = { id: tenantSnap.id, ...tenantSnap.data() } as TenantData;
              setTenant(tenantData);

              const invQ = query(collection(db, "tenants", targetTenantId, "invoices"), orderBy("month", "desc"));
              const invSnap = await getDocs(invQ);
              setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() } as InvoiceData)));
            }
          }
        }
      } catch (e) { 
        console.error("データ取得エラー:", e); 
      } finally { 
        setLoading(false); 
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => { await signOut(auth); router.push("/login"); };
  
// 1. 関数のカッコの中に (planType: 'standard' | 'spot') を追加するんだっぺ！
const handleUpgrade = async (planType: 'standard' | 'spot') => {
  if(!tenant || !user) return;
  
  // 💡 ここで「mode」と「priceId」を定義してやるのがポイントだぞい
  const mode = planType === 'standard' ? 'subscription' : 'payment';
  const priceId = planType === 'standard' 
    ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD 
    : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SPOT;

  const planLabel = planType === 'standard' ? "スタンダード（月額）" : "スポット（5,500円）";

  if(!confirm(`${planLabel} の申し込み画面へ移動しますか？`)) return;

  setLoading(true);

  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tenantId: tenant.id,
        email: user.email,
        name: tenant.name,
        priceId: priceId, // 👈 ここもさっき定義した priceId にするっぺ
        mode: mode,       // 👈 これで波線が消える！
        planType: planType // 👈 これで波線が消える！
      }),
    });
    
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      console.error("API Error:", data.error);
      alert(`エラー: ${data.error || "失敗しました"}`);
      setLoading(false);
    }
  } catch (e) {
    console.error(e);
    alert("通信エラーが発生しました");
    setLoading(false);
  }
};

  // ★追加：Stripeポータル（解約・カード変更）を開くっぺ！
  const handleManageBilling = async () => {
    if (!tenant) return;
    setLoading(true);
    try {
      const res = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(`管理画面エラーだっぺ！: ${data.error}`);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div></div>;
  
  if (!tenant) return (
    <div className="min-h-screen bg-[#0f111a] flex flex-col items-center justify-center text-white">
      <AlertCircle size={48} className="text-red-500 mb-4"/>
      <h2 className="text-xl font-bold">アカウント情報が見つかりません</h2>
      <button onClick={handleLogout} className="mt-4 text-sm bg-slate-800 hover:bg-slate-700 px-6 py-2 rounded-lg transition-colors">ログアウト</button>
    </div>
  );

  const isFree = !tenant.plan || tenant.plan === 'free';

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 font-sans">
      {/* ヘッダー */}
      <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/admin")} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors" title="イベント管理へ戻る">
              <ArrowLeft size={20}/>
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-indigo-500/20 p-1.5 rounded-lg"><Building2 className="text-indigo-400" size={18}/></div>
              <span className="font-bold text-white tracking-tight">{tenant.name} 様</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-400 transition-colors">
            <LogOut size={16}/> <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h1 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
            <CreditCard className="text-indigo-400"/> 契約・請求情報
          </h1>
          
          <div className="grid md:grid-cols-3 gap-4 mb-10">
            {/* 1. プラン情報（アップグレード導線付き） */}
            {/* 1. プラン情報 */}
<div className={`bg-slate-900 border ${isFree ? 'border-slate-800' : 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.2)]'} p-6 rounded-xl relative overflow-hidden group`}>
   <p className="text-xs text-slate-500 font-bold mb-1">現在のプラン</p>
   <div className="flex items-baseline gap-2 mb-3">
     <p className="text-3xl font-black text-white capitalize tracking-tight">{tenant.plan || "Free"}</p>
   </div>

   {isFree ? (
  <div className="flex flex-col gap-3 mt-2">
    {/* スタンダード用 */}
    <button 
      onClick={() => handleUpgrade('standard')}
      className="w-full py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
    >
      <Sparkles size={14}/> スタンダード（月額3,300円）
    </button>
    
    {/* スポット用（これを追加！） */}
    <button 
      onClick={() => handleUpgrade('spot')}
      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all"
    >
      <CheckCircle2 size={14}/> スポット利用（5,500円/回）
    </button>
  </div>
) : (
     <div className="space-y-3">
       <div className="text-xs text-emerald-400 flex items-center gap-1 font-bold">
         <CheckCircle2 size={14}/> プレミアム機能 利用中
       </div>
       {/* 💡 これが「おもてなし」の管理ボタンだっぺ！ */}
       <button 
         onClick={handleManageBilling}
         className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all"
       >
         <CreditCard size={14}/> お支払い情報の管理・解約
       </button>
     </div>
   )}
</div>

            {/* 2. 会員ID（はみ出し対策済み） */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-center">
               <p className="text-xs text-slate-500 font-bold mb-2">会員ID</p>
               {/* ▼▼▼ break-all で強制的に折り返し、文字サイズを調整 ▼▼▼ */}
               <p className="text-sm font-mono text-slate-300 break-all leading-relaxed select-all">
                 {tenant.id}
               </p>
            </div>

            {/* 3. 更新状況 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col justify-center">
               <p className="text-xs text-slate-500 font-bold mb-1">次回更新 / ステータス</p>
               <p className="text-lg font-bold text-slate-200">
                 {isFree ? "ー" : "自動更新"}
               </p>
               <p className="text-xs text-slate-500 mt-1">
                 {isFree ? "有効期限なし" : "2026/03/01"}
               </p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText className="text-indigo-400"/> 請求履歴</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[200px]">
            {invoices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-slate-500 gap-2">
                <FileText size={32} className="opacity-20"/>
                <p>請求データはありません</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-950 p-2 rounded border border-slate-800 text-slate-400"><Calendar size={20}/></div>
                      <div>
                        <p className="text-white font-bold">{inv.month.replace('-', '年')}月分</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                           {inv.status==='paid' 
                             ? <span className="text-emerald-400">● 領収済</span> 
                             : <span className="text-orange-400">● 未払い</span>
                           }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 justify-end">
                      <p className="text-lg font-bold text-white">¥{inv.amount.toLocaleString()}</p>
                      <PDFDownloadLink
                        document={
                          <InvoicePDF 
                            tenant={tenant} invoice={inv}
                            myCompany={{
                              orgName: "株式会社はなひろ\nCARE DESIGN WORKS事業部", 
                              zipCode: "962-0015", address: "福島県須賀川市日向町22 サンディアスB102", phone: "090-7068-5817", email: "info@hana-hiro.com", invoiceNumber: "T6380001023295"
                            }}
                          />
                        }
                        fileName={`請求書_${tenant.name}_${inv.month}.pdf`}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                      >
                        {({ loading }) => (loading ? '...' : <><Download size={16}/> PDF</>)}
                      </PDFDownloadLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}