"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle, XCircle, Mail, Loader2 } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleUnsubscribe = async () => {
    if (!email) return;
    setStatus("loading");

    try {
      // API経由で登録する（これなら権限エラーにならない）
      const res = await fetch("/api/optout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  };

  if (!email) {
    return (
      <div className="text-center text-slate-400">
        <XCircle className="mx-auto mb-4 text-slate-600" size={48} />
        <p>無効なリンクです。</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="text-center animate-in fade-in zoom-in">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-emerald-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">配信停止を受け付けました</h2>
        <p className="text-slate-500 mb-8">
          今後、<span className="text-slate-700 font-mono mx-1 font-bold">{email}</span> 宛の<br/>
          お知らせメールは配信されません。
        </p>
        <p className="text-xs text-slate-400">※反映まで数分かかる場合があります。</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="text-slate-500" size={32} />
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 mb-4">メール配信の停止</h2>
      <p className="text-slate-500 mb-8 leading-relaxed">
        以下のメールアドレスへの配信を停止しますか？<br/>
        <span className="text-indigo-600 font-bold font-mono text-lg block mt-2">{email}</span>
      </p>

      {status === "error" && (
        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm flex items-center justify-center gap-2 border border-red-100">
          <AlertTriangle size={16}/> エラーが発生しました。時間をおいて再度お試しください。
        </div>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={handleUnsubscribe}
          disabled={status === "loading"}
          className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {status === "loading" && <Loader2 className="animate-spin" size={18} />}
          {status === "loading" ? "処理中..." : "配信を停止する"}
        </button>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-slate-200 p-8 rounded-2xl shadow-xl">
        <Suspense fallback={<div className="text-slate-400 text-center">Loading...</div>}>
          <UnsubscribeContent />
        </Suspense>
      </div>
    </div>
  );
}