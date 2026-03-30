"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase"; 
import { onAuthStateChanged, isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { ArrowRight, Loader2, CheckCircle2, HelpCircle } from "lucide-react";

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // フォーム入力
  const [tenantId, setTenantId] = useState("");
  const [name, setName] = useState("");

  // メールリンクからの認証完了 & ログイン確認
  useEffect(() => {
    // メールリンク経由で来た場合、先にサインインを完了させる
    const completeEmailLinkSignIn = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        const savedEmail = window.localStorage.getItem('emailForSignIn');
        if (savedEmail) {
          try {
            await signInWithEmailLink(auth, savedEmail, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
          } catch (e) {
            console.error("メールリンク認証に失敗:", e);
          }
        }
      }
    };
    completeEmailLinkSignIn();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        // メールリンク認証の処理中かもしれないので少し待つ
        if (isSignInWithEmailLink(auth, window.location.href)) {
          return; // 認証完了を待つ
        }
        router.push("/");
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

      // 2. Firebase Auth テナント作成 + Firestore 保存を一括で行う
      const setupRes = await fetch('/api/admin/setup-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, name }),
      });
      const setupData = await setupRes.json();
      if (!setupRes.ok) {
        throw new Error(setupData.error || "テナント作成に失敗しました");
      }

      // setup-tenant が作った doc に追加フィールドを書き込む
      await setDoc(docRef, {
        plan: "free",
        branches: ["本部"],
        ownerEmail: user.email,
      }, { merge: true });

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

  if (checking) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-6">
            <img src="/icon.webp" alt="絆太郎" className="h-9 w-9 object-contain" />
            <span className="text-3xl font-black text-slate-900 tracking-tighter">絆太郎 <span className="text-lg font-medium text-slate-400">Event Manager</span></span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2">あと少しで完了です！</h1>
          <p className="text-slate-500 text-sm">あなたの組織情報を入力して、イベント管理を始めましょう。</p>
        </div>

        {/* メインカード */}
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-xl sm:px-10">

          {/* ステップ表示 */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                <CheckCircle2 size={16} />
              </div>
              <span className="text-xs font-bold text-indigo-600">アカウント作成</span>
            </div>
            <div className="w-8 h-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</div>
              <span className="text-xs font-bold text-indigo-600">組織の設定</span>
            </div>
            <div className="w-8 h-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">3</div>
              <span className="text-xs font-bold text-slate-400">利用開始</span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {/* 組織ID */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">組織ID</label>
              <input
                type="text"
                value={tenantId}
                onChange={handleIdChange}
                placeholder="例: my-company"
                className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-lg transition-all"
                required
              />
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <HelpCircle size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  <span>
                    イベントページのURLに使用されます。<br/>
                    （例: event-manager.app/t/<strong className="text-indigo-600">{tenantId || "my-company"}</strong>/e/イベント名）<br/>
                    半角英数・ハイフンのみ。後から変更できません。
                  </span>
                </p>
              </div>
            </div>

            {/* 組織名 */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">会社名 / 組織名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="株式会社〇〇、〇〇実行委員会など"
                className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                required
              />
              <p className="text-xs text-slate-400 mt-1.5 ml-1">イベントページやメールの送信者名に表示されます。後から変更も可能です。</p>
            </div>

            <button
              type="submit"
              disabled={loading || !tenantId || !name}
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? <Loader2 className="animate-spin"/> : (
                <>
                  アカウントを作成して開始 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          ログイン中: {user?.email}
        </div>
      </div>
    </div>
  );
}