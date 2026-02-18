"use client";

import { useState } from "react";
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // あなたのFirebase設定ファイルをインポート

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // フォームの内容
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Firestoreの 'contacts' コレクションに保存
      await addDoc(collection(db, "contacts"), {
        ...formData,
        createdAt: serverTimestamp(),
        status: "unread", // 未読ステータス
      });

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* ヘッダー簡易版 */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold text-sm">
            <ArrowLeft size={16} /> トップページに戻る
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black mb-4">お問い合わせ</h1>
          <p className="text-slate-600">
            ご質問、ご要望などございましたら、<br/>お気軽にお問い合わせください。
          </p>
        </div>

        {submitted ? (
          // ▼ 送信完了画面
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-4">送信しました</h2>
            <p className="text-slate-600 mb-8">
              お問い合わせありがとうございます。<br/>
              内容を確認次第、担当者よりご連絡させていただきます。
            </p>
            <Link href="/" className="inline-block bg-slate-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-slate-800 transition-colors">
              トップページへ戻る
            </Link>
          </div>
        ) : (
          // ▼ 入力フォーム
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 flex items-center gap-2 text-sm font-bold">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="space-y-6">
              {/* お名前 */}
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">お名前 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="山田 太郎"
                />
              </div>

              {/* 会社名 */}
              <div>
                <label htmlFor="company" className="block text-sm font-bold text-slate-700 mb-2">会社名 / 団体名</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="株式会社○○"
                />
              </div>

              {/* メールアドレス */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">メールアドレス <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  placeholder="taro@example.com"
                />
              </div>

              {/* お問い合わせ内容 */}
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2">お問い合わせ内容 <span className="text-red-500">*</span></label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="サービスについて詳しく聞きたい..."
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "送信中..." : <><Send size={18} /> 送信する</>}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}