"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, sendSignInLinkToEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore"; 
import { auth, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, Send, Loader2 } from "lucide-react";

// ★SaaS化の第一歩：スーパー管理者の定義
// 今はハードコードですが、将来的にはDB管理にします
const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [mailSent, setMailSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !tenantId) return setError("IDとメアドを入れてくんちぇ！");
    setLoading(true);
    try {
      auth.tenantId = tenantId; // 門番にテナントIDを教える
      const actionCodeSettings = {
        url: `${window.location.origin}/admin/login/verify?tenantId=${tenantId}`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email); // メアドを一時保存
      setMailSent(true);
    } catch (err: any) {
      setError("メール送信に失敗したっぺ。IDを確認してくんちぇ。");
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) throw new Error("Email not found");

      // 空白削除＆小文字化
      const currentEmailClean = user.email.replace(/\s+/g, '').toLowerCase();
      const superAdminEmailClean = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();

      // ★スーパー管理者は無条件で通過（初期設定用）
      if (currentEmailClean === superAdminEmailClean) {
         console.log("Super Admin Login detected.");
         router.push("/admin");
         return; 
      }

      // 通常管理者チェック
      const userRef = doc(db, "admin_users", user.email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // 会員なら管理画面へ
        console.log("Login successful:", user.email);
        router.push("/admin"); 
      } else {
        // ★ 未登録ならオンボーディング画面へご案内！
        console.log("新規ユーザーです。登録画面へ移動します。");
        router.push("/onboarding");
      }

    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/unauthorized-domain") {
        setError("ドメインが許可されていません（Firebase Authentication設定を確認してください）");
      } else {
        setError("ログインに失敗しました。");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4 relative overflow-hidden">
      {/* 背景のエフェクト（汎用的なデザイン） */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-slate-800/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-slate-700 text-white mb-4 shadow-xl shadow-indigo-500/20">
            <ShieldCheck size={32} />
          </div>
          {/* 👇 ここが重要！特定の組織名を消しました */}
          <h1 className="text-2xl font-bold text-white tracking-tight">
            絆太郎 SaaS
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            次世代イベント管理プラットフォーム
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-lg font-semibold text-slate-200">System Login</h2>
            <p className="text-slate-500 text-sm mt-1">管理者アカウントでログイン</p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <Lock size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full group relative flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-slate-50 text-slate-900 font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="animate-pulse">Checking...</span>
            ) : (
              <>
                {/* Googleアイコンはそのまま利用 */}
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                <span>Googleアカウントでログイン</span>
              </>
            )}
          </button>
          {mailSent ? (
  <div className="text-center p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
    <p className="text-emerald-400 font-bold">メールを送ったぞい！</p>
    <p className="text-xs text-slate-400 mt-1">リンクをクリックしてログインしてくんちぇ。</p>
  </div>
) : (
  <>
    {/* 区切り線 */}
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
      <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0B1120] px-2 text-slate-500">またはメアドでログイン</span></div>
    </div>

    {/* メアド入力フォーム */}
    <form onSubmit={handleEmailLogin} className="space-y-4">
      <input 
        type="text" value={tenantId} onChange={e => setTenantId(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500"
        placeholder="テナントID (happychoiceなど)" required
      />
      <input 
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500"
        placeholder="メールアドレス" required
      />
      <button
        type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
        <span>ログインメールを送信</span>
      </button>
    </form>
  </>
)}
        </div>
        
        <div className="text-center mt-8 text-slate-600 text-xs">
          &copy; 絆太郎 Event Manager System.
        </div>
      </div>
    </div>
  );
}