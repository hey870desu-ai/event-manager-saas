"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, serverTimestamp, where, getDocs } from "firebase/firestore";
import Link from "next/link";
import { LogOut, Plus, ChevronRight, Building2, Shield, Search, Wallet, Send, Loader2, CheckCircle2, AlertTriangle, Printer, X } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { BatchInvoicePDF } from "@/components/InvoicePDF";

// 本部オーナーのメアド
const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

type Tenant = {
  id: string;
  name: string;
  plan?: string;
  status?: string;
  lastBilling?: {
    month: string;
    status: string;
  };
  billingEmail?: string; // 請求先メールアドレス
};

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // ★一括処理用のState
  const [processing, setProcessing] = useState(false);
  const [targetMonth, setTargetMonth] = useState(""); // 例: "2026-01"
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // 1. 先月を初期値にセット (今日が2月なら "2026-01")
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    setTargetMonth(`${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser || currentUser.email !== SUPER_ADMIN_EMAIL) {
        router.push("/admin/login");
        return;
      }
      setUser(currentUser);
      
      const q = query(collection(db, "tenants"), orderBy("createdAt", "desc"));
      const unsubTenants = onSnapshot(q, (snapshot) => {
        setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
        setLoading(false);
      });

      return () => unsubTenants();
    });
    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => { await signOut(auth); router.push("/"); };

  // ★★★ 機能1: 請求データ一括作成 ★★★
  const handleBatchCreateInvoices = async () => {
    // 対象: フリープラン以外 かつ まだその月のデータがない人
    const targets = tenants.filter(t => 
      t.plan && t.plan !== 'free' && 
      t.lastBilling?.month !== targetMonth
    );

    if (targets.length === 0) return alert(`${targetMonth} 分の請求対象がいません（作成済みか、対象者なし）。`);
    if (!confirm(`${targets.length} 件のテナントに対して、${targetMonth} 分の請求データを作成しますか？`)) return;

    setProcessing(true);
    try {
      let count = 0;
      for (const t of targets) {
        // 金額計算
        const price = t.plan === 'pro' ? 29800 : t.plan === 'standard' ? 9800 : 0;
        const tax = Math.floor(price * 0.1);
        const total = price + tax;

        // 1. サブコレクションに追加
        await addDoc(collection(db, "tenants", t.id, "invoices"), {
          month: targetMonth,
          amount: total,
          status: "unbilled", // 作成時は「未請求」
          createdAt: serverTimestamp()
        });

        // 2. 本体更新（ここを修正しました！）
        await updateDoc(doc(db, "tenants", t.id), {
          lastBilling: { 
             month: targetMonth, 
             status: "unbilled", // ★ここを "billed" から "unbilled" に修正
             updatedAt: serverTimestamp()
          }
        });

        // 3. 画面上のリストも即座に更新
        setTenants(prev => prev.map(tenant => 
          tenant.id === t.id 
            ? { ...tenant, lastBilling: { month: targetMonth, status: "unbilled" } } 
            : tenant
        ));
        count++;
      }
      alert(`${count} 件の請求データを作成しました！`);
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setProcessing(false);
    }
  };
  // ★★★ 機能2: 請求通知メール一斉送信 (モック) ★★★
  const handleBatchSendMail = async () => {
    // 対象: その月の請求データはあるけど、まだ「未請求(unbilled)」の人
    const targets = tenants.filter(t => 
      t.lastBilling?.month === targetMonth && 
      t.lastBilling?.status === 'unbilled'
    );

    if (targets.length === 0) return alert(`${targetMonth} 分の送信対象がいません（全て送信済みか、データ未作成）。`);
    
    // ※本来はここでSendGridなどのAPIを叩きますが、今回は仕組みだけ作ります
    if (!confirm(`${targets.length} 件のテナントに請求通知メールを送信しますか？\n（※現在はシミュレーションです）`)) return;

    setProcessing(true);
    try {
      // APIコールの代わりに、ステータスを「請求済(billed)」に変える処理を実行
      let count = 0;
      for (const t of targets) {
         // Firestoreで該当する請求ドキュメントを探して更新（実務ではここでメール送信APIを呼ぶ）
         const q = query(collection(db, "tenants", t.id, "invoices"), where("month", "==", targetMonth));
         const snap = await getDocs(q);
         
         if (!snap.empty) {
           const invDoc = snap.docs[0];
           await updateDoc(doc(db, "tenants", t.id, "invoices", invDoc.id), { status: "billed" });
           
           // 本体のステータスも更新
           await updateDoc(doc(db, "tenants", t.id), {
             lastBilling: { ...t.lastBilling, status: "billed", month: targetMonth }
           });
           count++;
         }
      }
      alert(`${count} 件に送信済みマークを付けました！\n（※実際にメールを送るにはAPI設定が必要です）`);
    } catch (e) {
      console.error(e);
      alert("エラー");
    } finally {
      setProcessing(false);
    }
  };
  // ★★★ 機能3: 一括プレビュー (新規追加) ★★★
  const handleBatchPreview = async () => {
    // データ収集: 今月の請求データがあるテナントのみ対象
    const targets = tenants.filter(t => t.lastBilling?.month === targetMonth);
    
    if (targets.length === 0) return alert(`${targetMonth} 分の請求データが見つかりません。先に「一括作成」をしてください。`);

    setProcessing(true);
    try {
      const dataList = [];
      // 各テナントのサブコレクションから詳細データを取得
      for (const t of targets) {
        const q = query(collection(db, "tenants", t.id, "invoices"), where("month", "==", targetMonth));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          // 最初の1件を取得
          const invData = { id: snap.docs[0].id, ...snap.docs[0].data() };
          dataList.push({
             tenant: t,
             invoice: invData
          });
        }
      }
      setPreviewData(dataList);
      setShowPreviewModal(true);
    } catch (e) {
      console.error(e);
      alert("プレビューデータの取得に失敗しました");
    } finally {
      setProcessing(false);
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || !user) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="text-emerald-500"/>
            <h1 className="text-xl font-bold text-white">Super Admin Console</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors">
            <LogOut size={16}/> ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        
        {/* ▼▼▼ 月次処理アクションパネル ▼▼▼ */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 shadow-2xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Wallet className="text-yellow-400"/> 月次請求アクション
          </h2>
          
          <div className="flex flex-col md:flex-row items-center gap-6 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {/* 対象月選択 */}
            <div className="flex items-center gap-2">
               <span className="text-xs text-slate-500 font-bold">対象月:</span>
               <input 
                 type="month" 
                 value={targetMonth} 
                 onChange={(e)=>setTargetMonth(e.target.value)}
                 className="bg-slate-900 text-white border border-slate-700 rounded px-3 py-1 font-mono outline-none focus:border-indigo-500"
               />
            </div>

            <div className="h-8 w-px bg-slate-800 hidden md:block"></div>

            {/* アクションボタン群 */}
            <div className="flex gap-3 w-full md:w-auto">
              {/* 1. 一括作成 */}
              <button 
                onClick={handleBatchCreateInvoices}
                disabled={processing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>}
                一括作成
              </button>

              {/* 2. 一括プレビュー (ここに挿入) */}
              <button 
                onClick={handleBatchPreview}
                disabled={processing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={16}/> : <Printer size={16}/>}
                一括プレビュー
              </button>

              {/* 3. 一斉送信（ステータス更新） */}
              <button 
                onClick={handleBatchSendMail}
                disabled={processing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
                一斉送信(状態更新)
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 flex items-center gap-1">
            <AlertTriangle size={12}/> 
            対象: Standard/Proプランのテナント。「一斉送信」を押すとステータスが「請求済」に変わります。
          </p>
        </div>

        {/* テナント一覧 */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16}/>
            <input 
              type="text" 
              placeholder="会社名・IDで検索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-white pl-10 pr-4 py-2 rounded-lg w-64 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <Link href="/super-admin/tenants/new" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/20">
            <Plus size={16}/> 新規テナント登録
          </Link>
        </div>

        <div className="grid gap-4">
          {filteredTenants.length === 0 ? (
            <div className="text-center py-20 text-slate-500">テナントが見つかりません</div>
          ) : (
            filteredTenants.map((t) => (
              <Link 
                href={`/super-admin/tenants/${t.id}`} 
                key={t.id} 
                className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex justify-between items-center hover:border-indigo-500 hover:bg-slate-900 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 group-hover:border-indigo-500/30 transition-colors">
                    <Building2 size={24} className="text-slate-500 group-hover:text-indigo-400"/>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg group-hover:text-indigo-400 transition-colors">{t.name}</h3>
                    <div className="flex gap-3 text-xs text-slate-500 mt-1 items-center">
                      <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">ID: {t.id}</span>
                      <span className={`font-bold uppercase px-1.5 rounded ${t.plan === 'pro' ? 'text-orange-400 bg-orange-900/20' : t.plan === 'standard' ? 'text-blue-400 bg-blue-900/20' : 'text-slate-400'}`}>
                        {t.plan || "Free"}
                      </span>

                      {/* 請求ステータスバッジ */}
                      {t.lastBilling?.month === targetMonth && (
                        <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-800 animate-in fade-in slide-in-from-left-2">
                           {t.lastBilling.status === 'paid' ? (
                             <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 size={10}/> 入金済</span>
                           ) : t.lastBilling.status === 'billed' ? (
                             <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold border border-blue-500/20 flex items-center gap-1"><Send size={10}/> 請求済</span>
                           ) : (
                             <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold border border-slate-700">未請求</span>
                           )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="text-slate-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            ))
          )}
        </div>
        {/* ★★★ 一括プレビューモーダル ★★★ */}
        {showPreviewModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-xl flex flex-col border border-slate-700 shadow-2xl">
              
              {/* ヘッダー */}
              <div className="flex justify-between items-center p-4 border-b border-slate-700">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <Printer className="text-indigo-400"/> {targetMonth}分 請求書プレビュー ({previewData.length}件)
                </h3>
                <button onClick={() => setShowPreviewModal(false)} className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* PDFビューワーエリア (iframeで表示) */}
              <div className="flex-1 bg-slate-800 p-4 overflow-hidden relative">
                <PDFDownloadLink
                  document={
                    <BatchInvoicePDF 
                      dataList={previewData} 
                      myCompany={{
                          orgName: "株式会社はなひろ\nCARE DESIGN WORKS事業部", 
                          zipCode: "962-0015",
                          address: "福島県須賀川市日向町22 サンディアスB102",
                          phone: "090-7068-5817",
                          email: "info@hana-hiro.com",
                          invoiceNumber: "T6380001023295"
                      }}
                    />
                  }
                  fileName={`一括請求書_${targetMonth}.pdf`}
                >
                  {({ blob, url, loading }) => 
                     loading ? (
                       <div className="text-white flex items-center gap-2 justify-center h-full">
                         <Loader2 className="animate-spin"/> PDF生成中...
                       </div>
                     ) : (
                       <iframe src={url || ""} className="w-full h-full rounded bg-white" title="PDF Preview" />
                     )
                  }
                </PDFDownloadLink>
              </div>

              {/* フッター */}
              <div className="p-4 border-t border-slate-700 bg-slate-900 text-center">
                 <p className="text-xs text-slate-500 mb-2">※ 右上のダウンロードボタンや印刷ボタンから出力できます</p>
                 <button onClick={() => setShowPreviewModal(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg text-sm font-bold">
                   閉じる
                 </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}