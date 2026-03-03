"use client";

import { useEffect, useState, Suspense } from "react";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function VerifyEmailLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error" | "need_email">("verifying");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        // 🚨 【超重要】URLからテナントIDを確実に抜き出す
        const tId = searchParams.get('tenantId');
        console.log("📍 URLから取れたテナントID:", tId);

        if (tId) {
          // 門番に「この部屋だっぺ！」と教える
          auth.tenantId = tId; 
        }

        let email = window.localStorage.getItem("emailForSignIn");
        if (!email) {
          setStatus("need_email");
          return;
        }
        await completeSignIn(email);
      }
    };
    verify();
  }, [searchParams]); // 🚨 searchParams が準備できたら動くようにするっぺ

  const completeSignIn = async (email: string) => {
    try {
      setStatus("verifying");
      
      //念のため、ここでもテナントIDを再チェック
      const tId = searchParams.get('tenantId');
      if (tId) auth.tenantId = tId;

      console.log("🚀 ログイン実行中... テナントID:", auth.tenantId);

      await signInWithEmailLink(auth, email, window.location.href);
      
      window.localStorage.removeItem("emailForSignIn");
      setStatus("success");
      
      setTimeout(() => {
        router.push("/admin");
      }, 2000);

    } catch (error: any) {
      console.error("🔥 Firebaseエラー詳細:", error.code, error.message);
      setStatus("error");
      
      // エラーメッセージを親切にするっぺ
      if (error.code === 'auth/invalid-tenant-id') {
        setErrorMessage(`テナントID [${searchParams.get('tenantId')}] が門番に認められなかったっぺ。Googleの設定と一字一句合ってるか確認だばい。`);
      } else {
        setErrorMessage(error.message || "リンクの有効期限が切れているか、すでに使われたようだばい。");
      }
    }
  };

  // ... (下のリターン部分は塙さんの元のコードと同じでOKだっぺ！)
  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
        {status === "verifying" && (
          <div className="space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
            <h2 className="text-xl font-bold">入室確認中...</h2>
            <p className="text-slate-400 text-sm">鍵が本物かチェックしてるっぺ（ID: {searchParams.get('tenantId')}）</p>
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <p className="text-slate-400 text-sm break-all">{errorMessage}</p>
            <button onClick={() => router.push("/login")} className="text-indigo-400 text-sm hover:underline">ログイン画面に戻る</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailLinkPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-white"><Loader2 className="animate-spin" /></div>}>
      <VerifyEmailLinkContent />
    </Suspense>
  );
}