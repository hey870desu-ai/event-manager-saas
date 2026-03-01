"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { Calendar, Clock, MapPin, User, ShieldCheck, AlignLeft, Check, Link as LinkIcon, Facebook, CheckCircle2, AlertTriangle, Copy, Twitter, Mail, Phone } from "lucide-react";

// 親から受け取るデータの型定義
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

  // URL共有機能
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

  // テーマカラー（なければデフォルト）
  const themeColor = tenant?.themeColor || "#6366f1"; 
  
  // テーマ判定
  const isLight = event.theme === "light";

  const theme = {
    bg: isLight ? "bg-slate-100" : "bg-[#080a14]",
    text: isLight ? "text-slate-800" : "text-white",
    cardBg: isLight ? "bg-white border-white shadow-xl shadow-slate-300/60 ring-1 ring-slate-100" : "bg-[#131625]/70 border-white/10 shadow-2xl ring-white/5",
  };

  // --- 完了画面 (テック・コーポレート用 調整版) ---
if (submitted) {
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white max-w-lg w-full p-8 md:p-10 rounded-3xl shadow-xl text-center space-y-6 border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* アイコンとタイトル */}
        <div className="space-y-2">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">お申し込み完了</h2>
        </div>

        {/* ★ 追加：当日の案内（テック系に合わせた少し落ち着いたオレンジ） */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-left">
          <p className="text-xs font-bold text-amber-800 leading-relaxed text-center">
            【当日の受付用QRコード】<br/>
            この画面をスクリーンショット等で保存し、<br/>
            当日受付にてスタッフへご提示ください。
          </p>
        </div>

        {/* イベント情報カード */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left space-y-2">
           <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">EVENT INFO</div>
           <h3 className="text-sm font-bold text-slate-800 leading-snug">{event.title}</h3>
           <div className="pt-2 border-t border-slate-200/50 space-y-1.5">
             <div className="flex items-center gap-2 text-xs text-slate-600">
               <Calendar size={14} style={{color: themeColor}}/><span className="font-bold">{formatDate(event.date).full}</span>
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-600">
               <Clock size={14} style={{color: themeColor}}/><span className="font-bold">{event.startTime} - {event.endTime}</span>
             </div>
             <div className="flex items-start gap-2 text-xs text-slate-600">
               <MapPin size={14} className="mt-0.5" style={{color: themeColor}}/><span className="font-bold">{event.venueName || "会場未定"}</span>
             </div>
           </div>
        </div>

        {/* QRコードセクション */}
        <div className="bg-slate-900 p-5 rounded-2xl inline-block shadow-inner relative group">
           {/* ラベルを追加して「何のためのQRか」を明確に */}
           <div className="text-[9px] text-slate-500 font-bold mb-2 tracking-[0.2em]">CHECK-IN TICKET</div>
           <div className="bg-white p-2 rounded-lg">
              {reservationId ? (
                <img src={qrImageUrl} alt="QR" className="w-[140px] h-[140px] object-contain"/>
              ) : (
                <div className="w-[140px] h-[140px] bg-slate-100 flex items-center justify-center text-xs">Loading...</div>
              )}
           </div>
           <div className="text-[9px] text-slate-500 mt-2 font-mono">ID: {reservationId}</div>
        </div>

        <div className="pt-2">
          <button onClick={()=>window.location.reload()} className="text-sm font-bold py-2.5 px-6 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            イベントページに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

  const { full, week } = formatDate(event.date);

  return (
    <div className={`min-h-screen font-sans selection:bg-indigo-500/30 pb-32 overflow-x-hidden relative ${theme.bg} ${theme.text}`}>
      {/* 背景エフェクト */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-screen animate-pulse opacity-10" style={{ backgroundColor: themeColor, animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <div className="relative z-10 container mx-auto px-0 md:px-4 pt-12 md:pt-24 max-w-6xl">
        {/* ヘッダー */}
        <div className="text-center mb-8 fade-in px-4">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-[#1A1D2D]/80 border border-white/10 backdrop-blur-md mb-8 shadow-lg shadow-black/20">
            {tenant?.logoUrl ? <img src={tenant.logoUrl} alt={tenant.name} className="h-5 object-contain" /> : <><ShieldCheck size={14} style={{ color: themeColor }} /><span className="text-xs text-slate-300 tracking-widest uppercase font-medium">Official Event</span></>}
            <span className="text-slate-600 mx-1">|</span>
            <span className="text-xs text-slate-300 uppercase tracking-widest font-bold">{tenant?.name || tenantId}</span>
          </div>
          <h1 className={`text-2xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-wide mb-6 ${theme.text}`}>{event.title}</h1>
          {event.subtitle && <p className="text-slate-400 text-sm md:text-base max-w-3xl mx-auto leading-relaxed font-light tracking-wider mb-6">{event.subtitle}</p>}
        </div>

        {/* 2カラムレイアウト */}
        <div className={`backdrop-blur-xl border-y md:border md:rounded-[2.5rem] overflow-visible grid grid-cols-1 lg:grid-cols-2 ring-1 ${theme.cardBg}`}>
          {/* 左カラム */}
          <div className="p-4 md:p-10 lg:border-r border-white/5 flex flex-col relative group overflow-hidden md:rounded-tl-[2.5rem]">
            <div className="absolute top-0 left-0 w-full h-[2px] opacity-50" style={{ backgroundImage: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}></div>
            <div className="space-y-8 md:space-y-10 z-10 h-full flex flex-col relative">
               {/* 講師 */}
               <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-4" style={{ color: themeColor }}><User size={14} /> 講師</div>
                <div className="bg-[#1A1D2D] rounded-xl p-4 md:p-5 border border-white/5 shadow-inner flex flex-row gap-4 items-start">
                    {event.lecturerImage && <div className="shrink-0"><img src={event.lecturerImage} alt={event.lecturer} className="w-20 h-28 md:w-24 md:h-32 rounded-lg object-cover border border-white/10 shadow-lg"/></div>}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-white mb-1 tracking-wide leading-tight">{event.lecturer ? `${event.lecturer} 氏` : "講師調整中"}</h3>
                      <p className="text-xs font-medium mb-3 tracking-wider" style={{ color: themeColor }}>{event.lecturerTitle}</p>
                      <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap hidden md:block">{event.lecturerProfile}</p>
                    </div>
                </div>
              </div>
              {/* 内容 */}
              <div className="flex-1">
                 <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}><AlignLeft size={14} /> セミナー内容</div>
                 <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5 mb-4">
                    <div className="text-slate-300 text-sm leading-7 whitespace-pre-wrap tracking-wide font-light">{event.content}</div>
                 </div>
                 {event.timeTable && (
                   <div className="mt-6">
                      <div className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">タイムテーブル</div>
                      <div className="text-slate-300 text-sm leading-7 whitespace-pre-wrap pl-3 border-l-2 border-slate-700">{event.timeTable}</div>
                   </div>
                 )}
              </div>
              {/* シェアボタン */}
              <div className="mt-auto pt-8 border-t border-white/5">
                 <div className="flex gap-3">
                    <button onClick={handleShareLine} className="w-12 h-12 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-105" title="LINEで送る"><LinkIcon size={20}/></button>
                    <button onClick={handleShareFB} className="w-12 h-12 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-105" title="Facebookでシェア"><Facebook size={20}/></button>
                    <button onClick={handleShareTwitter} className="w-12 h-12 rounded-full bg-black border border-white/20 text-white flex items-center justify-center hover:scale-105" title="Xでポスト"><Twitter size={20}/></button>
                    <button onClick={handleCopyLink} className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all hover:scale-105 ${copied ? "bg-slate-200 text-slate-900" : "bg-[#1A1D2D] text-slate-400 border-white/10"}`} title="リンクをコピー">{copied ? <Check size={20}/> : <Copy size={20}/>}</button>
                 </div>
              </div>
            </div>
          </div>

          {/* 右カラム */}
          <div className="p-4 md:p-10 bg-black/20 flex flex-col justify-between md:rounded-br-[2.5rem]">
            <div className="space-y-8">
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}><Calendar size={14} /> 開催日時</div>
                <div className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-2">{full} <span className="text-xl text-slate-500 font-sans ml-1">({week})</span></div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm md:text-lg text-slate-300 pl-1">
                  <div className="flex items-center gap-2"><Clock size={16} className="text-slate-500"/><span className="tracking-wide">{event.startTime} - {event.endTime}</span></div>
                  <span className="text-xs text-white font-medium px-2 py-1 rounded border border-white/10 w-fit" style={{ backgroundColor: themeColor }}>受付 {event.openTime}〜</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-xs mb-3" style={{ color: themeColor }}><MapPin size={14} /> 会場</div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 leading-snug tracking-wide">{event.venueName || "会場未定"}</h3>
                {event.venueAddress && (
                  <div className="w-full h-40 md:h-48 rounded-xl overflow-hidden border border-white/10 shadow-inner bg-slate-900/50 mt-2 relative z-0">
                    <iframe 
                      width="100%" 
                      height="100%" 
                      style={{ border: 0 }} 
                      loading="lazy" 
                      allowFullScreen 
                      src={`https://www.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}
                    ></iframe>
                  </div>
                )}
              </div>

              {/* 会場マップの </div> の直後に挿入 */}
          <div className="bg-[#1A1D2D]/80 rounded-[2rem] p-8 border border-white/5 shadow-2xl space-y-6 mt-10 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ backgroundColor: themeColor }}></div>
              <h3 className="font-bold text-white tracking-widest text-sm uppercase">お問い合わせ</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organizer</p>
                <p className="font-bold text-slate-200">{event.contactName || tenant?.name || "Support Team"}</p>
              </div>

              <div className="flex flex-col gap-2">
                {event.contactEmail && (
                  <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all group">
                    <Mail size={16} className="group-hover:text-indigo-400" />
                    <span className="truncate">{event.contactEmail}</span>
                  </a>
                )}
                {event.contactPhone && (
                  <a href={`tel:${event.contactPhone}`} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all group">
                    <Phone size={16} className="group-hover:text-indigo-400" />
                    {event.contactPhone}
                  </a>
                )}
              </div>
            </div>
          </div>

              {/* 🎫 修正：日本語化 ＆ 見やすさアップ版 */}
              <div className="space-y-4 pt-8 border-t border-white/5">
                {/* 見出しを日本語にして、少しだけ大きく（text-xs）したぞい */}
                <div className="text-xs font-black tracking-widest mb-3" style={{ color: themeColor }}>
                  チケット・参加費用
                </div>
                
                <div className="space-y-3">
                  {(event.tickets && event.tickets.length > 0) ? (
                    event.tickets.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                        <div className="flex flex-col">
                          {/* ここも日本語だっぺ！ */}
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mb-0.5">参加チケット</span>
                          <span className="text-sm font-bold text-slate-200">{t.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold font-mono text-white">
                            {t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                      <span className="text-sm font-bold text-slate-200">参加費</span>
                      <span className="text-xl font-bold font-mono text-white">
                        {(!event.price || event.price === "0" || event.price === "無料") ? "無料" : isNaN(Number(event.price)) ? event.price : `¥${Number(event.price).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* 👥 定員情報を日本語でハッキリ（opacityを消して、文字を大きくしたぞい） */}
                <div className="flex items-center gap-2 px-1 py-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor }}></div>
                  <p className="text-sm font-bold text-slate-400 tracking-wider">
                    定員：{event.capacity ? `${Number(event.capacity).toLocaleString()}名` : "制限なし"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 relative z-50 isolate">
              <div className="flex items-center justify-between mb-3 px-1"><h3 className="text-sm font-bold text-white tracking-wider">イベントへの参加申し込み</h3></div>
              <div className="bg-slate-900/80 rounded-xl p-2 md:p-6 backdrop-blur-sm border border-slate-700/50">
                <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant || undefined} onSuccess={handleFormSuccess}/>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-20 mb-10 text-center relative z-10"><p className="text-slate-600 text-[10px] tracking-[0.2em] uppercase">© {new Date().getFullYear()} 絆太郎 Event Manager.</p></footer>
      </div>
    </div>
  );
}