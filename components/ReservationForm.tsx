// 📂 components/ReservationForm.tsx
// 📝 修正版: 「会社名」「事業所名」の強制表示を削除し、基本4項目のみに

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { Send, CheckCircle, AlertCircle, X, ChevronRight, User, Mail, Phone, List, MessageSquare, CreditCard,ExternalLink } from "lucide-react"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

type TenantData = {
  name: string;
  themeColor?: string;
};

type CustomField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  options?: string[];
  required: boolean;
};

// ▼▼▼ 修正1: tenantId と eventId に「?」をつけて省略可能にする ▼▼▼
type Props = {
  tenantId?: string;
  eventId?: string;
  event: any; 
  tenantData?: TenantData;
  tenant?: any;
  onSuccess?: (id: string) => void;
};

export default function ReservationForm({ 
  tenantId, 
  eventId, 
  event, 
  tenantData, 
  onSuccess, 
  tenant 
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [participationType, setParticipationType] = useState("offline");
  const [agreed, setAgreed] = useState(false);
  // ▼▼▼ 追加：開催形式の判定フラグ ▼▼▼
  const hasVenue = !!event.venueName; // 会場名があるか
  const hasOnline = !!event.zoomUrl;   // Zoom等のURLがあるか
  const isHybrid = hasVenue && hasOnline; // 両方あればハイブリッド

  // 初回表示時に適切な方をデフォルトにする
  useEffect(() => {
    if (hasOnline && !hasVenue) {
      setParticipationType("online");
    } else {
      setParticipationType("offline");
    }
  }, [hasOnline, hasVenue]);
  // ▲▲▲ ここまで ▲▲▲
  
  // 1. フックとパラメータ
  const params = useParams();

  // 2. safeTenant を最初に定義！ (これがないと下でエラーになります)
  const safeTenant = tenantData || tenant;
  
  // 3. IDの定義 (重複していたのを1つにまとめました)
  const safeEventId = eventId || event?.id || (params?.event as string);
  const safeTenantId = tenantId || event?.tenantId || safeTenant?.id || (params?.tenant as string) || "demo";

  // 4. 価格計算
  const priceStr = event.price || "無料";
  const isPaid = priceStr !== "無料" && !isNaN(Number(priceStr));
  const priceAmount = isPaid ? Number(priceStr) : 0;

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const themeColor = safeTenant?.themeColor || "#f97316";
  const customFields: CustomField[] = event.customFields || [];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const formData = new FormData(e.currentTarget);
      
      const customAnswers: {[key: string]: any} = {};
      customFields.forEach(field => {
        if (field.type === "checkbox") {
           customAnswers[field.label] = formData.getAll(field.id);
        } else {
           customAnswers[field.label] = formData.get(field.id)?.toString() || "";
        }
      });

      const reservationData = {
        tenantId,
        eventId,
        eventTitle: event.title,
        name: formData.get("name")?.toString() || "",
        email: formData.get("email")?.toString() || "",
        phone: formData.get("phone")?.toString() || "",
        type: participationType,
        customAnswers: customAnswers,
        notes: formData.get("notes")?.toString() || "",
        
        // ★修正: 有料なら「支払い待ち」、無料なら「確定」
        status: isPaid ? "payment_pending" : "confirmed", 
        createdAt: serverTimestamp(),
        emailed: false,
        checkedIn: false,
        price: isPaid ? priceAmount : 0, // 価格も保存
      };

      if (!safeEventId) throw new Error("Event ID is missing");
      
      // 1. まずFirestoreに保存
      const docRef = await addDoc(collection(db, "events", safeEventId, "reservations"), reservationData);

      // ▼▼▼ 追加: 有料イベントの場合 ▼▼▼
      if (isPaid) {
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: safeEventId,
            tenantId: safeTenantId,
            price: priceAmount,
            title: event.title,
            origin: window.location.origin,
            reservationId: docRef.id, 
            email: reservationData.email
          }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (data.url) {
          window.location.href = data.url; // Stripeへ移動
          return; 
        }
      }

      // メール送信処理
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: reservationData.name,
            email: reservationData.email,
            // company: reservationData.company, // ← 削除
            type: reservationData.type,
            eventTitle: event.title,
            eventDate: event.date,
            eventTime: `${event.startTime} - ${event.endTime}`,
            venueName: event.venueName,
            zoomUrl: event.zoomUrl,
            meetingId: event.meetingId,
            zoomPasscode: event.zoomPasscode,
            reservationId: docRef.id,
            tenantName: safeTenant?.orgName || safeTenant?.name,
            themeColor: tenantData?.themeColor,
            replyTo: safeTenant?.ownerEmail,
            customAnswers: customAnswers // ★追加: カスタム回答もメールに含める
          }),
        });
      } catch (mailError) { console.error("Mail error:", mailError); }

      setStatus("success");
      if (onSuccess) { setIsOpen(false); onSuccess(docRef.id); }
      
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("エラーが発生しました。");
      setStatus("error");
    }
  };

  if (!mounted) return null;

  return (
    <>
      <button onClick={() => setIsOpen(true)} style={{ background: themeColor }} className="w-full group relative flex items-center justify-center gap-3 px-8 py-5 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] hover:opacity-90">
        <span className="text-xl tracking-wide">参加する</span>
        <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform"><ChevronRight size={20} /></div>
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsOpen(false)} />

          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0f111a] border border-slate-700 rounded-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300 overflow-hidden ring-1 ring-white/10">
            {status === "success" && !onSuccess ? (
               <div className="h-full flex items-center justify-center p-10 min-h-[400px]">
                 <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 mb-6"><CheckCircle size={40} /></div>
                    <h3 className="text-2xl font-bold text-white mb-3">お申し込み完了</h3>
                    <p className="text-slate-300 mb-8">受付メールをお送りしました。</p>
                    <button onClick={() => { setIsOpen(false); setStatus("idle"); }} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white">閉じる</button>
                 </div>
               </div>
            ) : (
              <>
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0f111a]/95 backdrop-blur z-10 sticky top-0">
                  <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-1 h-6 rounded-full" style={{ background: themeColor }}></span> 参加申し込みフォーム
                  </h2>
                  <button onClick={() => setIsOpen(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"><X size={24} /></button>
                </div>

                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#0f111a]">
                  <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* ▼▼▼ 基本情報（必須3項目のみに修正） ▼▼▼ */}
                    <div className="space-y-6">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">基本情報</h3>
                      
                      {/* お名前 & メールアドレス */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5"><User size={14} style={{color: themeColor}}/> お名前 <span className="text-red-400">*</span></label>
                          <input type="text" name="name" required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5"><Mail size={14} style={{color: themeColor}}/> メールアドレス <span className="text-red-400">*</span></label>
                          <input type="email" name="email" required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                        </div>
                      </div>

                      {/* 電話番号のみ（会社名は削除） */}
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5"><Phone size={14} style={{color: themeColor}}/> 電話番号 <span className="text-red-400">*</span></label>
                          <input type="tel" name="phone" required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-1" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                      </div>
                    </div>
                    {/* ▲▲▲ 修正完了 ▲▲▲ */}

                    {/* ▼▼▼ 修正版: 垣根（線と文字）を完全に削除 ▼▼▼ */}
                    {customFields.length > 0 && (
                      <div className="space-y-6 mt-6">
                        
                        {/* 🗑️ ここにあった <h3>アンケート</h3> と border を削除しました */}

                        {customFields.map((field) => (
                          <div key={field.id} className="space-y-3">
                            <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
                              <span style={{color: themeColor}}>■</span> {field.label} 
                              {field.required && <span className="text-red-400">*</span>}
                            </label>

                            {field.type === "text" && (
                              <input type="text" name={field.id} required={field.required} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                            )}

                            {field.type === "textarea" && (
                              <textarea name={field.id} required={field.required} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none min-h-[80px]" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                            )}

                            {field.type === "select" && (
                              <select name={field.id} required={field.required} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'}>
                                <option value="">選択してください</option>
                                {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            )}

                            {field.type === "checkbox" && (
                              <div className="grid grid-cols-2 gap-3">
                                {field.options?.map(opt => (
                                  <label key={opt} className="flex items-center gap-2 p-3 rounded-lg border border-transparent hover:bg-slate-800 cursor-pointer transition-colors bg-slate-900">
                                    <input type="checkbox" name={field.id} value={opt} className="w-4 h-4 rounded border-slate-600 bg-slate-800" style={{ accentColor: themeColor }} />
                                    <span className="text-sm text-slate-300">{opt}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* ▲▲▲ 修正完了 ▲▲▲ */}

                   {/* 参加形式 */}
<div className="space-y-4">
  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">
    参加形式
  </h3>

  {isHybrid ? (
    /* 【ハイブリッドの場合】 選択肢を2つ表示 */
    <div className="grid grid-cols-2 gap-4">
      {/* 会場参加ボタン */}
      <div 
        onClick={() => setParticipationType("offline")}
        className={`cursor-pointer relative p-4 rounded-xl border text-center transition-all ${participationType === "offline" ? "bg-slate-800/80" : "bg-slate-900"}`}
        style={{ borderColor: participationType === "offline" ? themeColor : '#334155' }}
      >
        <span className={`font-bold ${participationType === "offline" ? "text-white" : "text-slate-400"}`}>会場参加</span>
        {participationType === "offline" && <div className="absolute top-2 right-2 text-emerald-400"><CheckCircle size={16} /></div>}
      </div>

      {/* オンラインボタン */}
      <div 
        onClick={() => setParticipationType("online")}
        className={`cursor-pointer relative p-4 rounded-xl border text-center transition-all ${participationType === "online" ? "bg-slate-800/80" : "bg-slate-900"}`}
        style={{ borderColor: participationType === "online" ? themeColor : '#334155' }}
      >
        <span className={`font-bold ${participationType === "online" ? "text-white" : "text-slate-400"}`}>オンライン</span>
        {participationType === "online" && <div className="absolute top-2 right-2 text-emerald-400"><CheckCircle size={16} /></div>}
      </div>
    </div>
  ) : (
    /* 【一方のみの場合】 固定のバッジを表示 */
    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between group">
      <div className="flex items-center gap-3">
        {/* オンラインならMail/Smartphone、リアルならUserなど適切なアイコンを出すのもアリ */}
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: themeColor }}></div>
        <span className="font-bold text-white tracking-wide">
          {hasOnline ? "オンライン開催（Zoom/URL）" : "会場開催（リアル）"}
        </span>
      </div>
      <span className="text-[10px] font-black text-slate-500 bg-slate-800 px-2.5 py-1 rounded-full uppercase tracking-widest border border-slate-700">
        Entry Mode: Fixed
      </span>
    </div>
  )}
</div>



                    {/* 備考（固定） */}
                    <div className="space-y-2 pt-4 border-t border-slate-800">
                       <label className="text-sm font-medium text-slate-300 flex items-center gap-1.5"><MessageSquare size={14} style={{color: themeColor}}/> ご要望・備考 (任意)</label>
                       <textarea name="notes" placeholder="その他、ご質問などがございましたらご記入ください。" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none min-h-[100px]" style={{ borderColor: 'transparent' }} onFocus={(e) => e.target.style.borderColor = themeColor} onBlur={(e) => e.target.style.borderColor = '#334155'} />
                    </div>

                    {/* ▼▼▼ 追加：プライバシーポリシー同意チェック ▼▼▼ */}
<div className="mt-8 p-4 bg-slate-900/50 border border-slate-700 rounded-xl">
  <label className="flex items-start gap-3 cursor-pointer group">
    <input 
      type="checkbox" 
      checked={agreed}
      onChange={(e) => setAgreed(e.target.checked)}
      className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-offset-0 focus:ring-1"
      style={{ accentColor: themeColor }}
      required 
    />
    <span className="text-sm text-slate-400 leading-relaxed select-none">
  <Link href="/privacy" target="_blank" className="font-bold hover:underline inline-flex items-center gap-1" style={{ color: themeColor }}>
    プライバシーポリシー
    <ExternalLink size={14} />
  </Link>
  に同意し、<span>主催者からの案内</span>を受け取ることを含め申し込む。
</span>
  </label>
</div>
{/* ▲▲▲ 追加完了 ▲▲▲ */}

                    {status === "error" && (
                      <div className="p-4 bg-red-900/30 text-red-200 text-sm rounded-lg border border-red-500/30 flex items-start gap-3">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <div><p className="font-bold">エラーが発生しました</p><p>{errorMessage}</p></div>
                      </div>
                    )}

                    <div className="pt-8 border-t border-slate-800 mt-8">
  <button 
    type="submit" 
    // ▼ 修正点1: 「読み込み中」または「未同意」の場合にボタンを無効化
    disabled={status === "loading" || !agreed} 
    // ▼ 修正点2: 同意していない時はグレー(#334155)、同意したらテーマカラーに
    style={{ background: agreed ? themeColor : '#334155' }} 
    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
  >
    {status === "loading" ? (
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/>
    ) : (
      isPaid ? (
        <>{priceAmount.toLocaleString()}円で支払う <CreditCard size={18} /></>
      ) : (
        <>上記の内容で申し込む <Send size={18} /></>
      )
    )}
  </button>
</div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}