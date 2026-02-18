"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc, deleteDoc, serverTimestamp, addDoc, orderBy, deleteField, limit } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";
import { Building2, Save, ArrowLeft, User, Key, Receipt, MapPin, FileText, Trash2, Loader2, Store, Plus, CheckCircle2, AlertCircle, Edit } from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/InvoicePDF";


const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

// 請求データの型定義
type InvoiceRecord = {
  id: string;
  month: string;      // "2026-02"
  amount: number;     // 10780
  status: 'unbilled' | 'billed' | 'paid'; // ステータス
  items?: { name: string; detail?: string; price: number; quantity: number }[];
  issuedAt?: any;
  createdAt?: any;
};

export default function TenantDetailPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id as string;

  const [tenantData, setTenantData] = useState<any>({});
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranchName, setNewBranchName] = useState("");
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // ★請求管理用のState
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser || currentUser.email !== SUPER_ADMIN_EMAIL) {
          router.push("/");
          return;
        }
        setUser(currentUser);
        if (tenantId) await fetchData(tenantId);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    });
    return () => unsubscribe();
  }, [router, tenantId]);

  const fetchData = async (id: string) => {
    try {
      // 1. テナント情報
      const docRef = doc(db, "tenants", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setTenantData(data);
        setBranches(Array.isArray(data.branches) ? data.branches : ["本部"]);
      } else {
        alert("データなし"); router.push("/super-admin"); return;
      }

      // 2. 管理者リスト
      const q = query(collection(db, "admin_users"), where("tenantId", "==", id));
      const adminSnap = await getDocs(q);
      setAdmins(adminSnap.docs.map(d => ({ email: d.id, ...d.data() })));

      // 3. ★請求履歴の取得
      fetchInvoices(id);

    } catch (e) { console.error(e); }
  };

  const fetchInvoices = async (tid: string) => {
    try {
      // invoicesサブコレクションから取得
      const q = query(collection(db, "tenants", tid, "invoices"), orderBy("month", "desc"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as InvoiceRecord[];
      setInvoices(list);
    } catch(e) { console.error("Invoice fetch error", e); }
  };

const handleSave = async () => {
    // 1. 確認画面（window.をつける）
    if (!window.confirm("変更内容を保存しますか？")) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, "tenants", tenantId);
      // データ更新
      await updateDoc(docRef, { ...tenantData, branches: branches });
      
      // 2. 完了メッセージ（window.をつける）
      window.alert("保存しました！");
    } catch (e) { 
      console.error(e); 
      window.alert("保存失敗"); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleChange = (field: string, value: string) => {
    setTenantData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdateBranch = (index: number, val: string) => {
    const newB = [...branches]; newB[index] = val; setBranches(newB);
  };
  const handleAddBranch = () => {
    if(!newBranchName) return;
    setBranches([...branches, newBranchName]); setNewBranchName("");
  };
  const handleDeleteBranch = (index: number) => {
    if(branches.length <= 1) return alert("最低1つの拠点は必要です");
    const newB = branches.filter((_, i) => i !== index); setBranches(newB);
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    if (!confirm(`${newAdminEmail} を管理者に追加しますか？`)) return;
    try {
      await setDoc(doc(db, "admin_users", newAdminEmail), {
        email: newAdminEmail, tenantId: tenantId, role: "admin", createdAt: serverTimestamp(), addedBy: "SuperAdmin"
      });
      setNewAdminEmail(""); fetchData(tenantId); alert("追加しました");
    } catch (e) { alert("エラー"); }
  };

  const handleRemoveAdmin = async (email: string) => {
    if (!confirm(`削除しますか？ ${email}`)) return;
    try {
      await deleteDoc(doc(db, "admin_users", email)); fetchData(tenantId); alert("削除しました");
    } catch (e) { alert("失敗"); }
  };
// ★★★ 親データ（看板）を強制的に最新状態へ同期する関数 ★★★
  const syncLatestStatus = async () => {
    try {
      // 一番新しい請求データを1件だけ取りに行く
      const q = query(collection(db, "tenants", tenantId, "invoices"), orderBy("month", "desc"), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        // データがあれば、その内容で看板を上書き
        const latest = snap.docs[0].data();
        await updateDoc(doc(db, "tenants", tenantId), {
          lastBilling: {
            month: latest.month,
            status: latest.status,
            updatedAt: serverTimestamp()
          }
        });
      } else {
        // データが一件もなければ、看板を完全に消去
        await updateDoc(doc(db, "tenants", tenantId), {
          lastBilling: deleteField()
        });
      }
    } catch (e) {
      console.error("Sync Error:", e);
    }
  };
// ★ 1. 請求レコード作成（同期付き）
  const handleCreateInvoiceRecord = async () => {
    if (!tenantData.plan) return alert("プランが設定されていません");
    setCreatingInvoice(true);
    try {
      const today = new Date();
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const monthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
      
      const price = tenantData.plan === 'pro' ? 3000 : 0;
      const tax = Math.floor(price * 0.1);
      const total = price + tax;

      await addDoc(collection(db, "tenants", tenantId, "invoices"), {
        month: monthStr,
        amount: total,
        status: "unbilled",
        createdAt: serverTimestamp()
      });
      
      // 親データを再計算して同期
      await syncLatestStatus();
      
      fetchInvoices(tenantId);
      alert(`${monthStr} 分の請求データを作成しました`); 
    } catch(e) { console.error(e); alert("作成失敗"); } finally { setCreatingInvoice(false); }
  };

  // ★ 明細編集用のState
  const [editingInv, setEditingInv] = useState<InvoiceRecord | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);

  // 編集モーダルを開く
  const openEditModal = (inv: InvoiceRecord) => {
    setEditingInv(inv);
    // 既存のitemsがあればそれを使用、なければデフォルトを作成してセット
    if (inv.items && inv.items.length > 0) {
      setEditItems(inv.items);
    } else {
      // 既存ロジックでのデフォルト明細を生成
      const price = Math.floor(inv.amount / 1.1);
      setEditItems([{
        name: `システム利用料 (${tenantData.plan || 'standard'}プラン)`,
        detail: `期間: ${inv.month}分`, // 簡易表示
        price: price,
        quantity: 1
      }]);
    }
  };

  // 明細行の変更
  const updateEditItem = (index: number, field: string, value: any) => {
    const newItems = [...editItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditItems(newItems);
  };

  // 行追加・削除
  const addEditItem = () => setEditItems([...editItems, { name: "", price: 0, quantity: 1 }]);
  const removeEditItem = (index: number) => setEditItems(editItems.filter((_, i) => i !== index));

  // 編集内容を保存
  const saveInvoiceDetails = async () => {
    if (!editingInv) return;
    if (!confirm("明細を更新して保存しますか？\n（金額も自動再計算されます）")) return;

    try {
      // 合計金額を再計算
      const subTotal = editItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
      const tax = Math.floor(subTotal * 0.1);
      const newTotal = subTotal + tax;

      // Firestore更新
      const invRef = doc(db, "tenants", tenantId, "invoices", editingInv.id);
      await updateDoc(invRef, {
        items: editItems,
        amount: newTotal // 金額も更新！
      });

      // State更新
      setInvoices(prev => prev.map(inv => inv.id === editingInv.id ? { ...inv, items: editItems, amount: newTotal } : inv));
      
      setEditingInv(null); // モーダル閉じる
      alert("明細を更新しました！");
    } catch(e) { console.error(e); alert("更新失敗"); }
  };

// ★ 2. ステータス変更（同期付き）
  const handleUpdateStatus = async (invId: string, newStatus: InvoiceRecord['status']) => {
    try {
      // 請求データを更新
      await updateDoc(doc(db, "tenants", tenantId, "invoices", invId), {
        status: newStatus
      });

      // 親データを再計算して同期 (少し待ってから実行)
      setTimeout(async () => {
        await syncLatestStatus();
      }, 500);

      setInvoices(prev => prev.map(inv => inv.id === invId ? { ...inv, status: newStatus } : inv));
    } catch(e) { alert("更新失敗"); }
  };

// ★ 3. 請求履歴削除（同期付き）
  const handleDeleteInvoice = async (invId: string) => {
    if(!confirm("この請求データを削除しますか？\n（一覧画面のステータスも更新されます）")) return;
    try {
      // 請求データそのものを削除
      await deleteDoc(doc(db, "tenants", tenantId, "invoices", invId));

      // 親データを再計算して同期
      await syncLatestStatus();

      setInvoices(prev => prev.filter(i => i.id !== invId));
    } catch(e) { alert("削除失敗"); console.error(e); }
  };

  // ★ テナント完全削除機能（Danger Zone）修正版
  const handleDeleteTenant = async () => {
    const msg = `⚠️ 本当にこのテナント（${tenantData.name}）を削除しますか？\n\n【重要】\n請求履歴などのサブデータも全て削除されます。\nこのIDで再登録しても、データは空の状態になります。`;
    if (!window.confirm(msg)) return;

    const inputId = window.prompt("確認のため、テナントIDを入力してください", "");
    if (inputId !== tenantId) return alert("IDが一致しません。キャンセルしました。");

    setSaving(true);
    try {
      // 1. 【追加】請求データ(invoices)などのサブコレクションを削除
      // ※Firestoreは親を消しても子が消えないため、明示的に消す必要があります
      const invoicesRef = collection(db, "tenants", tenantId, "invoices");
      const invoiceSnap = await getDocs(invoicesRef);
      const deleteInvoicePromises = invoiceSnap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteInvoicePromises);

      // 2. 管理者(admin_users)を削除
      const q = query(collection(db, "admin_users"), where("tenantId", "==", tenantId));
      const snap = await getDocs(q);
      const deleteUserPromises = snap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deleteUserPromises);

      // 3. テナント(tenants)を削除
      await deleteDoc(doc(db, "tenants", tenantId));

      alert("完全に削除しました（残存データも消去済み）。一覧に戻ります。");
      router.push("/super-admin");

    } catch (e) {
      console.error(e);
      alert("削除に失敗しました");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 pb-20">
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">{tenantData.name}</h1>
              <p className="text-xs text-slate-500 font-mono">ID: {tenantId}</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95">
            {saving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />} 保存する
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左カラム：メイン情報 */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 基本情報 */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2 pb-2 border-b border-slate-800"><Building2 className="text-indigo-400" size={20}/> 基本情報</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">正式名称</label><input type="text" value={tenantData.name || ""} onChange={(e)=>handleChange("name", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-500 block mb-1">代表者名</label><input type="text" value={tenantData.ceoName || ""} onChange={(e)=>handleChange("ceoName", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
              <div><label className="text-xs font-bold text-slate-500 block mb-1">電話番号</label><input type="text" value={tenantData.phone || ""} onChange={(e)=>handleChange("phone", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
              <div className="col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">Webサイト</label><input type="text" value={tenantData.website || ""} onChange={(e)=>handleChange("website", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
              <div className="col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">住所</label><div className="flex gap-2 mb-2"><span className="shrink-0 pt-3 text-slate-500"><MapPin size={16}/></span><input type="text" value={tenantData.zipCode || ""} onChange={(e)=>handleChange("zipCode", e.target.value)} className="w-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" placeholder="〒" /></div><textarea value={tenantData.address || ""} onChange={(e)=>handleChange("address", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none h-20 resize-none" /></div>
            </div>
          </section>

          {/* 拠点管理 */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2 pb-2 border-b border-slate-800"><Store className="text-cyan-400" size={20}/> 拠点・部門管理</h2>
            <div className="space-y-3">
               {branches.map((b, i) => (
                 <div key={i} className="flex gap-2"><input type="text" value={b} onChange={(e)=>handleUpdateBranch(i, e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none"/><button onClick={()=>handleDeleteBranch(i)} className="p-3 text-slate-600 hover:text-red-400 border border-slate-700 rounded-lg"><Trash2 size={18}/></button></div>
               ))}
               <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800/50"><input type="text" value={newBranchName} onChange={(e)=>setNewBranchName(e.target.value)} placeholder="新しい拠点名" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none text-sm"/><button onClick={handleAddBranch} disabled={!newBranchName} className="bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 px-4 rounded-lg font-bold flex items-center gap-2 hover:bg-cyan-500 hover:text-white transition-all disabled:opacity-50"><Plus size={18}/> 追加</button></div>
            </div>
          </section>

          {/* 契約・請求情報 */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2 pb-2 border-b border-slate-800"><Receipt className="text-emerald-400" size={20}/> 契約・インボイス</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2"><label className="text-xs font-bold text-emerald-400 block mb-1">インボイス番号</label><input type="text" value={tenantData.invoiceNumber || ""} onChange={(e)=>handleChange("invoiceNumber", e.target.value)} className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg p-3 text-white outline-none font-mono" /></div>
              <div><label className="text-xs font-bold text-slate-500 block mb-1">プラン</label><select value={tenantData.plan || "standard"} onChange={(e)=>handleChange("plan", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none"><option value="free">Free</option><option value="standard">Standard</option><option value="pro">Pro</option></select></div>
              <div><label className="text-xs font-bold text-slate-500 block mb-1">更新日</label><input type="date" value={tenantData.renewalDate || ""} onChange={(e)=>handleChange("renewalDate", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
              <div className="col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">請求メール</label><input type="email" value={tenantData.billingEmail || ""} onChange={(e)=>handleChange("billingEmail", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" /></div>
            </div>
          </section>

          {/* ★★★ 新機能: 請求・入金管理ボード ★★★ */}
          <section className="bg-slate-900 border border-slate-800 rounded-xl p-6">
             <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
               <h2 className="text-white font-bold flex items-center gap-2"><FileText className="text-yellow-400" size={20}/> 請求・入金管理</h2>
               <button onClick={handleCreateInvoiceRecord} disabled={creatingInvoice} className="text-xs bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors disabled:opacity-50">
                 {creatingInvoice ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14}/>} 今月分を作成
               </button>
             </div>

             {invoices.length === 0 ? (
               <div className="text-center py-8 text-slate-500 text-sm">請求データがありません</div>
             ) : (
               <div className="space-y-3">
                 {invoices.map((inv) => (
                   <div key={inv.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                     <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="bg-slate-900 px-3 py-2 rounded border border-slate-800 text-center min-w-[80px]">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Month</div>
                          <div className="text-white font-mono font-bold">{inv.month}</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">¥{inv.amount.toLocaleString()}</div>
                          <div className="text-xs text-slate-500">Plan: {tenantData.plan}</div>
                        </div>
                     </div>

                     <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                       
                       {/* ステータス切替ボタン */}
                       <div className="flex bg-slate-900 rounded-lg border border-slate-800 p-1">
                         <button 
                           onClick={()=>handleUpdateStatus(inv.id, 'unbilled')}
                           className={`px-3 py-1 text-xs rounded font-bold transition-all ${inv.status==='unbilled'?'bg-slate-700 text-white shadow':'text-slate-500 hover:text-slate-300'}`}
                         >未請求</button>
                         <button 
                           onClick={()=>handleUpdateStatus(inv.id, 'billed')}
                           className={`px-3 py-1 text-xs rounded font-bold transition-all ${inv.status==='billed'?'bg-blue-600 text-white shadow':'text-slate-500 hover:text-slate-300'}`}
                         >請求済</button>
                         <button 
                           onClick={()=>handleUpdateStatus(inv.id, 'paid')}
                           className={`px-3 py-1 text-xs rounded font-bold transition-all ${inv.status==='paid'?'bg-emerald-600 text-white shadow':'text-slate-500 hover:text-slate-300'}`}
                         >入金済</button>
                       </div>

                       <button 
                         onClick={() => openEditModal(inv)} 
                         className="p-2 text-slate-500 hover:text-white transition-colors"
                         title="明細を編集"
                       >
                         <Edit size={18} />
                       </button>

                       {/* PDFダウンロード (クリックで自動的に「請求済」にする機能つき) */}
                       <div onClick={() => { if(inv.status === 'unbilled') handleUpdateStatus(inv.id, 'billed'); }}>
                          <PDFDownloadLink
                             document={<InvoicePDF tenant={tenantData} invoice={inv}
                             myCompany={{
                                // ★会社情報更新済み
                                orgName: "株式会社はなひろ\nCARE DESIGN WORKS事業部", 
                                zipCode: "962-0015",
                                address: "福島県須賀川市日向町22 サンディアスB102",
                                phone: "090-7068-5817",
                                email: "info@hana-hiro.com",
                                invoiceNumber: "T6380001023295"
                             }} />}
                             fileName={`請求書_${tenantData.name}_${inv.month}.pdf`}
                             className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg border border-slate-700 block transition-colors"
                             title="PDFダウンロード"
                          >
                            <FileText size={18}/>
                          </PDFDownloadLink>
                       </div>

                       <button onClick={()=>handleDeleteInvoice(inv.id)} className="text-slate-600 hover:text-red-400 p-2"><Trash2 size={18}/></button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </section>
          
        </div>

{/* 右カラム：管理者・Info・Danger Zone */}
        <div className="lg:col-span-1 space-y-8">
           <section className="bg-slate-900 border border-indigo-500/30 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
             <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Key className="text-indigo-400" size={20}/> 管理者</h2>
             <div className="space-y-4">
               <div className="flex gap-2"><input type="email" value={newAdminEmail} onChange={(e)=>setNewAdminEmail(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white min-w-0" placeholder="追加するメアド" /><button onClick={handleAddAdmin} disabled={!newAdminEmail} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-50">追加</button></div>
               <div className="bg-slate-950 rounded-lg border border-slate-800 divide-y divide-slate-800/50">
                 {admins.map(admin => (
                   <div key={admin.email} className="p-3 flex justify-between items-center group"><div className="min-w-0"><div className="text-sm text-slate-300 truncate">{admin.email}</div></div><button onClick={()=>handleRemoveAdmin(admin.email)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div>
                 ))}
               </div>
             </div>
           </section>
           
           <section className="bg-slate-900 border border-slate-800 rounded-xl p-6"><h2 className="text-sm font-bold text-slate-400 mb-4">Info</h2><div className="space-y-2 text-xs text-slate-500"><div className="flex justify-between"><span>Created:</span> <span className="text-slate-300">{tenantData.createdAt?.toDate?.().toLocaleDateString() || "-"}</span></div><div className="flex justify-between"><span>ID:</span> <span className="text-slate-300 font-mono">{tenantId}</span></div></div></section>

           {/* ★★★ Danger Zone (契約解除・削除) ★★★ */}
           <section className="bg-slate-900 border border-red-900/30 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-red-600/50"></div>
             <h2 className="text-red-500 font-bold mb-4 flex items-center gap-2"><AlertCircle size={20}/> 契約解除エリア</h2>
             <p className="text-xs text-slate-500 mb-4">
               この操作は取り消せません。テナント情報と所属管理者の権限が完全に削除されます。<br/>
               <span className="text-red-400">※Stripeの定期課金は停止されません。先にStripeでキャンセルしてください。</span>
             </p>
             <button 
               onClick={handleDeleteTenant}
               className="w-full bg-red-950/30 hover:bg-red-600 hover:text-white text-red-500 border border-red-900/50 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2"
             >
               <Trash2 size={18}/> テナントを完全削除
             </button>
           </section>
        </div>

        {/* ★ 明細編集モーダル ★ */}
      {editingInv && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">請求明細の編集 ({editingInv.month})</h3>
            
            <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto pr-2">
              {editItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-start bg-slate-950 p-3 rounded border border-slate-800">
                  <div className="flex-1 space-y-2">
                    <input type="text" placeholder="品名" value={item.name} onChange={(e)=>updateEditItem(i, 'name', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white text-sm p-2 rounded"/>
                    <input type="text" placeholder="詳細(期間など)" value={item.detail || ""} onChange={(e)=>updateEditItem(i, 'detail', e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-slate-400 text-xs p-2 rounded"/>
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-slate-500 block">単価(税抜)</label>
                    <input type="number" value={item.price} onChange={(e)=>updateEditItem(i, 'price', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-white text-sm p-2 rounded text-right"/>
                  </div>
                  <div className="w-16">
                    <label className="text-[10px] text-slate-500 block">数量</label>
                    <input type="number" value={item.quantity} onChange={(e)=>updateEditItem(i, 'quantity', Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-white text-sm p-2 rounded text-center"/>
                  </div>
                  <button onClick={()=>removeEditItem(i)} className="pt-6 text-slate-600 hover:text-red-400"><Trash2 size={18}/></button>
                </div>
              ))}
              <button onClick={addEditItem} className="w-full py-2 border border-dashed border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 rounded text-sm flex items-center justify-center gap-2"><Plus size={16}/> 行を追加</button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button onClick={()=>setEditingInv(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm">キャンセル</button>
              <button onClick={saveInvoiceDetails} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold text-sm">保存して再計算</button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
}