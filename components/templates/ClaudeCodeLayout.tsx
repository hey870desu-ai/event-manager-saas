"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import { JetBrains_Mono, DotGothic16 } from "next/font/google";
import {
  Clock, MapPin, User, Sparkles,
  Check, ExternalLink, Music, PartyPopper,
  Twitter, Facebook, Link as LinkIcon, Mail, Phone, Users, Video,
  Terminal, Code2, Cpu,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const dotFont = DotGothic16({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export default function ClaudeCodeLayout({ event, tenant, eventId, tenantId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleFormSuccess = (id: string) => {
    setReservationId(id);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===== 完了画面 =====
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}&bgcolor=0F0F0F&color=E8E8E8`;
    return (
      <div className={`min-h-screen bg-[#0F0F0F] flex items-center justify-center p-6 text-[#E8E8E8] ${mono.className}`}
           style={{ backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
        <div className="max-w-xl w-full text-center space-y-8 animate-bounce-in bg-[#1A1A1A] p-10 rounded-3xl border-4 border-[#D97757] shadow-[8px_8px_0px_0px_#D97757]">
          <div className="text-left mb-2">
            <span className="text-[#6BCF8E] text-xs">$ </span>
            <span className="text-[#D97757] text-xs">reservation --status</span>
            <span className="text-[#888] text-xs"> &gt; ok</span>
          </div>
          <div className="inline-flex p-4 rounded-2xl bg-[#1E1E1E] text-[#FF8E61] border-4 border-[#D97757] mb-2 shadow-[4px_4px_0px_0px_#D97757]">
            <PartyPopper size={48} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-3 text-[#E8E8E8]">REGISTRATION COMPLETE</h2>
            <p className="font-bold text-[#888]">お申し込み完了しました 🎉<br/>確認メールをお送りしましたのでご確認ください。</p>
          </div>
          <div className="bg-[#0F0F0F] border-4 border-[#D97757] rounded-2xl p-8 flex flex-col items-center transform rotate-1 shadow-[4px_4px_0px_0px_#D97757]">
            <p className="text-xs font-black uppercase mb-4 tracking-widest bg-[#D97757] text-[#0F0F0F] px-3 py-1 border-2 border-[#D97757] inline-block">YOUR TICKET</p>
            <div className="bg-[#1A1A1A] p-2 border-2 border-[#D97757] rounded-xl mb-4">
              <img src={qrImageUrl} alt="QR" className="w-40 h-40"/>
            </div>
            <p className="text-sm font-bold text-[#888]">当日このQRをご提示ください</p>
          </div>
          {(event.preSurveyFields?.length > 0 || event.preSurveyUrl) && (
            <div className="bg-[#1E1E1E] border-4 border-[#F08856] rounded-2xl p-4 text-center">
              <p className="text-sm font-black text-[#F08856] mb-1">📝 事前アンケートのご協力をお願いします</p>
              <p className="text-xs text-[#888] mb-3">ご回答いただけると、より良いイベントになります</p>
              <a href={event.preSurveyFields?.length > 0 ? `/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}` : event.preSurveyUrl}
                 target="_blank" rel="noopener noreferrer"
                 className="inline-block px-6 py-2.5 bg-[#D97757] hover:bg-[#F08856] text-[#0F0F0F] font-black rounded-xl transition-colors text-sm">
                アンケートに回答する
              </a>
            </div>
          )}
          <button onClick={() => window.location.reload()}
                  className="text-[#E8E8E8] font-black border-b-4 border-[#D97757] hover:border-[#F08856] transition-colors">
            $ back
          </button>
        </div>
      </div>
    );
  }

  // ===== 通常画面 =====
  const d = new Date(event.date);
  const dateStr = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  const weekDay = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];

  const lecturersList = event.lecturers && Array.isArray(event.lecturers)
    ? event.lecturers
    : event.lecturer
      ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }]
      : [];

  const hasTimeTableData = event.schedule && Array.isArray(event.schedule);

  const rawPrice = String(event.price || "").trim();
  const priceNum = Number(rawPrice);
  const isFree = !rawPrice || rawPrice === "0" || rawPrice === "無料";
  const displayPrice = isFree ? "FREE" : isNaN(priceNum) ? rawPrice : `¥${priceNum.toLocaleString()}`;

  return (
    <div className={`min-h-screen bg-[#0F0F0F] text-[#E8E8E8] selection:bg-[#D97757] selection:text-[#0F0F0F] overflow-x-hidden ${mono.className}`}
         style={{ backgroundImage: "linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)", backgroundSize: "40px 40px" }}>

      {/* ===== 1. HERO ===== */}
      <section className="relative pt-16 pb-24 px-6">
        <div className="max-w-5xl mx-auto relative z-10">

          {/* terminal prompt label */}
          <div className="flex justify-center mb-6">
            <span className="bg-[#1A1A1A] text-[#D97757] px-4 py-2 rounded-md font-bold tracking-widest text-xs border-2 border-[#D97757] shadow-[4px_4px_0px_0px_#D97757] transform -rotate-1">
              <span className="text-[#6BCF8E]">$ </span>launch ▶ {tenant?.name || "kizuna-event"}
            </span>
          </div>

          {/* タイトル */}
          <div className="relative text-center mb-12 px-2">
            <p className="text-[#F08856] text-xs font-mono mb-3 tracking-widest">▸ EVENT / {dateStr}</p>
            <h1 className={`text-3xl md:text-5xl lg:text-6xl font-black text-[#E8E8E8] leading-tight tracking-tight break-words ${dotFont.className}`}
                style={{ textShadow: "0 0 20px rgba(217, 119, 87, 0.6), 0 0 40px rgba(217, 119, 87, 0.3)" }}>
              {event.title}
            </h1>
            <Sparkles className="absolute -top-6 right-6 text-[#F08856] w-8 h-8 animate-pulse hidden md:block" />
            <Cpu className="absolute bottom-0 left-6 text-[#D97757] w-7 h-7 animate-pulse hidden md:block" />
          </div>

          {/* メイン画像（ターミナルウィンドウ風） */}
          <div className="relative max-w-4xl mx-auto group">
            {/* drop shadow base */}
            <div className="absolute inset-0 bg-[#D97757] rounded-2xl translate-x-2 translate-y-2"></div>
            <div className="relative bg-[#1A1A1A] rounded-2xl border-4 border-[#D97757] overflow-hidden">
              {/* terminal title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#2A2A2A] bg-[#0F0F0F]">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]"></span>
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]"></span>
                <span className="w-3 h-3 rounded-full bg-[#28C940]"></span>
                <span className="ml-3 text-xs text-[#888] font-mono">event.preview ─ {tenantId}/{eventId.slice(0,8)}</span>
              </div>
              <div className="p-3 md:p-4 flex items-center justify-center min-h-[300px]">
                {event.ogpImage ? (
                  <img src={event.ogpImage} className="w-full h-auto max-h-[60vh] object-contain rounded-xl" alt="Main Visual" />
                ) : (
                  <div className="w-full h-64 md:h-96 bg-[#1E1E1E] rounded-xl flex items-center justify-center border-2 border-[#2A2A2A]">
                    <Terminal size={64} className="text-[#D97757]"/>
                  </div>
                )}
              </div>
            </div>

            {/* 日付バッジ */}
            <div className="absolute -top-5 -left-3 md:-left-6 bg-[#D97757] text-[#0F0F0F] p-5 rounded-lg border-4 border-[#0F0F0F] shadow-[4px_4px_0px_0px_#FF8E61] transform -rotate-6 z-20">
              <p className="text-[10px] font-black text-[#0F0F0F]/80 uppercase tracking-widest">date</p>
              <p className="text-2xl font-black leading-none">{dateStr}</p>
              <p className="text-xs font-bold text-center mt-1">{weekDay}</p>
            </div>
          </div>

          {/* インフォメーションバー */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <div className="bg-[#1A1A1A] px-6 py-3 rounded-md border-4 border-[#D97757] shadow-[4px_4px_0px_0px_#D97757] flex items-center gap-3 font-bold text-base transform hover:-translate-y-1 transition-transform">
              <Clock className="text-[#F08856]" size={20}/>
              <span className="font-mono">{event.startTime} - {event.endTime}</span>
            </div>
            <div className="bg-[#1A1A1A] px-6 py-3 rounded-md border-4 border-[#D97757] shadow-[4px_4px_0px_0px_#F08856] flex items-center gap-3 font-bold text-base transform hover:-translate-y-1 transition-transform">
              <MapPin className="text-[#F08856]" size={20}/>
              <span>{event.venueName}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. MAIN CONTENT ===== */}
      <main className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-12 gap-12">

        {/* 左カラム */}
        <div className="lg:col-span-8 space-y-12">

          {/* EVENT INFO */}
          <section className="bg-[#1A1A1A] p-8 md:p-10 rounded-2xl border-4 border-[#D97757] shadow-[8px_8px_0px_0px_#D97757]">
            <h2 className={`text-xl font-black bg-[#D97757] text-[#0F0F0F] inline-block px-4 py-1 rounded-md border-2 border-[#D97757] transform -rotate-1 mb-6 shadow-[2px_2px_0px_0px_#FF8E61] ${mono.className}`}>
              ▸ event.info
            </h2>
            <div className="prose prose-invert max-w-none font-medium text-[#C8C8C8] leading-relaxed whitespace-pre-wrap">
              {event.content}
            </div>
          </section>

          {/* TIMETABLE */}
          <section className="bg-[#1A1A1A] p-8 md:p-10 rounded-2xl border-4 border-[#D97757] shadow-[8px_8px_0px_0px_#F08856]">
            <h2 className={`text-xl font-black bg-[#F08856] text-[#0F0F0F] inline-block px-4 py-1 rounded-md border-2 border-[#F08856] transform rotate-1 mb-8 shadow-[2px_2px_0px_0px_#D97757] ${mono.className}`}>
              ▸ schedule
            </h2>
            {hasTimeTableData ? (
              <div className="space-y-6">
                {event.schedule.map((item: any, i: number) => (
                  <div key={i} className="flex gap-4 md:gap-6 items-start group">
                    <div className="bg-[#0F0F0F] text-[#D97757] font-black px-3 py-2 rounded-md text-sm shrink-0 mt-1 border-2 border-[#D97757] shadow-[3px_3px_0px_0px_#F08856] group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-none transition-all font-mono">
                      {item.time}
                    </div>
                    <div>
                      <h4 className="text-lg font-black mb-1 text-[#E8E8E8]">{item.title}</h4>
                      {item.speaker && (
                        <p className="text-xs font-bold text-[#888] mb-1 flex items-center gap-1">
                          <User size={12}/> {item.speaker}
                        </p>
                      )}
                      <p className="text-[#A8A8A8] text-sm leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="font-bold text-[#888] whitespace-pre-wrap">{event.timeTable || "// schedule coming soon..."}</div>
            )}
          </section>

          {/* GUESTS */}
          {lecturersList.length > 0 && (
            <section className="bg-[#1A1A1A] p-8 md:p-10 rounded-2xl border-4 border-[#D97757] shadow-[8px_8px_0px_0px_#FF8E61]">
              <h2 className={`text-xl font-black bg-[#FF8E61] text-[#0F0F0F] inline-block px-4 py-1 rounded-md border-2 border-[#FF8E61] transform -rotate-1 mb-8 shadow-[2px_2px_0px_0px_#D97757] ${mono.className}`}>
                ▸ speakers
              </h2>
              <div className="grid gap-8">
                {lecturersList.map((lec: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
                    <div className="w-32 h-32 rounded-2xl border-4 border-[#D97757] overflow-hidden shrink-0 shadow-[4px_4px_0px_0px_#D97757] bg-[#0F0F0F]">
                      {lec.image ? (
                        <img src={lec.image} className="w-full h-full object-cover"/>
                      ) : (
                        <User size={64} className="m-auto mt-8 text-[#555]"/>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-black bg-[#0F0F0F] text-[#D97757] px-2 py-0.5 rounded inline-block mb-2 whitespace-pre-line border border-[#D97757]">
                        {lec.title}
                      </p>
                      <h3 className="text-2xl font-black mb-2 text-[#E8E8E8]">{lec.name}</h3>
                      <p className="text-sm font-medium text-[#A8A8A8]">{lec.profile || lec.lecturerProfile}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 右カラム */}
        <div className="lg:col-span-4 space-y-8">

          {/* 開催形式バッジ */}
          <div className="flex justify-center mb-6 px-4">
            {event.hasOnline && event.hasOffline && (
              <div className="bg-[#D97757] text-[#0F0F0F] border-4 border-[#0F0F0F] px-6 py-3 rounded-md font-black text-sm shadow-[4px_4px_0px_0px_#FF8E61] transform rotate-1 flex items-center gap-3 transition-transform hover:scale-105">
                <Users size={20} strokeWidth={3} /> HYBRID
              </div>
            )}
            {event.hasOnline && !event.hasOffline && (
              <div className="bg-[#6BCF8E] text-[#0F0F0F] border-4 border-[#0F0F0F] px-6 py-3 rounded-md font-black text-sm shadow-[4px_4px_0px_0px_#D97757] transform -rotate-1 flex items-center gap-3 transition-transform hover:scale-105">
                <Video size={20} strokeWidth={3} /> ONLINE
              </div>
            )}
            {!event.hasOnline && event.hasOffline && (
              <div className="bg-[#F08856] text-[#0F0F0F] border-4 border-[#0F0F0F] px-6 py-3 rounded-md font-black text-sm shadow-[4px_4px_0px_0px_#D97757] transform rotate-1 flex items-center gap-3 transition-transform hover:scale-105">
                <MapPin size={20} strokeWidth={3} /> ON-SITE
              </div>
            )}
          </div>

          {/* 申し込みカード */}
          <div id="reservation-area" className="sticky top-8">
            <div className="bg-[#1A1A1A] rounded-2xl border-4 border-[#D97757] shadow-[12px_12px_0px_0px_#D97757] p-8 overflow-hidden relative">
              {/* terminal-style header */}
              <div className="absolute top-0 left-0 w-full h-3 bg-stripes-orange opacity-30"></div>

              <div className="text-center mb-8 mt-4">
                <p className={`font-bold text-[#D97757] text-xs tracking-widest mb-4 uppercase ${mono.className}`}>
                  ▸ tickets.list
                </p>

                <div className="space-y-4 mb-8">
                  {event.tickets && event.tickets.length > 0 ? (
                    event.tickets.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-4 rounded-md bg-[#0F0F0F] border-4 border-[#D97757] shadow-[4px_4px_0px_0px_#F08856] transition-transform hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                        <div className="text-left">
                          <p className={`text-[10px] font-black text-[#888] uppercase tracking-tighter ${mono.className}`}>name</p>
                          <p className="text-sm font-black text-[#E8E8E8]">{t.name}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xl font-black text-[#FF8E61] ${mono.className}`}>
                            {t.price === 0 ? "FREE" : `¥${t.price.toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 rounded-md bg-[#D97757] text-[#0F0F0F] border-4 border-[#0F0F0F] shadow-[4px_4px_0px_0px_#FF8E61] flex justify-between items-center transform -rotate-1">
                      <span className="text-sm font-black">参加費</span>
                      <span className={`text-2xl font-black ${mono.className}`}>{displayPrice}</span>
                    </div>
                  )}
                </div>

                {event.capacity && (
                  <p className="text-xs font-bold flex items-center justify-center gap-1 text-[#888]">
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

          {/* MAP */}
          <div className="bg-[#1A1A1A] rounded-2xl border-4 border-[#D97757] shadow-[8px_8px_0px_0px_#F08856] p-5">
            <p className={`text-xs font-bold text-[#D97757] tracking-widest mb-3 ${mono.className}`}>▸ map.location</p>
            <div className="rounded-md border-4 border-[#D97757] overflow-hidden h-48 mb-4 grayscale hover:grayscale-0 transition-all">
              {event.venueAddress && (
                <iframe
                  width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}>
                </iframe>
              )}
            </div>
            <div className="space-y-3 mb-4">
              <p className="font-black text-center text-lg text-[#E8E8E8]">{event.venueName}</p>
              <p className="text-sm font-bold text-[#A8A8A8] text-center">{event.venueAddress}</p>
            </div>
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className="block text-center bg-[#D97757] text-[#0F0F0F] font-black py-3 rounded-md hover:bg-[#F08856] transition-all shadow-[4px_4px_0px_0px_#FF8E61] active:shadow-none active:translate-x-1 active:translate-y-1"
            >
              OPEN IN MAPS <ExternalLink size={14} className="inline ml-1"/>
            </a>
          </div>

          {/* お問い合わせ */}
          <div className="bg-[#1A1A1A] rounded-2xl border-4 border-[#D97757] shadow-[8px_8px_0px_0px_#FF8E61] p-8 space-y-6 transform -rotate-1">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-[#6BCF8E] rounded-full animate-pulse"></div>
              <h3 className={`font-black text-[#D97757] text-base uppercase ${mono.className}`}>$ contact</h3>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0F0F0F] p-3 rounded-md border-2 border-[#2A2A2A]">
                <p className={`text-[10px] font-black text-[#555] uppercase ${mono.className}`}>staff</p>
                <p className="font-black text-[#E8E8E8]">{event.contactName || tenant?.name || "運営チーム"}</p>
              </div>

              <div className="flex flex-col gap-3">
                {event.contactEmail && (
                  <a href={`mailto:${event.contactEmail}`}
                     className="flex items-center gap-3 p-4 bg-[#D97757] border-4 border-[#0F0F0F] rounded-md text-xs font-black text-[#0F0F0F] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#FF8E61]">
                    <Mail size={18} /> <span className="truncate">{event.contactEmail}</span>
                  </a>
                )}
                {event.contactPhone && (
                  <a href={`tel:${event.contactPhone}`}
                     className="flex items-center gap-3 p-4 bg-[#F08856] border-4 border-[#0F0F0F] rounded-md text-xs font-black text-[#0F0F0F] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all shadow-[4px_4px_0px_0px_#D97757]">
                    <Phone size={18} /> {event.contactPhone}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* シェアボタン */}
          <div className="flex justify-center gap-4">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${shareUrl}`}
               target="_blank" rel="noopener noreferrer"
               className="w-14 h-14 bg-[#1A1A1A] border-4 border-[#D97757] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#D97757] hover:translate-y-1 hover:shadow-none transition-all text-[#E8E8E8]">
              <Twitter size={22} fill="currentColor"/>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
               target="_blank" rel="noopener noreferrer"
               className="w-14 h-14 bg-[#1A1A1A] border-4 border-[#D97757] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#F08856] hover:translate-y-1 hover:shadow-none transition-all text-[#F08856]">
              <Facebook size={22} fill="currentColor"/>
            </a>
            <button onClick={handleCopyLink}
                    className="w-14 h-14 bg-[#1A1A1A] border-4 border-[#D97757] rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#FF8E61] hover:translate-y-1 hover:shadow-none transition-all text-[#FF8E61]">
              {copied ? <Check size={22}/> : <LinkIcon size={22}/>}
            </button>
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#0A0A0A] text-[#E8E8E8] py-20 border-t-8 border-[#D97757]">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-12">

          <div>
            {tenant?.logoUrl && (
              <img src={tenant.logoUrl} className="h-10 mx-auto mb-6 brightness-0 invert opacity-80" alt="logo"/>
            )}
            <h2 className="text-2xl font-black mb-2 tracking-tight text-[#E8E8E8]">{tenant?.name}</h2>
            <p className={`text-xs text-[#555] tracking-widest ${mono.className}`}>// powered by hanahiro</p>
          </div>

          <div className="flex justify-center">
            <Link
              href={`/${tenantId}/legal`}
              className="bg-[#D97757] text-[#0F0F0F] px-8 py-3 rounded-md border-4 border-[#0F0F0F] font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-[6px_6px_0px_0px_#F08856]"
            >
              特定商取引法に基づく表記
            </Link>
          </div>

          <div className="space-y-8 pt-8 border-t border-[#2A2A2A]">
            <p className={`text-[10px] font-black text-[#555] uppercase tracking-[0.4em] ${mono.className}`}>
              © {new Date().getFullYear()} {tenant?.name || "kizuna-taro Event Manager"}
            </p>

            <div className={`inline-block bg-[#1A1A1A] text-[#D97757] px-6 py-2 border-4 border-[#D97757] rounded-md font-black text-[10px] uppercase tracking-wider transform rotate-2 shadow-[4px_4px_0px_0px_#F08856] ${mono.className}`}>
              powered by 絆太郎 Event Manager
            </div>
          </div>
        </div>
      </footer>

      {/* ストライプ背景 */}
      <style jsx>{`
        .bg-stripes-orange {
          background-image: linear-gradient(45deg, #D97757 25%, transparent 25%, transparent 50%, #D97757 50%, #D97757 75%, transparent 75%, transparent);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
