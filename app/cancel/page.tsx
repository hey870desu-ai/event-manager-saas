"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { XCircle, CheckCircle, AlertCircle, CreditCard } from "lucide-react";

function CancelContent() {
  const searchParams = useSearchParams();
  const rid = searchParams.get("rid");
  const eid = searchParams.get("eid");
  const paid = searchParams.get("paid"); // 有料イベントかどうか
  const [status, setStatus] = useState<'confirm' | 'processing' | 'done' | 'error'>('confirm');
  const [refunded, setRefunded] = useState(false);

  const handleCancel = async () => {
    if (!rid || !eid) {
      alert("IDが不足しています。メールのリンクをもう一度確認してください。");
      return;
    }

    setStatus('processing');
    try {
      const res = await fetch("/api/cancel-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: rid, eventId: eid }),
      });
      if (res.ok) {
        const data = await res.json();
        setRefunded(data.refunded === true);
        setStatus('done');
      } else {
        setStatus('error');
      }
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
          <p className="text-slate-500 font-bold text-sm mb-6 leading-relaxed">
            ボタンを押すと、お申し込みが取り消され、<br />他の方が申し込めるようになります。
          </p>

          {paid === '1' && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
              <CreditCard size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>有料イベントのため、キャンセル時にお支払い済みの参加費が自動返金されます。</strong>
                <br />
                <span className="text-xs text-amber-600">返金の反映にはカード会社により数日かかる場合があります。</span>
              </p>
            </div>
          )}

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
          <p className="text-slate-600 font-black text-xl">手続き中...</p>
          {paid === '1' && (
            <p className="text-slate-400 text-sm mt-2">返金処理を行っています</p>
          )}
        </div>
      )}

      {status === 'done' && (
        <>
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={48} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-4">キャンセルが<br />完了しました</h1>

          {refunded && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-700 font-bold">参加費の返金処理が完了しました</p>
              <p className="text-xs text-emerald-600 mt-1">カードへの反映まで数日かかる場合があります。</p>
            </div>
          )}

          {paid === '1' && !refunded && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-700 font-bold">返金処理に問題が発生しました</p>
              <p className="text-xs text-amber-600 mt-1">事務局より別途ご連絡いたします。</p>
            </div>
          )}

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
          <h1 className="text-xl font-bold text-slate-900 mb-4">エラーが発生しました</h1>
          <p className="text-slate-500 text-sm mb-8">手続きに失敗しました。お手数ですが、事務局へ直接ご連絡ください。</p>
        </>
      )}
    </div>
  );
}

export default function ParticipantCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 font-bold animate-pulse">読み込み中...</div>}>
        <CancelContent />
      </Suspense>
    </div>
  );
}
