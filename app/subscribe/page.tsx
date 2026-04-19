"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, User, CheckCircle, Loader2, Heart } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function SubscribeContent() {
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("t");

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [themeColor, setThemeColor] = useState("#3b82f6");

  // テナント情報を取得
  useEffect(() => {
    if (!tenantId) return;
    getDoc(doc(db, "tenants", tenantId)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTenantName(data.name || "");
        if (data.themeColor) setThemeColor(data.themeColor);
      }
    });
  }, [tenantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !tenantId) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, tenantId }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "登録に失敗しました");
        setStatus("error");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
      setStatus("error");
    }
  };

  if (!tenantId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <p className="text-slate-400">無効なリンクです。</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 shadow-2xl">
            <CheckCircle size={64} className="mx-auto mb-6 text-emerald-400" />
            <h2 className="text-2xl font-black text-white mb-3">登録完了！</h2>
            <p className="text-slate-400 leading-relaxed">
              {tenantName}のメールマガジンに<br/>ご登録いただきありがとうございます。
            </p>
            <p className="text-xs text-slate-600 mt-6">
              配信停止はメール内のリンクからいつでも可能です。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* ヘッダー */}
          <div className="p-8 text-center" style={{ background: `linear-gradient(135deg, #1e293b, ${themeColor}30)`, borderBottom: `3px solid ${themeColor}` }}>
            <Heart size={32} className="mx-auto mb-4" style={{ color: themeColor }} />
            <h1 className="text-xl font-black text-white mb-2">
              {tenantName || "メールマガジン"}
            </h1>
            <p className="text-sm text-slate-400">
              最新のお知らせをお届けします
            </p>
          </div>

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block">お名前</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 mb-1.5 block">メールアドレス <span className="text-red-400">*</span></label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-red-400 text-xs">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email}
              className="w-full py-3.5 rounded-xl font-black text-white text-sm shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: themeColor }}
            >
              {status === "loading" ? (
                <><Loader2 size={18} className="animate-spin" /> 登録中...</>
              ) : (
                <><Mail size={18} /> 無料で登録する</>
              )}
            </button>

            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
              ご登録いただいたメールアドレスは、メールマガジンの配信にのみ使用いたします。<br/>
              配信停止はメール内のリンクからいつでも可能です。
            </p>
          </form>
        </div>

        <p className="text-center text-[10px] text-slate-700 mt-6">Powered by 絆太郎</p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-slate-500" size={32}/></div>}>
      <SubscribeContent />
    </Suspense>
  );
}
