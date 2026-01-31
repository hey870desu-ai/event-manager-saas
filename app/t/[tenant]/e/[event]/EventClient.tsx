// 📂 app/t/[tenant]/e/[event]/EventClient.tsx
// 📝 役割：SaaS完全対応（ロゴ・色・メール連携）

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore"; 
import { db } from "@/lib/firebase"; 
import ReservationForm from "@/components/ReservationForm";
import { Calendar, Clock, MapPin, User, ShieldCheck, AlignLeft, Check, Link as LinkIcon, Facebook, CheckCircle2, AlertTriangle, Share2, Copy } from "lucide-react";

// ★SaaS化変更点: テナント情報の型を拡張
type TenantData = {
  name: string;
  logoUrl?: string;     // ロゴ画像のURL
  themeColor?: string;  // ブランドカラー (例: #ec4899)
  websiteUrl?: string;  // 会社のHP
};

export default function EventClient() {
  const params = useParams();
  
  const tenantRaw = params?.tenant;
  const eventRaw = params?.event;
  
  const tenantId = (Array.isArray(tenantRaw) ? tenantRaw[0] : tenantRaw) || "default";
  const eventId = (Array.isArray(eventRaw) ? eventRaw[0] : eventRaw) || "";
  
  const [event, setEvent] = useState<any>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState(""); 

  const processed = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId || !tenantId) return;
      try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        
        const tenantRef = doc(db, "tenants", tenantId);
        const tenantSnap = await getDoc(tenantRef);

        if (eventSnap.exists()) {
          setEvent(eventSnap.data());
        }
        
        if (tenantSnap.exists()) {
          setTenant(tenantSnap.data() as TenantData);
        } else {
          setTenant({ name: "Demo Company" }); 
        }

      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, tenantId]);

  useEffect(() => {
    const countView = async () => {
      if (!event || processed.current) return;
      processed.current = true;
      try {
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, { views: increment(1) });
      } catch (e) {
        console.error("PV tracking error", e);
      }
    };
    countView();
  }, [event, eventId]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = event ? `${event.title} | イベント申し込み` : "";

  const handleShareLine = () => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleShareFB = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event?.title, text: event?.title, url: shareUrl });
        return; 
      } catch (error) {}
    }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };
  const handleShareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { full: "----年--月--日", week: "-" };
    const d = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return {
      full: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`,
      week: days[d.getDay()]
    };
  };

  const handleFormSuccess = (id: string) => {
    setReservationId(id);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ★テーマカラーの適用（なければデフォルトのIndigo）
  const themeColor = tenant?.themeColor || "#6366f1"; 

  if (loading) return (
    <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center">
      <div className="w-10 h-10 border-t-2 border-r-2 rounded-full animate-spin" style={{ borderColor: themeColor }}></div>
    </div>
  );
  
  if (!event) return <div className="min-h-screen bg-[#0B0D17] text-slate-500 flex items-center justify-center">イベントが見つかりません</div>;

  // --- 完了画面 ---
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white max-w-lg w-full p-8 md:p-10 rounded-3xl shadow-xl text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <div>
             <h2 className="text-xl font-bold text-slate-800 mb-1">お申し込み完了</h2>
             <p className="text-slate-500 text-xs">ご参加ありがとうございます。</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left space-y-2">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">EVENT INFO</div>
            <h3 className="text-sm font-bold text-slate-800 leading-snug">{event.title}</h3>
            <div className="pt-2 border-t border-slate-200/50 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar size={14} className="shrink-0" style={{color: themeColor}}/>
                <span className="font-bold">{formatDate(event.date).full} ({formatDate(event.date).week})</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Clock size={14} className="shrink-0" style={{color: themeColor}}/>
                <span className="font-bold">{event.startTime} - {event.endTime}</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <MapPin size={14} className="shrink-0 mt-0.5" style={{color: themeColor}}/>
                <span className="font-bold">{event.venueName || "会場未定"}</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl inline-block shadow-inner relative group">
             <div className="bg-white p-2 rounded-lg">
                {reservationId ? (
                  <img src={qrImageUrl} alt="Entry QR Code" className="w-[140px] h-[140px] object-contain"/>
                ) : (
                  <div className="w-[140px] h-[140px] bg-slate-100 flex items-center justify-center text-slate-400 text-xs">読み込み中...</div>
                )}
             </div>
             <p className="text-white text-[10px] mt-2 tracking-widest uppercase font-bold opacity-70">Entry Pass</p>
          </div>
          <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-xl text-left border border-amber-100 leading-relaxed">
             <p className="font-bold flex items-center gap-2 mb-1"><AlertTriangle size={14}/> 保存のお願い</p>
             この画面を <span className="font-bold underline">スクリーンショット</span> して保存しておくと、当日の受付がスムーズです。
          </div>
          <div className="pt-2">
             <button onClick={()=>window.location.reload()} className="text-sm font-bold transition-colors py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">イベントページに戻る</button>
          </div>
        </div>
      </div>
    );
  }

  const { full, week } = formatDate(event.date);

  return (
    <div className="min-h-screen bg-[#080a14] text-white font-sans selection:bg-indigo-500/30 pb-32 overflow-x-hidden relative">
      
      {/* 背景エフェクト: テーマカラーを反映 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-10" style={{ backgroundColor: themeColor, animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative z-10 container mx-auto px-0 md:px-4 pt-12 md:pt-24 max-w-6xl">
        
        {/* ヘッダー */}
        <div className="text-center mb-8 fade-in px-4">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#1A1D2D]/80 border border-white/10 backdrop-blur-md mb-8 shadow-lg shadow-black/20">
            {/* ★ロゴがあれば表示 */}
            {tenant?.logoUrl ? (
               <img src={tenant.logoUrl} alt={tenant.name} className="h-5 object-contain" />
            ) : (
               <>
                 <ShieldCheck size={14} style={{ color: themeColor }} />
                 <span className="text-[10px] md:text-xs text-slate-300 tracking-widest uppercase font-medium">Official Event</span>
               </>
            )}
            <span className="text-slate-600 mx-1">|</span>
            <span className="text-[10px] md:text-xs text-slate-300 uppercase tracking-widest font-bold">{tenant?.name || tenantId}</span>
          </div>
          
          <h1 className="text-2xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-wide mb-6 text-white">{event.title}</h1>
          {event.subtitle && <p className="text-slate-400 text-sm md:text-base max-w-3xl mx-auto leading-relaxed font-light tracking-wider mb-6">{event.subtitle}</p>}

          <div className="flex justify-center gap-3 mb-8">
             {event.hasOnline && <span className="px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-[10px] tracking-widest uppercase font-bold">ハイブリッド</span>}
             <span className="px-3 py-1 rounded-full border border-slate-700 bg-slate-800/50 text-slate-300 text-[10px] tracking-widest uppercase font-bold">SEMINAR</span>
          </div>
        </div>

        {/* 2カラムレイアウト */}
        <div className="bg-[#131625]/70 backdrop-blur-xl border-y md:border border-white/10 md:rounded-[2.5rem] overflow-visible shadow-2xl shadow-black/80 grid grid-cols-1 lg:grid-cols-2 ring-1 ring-white/5">
          
          {/* 左カラム */}
          <div className="p-4 md:p-10 lg:border-r border-white/5 flex flex-col relative group overflow-hidden md:rounded-tl-[2.5rem]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent to-transparent opacity-50" style={{ backgroundImage: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}></div>
            
            <div className="space-y-8 md:space-y-10 z-10 h-full flex flex-col relative">
               {/* 講師 */}
               <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-4" style={{ color: themeColor }}>
                  <User size={14} /> 講師
                </div>
                <div className="bg-[#1A1D2D] rounded-xl p-4 md:p-5 border border-white/5 shadow-inner relative overflow-hidden group transition-colors hover:border-white/10">
                   <div className="relative z-10 flex flex-row gap-4 items-start">
                      {event.lecturerImage && <div className="shrink-0"><img src={event.lecturerImage} alt={event.lecturer} className="w-20 h-28 md:w-24 md:h-32 rounded-lg object-cover border border-white/10 shadow-lg"/></div>}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-1 tracking-wide leading-tight">{event.lecturer ? `${event.lecturer} 氏` : "講師調整中"}</h3>
                        <p className="text-xs font-medium mb-3 tracking-wider" style={{ color: themeColor }}>{event.lecturerTitle}</p>
                        <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap hidden md:block">{event.lecturerProfile || "プロフィール情報がありません"}</p>
                      </div>
                   </div>
                   <div className="md:hidden mt-3 pt-3 border-t border-white/5 relative z-10"><p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{event.lecturerProfile || "プロフィール情報がありません"}</p></div>
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1">
                 <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}>
                    <AlignLeft size={14} /> セミナー内容
                 </div>
                 <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5 mb-4">
                    <div className="text-slate-300 text-sm leading-7 whitespace-pre-wrap tracking-wide font-light">{event.content || "詳細情報はまだありません。"}</div>
                 </div>
                 {event.timeTable && (
                   <div className="mt-6">
                      <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">タイムテーブル</div>
                      <div className="text-slate-300 text-sm leading-7 whitespace-pre-wrap pl-3 border-l-2 border-slate-700">{event.timeTable}</div>
                   </div>
                 )}
              </div>

              {/* シェア */}
              <div className="mt-auto pt-8 border-t border-white/5">
                 <div className="flex gap-3">
                    <button onClick={handleShareLine} className="w-12 h-12 rounded-full bg-[#06C755] text-white flex items-center justify-center transition-all hover:scale-105"><svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M12 2.5c-5.5 0-10 3.6-10 8 0 2.3 1.2 4.3 3.3 5.8.4.2.4.6.3 1-.3 1.2-.9 2.2-1 2.3-.2.3 0 .6.4.6h.1c1.8 0 4.1-.9 5.8-2.1.4-.2.8-.3 1.1-.3 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg></button>
                    <button onClick={handleShareFB} className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center transition-all hover:scale-105"><Facebook size={24} fill="currentColor" strokeWidth={0} /></button>
                    <button onClick={handleShareTwitter} className="w-12 h-12 rounded-full bg-black border border-white/20 text-white flex items-center justify-center transition-all hover:scale-105"><svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></button>
                    <button onClick={handleCopyLink} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 ${copied ? "bg-slate-200 text-slate-900 border-slate-200" : "bg-[#1A1D2D] text-slate-400 border-white/10 hover:border-white/50 hover:text-white"}`}>{copied ? <Check size={20}/> : <LinkIcon size={20}/>}</button>
                 </div>
              </div>
            </div>
          </div>

          {/* 右カラム */}
          <div className="p-4 md:p-10 bg-black/20 flex flex-col justify-between md:rounded-br-[2.5rem]">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}>
                  <Calendar size={14} /> 開催日時
                </div>
                <div className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">{full} <span className="text-xl text-slate-500 font-sans ml-1">({week})</span></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm md:text-lg text-slate-300 pl-1">
                  <div className="flex items-center gap-2"><Clock size={16} className="text-slate-500"/><span className="tracking-wide">{event.startTime} - {event.endTime}</span></div>
                  <span className="text-xs text-white font-medium px-2 py-1 rounded border border-white/10 w-fit" style={{ backgroundColor: themeColor }}>受付 {event.openTime}〜</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}>
                  <MapPin size={14} /> 会場
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-snug tracking-wide">{event.venueName || "会場未定"}</h3>
                {event.venueAddress && <p className="text-slate-300 text-sm mb-3">{event.venueAddress}</p>}
                {event.venueAddress && (
                  <div className="w-full h-40 md:h-48 rounded-xl overflow-hidden border border-white/10 shadow-inner bg-slate-900/50 mt-2 relative z-0">
                    <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" allowFullScreen src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div>
                  <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: themeColor }}>参加費</div>
                  <div className="text-lg md:text-xl font-bold text-white tracking-wide">{event.price || "無料"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: themeColor }}>定員</div>
                  <div className="text-lg md:text-xl font-bold text-white tracking-wide">{event.capacity ? `${event.capacity}名` : "定員なし"}</div>
                </div>
              </div>
            </div>

            <div className="mt-10 relative z-50 isolate">
              <div className="flex items-center justify-between mb-3 px-1"><h3 className="text-sm font-bold text-white tracking-wider">イベントへの参加申し込み</h3></div>
              <div className="bg-slate-900/80 rounded-xl p-2 md:p-6 backdrop-blur-sm border border-slate-700/50">
                {/* ★テナント情報（ロゴや色）をフォームに渡す */}
                <ReservationForm 
                  tenantId={tenantId} 
                  eventId={eventId} 
                  event={event} 
                  // ↓ これを追加
                  tenantData={tenant || undefined} 
                  onSuccess={handleFormSuccess}
                />
              </div>
            </div>
          </div>

        </div>
        
        <footer className="mt-20 mb-10 text-center relative z-10">
          <p className="text-slate-600 text-[10px] tracking-[0.2em] uppercase">© {new Date().getFullYear()} Event System.</p>
        </footer>
      </div>
    </div>
  );
}