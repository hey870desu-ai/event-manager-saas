"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, Clock, ReceiptText } from "lucide-react";

function SuccessContent() {
  const params = useParams();
  const tId = params.tenantId as string;
  const eId = params.eventId as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const processedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  
  const [ticketData, setTicketData] = useState<{
    reservationId: string;
    eventId: string;
    tenantId: string;
    paymentStatus: string;
  } | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }

    if (processedRef.current) return;
    processedRef.current = true;

    const verifyPayment = async () => {
      try {
        const res = await fetch("/api/stripe/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) throw new Error("Verification failed");
        
        const data = await res.json();
        
        setTicketData({
          reservationId: data.reservationId,
          eventId: data.eventId,
          tenantId: data.tenantId || "demo",
          paymentStatus: data.paymentStatus || "paid",
        });

        setStatus("success");
      } catch (error) {
        console.error(error);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [sessionId]);

  const qrUrl = ticketData 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&ecc=M&data=${ticketData.reservationId}`
    : "";

  return (
    <div className="min-h-screen bg-[#0f111a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        
        {status === "loading" && (
          <div className="py-10">
            <Loader2 className="w-16 h-16 text-indigo-500 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">決済を確認しています...</h2>
            <p className="text-slate-400 text-sm">画面を閉じずにお待ちください</p>
          </div>
        )}

        {status === "success" && ticketData && (
          <div className="py-4 animate-in zoom-in-95 duration-500">
            {ticketData.paymentStatus === 'unpaid' ? (
              <>
                <div className="w-20 h-20 bg-orange-500/20 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-orange-400">お申し込み完了</h2>
                <p className="text-white font-bold mb-4">（お支払い待ち）</p>
                <div className="bg-slate-800/50 p-4 rounded-xl text-left text-sm text-slate-300 mb-6 border border-slate-700">
                  <p className="mb-2">まだ参加確定していません。</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>選択したコンビニ・銀行でお支払いを完了させてください。</li>
                    <li>入金確認後にQRコード（参加証）が発行されます。</li>
                  </ul>
                </div>
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-3 mb-8 text-sm text-indigo-200">
                   <p className="flex items-center justify-center gap-2">
                     <ReceiptText size={16}/> 詳細はStripeからのメールをご確認ください
                   </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold mb-2">お申し込み完了！</h2>
                <div className="bg-white p-3 rounded-xl inline-block mb-8 shadow-lg">
                  <img src={qrUrl} alt="Ticket QR" width={180} height={180} />
                </div>
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-3 mb-8 text-sm text-indigo-200">
                   <p className="font-bold flex items-center justify-center gap-2 mb-1">
                     📸 スクリーンショット推奨
                   </p>
                </div>
              </>
            )}

            <div className="space-y-3">
              <button 
                onClick={() => router.push(`/t/${tId}/e/${eId}`)}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition-colors"
              >
                <ArrowLeft size={18} /> イベントページに戻る
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="py-6">
            <div className="w-20 h-20 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-xl font-bold mb-4">エラーが発生しました</h2>
            <button 
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold"
            >
              トップページへ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ★ これが絶対に必要だっぺ！
export default function ThanksPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f111a]" />}>
      <SuccessContent />
    </Suspense>
  );
}