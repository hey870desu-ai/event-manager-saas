"use client";

import React, { useState, useEffect, useRef } from "react";
import ReservationForm from "@/components/ReservationForm";
import { 
  Calendar, Clock, MapPin, User, AlignLeft, Check, 
  Link as LinkIcon, Facebook, CheckCircle2, Copy, 
  Twitter, Mail, Phone, Sparkles, Users, Info, ChevronRight
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function ChameleonLayout({ event, tenant, eventId, tenantId }: Props) {
  const [dynamicColor, setDynamicColor] = useState("#6366f1"); 
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState(""); 
  const [copied, setCopied] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (event.ogpImage && imgRef.current) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = event.ogpImage;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 10; canvas.height = 10;
        ctx?.drawImage(img, 0, 0, 10, 10);
        const data = ctx?.getImageData(0, 0, 10, 10).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < (data?.length || 0); i += 4) {
          r += data![i]; g += data![i+1]; b += data![i+2];
        }
        const count = (data?.length || 0) / 4;
        // 色味を少し強調して反映
        setDynamicColor(`rgb(${Math.round(r/count)}, ${Math.round(g/count)}, ${Math.round(b/count)})`);
      };
    }
  }, [event.ogpImage]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr || new Date());
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return { full: `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`, week: days[d.getDay()] };
  };

  const handleFormSuccess = (id: string) => {
    setReservationId(id); setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { full, week } = formatDate(event.date);
  const lecturersList = event.lecturers || (event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }] : []);
// --- SNSシェア用ハンドラー ---
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShareX = () => {
    const shareText = `${event.title} | イベント申し込み`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleShareFB = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleShareLINE = () => {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white max-w-lg w-full p-10 rounded-[3rem] shadow-2xl text-center space-y-6 border-4" style={{ borderColor: dynamicColor }}>
          <CheckCircle2 size={64} className="mx-auto" style={{ color: dynamicColor }} />
          <h2 className="text-3xl font-black text-slate-900">お申し込み完了</h2>
          <button onClick={()=>window.location.reload()} className="px-10 py-4 rounded-full text-white font-bold shadow-lg" style={{ backgroundColor: dynamicColor }}>ページに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative transition-colors duration-1000" style={{ backgroundColor: `${dynamicColor}15` }}>
      
      {/* 背景のダイナミック・オーラ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] blur-[150px] opacity-20" style={{ backgroundColor: dynamicColor }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] blur-[150px] opacity-20" style={{ backgroundColor: dynamicColor }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 pt-8 md:pt-16 max-w-6xl">
        
        {/* サムネイル・メインビジュアル */}
        <div className="relative mb-12 group">
          <div className="absolute inset-0 rounded-[2.5rem] md:rounded-[4rem] translate-y-4 blur-2xl opacity-30 transition-transform group-hover:translate-y-6" style={{ backgroundColor: dynamicColor }}></div>
          <div className="relative bg-white p-2 md:p-4 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl">
            <img 
  ref={imgRef} 
  src={event.ogpImage} 
  className="relative w-full h-auto max-h-[60vh] object-contain rounded-[2rem] md:rounded-[3.5rem]" 
  alt="Event Thumbnail" 
/>
          </div>
        </div>

        {/* ヘッダーセクション */}
        <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] p-8 md:p-16 mb-12 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: dynamicColor }}></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">
              <Sparkles size={14} style={{ color: dynamicColor }} /> {tenant?.name}
            </div>
            <div className="flex flex-wrap gap-3">
  {/* X */}
  <button onClick={handleShareX} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
    <Twitter size={18}/>
  </button>

  {/* LINE */}
  <button onClick={handleShareLINE} className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2c-5.522 0-10 3.91-10 8.73 0 2.82 1.515 5.33 3.896 7l-.585 2.14c-.067.245.163.456.387.357l2.527-1.12c.594.16 1.22.25 1.775.25 5.522 0 10-3.91 10-8.73s-4.478-8.73-10-8.73z"/>
    </svg>
  </button>

  {/* FB */}
  <button onClick={handleShareFB} className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
    <Facebook size={18}/>
  </button>

  {/* Copy */}
  <button 
    onClick={handleCopyLink} 
    className="h-10 px-4 rounded-full border-2 flex items-center gap-2 font-bold transition-all shadow-sm bg-white text-xs" 
    style={{ borderColor: copied ? dynamicColor : '#f1f5f9', color: copied ? dynamicColor : '#64748b' }}
  >
    {copied ? <Check size={14}/> : <Copy size={14}/>}
    <span>{copied ? "OK" : "Link"}</span>
  </button>
</div>
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-slate-900 leading-[1.1] mb-6">{event.title}</h1>
          {event.subtitle && <p className="text-lg md:text-2xl font-medium text-slate-500 leading-relaxed border-l-4 pl-6" style={{ borderColor: dynamicColor }}>{event.subtitle}</p>}
        </div>

        {/* メインコンテンツ・グリッド */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          
          {/* 左：詳細カード群 */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 詳細情報カード */}
            <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-lg border border-slate-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-2xl" style={{ backgroundColor: `${dynamicColor}15`, color: dynamicColor }}><Info size={24}/></div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Information</h2>
              </div>
              <div className="prose prose-slate max-w-none text-slate-700 leading-8 whitespace-pre-wrap font-medium text-lg">
                {event.content}
              </div>
            </div>

            {/* タイムテーブルカード */}
            {event.timeTable && (
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-lg border border-slate-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900"><Clock size={120}/></div>
                <h2 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-2">
                  <span className="w-2 h-8 rounded-full" style={{ backgroundColor: dynamicColor }}></span>
                  Time Table
                </h2>
                <div className="relative bg-slate-50 rounded-3xl p-8 border border-slate-100 text-slate-700 leading-8 whitespace-pre-wrap font-bold">
                  {event.timeTable}
                </div>
              </div>
            )}

            {/* 講師カード */}
            {lecturersList.length > 0 && (
              <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-lg border border-slate-100">
                <h2 className="text-xl font-black text-slate-900 mb-10 flex items-center gap-2">
                   <User size={24} style={{ color: dynamicColor }}/> Lecturers
                </h2>
                <div className="grid gap-6">
                  {lecturersList.map((lec: any, i: number) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-8 p-8 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                      {lec.image && <div className="shrink-0 ring-4 ring-white rounded-2xl overflow-hidden shadow-lg"><img src={lec.image} className="w-32 h-40 object-cover" alt={lec.name}/></div>}
                      <div>
                        <div className="inline-block px-3 py-1 rounded-lg text-[10px] font-black text-white mb-3" style={{ backgroundColor: dynamicColor }}>{lec.title}</div>
                        <h3 className="text-2xl font-black text-slate-900 mb-3">{lec.name}</h3>
                        <p className="text-slate-600 leading-relaxed font-medium">{lec.profile}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右：サイドバー・アクション */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* 開催概要カード */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100 sticky top-8">
              <div className="space-y-8 mb-10">
                <div className="group">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Schedule</p>
                  <div className="text-3xl font-black text-slate-900 group-hover:translate-x-1 transition-transform">{full}</div>
                  <div className="flex items-center gap-3 mt-3 p-3 rounded-2xl bg-slate-50 font-bold text-slate-600">
                    <Clock size={18} style={{ color: dynamicColor }}/> {event.startTime} - {event.endTime}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Venue</p>
                  <h3 className="text-xl font-black text-slate-900 mb-4">{event.venueName}</h3>
                  {event.venueAddress && (
                    <div className="rounded-[2rem] overflow-hidden border-2 border-slate-100 shadow-inner aspect-video">
                      <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Fee</p>
                    <div className="text-xl font-black text-slate-900">{event.price || "無料"}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Capacity</p>
                    <div className="text-xl font-black text-slate-900">{event.capacity ? `${event.capacity}名` : "定員なし"}</div>
                  </div>
                </div>
              </div>

              {/* フォーム部分 */}
              <div className="pt-8 border-t border-slate-100">
                <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess}/>
              </div>
            </div>

            {/* お問い合わせカード */}
            <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
              <h3 className="font-black text-slate-900 flex items-center gap-2 mb-6">
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: dynamicColor }}></div>
                Contact
              </h3>
              <div className="space-y-4">
                 <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Organizer</p>
                    <p className="font-bold text-slate-800">{event.contactName || tenant?.name}</p>
                 </div>
                 <div className="space-y-2">
                    {event.contactEmail && (
                      <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                        <Mail size={16} style={{ color: dynamicColor }}/>
                        <span className="truncate">{event.contactEmail}</span>
                      </a>
                    )}
                    {event.contactPhone && (
                      <a href={`tel:${event.contactPhone}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                        <Phone size={16} style={{ color: dynamicColor }}/>
                        {event.contactPhone}
                      </a>
                    )}
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-20 py-12 text-center border-t border-slate-200/50">
          <div className="flex flex-col items-center gap-6">
            {tenant?.logoUrl && <img src={tenant.logoUrl} className="h-8 opacity-60 grayscale hover:grayscale-0 transition-all" alt="logo"/>}
            <div className="text-[10px] font-black text-slate-400 tracking-[0.5em] uppercase">
              © {new Date().getFullYear()} {tenant?.name || "Event Manager"}
            </div>
            <div className="px-4 py-1 rounded-full bg-slate-900 text-white text-[8px] font-bold tracking-widest uppercase opacity-20">
              Powered by Event Manager
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}