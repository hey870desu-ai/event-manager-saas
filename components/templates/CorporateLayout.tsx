"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { 
  Calendar, MapPin, User, CheckCircle2, ArrowRight, 
  Share2, Check, ExternalLink, Train, Users, Sparkles,
  Twitter, Facebook, Link as LinkIcon,Mail, Phone,Clock
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function CorporateLayout({ event, tenant, eventId, tenantId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState(""); 
  const [copied, setCopied] = useState(false);
  const themeColor = event.themeColor || "#3b82f6";

  // --- 共通機能 ---
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleFormSuccess = (id: string) => {
    setReservationId(id);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr: string) => {
  if (!dateStr) return { full: "----年--月--日" };
  const d = new Date(dateStr);
  return { full: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` };
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

  const d = new Date(event.date);
  const dateStr = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  const weekDay = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  
  const lecturersList = event.lecturers && Array.isArray(event.lecturers) 
    ? event.lecturers 
    : event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }] : [];

  const hasTimeTableData = event.schedule && Array.isArray(event.schedule);

  // 参加費表示ロジック
  const rawPrice = String(event.price || "").trim();
  const priceNum = Number(rawPrice);
  const isFree = !rawPrice || rawPrice === "0" || rawPrice === "無料";
  
  const displayPrice = isFree 
    ? "無料" 
    : isNaN(priceNum) 
      ? rawPrice 
      : `${priceNum.toLocaleString()}円`; 

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-purple-200 selection:text-purple-900 overflow-x-hidden">
      
      {/* 1. HERO: 淡いピンク・パープルグラデーション */}
      <section className="relative h-[80vh] w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          {event.ogpImage ? (
            <img src={event.ogpImage} className="w-full h-full object-cover animate-subtle-zoom" alt="Hero" />
          ) : (
            <div className="w-full h-full bg-transparent" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-white/90" />
        
        <div className="relative z-10 text-center px-6 max-w-6xl w-full">
          <p className="text-white/90 text-[10px] font-black tracking-[0.4em] mb-6 animate-in fade-in slide-in-from-top-4 duration-1000 drop-shadow-md flex justify-center items-center gap-2 uppercase">
             <Sparkles size={12}/> {tenant?.name || "Official Event"} presents
          </p>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 drop-shadow-lg">
            {event.title}
          </h1>

          {event.subtitle && (
             <p className="text-lg md:text-xl text-white/95 font-medium mb-10 max-w-4xl mx-auto leading-relaxed animate-in fade-in duration-1000 delay-300 drop-shadow-md">
               {event.subtitle}
             </p>
          )}

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-4 text-white font-bold tracking-wide animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2 bg-white/20 px-6 py-3 rounded-xl backdrop-blur-md border border-white/30 shadow-sm">
                <Calendar size={18} /> {dateStr} ({weekDay})
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-6 py-3 rounded-xl backdrop-blur-md border border-white/30 shadow-sm">
                <MapPin size={18} /> {event.venueName}
            </div>
          </div>
        </div>

        {/* シェアボタン群 */}
        <div className="absolute bottom-8 right-6 md:right-12 z-30 flex flex-col gap-3">
          <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${shareUrl}`)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-black transition-all shadow-lg hover:scale-110">
            <Twitter size={20} fill="currentColor"/>
          </button>
          <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-[#1877F2] transition-all shadow-lg hover:scale-110">
            <Facebook size={20} fill="currentColor"/>
          </button>
          <button onClick={() => window.open(`https://social-plugins.line.me/lineit/share?url=${shareUrl}`)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-[#06C755] transition-all shadow-lg hover:scale-110">
             <Mail size={20} />
          </button>
          <button onClick={handleCopyLink} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-purple-600 transition-all shadow-lg">
            {copied ? <Check size={20}/> : <LinkIcon size={20}/>}
          </button>
        </div>
      </section>

      {/* 2. INFO BAR (角丸を rounded-3xl へ) */}
      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-20">
        <div className="bg-white p-8 md:p-12 shadow-2xl rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-10 border border-slate-100">
           <div className="space-y-3 pl-4 md:pl-8 border-l-4" style={{ borderColor: themeColor }}>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} style={{ color: themeColor }}/> 開催日時
             </p>
             <p className="text-2xl font-black text-slate-800">{dateStr} <span className="text-slate-400 text-lg font-normal">({weekDay})</span></p>
             <p className="text-slate-700 font-bold text-lg">{event.startTime} — {event.endTime}</p>
           </div>
           <div className="space-y-3 pl-4 md:pl-8 border-l-4" style={{ borderColor: themeColor }}>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} style={{ color: themeColor }}/> 開催場所
             </p>
             <p className="text-2xl font-black text-slate-800">{event.venueName}</p>
             <p className="text-slate-600 font-medium">{event.venueAddress}</p>
           </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-12 lg:gap-16">
        
        <div className="lg:col-span-8 space-y-20">
          {/* イベント概要 */}
          <section className="space-y-8">
            <div className="inline-flex items-center gap-4">
              <span className="h-[3px] w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Event Overview</h2>
            </div>
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-[1.8] font-medium text-lg">
                {event.content}
              </div>
            </div>
          </section>

          {/* タイムテーブル (角丸を rounded-2xl へ) */}
          <section className="space-y-10">
             <div className="inline-flex items-center gap-4">
               <span className="h-[3px] w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Timeline</h2>
             </div>
             
             {hasTimeTableData ? (
               <div className="border-l-2 border-slate-100 pl-6 md:pl-10 space-y-10">
                 {event.schedule.map((item: any, i: number) => (
                   <div key={i} className="relative group">
                     <div className="absolute -left-[33px] md:-left-[49px] top-1.5 w-4 h-4 rounded-full bg-white border-[3px] border-slate-200 group-hover:border-purple-400 transition-colors duration-300"></div>
                     <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 mb-2">
                       <span className="font-bold text-slate-400 text-xl font-mono group-hover:text-purple-600">{item.time}</span>
                       <h4 className="font-bold text-xl text-slate-900">{item.title}</h4>
                     </div>
                     {item.speaker && <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><User size={14}/> {item.speaker}</p>}
                     <p className="text-slate-600 font-medium leading-relaxed text-sm">{item.description}</p>
                   </div>
                 ))}
               </div>
             ) : (
               <div className="bg-slate-50 p-8 rounded-2xl font-medium text-slate-600 whitespace-pre-wrap leading-loose border border-slate-100">
                 {event.timeTable || "現在調整中です。"}
               </div>
             )}
          </section>

          {/* 講師紹介 (角丸を rounded-2xl へ) */}
          {lecturersList.length > 0 && (
            <section className="space-y-12">
              <div className="inline-flex items-center gap-4">
                <span className="h-[3px] w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Speakers</h2>
              </div>
              <div className="grid gap-8">
                {lecturersList.map((lec: any, index: number) => (
                  <div key={index} className="flex flex-row gap-6 md:gap-8 items-start p-6 rounded-2xl bg-slate-50 border border-slate-100 group">
                    <div className="w-24 h-32 md:w-32 md:h-44 overflow-hidden rounded-xl bg-slate-200 shadow-sm shrink-0">
                      {lec.image && <img src={lec.image} alt={lec.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-purple-600 mb-1 uppercase tracking-widest">{lec.title}</p>
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-3">{lec.name}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium line-clamp-4">{lec.profile || lec.lecturerProfile}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        

        {/* サイドバー: 予約フォーム */}
        <div className="lg:col-span-4 space-y-8">
          <div className="sticky top-8 space-y-8">
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm">
              <div className="text-center mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Reservation</p>
                
                {/* 🎫 チケットリスト (Corporate Ver.) */}
                <div className="space-y-3 mb-8">
                  {(event.tickets && event.tickets.length > 0) ? (
                    event.tickets.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-xl bg-white border-2 border-slate-100 shadow-sm transition-all hover:border-purple-200">
                        <div className="text-left">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Ticket</p>
                          <p className="text-xs font-black text-slate-800">{t.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-slate-900 font-mono">
                            {t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-xl bg-white border-2 border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800">参加費</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{displayPrice}</span>
                    </div>
                  )}
                  {/* 定員 */}
                  <div className="flex items-center justify-center gap-2 pt-2 opacity-60">
                    <Users size={14} className="text-slate-400" />
                    <p className="text-[10px] font-bold text-slate-500">定員：{event.capacity ? `${event.capacity}名` : "制限なし"}</p>
                  </div>
                </div>

                <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-pink-500 mx-auto rounded-full"></div>
              </div>

              <div className="space-y-6">
                <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess} />
              </div>
            </div>

            {/* アクセスマップ (URL修正済み) */}
            <div className="bg-white rounded-3xl p-3 border border-slate-200 shadow-sm">
              <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                {event.venueAddress && (
                  <iframe 
                    width="100%" height="100%" style={{ border: 0 }} 
                    src={`http://googleusercontent.com/maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&output=embed`}
                  ></iframe>
                )}
              </div>
              <div className="p-4 space-y-3">
                <h4 className="font-black text-slate-900">{event.venueName}</h4>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{event.venueAddress}</p>
                {event.venueAccess && (
                   <div className="flex gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 p-3 rounded-xl">
                      <Train size={14} className="text-slate-400 shrink-0" /> {event.venueAccess}
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 4. お問い合わせバー (フッター直前・横並び) */}
      <section className="max-w-7xl mx-auto px-6 mb-20">
        <div className="bg-slate-900 rounded-2xl p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Mail size={28} />
            </div>
            <div>
              <h3 className="text-xl font-black">お問い合わせ</h3>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.4em]">Get in touch with us</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-end gap-x-12 gap-y-6">
            <div className="space-y-1">
              <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Organizer</p>
              <p className="font-bold text-lg">{event.contactName || tenant?.name}</p>
            </div>
            {event.contactEmail && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Email</p>
                <a href={`mailto:${event.contactEmail}`} className="block font-bold text-lg hover:text-purple-400 transition-colors underline underline-offset-8 decoration-white/10">{event.contactEmail}</a>
              </div>
            )}
            {event.contactPhone && (
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Phone</p>
                <a href={`tel:${event.contactPhone}`} className="block font-bold text-lg hover:text-purple-400 transition-colors">{event.contactPhone}</a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-4">
            {tenant?.logoUrl && (
                <img src={tenant.logoUrl} alt={tenant.name} className="h-10 object-contain brightness-0 invert opacity-90" />
            )}
            <h2 className="text-xl font-bold tracking-tight text-white/90">{tenant?.name}</h2>
          </div>
          <div className="h-[1px] w-32 bg-white/10" />
          <p className="text-[10px] font-bold tracking-[0.4em] text-white/30 uppercase">
            © {new Date().getFullYear()} {tenant?.name || "絆太郎 Event Manager"}
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes subtle-zoom {
          from { transform: scale(1); }
          to { transform: scale(1.1); }
        }
        .animate-subtle-zoom {
          animation: subtle-zoom 30s infinite alternate ease-in-out;
        }
      `}</style>
    </div>
  );
}