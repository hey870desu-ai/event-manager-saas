"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { 
  Clock, MapPin, User, Sparkles, 
  CheckCircle2, Share2, Check, ExternalLink, 
  Music, PartyPopper,Twitter, Facebook, Link as LinkIcon, Mail, Phone,Users,Video
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function PopLayout({ event, tenant, eventId, tenantId }: Props) {
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

  // --- 完了画面 (POP Ver.) ---
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center p-6 font-sans text-slate-900">
        <div className="max-w-xl w-full text-center space-y-8 animate-bounce-in bg-white p-10 rounded-3xl border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <div className="inline-flex p-4 rounded-full bg-pink-100 text-pink-500 border-4 border-slate-900 mb-2">
            <PartyPopper size={48} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-3">THANK YOU!</h2>
            <p className="font-bold text-slate-600">お申し込み完了だイェーイ！🎉<br/>メール送ったからチェックしてね！</p>
          </div>
          <div className="bg-cyan-50 border-4 border-slate-900 rounded-2xl p-8 flex flex-col items-center transform rotate-1">
             <p className="text-xs font-black uppercase mb-4 tracking-widest bg-yellow-300 px-2 py-1 border-2 border-slate-900 inline-block">YOUR TICKET</p>
             <div className="bg-white p-2 border-2 border-slate-900 rounded-xl mb-4">
                <img src={qrImageUrl} alt="QR" className="w-40 h-40 mix-blend-multiply"/>
             </div>
             <p className="text-sm font-bold">当日これ見せてね！</p>
          </div>
          <button onClick={()=>window.location.reload()} className="text-slate-900 font-black border-b-4 border-pink-400 hover:border-pink-600 transition-colors">
            戻る
          </button>
        </div>
      </div>
    );
  }

  const d = new Date(event.date);
  const dateStr = `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
  const weekDay = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  
  const lecturersList = event.lecturers && Array.isArray(event.lecturers) 
    ? event.lecturers 
    : event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }] : [];

  const hasTimeTableData = event.schedule && Array.isArray(event.schedule);

  // 金額表示
  const rawPrice = String(event.price || "").trim();
  const priceNum = Number(rawPrice);
  const isFree = !rawPrice || rawPrice === "0" || rawPrice === "無料";
  const displayPrice = isFree ? "FREE!" : isNaN(priceNum) ? rawPrice : `${priceNum.toLocaleString()}円`;

  return (
    // 背景：ドット柄でポップに
    <div className="min-h-screen bg-yellow-50 text-slate-900 font-sans selection:bg-pink-300 selection:text-white overflow-x-hidden"
         style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      
      {/* 1. HERO: 元気いっぱいなファーストビュー */}
      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-5xl mx-auto relative z-10">
          
          {/* ラベル */}
          <div className="flex justify-center mb-6">
            <span className="bg-slate-900 text-yellow-300 px-4 py-2 rounded-full font-black tracking-widest text-xs border-2 border-white shadow-lg transform -rotate-2">
              {tenant?.name || "POP EVENT"} PRESENTS
            </span>
          </div>

          {/* タイトルエリア */}
          <div className="relative text-center mb-12 px-2">
            <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-slate-900 leading-tight tracking-tighter drop-shadow-sm break-words">
              {event.title}
            </h1>
            <Sparkles className="absolute -top-8 right-10 text-yellow-400 w-12 h-12 animate-bounce hidden md:block" fill="currentColor" />
            <Music className="absolute bottom-0 left-10 text-pink-400 w-10 h-10 animate-pulse hidden md:block" />
          </div>

          {/* メイン画像（ステッカー風） */}
          <div className="relative max-w-4xl mx-auto transform rotate-1 hover:rotate-0 transition-transform duration-500 group">
             <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] md:rounded-[4rem] translate-x-3 translate-y-3"></div>
             <div className="relative bg-white p-2 md:p-4 rounded-[2.5rem] md:rounded-[4rem] border-4 border-slate-900 flex items-center justify-center overflow-hidden min-h-[300px]">
               {event.ogpImage ? (
                 <img src={event.ogpImage} className="w-full h-auto max-h-[70vh] object-contain rounded-[2rem] md:rounded-[3.5rem]" alt="Main Visual" />
               ) : (
                 <div className="w-full h-64 md:h-96 bg-cyan-100 rounded-[2rem] flex items-center justify-center">
                    <PartyPopper size={64} className="text-cyan-400"/>
                 </div>
               )}
             </div>
             
             <div className="absolute -top-6 -left-4 md:-left-8 bg-pink-500 text-white p-6 rounded-full border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transform -rotate-12 z-20">
                <p className="text-xs font-black text-pink-200 uppercase">Date</p>
                <p className="text-2xl font-black leading-none">{dateStr}</p>
                <p className="text-sm font-bold text-center">{weekDay}</p>
             </div>
          </div>

          {/* インフォメーションバー */}
          <div className="mt-12 flex flex-wrap justify-center gap-4 md:gap-8">
             <div className="bg-white px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#FCD34D] flex items-center gap-3 font-bold text-lg transform hover:-translate-y-1 transition-transform">
                <Clock className="text-slate-900"/> {event.startTime} - {event.endTime}
             </div>
             <div className="bg-white px-6 py-3 rounded-2xl border-4 border-slate-900 shadow-[4px_4px_0px_0px_#67E8F9] flex items-center gap-3 font-bold text-lg transform hover:-translate-y-1 transition-transform">
                <MapPin className="text-slate-900"/> {event.venueName}
             </div>
          </div>
        </div>
      </section>

      {/* 2. MAIN CONTENT */}
      <main className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-12 gap-12">
        
        <div className="lg:col-span-8 space-y-16">
           <section className="bg-white p-8 md:p-10 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#F472B6]">
              <h2 className="text-2xl font-black bg-yellow-300 inline-block px-4 py-1 border-2 border-slate-900 transform -rotate-1 mb-6 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                EVENT INFO
              </h2>
              <div className="prose prose-lg prose-slate max-w-none font-medium text-slate-700 leading-loose whitespace-pre-wrap">
                 {event.content}
              </div>
           </section>

           <section className="bg-white p-8 md:p-10 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#22D3EE]">
              <h2 className="text-2xl font-black bg-pink-300 inline-block px-4 py-1 border-2 border-slate-900 transform rotate-1 mb-8 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                TIMETABLE
              </h2>
              {hasTimeTableData ? (
                 <div className="space-y-6">
                    {event.schedule.map((item: any, i: number) => (
                       <div key={i} className="flex gap-4 md:gap-6 items-start group">
                          <div className="bg-slate-900 text-white font-black px-3 py-2 rounded-lg text-sm shrink-0 mt-1 shadow-[4px_4px_0px_0px_#FCD34D] group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all">
                             {item.time}
                          </div>
                          <div>
                             <h4 className="text-xl font-black mb-1">{item.title}</h4>
                             {item.speaker && <p className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><User size={12}/> {item.speaker}</p>}
                             <p className="text-slate-600 text-sm leading-relaxed">{item.description}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="font-bold text-slate-500 whitespace-pre-wrap">{event.timeTable || "Coming Soon..."}</div>
              )}
           </section>

           {lecturersList.length > 0 && (
             <section className="bg-white p-8 md:p-10 rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#A78BFA]">
                <h2 className="text-2xl font-black bg-cyan-300 inline-block px-4 py-1 border-2 border-slate-900 transform -rotate-1 mb-8 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
                  GUESTS
                </h2>
                <div className="grid gap-8">
                   {lecturersList.map((lec: any, index: number) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                         <div className="w-32 h-32 rounded-full border-4 border-slate-900 overflow-hidden shrink-0 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] bg-yellow-100">
                            {lec.image ? <img src={lec.image} className="w-full h-full object-cover"/> : <User size={64} className="m-auto mt-8 text-slate-400"/>}
                         </div>
                         <div>
                            <p className="text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded inline-block mb-2">{lec.title}</p>
                            <h3 className="text-2xl font-black mb-2">{lec.name}</h3>
                            <p className="text-sm font-medium text-slate-600">{lec.profile || lec.lecturerProfile}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </section>
           )}
        </div>

        {/* 右カラム (サイドバー) */}
        <div className="lg:col-span-4 space-y-8">
           
           {/* 1. 開催形式バッジ */}
           <div className="flex justify-center mb-6 px-4">
             {event.hasOnline && event.hasOffline && (
               <div className="bg-yellow-300 border-4 border-slate-900 px-6 py-3 rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transform rotate-1 flex items-center gap-3 transition-transform hover:scale-105">
                 <Users size={24} strokeWidth={3} /> HYBRID (会場 & ONLINE)
               </div>
             )}
             {event.hasOnline && !event.hasOffline && (
               <div className="bg-cyan-300 border-4 border-slate-900 px-6 py-3 rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transform -rotate-1 flex items-center gap-3 transition-transform hover:scale-105">
                 <Video size={24} strokeWidth={3} /> ONLINE 開催！
               </div>
             )}
             {!event.hasOnline && event.hasOffline && (
               <div className="bg-pink-400 border-4 border-slate-900 px-6 py-3 rounded-2xl font-black text-sm shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transform rotate-1 flex items-center gap-3 transition-transform hover:scale-105 text-white">
                 <MapPin size={24} strokeWidth={3} /> 会場で待ってるよ！
               </div>
             )}
           </div>

           {/* 2. 申し込みカード（チケットリスト対応だっぺ！） */}
           <div id="reservation-area" className="sticky top-8">
              <div className="bg-white rounded-[2.5rem] border-4 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,1)] p-8 overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-4 bg-stripes-pink opacity-20"></div>
                 
                 <div className="text-center mb-8 mt-4">
                    <p className="font-black text-slate-400 text-xs tracking-widest mb-4 uppercase">Ticket Options</p>
                    
                    {/* 🎫 チケットリスト (Popスタイルだぞい！) */}
                    <div className="space-y-4 mb-8">
                      {(event.tickets && event.tickets.length > 0) ? (
                        event.tickets.map((t: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-4 rounded-2xl bg-white border-4 border-slate-900 shadow-[4px_4px_0px_0px_#FCD34D] transition-transform hover:translate-x-1 hover:translate-y-1">
                            <div className="text-left">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Title</p>
                              <p className="text-sm font-black text-slate-800">{t.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-black text-slate-900">
                                {t.price === 0 ? "FREE!" : `${t.price.toLocaleString()}円`}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 rounded-2xl bg-yellow-300 border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] flex justify-between items-center transform -rotate-1">
                          <span className="text-sm font-black text-slate-800">参加費</span>
                          <span className="text-2xl font-black text-slate-900">{displayPrice}</span>
                        </div>
                      )}
                    </div>

                    {event.capacity && (
                       <p className="text-xs font-black flex items-center justify-center gap-1 opacity-50">
                          <Users size={14}/> 定員: {Number(event.capacity).toLocaleString()}名
                       </p>
                    )}
                 </div>

                 <div className="mb-4">
                    <ReservationForm 
                       tenantId={tenantId} eventId={eventId} event={event} 
                       tenantData={tenant || undefined} onSuccess={handleFormSuccess}
                    />
                 </div>
              </div>
           </div>

           {/* 3. MAP (URL修正 ＆ ポップな枠だっぺ！) */}
           <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#FCD34D] p-5">
              <div className="rounded-2xl border-4 border-slate-900 overflow-hidden h-48 mb-4 grayscale hover:grayscale-0 transition-all">
                 {event.venueAddress && (
                   <iframe 
                      width="100%" height="100%" style={{border:0}} loading="lazy" 
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}>
                   </iframe>
                 )}
              </div>
              <div className="space-y-3 mb-4">
                <p className="font-black text-center text-xl">{event.venueName}</p>
                <p className="text-sm font-bold text-slate-600 text-center">{event.venueAddress}</p>
              </div>
              <a 
                href={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}`} 
                target="_blank" rel="noopener noreferrer"
                className="block text-center bg-slate-900 text-white font-black py-3 rounded-xl hover:bg-slate-700 transition-all shadow-[4px_4px_0px_0px_#67E8F9] active:shadow-none active:translate-x-1 active:translate-y-1"
              >
                 GOOGLE MAP <ExternalLink size={14} className="inline ml-1"/>
              </a>
           </div>

           {/* 4. お問い合わせ (ポップな吹き出し風カード) */}
           <div className="bg-white rounded-[2rem] border-4 border-slate-900 shadow-[8px_8px_0px_0px_#F472B6] p-8 space-y-6 transform -rotate-1">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-pink-500 border-2 border-slate-900 rounded-full animate-ping"></div>
                <h3 className="font-black text-slate-900 text-lg uppercase">Contact!</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-100 p-3 rounded-xl border-2 border-slate-900">
                  <p className="text-[10px] font-black text-slate-400 uppercase">担当スタッフ</p>
                  <p className="font-black text-slate-800">{event.contactName || tenant?.name || "運営チーム"}</p>
                </div>

                <div className="flex flex-col gap-3">
                  {event.contactEmail && (
                    <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-4 bg-cyan-300 border-4 border-slate-900 rounded-2xl text-xs font-black text-slate-900 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                      <Mail size={18} /> <span className="truncate">{event.contactEmail}</span>
                    </a>
                  )}
                  {event.contactPhone && (
                    <a href={`tel:${event.contactPhone}`} className="flex items-center gap-3 p-4 bg-pink-400 border-4 border-slate-900 rounded-2xl text-xs font-black text-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
                      <Phone size={18} /> {event.contactPhone}
                    </a>
                  )}
                </div>
              </div>
           </div>

           {/* 5. シェアボタン */}
           <div className="flex justify-center gap-4">
               <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#000000] hover:translate-y-1 hover:shadow-none transition-all text-slate-900">
                  <Twitter size={24} fill="currentColor"/>
               </a>
               <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer" className="w-14 h-14 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#1877F2] hover:translate-y-1 hover:shadow-none transition-all text-[#1877F2]">
                  <Facebook size={24} fill="currentColor"/>
               </a>
               <button onClick={handleCopyLink} className="w-14 h-14 bg-white border-4 border-slate-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#A855F7] hover:translate-y-1 hover:shadow-none transition-all text-purple-500">
                  {copied ? <Check size={24}/> : <LinkIcon size={24}/>}
               </button>
           </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-20 border-t-8 border-yellow-400">
         <div className="text-center">
            {tenant?.logoUrl && <img src={tenant.logoUrl} className="h-10 mx-auto mb-6 brightness-0 invert opacity-80" alt="logo"/>}
            <h2 className="text-2xl font-black mb-2">{tenant?.name}</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">© 絆太郎 EVENT MANAGER</p>
         </div>
      </footer>
      
      {/* カスタムCSS (ストライプ背景用) */}
      <style jsx>{`
        .bg-stripes-pink {
            background-image: linear-gradient(45deg, #F472B6 25%, transparent 25%, transparent 50%, #F472B6 50%, #F472B6 75%, transparent 75%, transparent);
            background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}