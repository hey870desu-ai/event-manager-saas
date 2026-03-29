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
  const [status, setStatus] = useState<"loading" | "input" | "success" | "error">("loading");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const confirmSignIn = async () => {
      const tid = searchParams.get("tenantId");
      if (tid) {
        auth.tenantId = tid;
      }

      if (isSignInWithEmailLink(auth, window.location.href)) {
        let savedEmail = window.localStorage.getItem("emailForSignIn");
        if (savedEmail) {
          handleSignIn(savedEmail);
        } else {
          setStatus("input");
        }
      } else {
        setErrorMessage("無効なリンクだばい。もう一度招待メールを確認してくんちぇ。");
        setStatus("error");
      }
    };
    confirmSignIn();
  }, [searchParams]);

  const handleSignIn = async (targetEmail: string) => {
    // 🏆 ガード！メアドが空っぽや形式がおかしい時は何もしないぞい
    if (!targetEmail || !targetEmail.includes("@")) return;

    setStatus("loading");
    try {
      await signInWithEmailLink(auth, targetEmail, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      setStatus("success");
      setTimeout(() => router.push("/admin"), 2000);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/invalid-email') {
        setErrorMessage("メールアドレスの形式がおかしいぞい。正しく入力してくんちぇ！");
      } else {
        setErrorMessage("ログインに失敗したっぺ。招待されたメアドと同じか確認してくんちぇ。");
      }
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center text-white">
      <div className="mb-8">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
          <img src="/icon.webp" alt="絆太郎" className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">絆太郎・入室ゲート</h2>
      </div>

      {status === "loading" && (
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
          />
          <button
            onClick={() => handleSignIn(email)}
            // 🏆 修正ポイント：メアドが入るまでボタンを無効化するっぺ！
            disabled={!email || !email.includes("@")}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            入室を完了する <ArrowRight size={20} className="inline ml-2" />
          </button>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 animate-in zoom-in-95 text-white">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-bold">認証成功だばい！！</h3>
          <p className="text-slate-400">管理画面へ案内するぞい。</p>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-6 animate-in shake">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-400 font-bold text-sm">
            {errorMessage}
          </div>
          {/* 🏆 修正ポイント：エラーが出ても、入力画面に戻れるようにしたぞい！ */}
          <button onClick={() => setStatus("input")} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">
            もう一度入力する
          </button>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <VerifyLogic />
      </Suspense>
    </div>
  );
}