"use client";

import { useEffect, useState, Suspense } from "react"; // 🚨 Suspense を追加
import { auth } from "@/lib/firebase"; // 自分の設定ファイルに合わせてくんちぇ
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function VerifyEmailLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); // 🚨 これがエラーの原因だったやつだばい
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "need_email">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    // 1. このURLがマジックリンクかどうかを判定
    if (isSignInWithEmailLink(auth, window.location.href)) {
      
      // 2. ブラウザに保存してある「ログインしようとしたメールアドレス」を取り出す
      let email = window.localStorage.getItem("emailForSignIn");

      // 3. もし別のスマホやブラウザで開いた場合、emailが空っぽになるっぺ
      if (!email) {
        setStatus("need_email"); // アドレス再入力モードへ
        return;
      }

      // 4. 合体！ログイン実行だばい
      completeSignIn(email);
    }
  }, []);

  const completeSignIn = async (email: string) => {
    try {
      setStatus("verifying");
      const result = await signInWithEmailLink(auth, email, window.location.href);
      
      // ログイン成功したらlocalStorageを掃除して、管理画面へGO！
      window.localStorage.removeItem("emailForSignIn");
      setStatus("success");
      
      setTimeout(() => {
        router.push("/admin"); // ログイン成功後の飛ばし先だっぺ
      }, 2000);

    } catch (error: any) {
      console.error(error);
      setStatus("error");
      setErrorMessage("リンクの有効期限が切れているか、すでに使われたようだばい。");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
        
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold">入室確認中...</h2>
            <p className="text-slate-400 text-sm">鍵が本物かチェックしてるっぺ。ちょっと待っててくんちぇ。</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 animate-in zoom-in">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold">認証成功だばい！</h2>
            <p className="text-slate-400 text-sm">管理画面にジャンプするぞい...</p>
          </div>
        )}

        {status === "need_email" && (
          <div className="space-y-6 animate-in fade-in">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-indigo-400">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-xl font-bold">確認のためメールアドレスを教えてくんちぇ</h2>
            <p className="text-slate-400 text-sm">セキュリティのため、招待されたメールアドレスをもう一度入力してくんちぇ。</p>
            <input 
              type="email" 
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={() => completeSignIn(emailInput)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-bold transition-all"
            >
              ログインを完了する
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-400">入れなかったっぺ...</h2>
            <p className="text-slate-400 text-sm">{errorMessage}</p>
            <button onClick={() => router.push("/login")} className="text-indigo-400 text-sm hover:underline">ログイン画面に戻る</button>
          </div>
        )}

      </div>
    </div>
  );
}
// --- 【2階部分】ここが本当の「ページ」の入り口だぞい！ ---
export default function VerifyEmailLinkPage() {
  return (
    // 「Suspense」で中身を包んでやることで、Vercelも納得するんだばい！
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-white">
        <Loader2 className="animate-spin" />
      </div>
    }>
      <VerifyEmailLinkContent />
    </Suspense>
  );
}