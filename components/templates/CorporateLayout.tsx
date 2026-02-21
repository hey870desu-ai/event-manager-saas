"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { 
  Calendar, MapPin, User, CheckCircle2, ArrowRight, 
  Share2, Check, ExternalLink, Train, Users, Sparkles,
  Twitter, Facebook, Link as LinkIcon,Mail, Phone
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

  // --- 完了画面 ---
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-2xl w-full text-center space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="relative inline-block">
            <div className="absolute inset-0 scale-150 blur-3xl bg-purple-200/40 rounded-full" />
            <CheckCircle2 size={80} strokeWidth={1} className="relative text-slate-900" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black tracking-tighter text-slate-900">ご予約を確定しました</h2>
            <p className="text-slate-600 font-medium">登録いただいたアドレスへ、案内メールを送付しました。</p>
          </div>
          <div className="bg-[#F9F9F9] rounded-[3rem] p-16 border border-slate-200 shadow-xl">
             <div className="w-48 h-48 mx-auto bg-white p-4 rounded-3xl shadow-sm mb-8">
               <img src={qrImageUrl} alt="QR" className="w-full h-full object-contain" />
             </div>
             <p className="text-xs font-bold tracking-[0.1em] text-slate-500 uppercase">Personal Entry Key</p>
          </div>
          <button onClick={() => window.location.reload()} className="text-slate-900 font-bold border-b-2 border-slate-900 pb-1 hover:text-slate-600 hover:border-slate-400 transition-all">
            イベントページへ戻る
          </button>
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
      
      {/* 1. HERO: 淡いピンク・パープルグラデーション (Magic Hour) */}
      <section className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400">
        <div className="absolute inset-0 opacity-40 mix-blend-overlay">
          {event.ogpImage ? (
            <img src={event.ogpImage} className="w-full h-full object-cover animate-subtle-zoom" alt="Hero" />
          ) : (
            <div className="w-full h-full bg-transparent" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-white/90" />
        
        <div className="relative z-10 text-center px-6 max-w-6xl w-full">
          <p className="text-white/90 text-xs font-bold tracking-[0.2em] mb-6 animate-in fade-in slide-in-from-top-4 duration-1000 drop-shadow-md flex justify-center items-center gap-2">
             <Sparkles size={12}/> {tenant?.name || "Official Event"} presents
          </p>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight mb-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200 drop-shadow-lg">
            {event.title}
          </h1>

          {event.subtitle && (
             <p className="text-lg md:text-xl text-white/95 font-medium mb-10 max-w-4xl mx-auto leading-relaxed animate-in fade-in duration-1000 delay-300 drop-shadow-md">
               {event.subtitle}
             </p>
          )}

          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-white font-bold tracking-wide animate-in fade-in duration-1000 delay-500">
            <div className="flex items-center gap-2 bg-white/20 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/30 shadow-sm">
                <Calendar size={16} /> {dateStr} ({weekDay})
            </div>
            <div className="flex items-center gap-2 bg-white/20 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/30 shadow-sm">
                <MapPin size={16} /> {event.venueName}
            </div>
          </div>
        </div>

        {/* シェアボタン群 (ここに追加しました！) */}
        <div className="absolute bottom-8 right-6 md:right-12 z-30 flex flex-col gap-3 animate-in fade-in slide-in-from-right-8 duration-1000 delay-700">
          
          {/* X (Twitter) */}
          <a 
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${shareUrl}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-black hover:border-black transition-all duration-300 shadow-lg hover:scale-110"
            title="Xでポスト"
          >
            <Twitter size={20} fill="currentColor" className="text-white"/>
          </a>

          {/* Facebook */}
          <a 
            href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-[#1877F2] hover:border-[#1877F2] transition-all duration-300 shadow-lg hover:scale-110"
            title="Facebookでシェア"
          >
            <Facebook size={20} fill="currentColor" className="text-white"/>
          </a>

          {/* LINE */}
          <a 
            href={`https://social-plugins.line.me/lineit/share?url=${shareUrl}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-[#06C755] hover:border-[#06C755] transition-all duration-300 shadow-lg hover:scale-110"
            title="LINEで送る"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 2.5c-5.5 0-10 3.6-10 8 0 2.5 1.5 4.8 3.9 6.2-.2.7-.7 2.4-.8 2.8 0 0-.1.3.2.4.2.1.5 0 .9-.2 3.6-2.1 4-2.3 4.3-2.3.5.1 1.1.2 1.6.2 5.5 0 10-3.6 10-8s-4.5-8-10-8z"/>
            </svg>
          </a>

          {/* リンクコピー */}
          <button 
            onClick={handleCopyLink} 
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-purple-600 transition-all duration-300 shadow-lg hover:scale-110"
            title="リンクをコピー"
          >
            {copied ? <Check size={20}/> : <LinkIcon size={20}/>}
          </button>
        </div>
      </section>

      {/* 2. INFO BAR */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 relative z-20">
        <div className="bg-white p-10 md:p-14 shadow-2xl rounded-[3rem] grid grid-cols-1 md:grid-cols-2 gap-10 border border-slate-100">
           <div className="space-y-3 pl-4 md:pl-8 border-l-4 border-slate-100">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14}/> 開催日時
             </p>
             <p className="text-2xl font-black text-slate-800">{dateStr} <span className="text-slate-400 text-lg font-normal">({weekDay})</span></p>
             <p className="text-slate-700 font-bold text-lg">{event.startTime} — {event.endTime}</p>
           </div>
           <div className="space-y-3 pl-4 md:pl-8 border-l-4 border-slate-100">
             <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14}/> 開催場所
             </p>
             <p className="text-2xl font-black text-slate-800">{event.venueName}</p>
             <p className="text-slate-600 font-medium">{event.venueAddress}</p>
           </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-16 lg:gap-24">
        
        <div className="lg:col-span-8 space-y-24">
          {/* イベント概要 */}
          <section className="space-y-8">
            <div className="inline-flex items-center gap-4">
              <span className="h-[3px] w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
              <h2 className="text-lg font-black text-slate-900">イベント概要</h2>
            </div>
            <div className="prose prose-xl prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-[1.8] font-medium">
                {event.content}
              </div>
            </div>
          </section>

          {/* タイムテーブル */}
          <section className="space-y-10">
             <div className="inline-flex items-center gap-4">
               <span className="h-[3px] w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
               <h2 className="text-lg font-black text-slate-900">タイムテーブル</h2>
             </div>
             
             {hasTimeTableData ? (
               <div className="border-l-2 border-slate-100 pl-6 md:pl-10 space-y-10">
                 {event.schedule.map((item: any, i: number) => (
                   <div key={i} className="relative group">
                     <div className="absolute -left-[33px] md:-left-[49px] top-1.5 w-4 h-4 rounded-full bg-white border-[3px] border-slate-200 group-hover:border-purple-400 transition-colors duration-300"></div>
                     <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 mb-3">
                       <span className="font-bold text-slate-400 text-xl font-mono group-hover:text-purple-600 transition-colors">{item.time}</span>
                       <h4 className="font-bold text-xl text-slate-900">{item.title}</h4>
                     </div>
                     {item.speaker && <p className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2"><User size={14}/> {item.speaker}</p>}
                     <p className="text-slate-600 font-medium leading-relaxed">{item.description}</p>
                   </div>
                 ))}
               </div>
             ) : event.timeTable ? (
               <div className="bg-slate-50 p-8 rounded-3xl font-medium text-slate-600 whitespace-pre-wrap leading-loose border border-slate-100">
                 {event.timeTable}
               </div>
             ) : (
               <p className="text-slate-400 font-bold">現在調整中です。</p>
             )}
          </section>

          {/* 登壇者 */}
          {lecturersList.length > 0 && (
            <section className="space-y-12">
              <div className="inline-flex items-center gap-4">
                <span className="h-[3px] w-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></span>
                <h2 className="text-lg font-black text-slate-900">講師</h2>
              </div>
              <div className="grid gap-12 md:gap-16">
                {lecturersList.map((lec: any, index: number) => (
                  <div key={index} className="flex flex-row gap-6 md:gap-8 items-start group">
                    <div className="relative shrink-0">
                      <div className="w-28 h-36 md:w-40 md:h-52 overflow-hidden rounded-2xl md:rounded-3xl bg-slate-100 shadow-md">
                        {lec.image && <img src={lec.image} alt={lec.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                      </div>
                    </div>
                    <div className="space-y-3 md:space-y-4 flex-1 py-1 md:py-2 min-w-0">
                      <div>
                        <p className="text-xs font-bold text-purple-600 mb-1 md:mb-2 truncate">{lec.title}</p>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{lec.name}</h3>
                      </div>
                      <p className="text-sm md:text-base text-slate-600 leading-relaxed font-medium line-clamp-5 md:line-clamp-none">{lec.profile || lec.lecturerProfile}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        

        {/* サイドバー: 予約フォーム */}
        <div className="lg:col-span-4 space-y-10">
          <div id="reservation-area" className="sticky top-8 bg-slate-50 rounded-[3rem] p-8 md:p-10 border border-slate-200 shadow-sm">
            
            <div className="text-center mb-10 pb-8 border-b border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Event Info</p>
              
              <div className="flex flex-col gap-6 mb-6">
                
                {/* 参加費 (円を強制追加するロジックに変更) */}
                <div className="flex flex-col items-center">
                   <span className="text-xs text-slate-500 font-bold mb-1">参加費</span>
                   <div className="text-3xl font-black text-slate-900 tracking-tight">
                     {(!event.price || event.price === "0" || event.price === "無料") 
                        ? "無料" 
                        : isNaN(Number(event.price)) 
                          ? event.price 
                          : Number(event.price).toLocaleString() + "円"
                     }
                   </div>
                </div>

                {/* 定員 */}
                {event.capacity && (
                  <div className="flex flex-col items-center">
                     <span className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1">
                       <Users size={12}/> 定員
                     </span>
                     <div className="text-3xl font-black text-slate-900 tracking-tight">
                       {Number(event.capacity).toLocaleString()}名
                     </div>
                  </div>
                )}
              </div>

              <div className="h-1 w-10 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto rounded-full"></div>
            </div>

            <div className="space-y-6">
              <p className="text-center font-bold text-slate-900">参加申し込みフォーム</p>
              <ReservationForm 
                tenantId={tenantId} 
                eventId={eventId} 
                event={event} 
                tenantData={tenant || undefined} 
                onSuccess={handleFormSuccess}
              />
            </div>
            
            <p className="mt-6 text-center text-[10px] text-slate-400 font-medium px-2">
              ※申し込み完了後、ご登録のメールアドレスに電子チケットをお送りします。
            </p>
          </div>
          
          {/* アクセスマップ (URL修正済み) */}
          <div className="rounded-[3rem] overflow-hidden border border-slate-200 bg-white p-3 group shadow-sm">
            <div className="aspect-square rounded-[2.5rem] overflow-hidden relative">
               {event.venueAddress && (
                 <iframe 
                   width="100%" height="100%" style={{ border: 0 }} loading="lazy" 
                   src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                 ></iframe>
               )}
            </div>
            <div className="p-6 space-y-3">
              <p className="font-bold text-lg text-slate-900">{event.venueName}</p>
              <p className="text-sm text-slate-600 font-medium">{event.venueAddress}</p>
              
              {event.venueAccess && (
                 <div className="flex gap-2 text-xs text-slate-600 font-bold bg-slate-100 p-3 rounded-xl mt-2">
                    <Train size={14} className="shrink-0 text-slate-400" />
                    {event.venueAccess}
                 </div>
              )}

              <a 
                href={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors pt-3"
              >
                Googleマップで開く <ExternalLink size={14}/>
              </a>
            </div>
          </div>
          {/* ▼ ここから追加：お問い合わせセクション（エラー修正版） */}
          <div className="bg-slate-50 rounded-[3rem] p-8 border border-slate-200 shadow-sm space-y-6 mt-10">
            <div className="flex items-center gap-3">
              <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
              <h3 className="font-bold text-slate-900">お問い合わせ</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact Person</p>
                <p className="font-bold text-slate-800">{event.contactName || tenant?.name || "運営事務局"}</p>
              </div>

              <div className="flex flex-col gap-2">
                {event.contactEmail && (
                  <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm">
                    <Mail size={16} className="text-slate-400" />
                    <span className="truncate">{event.contactEmail}</span>
                  </a>
                )}
                {event.contactPhone && (
                  <a href={`tel:${event.contactPhone}`} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm">
                    <Phone size={16} className="text-slate-400" />
                    {event.contactPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
          {/* ▲ ここまで追加 */}
        </div>
      </main>

      {/* FOOTER: ヘッダーと同じグラデーション */}
      <footer className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-10">
          <div className="flex flex-col items-center gap-4">
            {tenant?.logoUrl && (
                <img src={tenant.logoUrl} alt={tenant.name} className="h-12 object-contain brightness-0 invert opacity-90" />
            )}
            <h2 className="text-xl font-bold tracking-tight text-white/90">{tenant?.name}</h2>
          </div>
          
          {tenant?.websiteUrl && (
             <a href={tenant.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white/40 hover:text-white transition-colors border-b border-white/20 pb-0.5">
                Official Website
             </a>
          )}

          <div className="h-[1px] w-32 bg-white/10" />
          <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase">
            © {new Date().getFullYear()} {tenant?.name || "Event Manager"} All rights reserved.
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
        ::selection {
          background: #E9D5FF;
          color: #4C1D95;
        }
      `}</style>
    </div>
  );
}