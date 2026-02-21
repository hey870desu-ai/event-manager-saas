"use client";

import React, { useState, useEffect, useRef } from "react";
import ReservationForm from "@/components/ReservationForm";
import { 
  Calendar, Clock, MapPin, User, AlignLeft, Check, 
  Link as LinkIcon, Facebook, CheckCircle2, Copy, 
  Twitter, Mail, Phone, Sparkles, Users 
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

  // --- 色抽出魔法 ---
  useEffect(() => {
    if (event.ogpImage && imgRef.current) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = event.ogpImage;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 10;
        canvas.height = 10;
        ctx?.drawImage(img, 0, 0, 10, 10);
        const data = ctx?.getImageData(0, 0, 10, 10).data;
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < (data?.length || 0); i += 4) {
          r += data![i]; g += data![i+1]; b += data![i+2];
        }
        const count = (data?.length || 0) / 4;
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
    setReservationId(id);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white max-w-lg w-full p-10 rounded-[3rem] shadow-xl text-center space-y-6 border border-slate-100">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: `${dynamicColor}20`, color: dynamicColor }}><CheckCircle2 size={32} /></div>
          <h2 className="text-2xl font-black text-slate-800">お申し込み完了</h2>
          <div className="bg-slate-50 rounded-3xl p-6 text-left border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-2">{event.title}</h3>
             <img src={qrImageUrl} alt="QR" className="w-32 h-32 mx-auto mt-4"/>
          </div>
          <button onClick={()=>window.location.reload()} className="px-8 py-3 rounded-full text-white font-bold" style={{ backgroundColor: dynamicColor }}>戻る</button>
        </div>
      </div>
    );
  }

  const { full, week } = formatDate(event.date);
  const lecturersList = event.lecturers || (event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }] : []);

  return (
    <div className="min-h-screen pb-32 relative transition-colors duration-1000" style={{ backgroundColor: `${dynamicColor}08` }}>
      {/* 背景の光 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] blur-[120px] opacity-10 animate-pulse" style={{ backgroundColor: dynamicColor }} />
        <div className="absolute bottom-[-10%] right-[10%] w-[500px] h-[500px] blur-[120px] opacity-10" style={{ backgroundColor: dynamicColor }} />
      </div>

      <div className="relative z-10 container mx-auto px-0 md:px-4 pt-4 md:pt-12 max-w-6xl">
        {/* サムネイル */}
        {event.ogpImage && (
          <div className="px-4 mb-10">
            <div className="relative max-w-5xl mx-auto">
              <div className="absolute inset-0 rounded-[2rem] md:rounded-[3rem] translate-x-2 translate-y-2 blur-md opacity-20" style={{ backgroundColor: dynamicColor }}></div>
              <img ref={imgRef} src={event.ogpImage} className="relative w-full aspect-video object-cover rounded-[2rem] md:rounded-[3rem] border-4 border-white shadow-2xl" alt="Main Visual" />
            </div>
          </div>
        )}

        {/* ヘッダー */}
        <div className="text-center mb-12 px-4">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white border border-slate-100 shadow-sm mb-6">
            <Sparkles size={14} style={{ color: dynamicColor }} />
            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">{tenant?.name}</span>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">{event.title}</h1>
          {event.subtitle && <p className="text-slate-500 text-sm md:text-lg font-medium max-w-3xl mx-auto">{event.subtitle}</p>}
        </div>

        {/* メイングリッド */}
        <div className="bg-white/80 backdrop-blur-xl border-y md:border md:rounded-[3rem] grid grid-cols-1 lg:grid-cols-12 shadow-2xl border-white">
          
          {/* 左：詳細情報 */}
          <div className="lg:col-span-8 p-6 md:p-12 border-r border-slate-50 space-y-16">
            <section>
              <div className="flex items-center gap-2 font-bold tracking-widest text-xs mb-8 uppercase" style={{ color: dynamicColor }}><AlignLeft size={14} /> Information</div>
              <div className="prose prose-slate max-w-none"><div className="text-slate-700 leading-8 whitespace-pre-wrap font-medium">{event.content}</div></div>
            </section>

            {/* タイムテーブル */}
            {event.timeTable && (
              <section>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Time Table</div>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-slate-600 text-sm leading-8 whitespace-pre-wrap">{event.timeTable}</div>
              </section>
            )}

            {/* 講師リスト */}
            {lecturersList.length > 0 && (
              <section>
                <div className="flex items-center gap-2 font-bold tracking-widest text-xs mb-8 uppercase" style={{ color: dynamicColor }}><User size={14} /> Lecturers</div>
                <div className="space-y-8">
                  {lecturersList.map((lec: any, i: number) => (
                    <div key={i} className="flex flex-col sm:flex-row gap-6 p-6 bg-white rounded-[2rem] border border-slate-100">
                      {lec.image && <img src={lec.image} className="w-24 h-32 object-cover rounded-2xl shadow-sm"/>}
                      <div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">{lec.name}</h3>
                        <p className="text-xs font-bold mb-3" style={{ color: dynamicColor }}>{lec.title}</p>
                        <p className="text-slate-600 text-sm leading-relaxed">{lec.profile}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* 右：サイドバー */}
          <div className="lg:col-span-4 p-6 md:p-12 bg-slate-50/30 space-y-10 md:rounded-br-[3rem]">
            <div className="space-y-8">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Schedule</div>
                <div className="text-3xl font-black text-slate-900">{full} <span className="text-lg font-medium opacity-30">({week})</span></div>
                <div className="flex items-center gap-2 mt-2 font-bold text-slate-600"><Clock size={16}/>{event.startTime} - {event.endTime}</div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Venue</div>
                <h3 className="text-xl font-black text-slate-900 mb-4">{event.venueName}</h3>
                {event.venueAddress && (
                  <div className="rounded-[2rem] overflow-hidden border-4 border-white shadow-md aspect-video">
                    <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe>
                  </div>
                )}
              </div>

              {/* 問い合わせ */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-sm font-black" style={{ color: dynamicColor }}><Mail size={16}/> Contact</div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Organizer</p>
                  <p className="font-bold text-slate-800">{event.contactName || tenant?.name}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {event.contactEmail && <a href={`mailto:${event.contactEmail}`} className="text-xs font-bold text-slate-500 hover:opacity-70 truncate">{event.contactEmail}</a>}
                  {event.contactPhone && <a href={`tel:${event.contactPhone}`} className="text-xs font-bold text-slate-500 hover:opacity-70">{event.contactPhone}</a>}
                </div>
              </div>
            </div>

            {/* フォーム */}
            <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-2xl border border-white">
              <div className="text-center mb-6"><span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Registration</span></div>
              <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess}/>
            </div>
          </div>
        </div>
        {/* ▼▼▼ 追加：フッター（蓋） ▼▼▼ */}
        <footer className="mt-20 mb-10 text-center relative z-10 space-y-4">
          <div className="flex flex-col items-center gap-4">
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-8 object-contain opacity-80" />
            ) : (
              <div className="flex items-center gap-2 font-bold text-slate-400">
                <Sparkles size={16} style={{ color: dynamicColor }} />
                <span>{tenant?.name}</span>
              </div>
            )}
            
            <div className="h-[1px] w-12 bg-slate-200" style={{ backgroundColor: `${dynamicColor}20` }}></div>
            
            <p className="text-[10px] font-bold tracking-[0.3em] text-slate-400 uppercase">
              © {new Date().getFullYear()} {tenant?.name || "Event Manager"} All rights reserved.
            </p>
            
            {/* システム名（控えめに） */}
            <p className="text-[9px] text-slate-300 font-medium tracking-widest">
              POWERED BY EVENT MANAGER
            </p>
          </div>
        </footer>
        {/* ▲▲▲ 追加ここまで ▲▲▲ */}
      </div>
    </div>
  );
}