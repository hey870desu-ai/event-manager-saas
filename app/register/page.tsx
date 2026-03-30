"use client";

import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, sendSignInLinkToEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [mailSent, setMailSent] = useState(false);

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (!user.email) throw new Error("Email not found");

      // すでに登録済みかチェック
      const userRef = doc(db, "admin_users", user.email);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        router.push("/admin");
      } else {
        router.push("/onboarding");
      }

    } catch (err: any) {
      console.error(err);
      setError("登録中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");

    try {
      auth.languageCode = 'ja';
      const actionCodeSettings = {
        url: `${window.location.origin}/onboarding`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMailSent(true);
    } catch (err: any) {
      console.error(err);
      setError("メール送信に失敗しました。メールアドレスを確認してください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center gap-3 mb-8">
          <img
            src="/icon.webp"
            alt="絆太郎"
            className="h-9 w-9 object-contain"
          />
          <span className="text-3xl font-black text-slate-900 tracking-tighter">
            絆太郎 EVENT MANAGER
          </span>
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

            {/* Googleアカウントで登録 */}
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-3 px-4 border border-slate-300 rounded-lg shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all group"
            >
              {loading ? (
                 <Loader2 className="animate-spin text-slate-500" size={20} />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Googleアカウントで登録
                </>
              )}
            </button>

            {/* 区切り線 */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">またはメールアドレスで登録</span>
              </div>
            </div>

            {/* メールリンク登録 */}
            {mailSent ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2"/>
                <p className="text-emerald-700 font-bold text-sm">登録メールを送信しました</p>
                <p className="text-xs text-slate-500 mt-1">
                  メール内のリンクをクリックして、<br/>アカウント作成を完了してください。
                </p>
              </div>
            ) : (
              <form onSubmit={handleEmailSignUp} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  placeholder="メールアドレスを入力"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-sm disabled:opacity-50 text-sm"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                  <span>メールアドレスで登録</span>
                </button>
              </form>
            )}

            <p className="text-xs text-center text-slate-500 mt-4">
               登録することで、<Link href="/terms" className="underline hover:text-indigo-600">利用規約</Link>と<Link href="/privacy" className="underline hover:text-indigo-600">プライバシーポリシー</Link>に同意したことになります。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
