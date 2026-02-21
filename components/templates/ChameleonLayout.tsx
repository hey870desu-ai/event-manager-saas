"use client";

import React, { useState, useEffect, useRef } from "react";
import ReservationForm from "@/components/ReservationForm";
import { Calendar, Clock, MapPin, User, AlignLeft, Check, Link as LinkIcon, Facebook, CheckCircle2, Copy, Twitter, Mail, Phone, Sparkles } from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function ChameleonLayout({ event, tenant, eventId, tenantId }: Props) {
  const [dynamicColor, setDynamicColor] = useState("#6366f1"); // デフォルト色
  const [submitted, setSubmitted] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // ★画像から色を抽出する魔法の処理
  useEffect(() => {
    if (event.ogpImage && imgRef.current) {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // CORS対策
      img.src = event.ogpImage;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = 10; // 低解像度で十分（平均色を取るため）
        canvas.height = 10;
        ctx?.drawImage(img, 0, 0, 10, 10);
        const data = ctx?.getImageData(0, 0, 10, 10).data;
        
        let r = 0, g = 0, b = 0;
        for (let i = 0; i < (data?.length || 0); i += 4) {
          r += data![i]; g += data![i + 1]; b += data![i + 2];
        }
        const count = (data?.length || 0) / 4;
        const rgb = `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
        setDynamicColor(rgb);
      };
    }
  }, [event.ogpImage]);

  // フォーマット用
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr || new Date());
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
  };

  if (submitted) return <div className="p-20 text-center">お申し込み完了！</div>;

  return (
    <div className="min-h-screen bg-white transition-colors duration-1000" style={{ backgroundColor: `${dynamicColor}10` }}>
      {/* 背景のボケ（抽出した色で光る） */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] blur-[120px] opacity-20 animate-pulse" style={{ backgroundColor: dynamicColor }} />
        <div className="absolute -bottom-[10%] -right-[10%] w-[500px] h-[500px] blur-[120px] opacity-10" style={{ backgroundColor: dynamicColor }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* サムネイル（これに基づいて色が決まる） */}
        <div className="mb-12">
          <img 
            ref={imgRef}
            src={event.ogpImage} 
            className="w-full aspect-video object-cover rounded-[2.5rem] shadow-2xl border-8 border-white"
            alt="Main Visual"
          />
        </div>

        {/* コンテンツエリア */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 shadow-xl border border-white">
          <div className="mb-10">
            <span className="inline-block px-4 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4" style={{ backgroundColor: `${dynamicColor}20`, color: dynamicColor }}>
              {tenant?.name}
            </span>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight mb-6">{event.title}</h1>
          </div>

          <div className="grid lg:grid-cols-12 gap-12">
            <div className="lg:col-span-8 space-y-12 text-slate-700 leading-relaxed whitespace-pre-wrap">
              {event.content}
            </div>

            {/* サイドバー */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 bg-white" style={{ borderTop: `4px solid ${dynamicColor}` }}>
                <div className="flex items-center gap-3 text-slate-900 font-bold">
                  <Calendar size={18} style={{ color: dynamicColor }} /> {formatDate(event.date)}
                </div>
                <div className="flex items-center gap-3 text-slate-900 font-bold">
                  <MapPin size={18} style={{ color: dynamicColor }} /> {event.venueName}
                </div>
                <div className="pt-4">
                  <ReservationForm 
                    tenantId={tenantId} eventId={eventId} event={event} 
                    tenantData={tenant} onSuccess={() => setSubmitted(true)}
                  />
                </div>
              </div>

              {/* お問い合わせ：ここも色が変わる */}
              <div className="p-6 rounded-3xl border border-slate-100 shadow-sm space-y-3 bg-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inquiry</p>
                <div className="font-bold text-slate-800">{event.contactName || "事務局"}</div>
                {event.contactEmail && (
                  <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: dynamicColor }}>
                    <Mail size={16} /> {event.contactEmail}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}