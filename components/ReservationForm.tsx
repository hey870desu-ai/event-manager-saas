// 📂 components/ReservationForm.tsx
// 📝 修正版: 「会社名」「事業所名」の強制表示を削除し、基本4項目のみに

"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { Send, CheckCircle, AlertCircle, X, ChevronRight, User, Mail, Phone, List, MessageSquare, CreditCard,ExternalLink,CheckCircle2 } from "lucide-react"; 
import { collection, addDoc, serverTimestamp,query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";

type TenantData = {
  id?: string;           // ★これを追加
  name: string;
  orgName?: string;      // ★これを追加
  themeColor?: string;
  stripeConnectId?: string; // ★これを追加
  ownerEmail?: string;    // ★これを追加
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
  // --- 🏆 【1段目】まずは「材料」を揃えるっぺ（一番上に持ってくる！） ---
  const params = useParams();
  const safeTenant = (tenantData || tenant) as any;
  const safeEventId = eventId || event?.id || (params?.event as string);
  const safeTenantId = tenantId || event?.tenantId || safeTenant?.id || (params?.tenant as string) || "demo";
  const themeColor = safeTenant?.themeColor || "#f97316";
  // カスタムフィールドのIDを安全な値に正規化（全角記号等が入っていた場合の対策）
  const customFields: CustomField[] = (event.customFields || []).map((f: any, i: number) => ({
    ...f,
    id: (f.id && /^[a-zA-Z0-9_-]+$/.test(f.id)) ? f.id : `cf_${i}_${Math.random().toString(36).substring(2, 7)}`,
  }));

  // --- 🏆 【2段目】次に「状態（State）」を準備するぞい ---
  const [currentCount, setCurrentCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [participationType, setParticipationType] = useState("offline");
  const [agreed, setAgreed] = useState(false);
  const [newReservationId, setNewReservationId] = useState("");
  const [mounted, setMounted] = useState(false);

  // --- 🏆 【3段目】「動き（Effect）」をつけるっぺ ---
  // マウント確認
  useEffect(() => { setMounted(true); }, []);

  // リアルタイム人数集計（safeEventIdが上で定義されてるからもう赤くならないぞい！）
  useEffect(() => {
    if (!safeEventId) return;
    const q = query(collection(db, "events", safeEventId, "reservations"));
    const unsubscribe = onSnapshot(q, (snap) => {
      const activePeople = snap.docs.filter(d => d.data().status !== 'cancelled').length;
      setCurrentCount(activePeople);
    });
    return () => unsubscribe();
  }, [safeEventId]);

  // --- 🏆 【4段目】「判定」を下すぞい ---
  const isFull = event.capacity && currentCount >= event.capacity;

  // チケット関係の計算
  const tickets = (event.tickets && event.tickets.length > 0) 
    ? event.tickets 
    : [{ id: "legacy", name: "通常参加", price: event.price === "無料" ? 0 : parseInt(event.price) || 0 }];
  const [selectedTicketId, setSelectedTicketId] = useState(tickets[0]?.id || "");
  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId) || tickets[0];
  const isPaid = selectedTicket && selectedTicket.price > 0;
  const priceAmount = isPaid ? selectedTicket.price : 0;

  // 開催形式の判定
  const hasVenue = event.hasOffline === true; 
  const hasOnline = event.hasOnline === true;
  
  useEffect(() => {
    if (hasOnline && !hasVenue) setParticipationType("online");
    else setParticipationType("offline");
  }, [hasOnline, hasVenue]);

  // ...ここから下に handleSubmit 関数が続くっぺ

const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 🚨 【LINE対策：最強の初動】
    // await（待ち）が発生する前に、全ての値を普通の「文字列」として変数に閉じ込めるっぺ！
    // これをしないと、LINEブラウザは通信中に「あれ？名前なんだっけ？」とデータを捨てちまうんだばい。
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const inputName = formData.get("name")?.toString() || "";
    const inputEmail = formData.get("email")?.toString() || "";
    const inputPhone = formData.get("phone")?.toString() || "";
    const inputNotes = formData.get("notes")?.toString() || "";

    // アンケート回答を安全に抽出
    // Firestoreはキーに1500バイト制限があるため、長文ラベルをキーにせず配列形式で保存
    const customAnswersList: Array<{label: string, value: string | string[]}> = [];
    customFields.forEach(field => {
      if (!field.id) return;
      const label = String(field.label || "").slice(0, 200); // ラベルも安全な長さに
      try {
        if (field.type === "checkbox") {
          const values = formData.getAll(field.id)
            .filter(v => typeof v === 'string')
            .map(v => String(v))
            .filter(v => v !== "");
          customAnswersList.push({ label, value: values });
        } else {
          const val = formData.get(field.id);
          customAnswersList.push({ label, value: (typeof val === 'string') ? val : String(val || "") });
        }
      } catch { /* skip */ }
    });
    // 配列形式なのでキーの長さ問題がない + JSON.stringify で最終浄化
    const customAnswers = JSON.parse(JSON.stringify(customAnswersList));

    setStatus("loading");
    setErrorMessage("");

    try {
      // 🚨 IDチェック
      if (!safeEventId) throw new Error("イベントIDが見つかりません。再読み込みしてくんちぇ。");

      // 🏆 【追加！】最新の参加人数をチェックして、定員オーバーなら弾くっぺ！
      // ※ event.capacity が設定されている場合のみチェックするぞい
      if (event.capacity) {
        const activeReservationsCount = currentCount || 0;
        if (activeReservationsCount >= event.capacity) {
          throw new Error("【満員御礼】申し訳ございません。たった今、定員に達しました。");
        }
      }

      const isStripeReady = !!safeTenant?.stripeConnectId;

      // Firestoreに安全に保存できるようにデータを構築
      const safeStr = (v: any) => (v == null ? "" : String(v));

      const reservationData: Record<string, any> = {
        tenantId: safeStr(safeTenantId),
        eventId: safeStr(safeEventId),
        eventTitle: safeStr(event.title),
        contactName: safeStr(event.contactName || "運営事務局"),
        contactEmail: safeStr(event.contactEmail),
        contactPhone: safeStr(event.contactPhone),
        name: safeStr(inputName),
        email: safeStr(inputEmail),
        phone: safeStr(inputPhone),
        type: safeStr(participationType),
        customAnswers: customAnswers,
        notes: safeStr(inputNotes),
        selectedTicket: safeStr(selectedTicket?.name),
        status: isPaid
          ? (isStripeReady ? "payment_pending" : "on_site")
          : "confirmed",
        createdAt: serverTimestamp(),
        emailed: false,
        checkedIn: false,
        price: isPaid ? Number(priceAmount) || 0 : 0,
      };

      // 最終サニタイズ: Firestoreが受け付けない値を除去
      // serverTimestampは特殊オブジェクトなので一旦退避
      const createdAtVal = reservationData.createdAt;
      delete reservationData.createdAt;
      const sanitized = JSON.parse(JSON.stringify(reservationData));
      sanitized.createdAt = createdAtVal;

      // 1. まずFirestoreに保存
      const docRef = await addDoc(collection(db, "events", safeEventId, "reservations"), sanitized);
      setNewReservationId(docRef.id);

      // ★ 改造ポイント3: 分かれ道の切り替えだっぺ！
      if (isPaid && isStripeReady) {
        // 【Aパターン】有料 且つ Stripe連携済み：Stripe決済画面へ！
        const res = await fetch('/api/stripe/checkout-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventId: safeEventId,
            tenantId: safeTenantId,
            amount: priceAmount,
            eventTitle: `${event.title} (${selectedTicket.name})`,
            email: reservationData.email,
            reservationId: docRef.id,
            stripeAccountId: safeTenant?.stripeConnectId 
          }),
        });

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url; 
          return;
        }
      } else {
        // 【Bパターン】無料イベント、もしくは「有料だけどStripe未連携（現金払い）」の場合
        // その場で即座にメールを飛ばすぞい！
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: isPaid ? `【当日払い受付】${event.title}` : `【受付完了】${event.title}`,
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
              eventId: safeEventId,
              tenantId: safeTenantId,
              tenantName: safeTenant?.orgName || safeTenant?.name,
              themeColor: themeColor,
              replyTo: event.contactEmail || safeTenant?.ownerEmail || "",
              customAnswers: customAnswers,
              contactName: event.contactName || safeTenant?.name || "運営事務局",
              contactEmail: event.contactEmail || "",
              contactPhone: event.contactPhone || "",
              replyMessage: event.replyMessage || "",
              preSurveyUrl: event.preSurveyUrl || "",
              eventPrice: isPaid ? `${priceAmount}円（当日会場にてお支払い）` : "無料"
            }),
          });
        } catch (mailError) { 
          console.error("Mail error:", mailError); 
        }

        // Stripeに飛ばない場合は、ここで「成功画面」を表示させるっぺ
        setStatus("success");
        if (onSuccess) { setIsOpen(false); onSuccess(docRef.id); }
      }
      
    } catch (error: any) {
      console.error("Error details:", error);
      // 🚨 「エラーが発生しました」の後に、本当の理由を表示させるぞい！
      setErrorMessage(error.message || "通信エラーが発生しました。");
      setStatus("error");
    }
  };

  if (!mounted) return null;

  return (
    <>
      <button 
  onClick={() => setIsOpen(true)} 
  /* 背景は塙さんこだわりのDXグラデーションだばい */
  style={{ background: 'linear-gradient(135deg, #FF0080 0%, #7928CA 100%)' }} 
  className="w-full group relative flex items-center justify-center gap-3 px-8 py-5 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-[1.05] active:scale-[0.98] overflow-hidden"
>
  {/* ▼▼▼ ちらっと光るエフェクト（ここが魔法の筋だっぺ！） ▼▼▼ */}
  <div className="absolute top-0 -left-[100%] h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] transition-all duration-700 group-hover:left-[100%] pointer-events-none" />
  {/* ▲▲▲ 修正ここまで ▲▲▲ */}

  <span className="text-xl tracking-wide relative z-10">参加する</span>
  <div className="bg-white/20 rounded-full p-1 group-hover:translate-x-1 transition-transform relative z-10">
    <ChevronRight size={20} />
  </div>
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

        {event.preSurveyUrl && (
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 mb-4">
            <p className="text-sm font-bold text-purple-300 mb-2">📝 事前アンケートのお願い</p>
            <p className="text-xs text-slate-400 mb-3">イベントをより良いものにするため、事前アンケートにご協力ください。</p>
            <a
              href={event.preSurveyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm"
            >
              アンケートに回答する <ExternalLink size={14} />
            </a>
          </div>
        )}

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
                    {/* --- ここからチケット選択セクションを追加 --- */}
<div className="space-y-4 mb-8">
  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center gap-2">
    チケット選択
  </h3>
  <div className="grid grid-cols-1 gap-3">
    {tickets.map((t: any) => (
      <label
        key={t.id}
        className={`
          relative p-4 rounded-xl border flex justify-between items-center transition-all cursor-pointer group
          ${selectedTicketId === t.id ? "bg-slate-800/80" : "bg-slate-900 hover:bg-slate-800/40"}
        `}
        style={{ borderColor: selectedTicketId === t.id ? themeColor : '#334155' }}
      >
        <input
          type="radio"
          name="ticket"
          value={t.id}
          checked={selectedTicketId === t.id}
          onChange={() => setSelectedTicketId(t.id)}
          className="hidden"
        />
        <div className="flex flex-col gap-1">
          <span className={`font-bold transition-colors ${selectedTicketId === t.id ? "text-white" : "text-slate-400"}`}>
            {t.name}
          </span>
        </div>
        <div className="text-right">
          <span className="font-mono font-black text-lg" style={{ color: selectedTicketId === t.id ? themeColor : '#64748b' }}>
            {t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}
          </span>
        </div>
        {selectedTicketId === t.id && (
          <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 shadow-lg animate-in zoom-in">
            <CheckCircle size={16} />
          </div>
        )}
      </label>
    ))}
  </div>
</div>
{/* --- ここまでチケット選択セクション --- */}
                    
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
                            <label className="text-sm font-medium text-slate-300 flex items-start gap-1.5">
                              <span style={{color: themeColor}} className="mt-0.5">■</span>
                              <span className="whitespace-pre-line">{field.label}</span>
                              {field.required && <span className="text-red-400 mt-0.5">*</span>}
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
  <Link href={safeTenant?.privacyPolicyUrl || `/privacy?t=${safeTenantId}`} target="_blank" className="font-bold hover:underline inline-flex items-center gap-1" style={{ color: themeColor }}>
    プライバシーポリシー
    <ExternalLink size={14} />
  </Link>
  に同意し、<span>{safeTenant?.orgName || safeTenant?.name || '主催者'}からの案内</span>を受け取ることを含め申し込む。
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
    // 🏆 満員(isFull)ならボタンを無効化（disabled）するぞい！
    disabled={status === "loading" || !agreed || isFull} 
    style={{ background: isFull ? "#64748b" : (agreed ? themeColor : '#334155') }} 
    className="w-full flex items-center justify-center gap-2 px-6 py-4 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
  >
    {status === "loading" ? (
      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"/>
    ) : isFull ? (
      // 🏆 満員なら文字を変えるっぺ！
      <>満員御礼（受付終了しました） <AlertCircle size={18} /></>
    ) : (
      isPaid ? (
        <>{priceAmount.toLocaleString()}円で申し込む <CreditCard size={18} /></>
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