"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Mail, ArrowRight } from "lucide-react";

function VerifyLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // 🏆 最初は「loading」ではなく、まず状態をチェックするぞい
  const [status, setStatus] = useState<"checking" | "input" | "loading" | "success" | "error">("checking");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkLink = async () => {
      // 1. 裏の背番号（tenantId）をセット
      const tid = searchParams.get("tenantId");
      if (tid) {
        auth.tenantId = tid;
      }

      // 2. メールリンクかどうかチェック
      if (isSignInWithEmailLink(auth, window.location.href)) {
        
        // 🏆 ここが修正ポイント！ localStorageを厳しくチェックするっぺ
        const savedEmail = window.localStorage.getItem("emailForSignIn");
        
        // メアドが「ちゃんとメアドの形」で保存されてる時だけ自動で進む
        if (savedEmail && savedEmail.includes("@")) {
          handleSignIn(savedEmail);
        } else {
          // 🏆 それ以外は、絶対に「入力画面（input）」を出すぞい！
          setStatus("input");
        }
      } else {
        setErrorMessage("無効なリンクだばい。もう一度招待メールを確認してくんちぇ。");
        setStatus("error");
      }
    };

    checkLink();
  }, [searchParams]);

  const handleSignIn = async (targetEmail: string) => {
    // 🏆 空っぽや変な文字の時は絶対に処理させないぞい！
    if (!targetEmail || !targetEmail.includes("@")) {
      setStatus("input");
      return;
    }

    setStatus("loading");
    try {
      await signInWithEmailLink(auth, targetEmail, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      setStatus("success");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (error: any) {
      console.error("Firebase Auth Error:", error);
      // エラーが出たら、勝手にエラー画面に行かずに「もう一回入れて」に戻すっぺ
      setErrorMessage("ログインに失敗したっぺ。正しいメアドか確認してくんちぇ。");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center text-white">
      <div className="mb-8">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
          <img src="/icon.webp" alt="絆太郎" className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">絆太郎・入室ゲート</h2>
      </div>

      {/* 状態別の表示 */}
      {(status === "checking" || status === "loading") && (
        <div className="space-y-4 animate-in fade-in">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-bold">本人確認中だばい...</p>
        </div>
      )}

      {status === "input" && (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl text-left text-indigo-300 font-bold text-sm">
            <Mail className="inline mr-2" size={16} /> 招待メールが届いた「自分のメアド」を入力してくんちぇ！
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@gmail.com"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-4 text-white focus:border-indigo-500 outline-none transition-all text-center text-lg"
            autoFocus
          />
          <button
            onClick={() => handleSignIn(email)}
            disabled={!email || !email.includes("@")}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            入室を完了する <ArrowRight size={20} />
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 animate-in zoom-in-95">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">認証成功だばい！！</h3>
          <p className="text-slate-400">管理画面へ案内するぞい。</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-6 animate-in shake">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400 font-bold text-sm">
            {errorMessage}
          </div>
          <button 
            onClick={() => setStatus("input")} 
            className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold"
          >
            メアド入力をやり直す
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">読み込み中だばい...</div>}>
        <VerifyLogic />
      </Suspense>
    </div>
  );
}