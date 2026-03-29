"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Mail, ArrowRight } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "input" | "success" | "error">("loading");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // 1. このURLが本当に「メールリンク」かチェックするっぺ
    if (isSignInWithEmailLink(auth, window.location.href)) {
      // 2. ブラウザにメアドが保存されているか確認（同じブラウザならあるはず）
      let savedEmail = window.localStorage.getItem("emailForSignIn");

      if (savedEmail) {
        handleSignIn(savedEmail);
      } else {
        // 🏆 保存されていなければ（別のデバイスや招待の場合）、入力画面を出すぞい！
        setStatus("input");
      }
    } else {
      setErrorMessage("無効なリンクだばい。もう一度招待メールを確認してくんちぇ。");
      setStatus("error");
    }
  }, []);

  const handleSignIn = async (targetEmail: string) => {
    setStatus("loading");
    try {
      await signInWithEmailLink(auth, targetEmail, window.location.href);
      // 成功したら保存したメアドは消しておくべ
      window.localStorage.removeItem("emailForSignIn");
      setStatus("success");
      
      // 3. 2秒後に管理画面へ！
      setTimeout(() => {
        router.push("/admin");
      }, 2000);
    } catch (error: any) {
      console.error(error);
      setErrorMessage("ログインに失敗したっぺ。メアドが正しいか確認してくんちぇ。");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4 font-sans text-white">
      <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center">
        
        {/* ロゴエリア */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
            <img src="/icon.webp" alt="絆太郎" className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black tracking-tight">絆太郎・入室ゲート</h2>
        </div>

        {/* 状態別の表示 */}
        {status === "loading" && (
          <div className="space-y-4 animate-in fade-in">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
            <p className="text-slate-400 font-bold">本人確認中だばい。そのまま待っててくんちぇ...</p>
          </div>
        )}

        {status === "input" && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl text-left">
              <p className="text-sm text-indigo-300 font-bold leading-relaxed">
                <Mail className="inline mr-2" size={16} />
                確認のため、招待されたメールアドレスを入力してくんちぇ！
              </p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none transition-all text-center text-lg"
            />
            <button
              onClick={() => handleSignIn(email)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              入室を完了する <ArrowRight size={20} />
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in zoom-in-95">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
            <h3 className="text-xl font-bold">認証成功だばい！！</h3>
            <p className="text-slate-400">管理画面へ案内するぞい。いけるぞい！！</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6 animate-in shake">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
              <p className="text-sm text-red-400 font-bold">{errorMessage}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold"
            >
              もう一度試す
            </button>
          </div>
        )}

      </div>
    </div>
  );
}