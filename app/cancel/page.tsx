"use client";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { XCircle, CheckCircle } from "lucide-react";

export default function ParticipantCancelPage() {
  const searchParams = useSearchParams();
  const rid = searchParams.get("rid"); // 予約ID
  const [status, setStatus] = useState<'confirm' | 'processing' | 'done' | 'error'>('confirm');

  const handleCancel = async () => {
    setStatus('processing');
    try {
      // 🏆 ここで「キャンセル処理API」を叩くっぺ！
      const res = await fetch("/api/cancel-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservationId: rid }),
      });
      if (res.ok) setStatus('done');
      else setStatus('error');
    } catch (e) { setStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center">
        {status === 'confirm' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-4">お申し込みをキャンセルしますか？</h1>
            <p className="text-slate-500 text-sm mb-8">ボタンを押すと、お申し込みが取り消され、枠が解放されます。</p>
            <button onClick={handleCancel} className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold">本当にキャンセルする</button>
          </>
        )}
        {status === 'processing' && <p className="animate-pulse">手続き中だっぺ...</p>}
        {status === 'done' && (
          <>
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">キャンセルが完了しました</h1>
            <p className="text-slate-500 text-sm">またのご参加を心よりお待ちしております。</p>
          </>
        )}
      </div>
    </div>
  );
}