"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ArrowLeft, Building2, Save, Loader2, User } from "lucide-react";

export default function NewTenantPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 入力フォームの状態
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free"); // デフォルトはFreeにしておくのが安全
  const [adminEmail, setAdminEmail] = useState("");
  
  // IDのバリデーション（英数字のみ）
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9-]/g, ""); 
    setTenantId(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name || !adminEmail) return alert("必須項目を入力してください");
    
    setLoading(true);
    try {
      // 1. ID重複チェック
      const docRef = doc(db, "tenants", tenantId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        alert("このIDは既に使用されています。別のIDにしてください。");
        setLoading(false);
        return;
      }

      // 2. テナント作成
      await setDoc(docRef, {
        name,
        plan,
        email: adminEmail,
        createdAt: serverTimestamp(),
        status: "active",
        branches: ["本部"] 
      });

      // 3. 最初の管理者を作成
      await setDoc(doc(db, "admin_users", adminEmail), {
        email: adminEmail,
        tenantId: tenantId,
        role: "owner", 
        branchId: "本部",
        createdAt: serverTimestamp(),
        addedBy: "SuperAdmin"
      });

      alert("テナントを作成しました！");
      router.push(`/super-admin/tenants/${tenantId}`); 

    } catch (error) {
      console.error(error);
      alert("作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300">
      <header className="bg-slate-900/80 border-b border-slate-800 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-white">新規テナント登録 (管理者用)</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2 pb-2 border-b border-slate-800">
              <Building2 className="text-emerald-400" size={20}/> 基本情報
            </h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">テナントID</label>
                <input type="text" value={tenantId} onChange={handleIdChange} placeholder="例: fukuhiroba" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none font-mono" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">会社名 / 屋号</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="株式会社〇〇" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">プラン</label>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none">
                  {/* ★★★ ここを修正しました ★★★ */}
                  <option value="free">Free (無料)</option>
                  <option value="pro">Pro (3,300円/月)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-white font-bold mb-6 flex items-center gap-2 pb-2 border-b border-slate-800">
              <User className="text-indigo-400" size={20}/> 管理者アカウント
            </h2>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">管理者のメールアドレス</label>
              <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@company.com" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none" required />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 登録
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}