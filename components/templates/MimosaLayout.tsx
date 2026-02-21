"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import { Calendar, Clock, MapPin, User, AlignLeft, Check, Link as LinkIcon, Facebook, CheckCircle2, Copy, Twitter, Mail, Phone, Sparkles } from "lucide-react";

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

  // 🌼 ミモザ・カラーパレット
  const mimosaYellow = "#FFE000"; 
  const mimosaBeige = "#FCF9EE"; // 背景用：ごく薄いベージュ
  const leafGreen = "#8BA889";  // 葉のグリーン（文字やアクセント用）

  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen bg-[#FCF9EE] flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white max-w-lg w-full p-8 md:p-10 rounded-[3rem] shadow-xl text-center space-y-6 border border-yellow-100 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 size={32} />
          </div>
          <div>
             <h2 className="text-2xl font-black text-slate-800 mb-1">お申し込み完了</h2>
             <p className="text-slate-500 font-medium">ご参加をお待ちしております。</p>
          </div>
          <div className="bg-[#FCF9EE]/50 rounded-3xl p-6 border border-yellow-200 text-left space-y-3">
             <h3 className="text-sm font-bold text-slate-800 leading-snug">{event.title}</h3>
             <div className="pt-3 border-t border-yellow-200/50 space-y-2 text-xs font-bold text-slate-600">
               <div className="flex items-center gap-2"><Calendar size={14} className="text-yellow-500"/>{formatDate(event.date).full}</div>
               <div className="flex items-center gap-2"><Clock size={14} className="text-yellow-500"/>{event.startTime} - {event.endTime}</div>
             </div>
          </div>
          <div className="bg-white p-6 rounded-3xl inline-block shadow-lg border border-yellow-50">
             <img src={qrImageUrl} alt="QR" className="w-[140px] h-[140px] object-contain"/>
          </div>
          <div className="pt-2"><button onClick={()=>window.location.reload()} className="text-sm font-bold py-3 px-8 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors">イベントページに戻る</button></div>
        </div>
      </div>
    );
  }

  const { full, week } = formatDate(event.date);

  return (
    <div className={`min-h-screen font-sans selection:bg-yellow-200 selection:text-yellow-900 pb-32 overflow-x-hidden relative bg-[#FCF9EE] text-slate-800`}>
      
      {/* 背景装飾：ふわふわしたミモザの光 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full blur-[120px] mix-blend-multiply opacity-30 animate-pulse" style={{ backgroundColor: mimosaYellow }} />
        <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full blur-[100px] mix-blend-multiply opacity-20" style={{ backgroundColor: leafGreen }} />
      </div>

      <div className="relative z-10 container mx-auto px-0 md:px-4 pt-12 md:pt-24 max-w-6xl">

        {/* ★ここから修正：サムネイル画像を最上部に配置 */}
        {event.ogpImage ? (
          <div className="px-4 mb-10">
            <div className="relative max-w-5xl mx-auto transform hover:scale-[1.01] transition-transform duration-500">
              {/* ステッカー風の影 */}
              <div className="absolute inset-0 bg-yellow-200/50 rounded-[2rem] md:rounded-[3rem] translate-x-2 translate-y-2 blur-sm"></div>
              <div className="relative aspect-video w-full overflow-hidden rounded-[2rem] md:rounded-[3rem] border-4 border-white shadow-xl">
                <img src={event.ogpImage} className="w-full h-full object-cover" alt="Event Thumbnail" />
              </div>
            </div>
          </div>
        ) : null}

        {/* ヘッダー：タイトルの位置を調整 */}
        <div className="text-center mb-12 px-4">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border border-yellow-200 shadow-sm mb-6">
            <Sparkles size={14} className="text-yellow-500" />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{tenant?.name || tenantId}</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black leading-tight text-slate-900 mb-6 max-w-5xl mx-auto">
            {event.title}
          </h1>
          
          {event.subtitle && (
            <p className="text-slate-500 text-sm md:text-lg max-w-3xl mx-auto leading-relaxed font-medium">
              {event.subtitle}
            </p>
          )}
        </div>

        {/* 2カラムレイアウト */}
        <div className={`bg-white/70 backdrop-blur-xl border-y md:border md:rounded-[3rem] overflow-visible grid grid-cols-1 lg:grid-cols-2 shadow-2xl shadow-yellow-900/5 border-white`}>
          
          {/* 左カラム：内容エリア */}
          <div className="p-6 md:p-12 lg:border-r border-yellow-50 flex flex-col relative overflow-hidden md:rounded-tl-[3rem]">
            <div className="space-y-12 z-10 h-full flex flex-col relative">
               
               {/* 講師紹介 */}
               <section>
                <div className="flex items-center gap-2 font-bold tracking-widest text-xs mb-6 text-yellow-600 uppercase"><User size={14} /> Lecturer</div>
                <div className="bg-[#FAF9F2] rounded-[2rem] p-6 md:p-8 border border-yellow-100 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                    {event.lecturerImage && <div className="shrink-0 ring-4 ring-white shadow-md rounded-2xl overflow-hidden"><img src={event.lecturerImage} alt={event.lecturer} className="w-24 h-32 md:w-28 md:h-36 object-cover"/></div>}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2">{event.lecturer ? `${event.lecturer} 氏` : "講師調整中"}</h3>
                      <p className="text-xs font-bold text-yellow-600 mb-4 tracking-wide">{event.lecturerTitle}</p>
                      <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{event.lecturerProfile}</p>
                    </div>
                </div>
              </section>

              {/* セミナー内容 */}
              <section className="flex-1">
                 <div className="flex items-center gap-2 font-bold tracking-widest text-xs mb-6 text-yellow-600 uppercase"><AlignLeft size={14} /> Information</div>
                 <div className="prose prose-slate max-w-none">
                    <div className="text-slate-700 text-base leading-8 whitespace-pre-wrap font-medium">{event.content}</div>
                 </div>
                 {event.timeTable && (
                   <div className="mt-10 p-8 bg-white rounded-[2rem] border border-yellow-50 shadow-sm">
                      <div className="text-[10px] text-yellow-600 font-bold tracking-widest uppercase mb-4 text-center">Time Table</div>
                      <div className="text-slate-600 text-sm leading-8 whitespace-pre-wrap font-medium">{event.timeTable}</div>
                   </div>
                 )}
              </section>

              {/* シェア */}
              <div className="mt-auto pt-8 border-t border-yellow-50 flex items-center justify-between">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Share this event</p>
                 <div className="flex gap-3">
                    <button onClick={handleShareLine} className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><LinkIcon size={18}/></button>
                    <button onClick={handleShareFB} className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Facebook size={18}/></button>
                    <button onClick={handleShareTwitter} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:opacity-80 transition-opacity"><Twitter size={18}/></button>
                    <button onClick={handleCopyLink} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${copied ? "bg-yellow-400 border-yellow-400 text-black" : "bg-white border-yellow-200 text-yellow-500 hover:border-yellow-400"}`}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button>
                 </div>
              </div>
            </div>
          </div>

          {/* 右カラム：手続きエリア */}
          <div className="p-6 md:p-12 bg-[#FAF9F2]/50 flex flex-col justify-between md:rounded-br-[3rem]">
            <div className="space-y-10">
              {/* 開催情報 */}
              <div className="space-y-6">
                <div>
                  <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-3">Schedule</div>
                  <div className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{full} <span className="text-xl text-yellow-600/50 font-medium ml-1">({week})</span></div>
                  <div className="flex items-center gap-4 text-slate-600 font-bold">
                    <div className="flex items-center gap-2"><Clock size={18} className="text-yellow-500"/>{event.startTime} - {event.endTime}</div>
                    <span className="text-[10px] bg-white px-3 py-1 rounded-full border border-yellow-200 shadow-sm text-yellow-600 uppercase tracking-widest">Door Open {event.openTime}</span>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-3">Venue</div>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-4">{event.venueName || "会場未定"}</h3>
                  {event.venueAddress && (
                    <div className="w-full h-44 rounded-[2rem] overflow-hidden border-4 border-white shadow-md relative z-0">
                      <iframe 
                        width="100%" height="100%" style={{ border: 0 }} 
                        loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                      ></iframe>
                    </div>
                  )}
                </div>
              </div>

              {/* お問い合わせ：ミモザ仕様 */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-yellow-100 shadow-sm space-y-6 mt-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-yellow-400 opacity-50"></div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_10px_#FFE000]"></div>
                  <h3 className="font-black text-slate-900 tracking-wider text-sm uppercase">Contact</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organizer</p>
                    <p className="font-black text-slate-800">{event.contactName || tenant?.name || "運営事務局"}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {event.contactEmail && (
                      <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-3 p-3 bg-[#FCF9EE] border border-yellow-100 rounded-2xl text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-600 transition-all group">
                        <Mail size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                        <span className="truncate">{event.contactEmail}</span>
                      </a>
                    )}
                    {event.contactPhone && (
                      <a href={`tel:${event.contactPhone}`} className="flex items-center gap-3 p-3 bg-[#FCF9EE] border border-yellow-100 rounded-2xl text-xs font-bold text-slate-600 hover:border-yellow-400 hover:text-yellow-600 transition-all group">
                        <Phone size={16} className="text-yellow-500 group-hover:scale-110 transition-transform" />
                        {event.contactPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* 料金・定員 */}
              <div className="grid grid-cols-2 gap-4 pt-10 border-t border-yellow-100">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1">Fee</div>
                  <div className="text-2xl font-black text-slate-900">{event.price || "無料"}</div>
                </div>
                <div className="text-center border-l border-yellow-50">
                  <div className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest mb-1">Capacity</div>
                  <div className="text-2xl font-black text-slate-900">{event.capacity ? `${event.capacity}名` : "定員なし"}</div>
                </div>
              </div>
            </div>

            {/* 申し込みフォーム */}
            <div className="mt-12 relative z-50">
              <div className="text-center mb-6">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Entry Form</span>
              </div>
              <div className="bg-white rounded-[2.5rem] p-3 md:p-8 shadow-2xl shadow-yellow-900/10 border border-yellow-50">
                <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant || undefined} onSuccess={handleFormSuccess}/>
              </div>
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