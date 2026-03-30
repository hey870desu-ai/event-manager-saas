"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { LogOut, Building2, Download, FileText, Calendar, AlertCircle, ArrowLeft, CreditCard, Sparkles, CheckCircle2, X, Zap, BarChart3, Mail, QrCode, Users, Shield } from "lucide-react";
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

  const handleUpgrade = async (planType: 'standard' | 'spot') => {
    if(!tenant || !user) return;

    const mode = planType === 'standard' ? 'subscription' : 'payment';
    const priceId = planType === 'standard'
      ? process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_STANDARD
      : process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SPOT;

    const planLabel = planType === 'standard' ? "スタンダード（月額3,300円）" : "スポット利用（5,500円）";
    if(!confirm(`${planLabel} の申し込み画面へ移動しますか？`)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant.id, email: user.email, name: tenant.name,
          priceId, mode, planType
        }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { alert(`エラー: ${data.error || "失敗しました"}`); setLoading(false); }
    } catch (e) { console.error(e); alert("通信エラーが発生しました"); setLoading(false); }
  };

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
      if (data.url) { window.location.href = data.url; }
      else { alert(`エラー: ${data.error}`); setLoading(false); }
    } catch (e) { console.error(e); setLoading(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div></div>;

  if (!tenant) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900">
      <AlertCircle size={48} className="text-red-500 mb-4"/>
      <h2 className="text-xl font-bold">アカウント情報が見つかりません</h2>
      <button onClick={handleLogout} className="mt-4 text-sm bg-slate-200 hover:bg-slate-300 px-6 py-2 rounded-lg transition-colors">ログアウト</button>
    </div>
  );

  const isFree = !tenant.plan || tenant.plan === 'free';
  const isStandard = tenant.plan === 'standard';

  const features = [
    { name: "イベント作成", free: "1件", standard: "無制限", icon: <Calendar size={16}/> },
    { name: "参加者管理・受付", free: true, standard: true, icon: <Users size={16}/> },
    { name: "QRコード受付", free: true, standard: true, icon: <QrCode size={16}/> },
    { name: "メール送信", free: true, standard: true, icon: <Mail size={16}/> },
    { name: "アンケート結果の閲覧", free: false, standard: true, icon: <BarChart3 size={16}/> },
    { name: "CSV一括ダウンロード", free: false, standard: true, icon: <Download size={16}/> },
    { name: "イベント複製", free: false, standard: true, icon: <Sparkles size={16}/> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* ヘッダー */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/admin")} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
              <ArrowLeft size={20}/>
            </button>
            <div className="flex items-center gap-3">
              <img src="/icon.webp" alt="絆太郎" className="h-8 w-8 object-contain" />
              <span className="font-bold text-slate-900">{tenant.name} 様</span>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">
            <LogOut size={16}/> <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">

        {/* 現在のプラン表示 */}
        <div className={`rounded-2xl p-6 md:p-8 mb-8 border ${isFree ? 'bg-white border-slate-200' : 'bg-gradient-to-r from-indigo-600 to-violet-600 border-transparent text-white'}`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className={`text-xs font-bold mb-1 ${isFree ? 'text-slate-400' : 'text-indigo-200'}`}>現在のプラン</p>
              <p className="text-3xl font-black tracking-tight capitalize">{tenant.plan || "Free"}</p>
              <p className={`text-sm mt-1 ${isFree ? 'text-slate-500' : 'text-indigo-100'}`}>
                会員ID: <span className="font-mono">{tenant.id}</span>
              </p>
            </div>
            {!isFree && (
              <button onClick={handleManageBilling}
                className="bg-white/20 hover:bg-white/30 backdrop-blur text-white border border-white/30 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                <CreditCard size={16}/> お支払い情報の管理
              </button>
            )}
          </div>
        </div>

        {/* プラン比較（無料ユーザー向け） */}
        {isFree && (
          <div className="mb-10">
            <h2 className="text-xl font-extrabold text-slate-900 mb-2 text-center">もっと絆太郎を活用しませんか？</h2>
            <p className="text-sm text-slate-500 text-center mb-8">有料プランで、イベント運営をさらにパワーアップ。</p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* スタンダードプラン */}
              <div className="bg-white rounded-2xl border-2 border-indigo-500 p-6 md:p-8 shadow-lg shadow-indigo-100 relative">
                <div className="absolute -top-3 left-6 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">おすすめ</div>
                <h3 className="text-lg font-black text-slate-900 mb-1">スタンダード</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black text-indigo-600">3,300</span>
                  <span className="text-sm text-slate-500">円/月（税込）</span>
                </div>
                <p className="text-sm text-slate-500 mb-6">全機能が使い放題。継続的にイベントを開催する方に。</p>
                <button onClick={() => handleUpgrade('standard')}
                  className="w-full py-3.5 bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 group">
                  <Sparkles size={18}/> スタンダードを始める
                </button>
              </div>

              {/* スポットプラン */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
                <h3 className="text-lg font-black text-slate-900 mb-1">スポット利用</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black text-slate-700">5,500</span>
                  <span className="text-sm text-slate-500">円/回（税込）</span>
                </div>
                <p className="text-sm text-slate-500 mb-6">1回だけ試したい方に。そのイベントだけ全機能解放。</p>
                <button onClick={() => handleUpgrade('spot')}
                  className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all border-2 border-slate-200 hover:border-slate-300 flex items-center justify-center gap-2">
                  <Zap size={18}/> スポットで利用する
                </button>
              </div>
            </div>

            {/* 機能比較テーブル */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <div className="p-4">機能</div>
                <div className="p-4 text-center">Free</div>
                <div className="p-4 text-center text-indigo-600">Standard</div>
              </div>
              {features.map((f, idx) => (
                <div key={idx} className="grid grid-cols-3 border-b border-slate-100 last:border-0 text-sm hover:bg-slate-50/50 transition-colors">
                  <div className="p-4 flex items-center gap-2 font-medium text-slate-700">
                    <span className="text-slate-400">{f.icon}</span> {f.name}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {typeof f.free === 'string' ? (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{f.free}</span>
                    ) : f.free ? (
                      <CheckCircle2 size={18} className="text-emerald-500"/>
                    ) : (
                      <X size={18} className="text-slate-300"/>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center">
                    {typeof f.standard === 'string' ? (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{f.standard}</span>
                    ) : f.standard ? (
                      <CheckCircle2 size={18} className="text-emerald-500"/>
                    ) : (
                      <X size={18} className="text-slate-300"/>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 安心ポイント */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Shield size={14} className="text-emerald-400"/> いつでも解約OK</span>
              <span className="flex items-center gap-1"><CreditCard size={14} className="text-emerald-400"/> Stripe安全決済</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-emerald-400"/> 初月から全機能利用可</span>
            </div>
          </div>
        )}

        {/* 請求履歴 */}
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <FileText size={20} className="text-indigo-500"/> 請求履歴
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm min-h-[160px]">
            {invoices.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                <FileText size={32} className="opacity-30"/>
                <p className="text-sm">請求データはありません</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-2.5 rounded-xl text-slate-400"><Calendar size={20}/></div>
                      <div>
                        <p className="text-slate-900 font-bold">{inv.month.replace('-', '年')}月分</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                           {inv.status==='paid'
                             ? <span className="text-emerald-500 font-bold">領収済</span>
                             : <span className="text-orange-500 font-bold">未払い</span>
                           }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 justify-end">
                      <p className="text-lg font-black text-slate-900">¥{inv.amount.toLocaleString()}</p>
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
                        className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        {({ loading: pdfLoading }) => (pdfLoading ? '...' : <><Download size={16}/> PDF</>)}
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
