"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { 
  Calendar, Clock, MapPin, User, AlignLeft, Check, 
  Link as LinkIcon, Facebook, CheckCircle2, Copy, 
  Twitter, Mail, Phone, Sparkles, Users, Video 
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function MimosaLayout({ event, tenant, eventId, tenantId }: Props) {
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState(""); 

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = event ? `${event.title} | イベント申し込み` : "";

  const handleShareLine = () => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleShareFB = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
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

  const mimosaYellow = "#FFE000"; 
  const leafGreen = "#8BA889";

  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen bg-[#FCF9EE] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white max-w-lg w-full p-8 md:p-10 rounded-[3rem] shadow-xl text-center space-y-6 border border-yellow-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800">お申し込み完了</h2>
          <div className="bg-[#FCF9EE]/50 rounded-3xl p-6 border border-yellow-200 text-left">
             <h3 className="text-sm font-bold text-slate-800">{event.title}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl inline-block shadow-lg border border-yellow-50">
             <img src={qrImageUrl} alt="QR" className="w-[140px] h-[140px] object-contain"/>
          </div>
          <button onClick={()=>window.location.reload()} className="w-full py-3 rounded-full bg-slate-900 text-white font-bold">戻る</button>
        </div>
      </div>
    );
  }

  const { full, week } = formatDate(event.date);

  return (
    <div className={`min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900 pb-32 overflow-x-hidden relative bg-[#FCF9EE] text-slate-800`}>
      
      {/* 背景装飾 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-multiply opacity-30 animate-pulse" style={{ backgroundColor: mimosaYellow }} />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full blur-[100px] mix-blend-multiply opacity-20" style={{ backgroundColor: leafGreen }} />
      </div>

      <div className="relative z-10 container mx-auto px-0 md:px-4 pt-12 md:pt-24 max-w-6xl">

        {/* ヘッダー */}
        <div className="text-center mb-24 px-4">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border border-yellow-200 shadow-sm mb-6">
            <Sparkles size={14} className="text-yellow-500" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{tenant?.name || tenantId}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.2] mb-8 max-w-4xl mx-auto break-keep">
    {event.title}
  </h1>
          {event.subtitle && <p className="text-slate-500 md:text-lg max-w-3xl mx-auto">{event.subtitle}</p>}
        </div>

        {/* 2カラムレイアウト */}
        <div className={`bg-white/70 backdrop-blur-xl border-y md:border md:rounded-[3rem] grid grid-cols-1 lg:grid-cols-2 shadow-2xl border-white`}>
          
          {/* 左：内容 */}
          <div className="p-6 md:p-12 lg:border-r border-yellow-50 space-y-12">
            <section>
              <div className="flex items-center gap-2 font-bold text-xs mb-6 text-yellow-600 uppercase"><User size={14} /> 講師紹介</div>
              <div className="bg-[#FAF9F2] rounded-[2rem] p-8 border border-yellow-100 flex flex-col sm:flex-row gap-6">
                {event.lecturerImage && <img src={event.lecturerImage} className="w-24 h-32 object-cover rounded-2xl ring-4 ring-white shadow-md"/>}
                <div>
                  <h3 className="text-xl font-black text-slate-900">{event.lecturer} 氏</h3>
                  <p className="text-xs font-bold text-yellow-600 mb-2">{event.lecturerTitle}</p>
                  <p className="text-slate-600 text-sm leading-relaxed">{event.lecturerProfile}</p>
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 font-bold text-xs mb-6 text-yellow-600 uppercase"><AlignLeft size={14} /> イベント詳細</div>
              <div className="text-slate-700 leading-8 whitespace-pre-wrap font-medium">{event.content}</div>
              {event.timeTable && (
                <div className="mt-8 p-8 bg-white rounded-[2rem] border border-yellow-50 text-sm leading-8 whitespace-pre-wrap">{event.timeTable}</div>
              )}
            </section>

            <div className="pt-8 border-t border-yellow-50 flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">このイベントをシェア</p>
              <div className="flex gap-3">
                <button onClick={handleShareLine} className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2c-5.522 0-10 3.91-10 8.73 0 2.82 1.515 5.33 3.896 7l-.585 2.14c-.067.245.163.456.387.357l2.527-1.12c.594.16 1.22.25 1.775.25 5.522 0 10-3.91 10-8.73s-4.478-8.73-10-8.73z"/></svg>
                </button>
                <button onClick={handleShareFB} className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center"><Facebook size={18}/></button>
                <button onClick={handleShareTwitter} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center"><Twitter size={18}/></button>
                <button onClick={handleCopyLink} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${copied ? "bg-yellow-400 border-yellow-400 text-black" : "bg-white border-yellow-200 text-yellow-500"}`}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button>
              </div>
            </div>
          </div>

          {/* 右：サイドバー */}
          <div className="p-6 md:p-12 bg-[#FAF9F2]/50 space-y-10 md:rounded-br-[3rem]">
            
            {/* 開催形式バッジ (追加) */}
            <div className="flex justify-center mb-6">
              {event.hasOnline && event.hasOffline && (
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 font-bold text-xs uppercase tracking-widest bg-white"
                     style={{ borderColor: mimosaYellow, color: '#b8860b' }}>
                  <Users size={16} className="text-yellow-500" /> ハイブリッド (会場 & Online)
                </div>
              )}
              {event.hasOnline && !event.hasOffline && (
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 font-bold text-xs uppercase tracking-widest bg-white"
                     style={{ borderColor: '#60a5fa', color: '#1d4ed8' }}>
                  <Video size={16} className="text-blue-400" /> Online 参加
                </div>
              )}
              {!event.hasOnline && event.hasOffline && (
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full border-2 font-bold text-xs uppercase tracking-widest bg-white"
                     style={{ borderColor: leafGreen, color: '#2d6a4f' }}>
                  <MapPin size={16} className="text-green-600" /> 会場 参加
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-8 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-xl border border-yellow-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 opacity-30"></div>
                <div className="space-y-8">
                  <div>
                    <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-3">開催日時</div>
                    <div className="text-3xl font-black text-slate-900">{full} <span className="text-xl text-yellow-600/50 font-medium">({week})</span></div>
                    <div className="flex items-center gap-2 mt-2 font-bold text-slate-600"><Clock size={18} className="text-yellow-500"/>{event.startTime} - {event.endTime}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-3">会場 & アクセス</div>
                    <h3 className="text-xl font-black text-slate-900 mb-3">{event.venueName}</h3>
                    {/* ★住所テキストを追加 */}
  {event.venueAddress && (
    <p className="text-sm font-bold text-slate-600 mb-3 flex items-start gap-2">
      <MapPin size={16} className="text-yellow-500 shrink-0 mt-0.5" />
      <span>{event.venueAddress}</span>
    </p>
  )}
                    {event.venueAccess && (
                      <div className="text-sm font-bold text-slate-500 mb-4 bg-[#FCF9EE] p-4 rounded-2xl border-l-4 border-yellow-400">
                        {event.venueAccess}
                      </div>
                    )}
                    {event.venueAddress && (
                      <div className="rounded-[2rem] overflow-hidden border-4 border-white shadow-md aspect-video">
                        <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-yellow-50 pt-8">
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">参加費</p>
                      <div className="text-xl font-black text-slate-900">
  {(!event.price || event.price === "0" || event.price === "無料") 
    ? "無料" 
    : isNaN(Number(event.price)) 
      ? event.price 
      : `${Number(event.price).toLocaleString()}円`}
</div>
                    </div>
                    <div className="text-center border-l border-yellow-50">
                      <p className="text-[10px] font-bold text-yellow-600 uppercase mb-1">定員</p>
                      <div className="text-xl font-black text-slate-900">{event.capacity ? `${event.capacity}名` : "なし"}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <div className="text-center mb-4"><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">お申し込みフォーム</span></div>
                  <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess}/>
                </div>
              </div>

              
            </div>
          </div>
        </div>
        {/* お問い合わせ：カードをやめて、オープンで品のあるデザインへ */}
<div className="mt-32 max-w-4xl mx-auto px-6 border-t border-yellow-200/50 pt-20">
  <div className="text-center space-y-8">
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-yellow-600 uppercase tracking-[0.4em]">Inquiry</p>
      <h3 className="text-2xl font-black text-slate-800">お問い合わせ</h3>
    </div>
    
    <div className="space-y-1">
      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Organizer</p>
      <p className="text-xl font-bold text-slate-700">{event.contactName || tenant?.name || "運営事務局"}</p>
    </div>

    <div className="flex flex-wrap justify-center gap-6 pt-4">
      {event.contactEmail && (
        <a href={`mailto:${event.contactEmail}`} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-white border border-yellow-100 flex items-center justify-center shadow-sm group-hover:bg-yellow-50 transition-colors">
            <Mail size={20} className="text-yellow-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500">{event.contactEmail}</span>
        </a>
      )}
      {event.contactPhone && (
        <a href={`tel:${event.contactPhone}`} className="flex flex-col items-center gap-2 group">
          <div className="w-14 h-14 rounded-full bg-white border border-yellow-100 flex items-center justify-center shadow-sm group-hover:bg-yellow-50 transition-colors">
            <Phone size={20} className="text-yellow-500" />
          </div>
          <span className="text-[10px] font-bold text-slate-500">{event.contactPhone}</span>
        </a>
      )}
    </div>
  </div>
</div>

        <footer className="mt-20 mb-10 text-center relative z-10">
          <p className="text-slate-400 text-[10px] tracking-[0.3em] font-bold uppercase">© {new Date().getFullYear()} {tenant?.name || "Event Manager"}</p>
        </footer>
      </div>
    </div>
  );
}