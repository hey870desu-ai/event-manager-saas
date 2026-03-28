"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react"; // 🏆 Suspenseを追加！
import { XCircle, CheckCircle, AlertCircle } from "lucide-react";

// 🏆 実際の処理をする中身（Content）
function CancelContent() {
  const searchParams = useSearchParams();
  const rid = searchParams.get("rid"); // 予約ID
  const eid = searchParams.get("eid"); // イベントID
  const [status, setStatus] = useState<'confirm' | 'processing' | 'done' | 'error'>('confirm');

  const handleCancel = async () => {
    if (!rid || !eid) {
      alert("IDが足りねぇぞい！メールのリンクをもう一度確認してくんちぇ。");
      return;
    }
    
    setStatus('processing');
    try {
      const res = await fetch("/api/cancel-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: rid, eventId: eid }),
      });
      if (res.ok) setStatus('done');
      else setStatus('error');
    } catch (e) {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl text-center border border-slate-100">
      {status === 'confirm' && (
        <>
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <XCircle size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4">申し込みを<br />キャンセルしますか？</h1>
          <p className="text-slate-500 font-bold text-sm mb-10 leading-relaxed">
            ボタンを押すと、お申し込みが取り消され、<br />他の方が申し込めるようになります。
          </p>
          <button 
            onClick={handleCancel} 
            className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
          >
            本当にキャンセルする
          </button>
        </>
      )}

      {status === 'processing' && (
        <div className="py-12">
          <div className="animate-spin h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <p className="text-slate-600 font-black text-xl">手続き中だっぺ...</p>
        </div>
      )}

      {status === 'done' && (
        <>
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4">キャンセルが<br />完了しました</h1>
          <p className="text-slate-600 font-bold mb-8">またのご参加を、<br />心よりお待ちしております。</p>
          <button 
            onClick={() => window.close()} 
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black"
          >
            閉じる
          </button>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="w-20 h-20 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={48} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-4">エラーだばい...</h1>
          <p className="text-slate-500 text-sm mb-8">手続きに失敗しました。お手数ですが、事務局へ直接ご連絡ください。</p>
        </>
      )}
    </div>
  );
}

// 🏆 外側の「箱」（Suspense）
export default function ParticipantCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 font-bold animate-pulse">読み込み中だぞい...</div>}>
        <CancelContent />
      </Suspense>
    </div>
  );
}