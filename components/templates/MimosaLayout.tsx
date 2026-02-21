"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { Calendar, Clock, MapPin, User, ShieldCheck, AlignLeft, Check, Link as LinkIcon, Facebook, CheckCircle2, AlertTriangle, Copy, Twitter, Mail, Phone, Sparkles } from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function TechLayout({ event, tenant, eventId, tenantId }: Props) {
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState(""); 

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

  // ★ミモザ・イエローをテーマカラーに設定
  const themeColor = "#FFE000"; 
  const leafColor = "#8BA889"; // ミモザの葉（セージグリーン）

  const theme = {
    bg: "bg-[#0A0C0A]", // 葉の緑をわずかに混ぜた深い黒
    text: "text-white",
    cardBg: "bg-[#141814]/80 border-white/10 shadow-2xl ring-white/5", // カードもわずかに緑寄りに
  };

  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen bg-[#FDFCF0] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white max-w-lg w-full p-8 md:p-10 rounded-3xl shadow-xl text-center space-y-6 border border-yellow-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <div>
             <h2 className="text-xl font-bold text-slate-800 mb-1">お申し込み完了</h2>
             <p className="text-slate-500 text-xs">ご参加ありがとうございます。</p>
          </div>
          <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-100 text-left space-y-2">
             <div className="text-[10px] text-yellow-600 font-bold uppercase tracking-widest mb-1">EVENT INFO</div>
             <h3 className="text-sm font-bold text-slate-800 leading-snug">{event.title}</h3>
             <div className="pt-2 border-t border-yellow-100/50 space-y-1.5">
               <div className="flex items-center gap-2 text-xs text-slate-600">
                 <Calendar size={14} className="text-yellow-500"/><span className="font-bold">{formatDate(event.date).full}</span>
               </div>
               <div className="flex items-center gap-2 text-xs text-slate-600">
                 <Clock size={14} className="text-yellow-500"/><span className="font-bold">{event.startTime} - {event.endTime}</span>
               </div>
               <div className="flex items-start gap-2 text-xs text-slate-600">
                 <MapPin size={14} className="mt-0.5 text-yellow-500"/><span className="font-bold">{event.venueName || "会場未定"}</span>
               </div>
             </div>
          </div>
          <div className="bg-slate-900 p-5 rounded-2xl inline-block shadow-inner relative group">
             <div className="bg-white p-2 rounded-lg">
                {reservationId ? <img src={qrImageUrl} alt="QR" className="w-[140px] h-[140px] object-contain"/> : <div className="w-[140px] h-[140px] bg-slate-100 flex items-center justify-center text-xs">Loading...</div>}
             </div>
          </div>
          <div className="pt-2"><button onClick={()=>window.location.reload()} className="text-sm font-bold py-2 px-4 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200">イベントページに戻る</button></div>
        </div>
      </div>
    );
  }

  const { full, week } = formatDate(event.date);

  return (
    <div className={`min-h-screen font-sans selection:bg-yellow-400/40 pb-32 overflow-x-hidden relative ${theme.bg} ${theme.text}`}>
      {/* 背景エフェクト（ミモザカラーの光） */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-10" style={{ backgroundColor: themeColor, animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] rounded-full blur-[100px] mix-blend-screen opacity-10" style={{ backgroundColor: leafColor }} />
      </div>

      <div className="relative z-10 container mx-auto px-0 md:px-4 pt-12 md:pt-24 max-w-6xl">
        <div className="text-center mb-8 fade-in px-4">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 shadow-lg">
            {tenant?.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="h-5 object-contain" /> : <><Sparkles size={14} style={{ color: themeColor }} /><span className="text-xs text-slate-300 tracking-widest uppercase font-medium">Special Event</span></>}
            <span className="text-white/20 mx-1">|</span>
            <span className="text-xs text-white/80 uppercase tracking-widest font-bold">{tenant?.name || tenantId}</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold leading-tight tracking-wide mb-6">{event.title}</h1>
          {event.subtitle && <p className="text-slate-400 text-sm md:text-base max-w-3xl mx-auto leading-relaxed font-light tracking-wider mb-6">{event.subtitle}</p>}
        </div>

        <div className={`backdrop-blur-xl border-y md:border md:rounded-[2.5rem] overflow-visible grid grid-cols-1 lg:grid-cols-2 ring-1 ${theme.cardBg}`}>
          <div className="p-4 md:p-10 lg:border-r border-white/5 flex flex-col relative group overflow-hidden md:rounded-tl-[2.5rem]">
            <div className="absolute top-0 left-0 w-full h-[2px] opacity-30" style={{ backgroundImage: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}></div>
            <div className="space-y-8 md:space-y-10 z-10 h-full flex flex-col relative">
               <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-4" style={{ color: themeColor }}><User size={14} /> 講師</div>
                <div className="bg-black/40 rounded-xl p-4 md:p-5 border border-white/5 shadow-inner flex flex-row gap-4 items-start">
                    {event.lecturerImage && <div className="shrink-0"><img src={event.lecturerImage} alt={event.lecturer} className="w-20 h-28 md:w-24 md:h-32 rounded-lg object-cover border border-white/10"/></div>}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 tracking-wide leading-tight">{event.lecturer ? `${event.lecturer} 氏` : "講師調整中"}</h3>
                      <p className="text-xs font-medium mb-3 tracking-wider" style={{ color: themeColor }}>{event.lecturerTitle}</p>
                      <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap hidden md:block">{event.lecturerProfile}</p>
                    </div>
                </div>
              </div>
              <div className="flex-1">
                 <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}><AlignLeft size={14} /> セミナー内容</div>
                 <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-4">
                    <div className="text-slate-300 text-sm leading-7 whitespace-pre-wrap tracking-wide font-light">{event.content}</div>
                 </div>
                 {event.timeTable && (
                   <div className="mt-6">
                      <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">タイムテーブル</div>
                      <div className="text-slate-300 text-sm leading-7 whitespace-pre-wrap pl-3 border-l-2 border-yellow-500/30">{event.timeTable}</div>
                   </div>
                 )}
              </div>
              <div className="mt-auto pt-8 border-t border-white/5">
                 <div className="flex gap-3">
                    <button onClick={handleShareLine} className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-105 transition-transform"><LinkIcon size={18}/></button>
                    <button onClick={handleShareFB} className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-105 transition-transform"><Facebook size={18}/></button>
                    <button onClick={handleShareTwitter} className="w-10 h-10 rounded-full bg-black border border-white/20 text-white flex items-center justify-center hover:scale-105 transition-transform"><Twitter size={18}/></button>
                    <button onClick={handleCopyLink} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-105 ${copied ? "bg-yellow-400 text-black" : "bg-white/5 text-white/50 border-white/10"}`}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button>
                 </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-10 bg-black/10 flex flex-col justify-between md:rounded-br-[2.5rem]">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}><Calendar size={14} /> 開催日時</div>
                <div className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">{full} <span className="text-xl text-white/30 font-sans ml-1">({week})</span></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm md:text-lg text-slate-300 pl-1">
                  <div className="flex items-center gap-2"><Clock size={16} className="text-white/30"/><span className="tracking-wide">{event.startTime} - {event.endTime}</span></div>
                  <span className="text-xs text-black font-bold px-3 py-1 rounded-full w-fit shadow-lg shadow-yellow-500/20" style={{ backgroundColor: themeColor }}>受付 {event.openTime}〜</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}><MapPin size={14} /> 会場</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 tracking-wide">{event.venueName || "会場未定"}</h3>
                {event.venueAddress && (
                  <div className="w-full h-40 md:h-48 rounded-xl overflow-hidden border border-white/10 bg-black/40 mt-2 relative z-0">
                    <iframe 
                      width="100%" height="100%" style={{ border: 0, filter: 'grayscale(1) invert(0.9) opacity(0.5)' }} 
                      loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                    ></iframe>
                  </div>
                )}
              </div>

              <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5 shadow-2xl space-y-6 mt-10 backdrop-blur-md ring-1 ring-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full shadow-[0_0_15px_rgba(255,224,0,0.4)]" style={{ backgroundColor: themeColor }}></div>
                  <h3 className="font-bold text-white tracking-widest text-sm uppercase">Contact</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Organizer</p>
                    <p className="font-bold text-white/90">{event.contactName || tenant?.name || "Support Team"}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {event.contactEmail && (
                      <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-white/60 hover:text-yellow-400 hover:border-yellow-400/50 transition-all group">
                        <Mail size={16} className="group-hover:scale-110 transition-transform" />
                        <span className="truncate">{event.contactEmail}</span>
                      </a>
                    )}
                    {event.contactPhone && (
                      <a href={`tel:${event.contactPhone}`} className="flex items-center gap-3 p-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-white/60 hover:text-yellow-400 hover:border-yellow-400/50 transition-all group">
                        <Phone size={16} className="group-hover:scale-110 transition-transform" />
                        {event.contactPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-8 border-t border-white/5">
                <div><div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: themeColor }}>参加費</div><div className="text-lg md:text-xl font-bold text-white">{event.price || "無料"}</div></div>
                <div><div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: themeColor }}>定員</div><div className="text-lg md:text-xl font-bold text-white">{event.capacity ? `${event.capacity}名` : "定員なし"}</div></div>
              </div>
            </div>

            <div className="mt-10 relative z-50 isolate">
              <div className="flex items-center justify-between mb-3 px-1"><h3 className="text-xs font-bold text-white/40 tracking-widest uppercase">Registration</h3></div>
              <div className="bg-[#1A1D1A] rounded-2xl p-2 md:p-6 border border-white/10 shadow-3xl">
                <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant || undefined} onSuccess={handleFormSuccess}/>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-20 mb-10 text-center relative z-10"><p className="text-white/20 text-[10px] tracking-[0.3em] uppercase">© {new Date().getFullYear()} {tenant?.name || "Event Manager"}</p></footer>
      </div>
    </div>
  );
}