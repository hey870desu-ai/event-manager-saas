"use client";

// 🏆 ビルド時に「勝手にページを作って壊れるな」と教える魔法
export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { auth } from "@/lib/firebase";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Mail, ArrowRight } from "lucide-react";

function VerifyLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  /**
   * status管理
   * checking: 初期チェック中
   * input   : メアド入力待ち（招待された人はここに来るっぺ）
   * loading : 認証処理実行中
   * success : 認証成功
   * error   : 本当のエラー（失敗時のみ表示）
   */
  const [status, setStatus] = useState<"checking" | "input" | "loading" | "success" | "error">("checking");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkLinkAndEmail = async () => {
      // 1. URLからテナントID（裏の背番号）をセット
      const tid = searchParams.get("tenantId");
      if (tid) {
        auth.tenantId = tid;
      }

      // 2. このURLが有効なメールリンクかチェック
      if (isSignInWithEmailLink(auth, window.location.href)) {
        
        // 3. ブラウザ（localStorage）にメアドが残っているか確認
        const savedEmail = window.localStorage.getItem("emailForSignIn");
        
        if (savedEmail && savedEmail.includes("@")) {
          // 保存されていれば、そのまま自動でログイン処理へ！
          handleSignIn(savedEmail);
        } else {
          // 🏆 【ここが重要！】保存されてなければ、エラーを出さずに「入力画面」を出すぞい！
          setStatus("input");
        }
      } else {
        // リンク自体が壊れている時だけエラーを表示
        setErrorMessage("このリンクは無効です。もう一度招待メールを確認してください。");
        setStatus("error");
      }
    };

    checkLinkAndEmail();
  }, [searchParams]);

  const handleSignIn = async (targetEmail: string) => {
    // 形式チェック
    if (!targetEmail || !targetEmail.includes("@")) {
      setStatus("input");
      return;
    }

    setStatus("loading");
    try {
      // Firebaseでログイン確定！
      await signInWithEmailLink(auth, targetEmail, window.location.href);
      window.localStorage.removeItem("emailForSignIn");
      setStatus("success");
      
      // 2秒後に管理画面へ案内
      setTimeout(() => {
        router.push("/admin");
      }, 2000);
    } catch (error: any) {
      console.error("Auth Error:", error);
      // 🏆 実際にログインに失敗した時だけ、赤いエラーを出すっぺ
      setErrorMessage("ログインに失敗しました。招待されたメールアドレスと同じか確認してください。");
      setStatus("error");
    }
  };

  return (
    <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center text-white">
      {/* 共通ヘッダー */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
          <img src="/icon.webp" alt="絆太郎" className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-white">絆太郎・入室ゲート</h2>
      </div>

      {/* 1. チェック中 & 認証実行中 */}
      {(status === "checking" || status === "loading") && (
        <div className="space-y-4 animate-in fade-in">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
          <p className="text-slate-400 font-bold">本人確認中だばい...</p>
        </div>
      )}

      {/* 2. メアド入力画面（おもてなしモード） */}
      {status === "input" && (
        <div className="space-y-6 animate-in zoom-in-95 duration-300">
          <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-xl text-left">
            <p className="text-sm text-indigo-300 font-bold leading-relaxed">
              <Mail className="inline mr-2" size={16} /> 
              確認のため、招待メールが届いた「メールアドレス」を入力してください。
            </p>
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

      {/* 3. 成功画面 */}
      {status === "success" && (
        <div className="space-y-4 animate-in zoom-in-95">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h3 className="text-xl font-bold text-white">認証成功だばい！！</h3>
          <p className="text-slate-400">管理画面へ案内するぞい。</p>
        </div>
      )}

      {/* 4. エラー画面 */}
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

// 🏆 Next.jsのお作法「Suspenseの箱」
export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-white">読み込み中だばい...</div>}>
        <VerifyLogic />
      </Suspense>
    </div>
  );
}