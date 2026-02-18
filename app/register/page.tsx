"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) throw new Error("Email not found");

      // 1. すでに登録済みかチェック
      const userRef = doc(db, "admin_users", user.email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        // 既にいたら管理画面へ
        console.log("既存ユーザーです。管理画面へ移動します。");
        router.push("/admin");
      } else {
        // ★ここを修正！
        // 勝手に登録せず、オンボーディング画面（自分で入力する画面）へ案内する
        console.log("新規ユーザーです。オンボーディングへ移動します。");
        router.push("/onboarding");
      }

    } catch (err: any) {
      console.error(err);
      setError("登録中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-2 mb-6">
           <Sparkles className="text-indigo-600" size={28} />
           <span className="text-2xl font-black text-slate-900 tracking-tighter">Event Manager</span>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-slate-900">
          無料でアカウント作成
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          クレジットカード登録は不要です。<br/>
          すでにアカウントをお持ちですか？{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            ログインはこちら
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl border border-slate-100 sm:rounded-xl sm:px-10">
          
          <div className="space-y-6">
            <div>
               <h3 className="text-sm font-bold text-slate-900 mb-4">アカウント作成でできること：</h3>
               <ul className="space-y-3 mb-6">
                  <li className="flex gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0"/>
                    <span>イベントページの作成・公開（無制限）</span>
                  </li>
                  <li className="flex gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0"/>
                    <span>参加者リストのリアルタイム管理</span>
                  </li>
                  <li className="flex gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={18} className="text-indigo-500 flex-shrink-0"/>
                    <span>QRコード受付機能の利用</span>
                  </li>
               </ul>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all group"
            >
              {loading ? (
                 <Loader2 className="animate-spin text-slate-500" size={20} />
              ) : (
                <>
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-5 w-5" />
                  Googleアカウントで登録
                </>
              )}
            </button>
            
            <p className="text-xs text-center text-slate-500 mt-4">
               登録することで、<Link href="/terms" className="underline hover:text-indigo-600">利用規約</Link>と<Link href="/privacy" className="underline hover:text-indigo-600">プライバシーポリシー</Link>に同意したことになります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}