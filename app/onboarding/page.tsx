"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Building2, ArrowRight, Loader2, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // フォーム入力
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");

  // ログイン確認 & 会員チェック
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/"); // ログインしてなければTOPへ
      } else {
        setUser(currentUser);
        
        // ★追加: もし既に登録済みなら、間違ってここに来ても管理画面へ飛ばす
        try {
          const adminRef = doc(db, "admin_users", currentUser.email!);
          const adminSnap = await getDoc(adminRef);
          if (adminSnap.exists()) {
             console.log("すでに会員です。管理画面へ移動します。");
             router.push("/admin"); // ★希望通り /admin へ
             return;
          }
        } catch (e) {
          console.error(e);
        }
      }
      setChecking(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 半角英数のみ許可
    const val = e.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase();
    setTenantId(val);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name || !user) return;
    
    setLoading(true);
    try {
      // 1. ID重複チェック
      const docRef = doc(db, "tenants", tenantId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        alert("このIDは既に使用されています 😢\n別のIDを試してください。");
        setLoading(false);
        return;
      }

      // 2. テナント作成（まずはFreeプランで）
      await setDoc(docRef, {
        name: name,
        plan: "free", 
        createdAt: serverTimestamp(),
        status: "active",
        branches: ["本部"],
        ownerEmail: user.email,
      });

      // 3. 自分を管理者に設定
      await setDoc(doc(db, "admin_users", user.email), {
        email: user.email,
        tenantId: tenantId,
        role: "owner",
        branchId: "本部",
        createdAt: serverTimestamp(),
        addedBy: "SelfRegistration"
      });

      // 4. 管理画面へGo!
      alert("登録完了！管理画面へ移動します 🚀");
      router.push("/admin"); // ★ここも /admin に修正しました

    } catch (error) {
      console.error(error);
      alert("エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  if (checking) return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-white"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.15),transparent_50%)]"></div>
      
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 mb-4">
            <Sparkles size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">ようこそ、{user?.displayName || "ゲスト"} さん</h1>
          <p className="text-slate-500 text-sm">あなたの組織（テナント）を作成して、<br/>イベント管理を始めましょう。</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-indigo-400 mb-1.5 ml-1">組織ID (URLに使われます)</label>
            <div className="relative">
              <input 
                type="text" 
                value={tenantId} 
                onChange={handleIdChange}
                placeholder="例: my-company (半角英数)" 
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-lg transition-all"
                required
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-2 ml-1">※後から変更できません。重複しないユニークなIDにしてください。</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">会社名 / 組織名</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="株式会社〇〇、〇〇実行委員会など" 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder:text-slate-600 focus:border-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !tenantId || !name}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-4 group"
          >
            {loading ? <Loader2 className="animate-spin"/> : (
              <>
                アカウントを作成して開始 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-8 text-center text-xs text-slate-600">
        ログイン中: {user?.email}
      </div>
    </div>
  );
}