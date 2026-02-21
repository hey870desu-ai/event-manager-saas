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
  const [newReservationId, setNewReservationId] = useState("");
 // ✅ 修正後のコード（データのフラグを直接使う）
// event.hasOffline や event.hasOnline がデータ内にあるので、それを使います
const hasVenue = event.hasOffline === true; 
const hasOnline = event.hasOnline === true;
const isHybrid = hasVenue && hasOnline;
console.log("🔍 イベントデータ判定:", { venue: event.venueName, hasVenue, online: event.zoomUrl, hasOnline });

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
        contactName: event.contactName || "運営事務局",
        contactEmail: event.contactEmail || "", 
        contactPhone: event.contactPhone || "",
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
      // ★ これを追加
setNewReservationId(docRef.id);

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

      // ★修正：無料イベント(!isPaid)の時だけ、ここで即座にメールを送る
      if (!isPaid) {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: `【仮受付テスト】${event.title}`, // ★ この1行を追加！
              name: reservationData.name,
              email: reservationData.email,
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
              customAnswers: customAnswers,

              // 問い合わせ先情報
              contactName: event.contactName || safeTenant?.name || "運営事務局",
              contactEmail: event.contactEmail || "",
              contactPhone: event.contactPhone || "",
              eventPrice: event.price 
            }),
          });
        } catch (mailError) { 
          console.error("Mail error:", mailError); 
        }
      }

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
   <div className="h-full flex items-center justify-center p-6 md:p-10 min-h-[400px] overflow-y-auto">
     <div className="text-center w-full max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4"><CheckCircle size={32} /></div>
        <h3 className="text-xl font-bold text-white mb-2">お申し込み完了</h3>
        <p className="text-slate-400 text-sm mb-6">受付メールをお送りしました。</p>
        
        {/* ★ QRコードと案内セクションを追加 */}
        <div className="bg-white p-6 rounded-3xl mb-6 shadow-xl border-4" style={{ borderColor: themeColor }}>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Check-in QR Ticket</p>
           <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${newReservationId}`} 
              alt="Check-in QR" 
              className="w-40 h-40 mx-auto mb-4"
           />
           <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
              <p className="text-[11px] font-bold text-orange-700 leading-relaxed">
                【当日これを使います】<br/>
                この画面をスクリーンショット等で保存し、<br/>
                受付でスタッフにご提示ください。
              </p>
           </div>
        </div>

        <button onClick={() => { setIsOpen(false); setStatus("idle"); }} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition-colors">閉じる</button>
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
  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2">参加形式</h3>
  <div className="grid grid-cols-2 gap-4">
    
    {/* --- 会場参加ボタン --- */}
    <div 
      onClick={() => hasVenue && setParticipationType("offline")} // 会場設定がある時だけクリック可能
      className={`
        relative p-4 rounded-xl border text-center transition-all group
        ${!hasVenue 
          ? "bg-slate-900/50 border-slate-800 opacity-40 cursor-not-allowed" // 会場がない時はグレーアウト
          : participationType === "offline" 
            ? "bg-slate-800/80 cursor-pointer" 
            : "bg-slate-900 hover:bg-slate-800/50 cursor-pointer"}
      `}
      style={{ borderColor: (hasVenue && participationType === "offline") ? themeColor : '#334155' }}
    >
      <div className="flex flex-col items-center gap-1">
         <span className={`font-bold ${participationType === "offline" && hasVenue ? "text-white" : "text-slate-500"}`}>会場参加</span>
         {!hasVenue && <span className="text-[10px] text-slate-600 font-medium tracking-tighter">（設定なし）</span>}
      </div>
      {participationType === "offline" && hasVenue && (
        <div className="absolute top-2 right-2 text-emerald-400">
          <CheckCircle size={16} />
        </div>
      )}
    </div>

    {/* --- オンラインボタン --- */}
    <div 
      onClick={() => hasOnline && setParticipationType("online")} // オンライン設定がある時だけクリック可能
      className={`
        relative p-4 rounded-xl border text-center transition-all group
        ${!hasOnline 
          ? "bg-slate-900/50 border-slate-800 opacity-40 cursor-not-allowed" // オンラインがない時はグレーアウト
          : participationType === "online" 
            ? "bg-slate-800/80 cursor-pointer" 
            : "bg-slate-900 hover:bg-slate-800/50 cursor-pointer"}
      `}
      style={{ borderColor: (hasOnline && participationType === "online") ? themeColor : '#334155' }}
    >
      <div className="flex flex-col items-center gap-1">
         <span className={`font-bold ${participationType === "online" && hasOnline ? "text-white" : "text-slate-500"}`}>オンライン</span>
         {!hasOnline && <span className="text-[10px] text-slate-600 font-medium tracking-tighter">（設定なし）</span>}
      </div>
      {participationType === "online" && hasOnline && (
        <div className="absolute top-2 right-2 text-emerald-400">
          <CheckCircle size={16} />
        </div>
      )}
    </div>

  </div>
  
  {/* 補足メッセージ（どちらか一方が無い場合のみ表示） */}
  {(!hasVenue || !hasOnline) && (
    <p className="text-[10px] text-slate-600 text-center italic">
      ※このイベントは {hasVenue ? "会場" : "オンライン"} 開催のみ対応しています
    </p>
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