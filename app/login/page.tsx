"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"; // Google認証用
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Loader2, Building2, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function TenantLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // ログイン成功したらダッシュボードへ
      router.push("/admin");
    } catch (err: any) {
      console.error(err);
      setError("ログインに失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* 背景装飾 */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-md w-full relative z-10">
        
        {/* ▼ 絆太郎：ログインポータル・ロゴエリア */}
<div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
  {/* ロゴを囲む枠：icon.webp が映えるように少し調整 */}
  <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl mb-6">
    <img 
      src="/icon.webp" 
      alt="絆太郎ロゴ" 
      className="w-12 h-12 object-contain" 
    />
  </div>

  {/* タイトル：Tenant Portal から「絆太郎」へ！ */}
  <h1 className="text-3xl font-black text-white tracking-tight">
    絆太郎 <span className="text-lg font-medium text-slate-400">Event Manager</span>
  </h1>

  {/* サブテキスト：より主催者様に寄り添った言葉に */}
  <p className="text-slate-500 text-sm mt-3 font-medium">
    セミナー主催者様 専用ポータル
  </p>
</div>

        {/* ログインカード */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 text-center">
          
          <h2 className="text-lg font-bold text-white mb-6">アカウントにログイン</h2>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2 mb-4 text-left">
              <ShieldCheck size={14} /> {error}
            </div>
          )}

          {/* Googleログインボタン */}
          <button 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70 group"
          >
            {loading ? (
              <Loader2 className="animate-spin text-slate-500" size={20} />
            ) : (
              <>
                {/* Googleロゴ (SVG) */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Googleアカウントでログイン
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 mt-6 leading-relaxed">
            管理者に登録されたGoogleアカウントをお使いください。<br/>
            ログインできない場合は担当者までお問い合わせください。
          </p>

        </div>
        
        <div className="text-center mt-8 space-y-2">
           <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
             <CheckCircle2 size={12} className="text-emerald-500"/> SSL暗号化通信
             <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
             <CheckCircle2 size={12} className="text-emerald-500"/> Google認証連携
           </div>
           <p className="text-[10px] text-slate-600">
             © 2026 HANAHIRO CARE DESIGN WORKS SaaS System.
           </p>
        </div>

      </div>
    </div>
  );
}