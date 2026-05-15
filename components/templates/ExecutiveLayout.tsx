"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import { Cormorant_Garamond, Noto_Serif_JP } from "next/font/google";
import {
  Clock, MapPin, User, Calendar,
  Check, ExternalLink, ChevronRight,
  Mail, Phone, Users, Video,
  Link as LinkIcon, Facebook, Twitter,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

const serifEn = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const serifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

// Color tokens
const GOLD = "#C9A961";
const GOLD_LIGHT = "#DCC07E";
const GOLD_DEEP = "#8B7333";
const INK = "#0A0A0A";
const INK_CARD = "#141414";
const INK_DEEP = "#050505";
const TEXT = "#EAEAEA";
const TEXT_DIM = "#9A9A9A";
const TEXT_FAINT = "#5A5A5A";
const LINE = "#2A2A2A";

export default function ExecutiveLayout({ event, tenant, eventId, tenantId }: Props) {
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
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${reservationId}&bgcolor=141414&color=C9A961`;
    return (
      <div className={`min-h-screen bg-[${INK}] text-[${TEXT}] flex items-center justify-center p-6 ${serifJp.className}`}>
        <div className="max-w-xl w-full text-center space-y-10 bg-[#141414] p-12 md:p-14 border border-[#C9A961]/40">
          {/* Gold corner ornaments */}
          <div className="relative">
            <span className="absolute -top-12 -left-12 w-8 h-8 border-t border-l border-[#C9A961]"></span>
            <span className="absolute -top-12 -right-12 w-8 h-8 border-t border-r border-[#C9A961]"></span>
            <p className={`text-[10px] tracking-[0.5em] text-[#C9A961] uppercase mb-6 ${serifEn.className}`}>
              ─ Reservation Confirmed ─
            </p>
            <h2 className={`text-3xl md:text-4xl font-light mb-4 text-[#EAEAEA] ${serifJp.className}`}
                style={{ letterSpacing: "0.05em" }}>
              お申込みありがとうございます
            </h2>
            <p className="text-sm text-[#9A9A9A] leading-relaxed">
              ご登録のメールアドレスへ確認のご連絡を<br/>差し上げております。
            </p>
          </div>

          {/* QR with gold frame */}
          <div className="relative inline-block">
            <span className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-[#C9A961]"></span>
            <span className="absolute -top-2 -right-2 w-4 h-4 border-t border-r border-[#C9A961]"></span>
            <span className="absolute -bottom-2 -left-2 w-4 h-4 border-b border-l border-[#C9A961]"></span>
            <span className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-[#C9A961]"></span>
            <div className="bg-[#141414] p-6 border border-[#C9A961]/30">
              <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase mb-4 ${serifEn.className}`}>
                Your Invitation
              </p>
              <img src={qrImageUrl} alt="QR" className="w-44 h-44 mx-auto"/>
              <p className={`mt-4 text-xs text-[#9A9A9A] tracking-widest ${serifEn.className}`}>
                ID&nbsp;:&nbsp;{reservationId.slice(0, 12)}
              </p>
            </div>
          </div>

          <p className="text-sm text-[#9A9A9A]">当日はこちらのコードをご提示ください</p>

          {(event.preSurveyFields?.length > 0 || event.preSurveyUrl) && (
            <div className="border border-[#C9A961]/30 p-6">
              <p className={`text-sm font-medium text-[#C9A961] mb-2 ${serifJp.className}`}>事前アンケートのお願い</p>
              <p className="text-xs text-[#9A9A9A] mb-4">より良い学びの場のため、ご回答をお願い致します</p>
              <a href={event.preSurveyFields?.length > 0 ? `/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}` : event.preSurveyUrl}
                 target="_blank" rel="noopener noreferrer"
                 className={`inline-flex items-center gap-2 px-8 py-3 bg-[#C9A961] text-[#0A0A0A] text-xs tracking-[0.3em] uppercase hover:bg-[#DCC07E] transition-colors ${serifEn.className}`}>
                Proceed to Survey <ChevronRight size={14}/>
              </a>
            </div>
          )}

          <button onClick={() => window.location.reload()}
                  className={`text-[#C9A961] text-xs tracking-[0.4em] uppercase border-b border-[#C9A961] pb-1 hover:text-[#DCC07E] hover:border-[#DCC07E] transition-colors ${serifEn.className}`}>
            return
          </button>
        </div>
      </div>
    );
  }

  // ===== 通常画面 =====
  const d = new Date(event.date);
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const monthStr = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()];
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
  const displayPrice = isFree ? "Complimentary" : isNaN(priceNum) ? rawPrice : `¥${priceNum.toLocaleString()}`;

  return (
    <div className={`min-h-screen bg-[${INK}] text-[${TEXT}] selection:bg-[#C9A961] selection:text-[#0A0A0A] overflow-x-hidden ${serifJp.className}`}>

      {/* ===== 1. HERO ===== */}
      <section className="relative pt-20 md:pt-28 pb-20 px-6">
        <div className="max-w-5xl mx-auto relative z-10">

          {/* Top label with gold pinstripes */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className="h-px w-16 bg-[#C9A961]"></span>
            <span className={`text-[10px] tracking-[0.6em] text-[#C9A961] uppercase ${serifEn.className}`}>
              Executive Seminar · {monthStr} {d.getFullYear()}
            </span>
            <span className="h-px w-16 bg-[#C9A961]"></span>
          </div>

          {/* Title */}
          <div className="text-center mb-14 px-2">
            <h1 className={`text-3xl md:text-5xl lg:text-6xl font-medium text-[#EAEAEA] leading-tight break-words ${serifJp.className}`}
                style={{ letterSpacing: "0.04em", lineHeight: 1.4 }}>
              {event.title}
            </h1>
            <div className="mt-8 flex justify-center">
              <span className="h-px w-24 bg-[#C9A961]"></span>
            </div>
            <p className={`mt-8 text-base md:text-lg text-[#C9A961] italic tracking-wide ${serifEn.className}`}>
              Presented by {tenant?.name || "HANAHIRO"}
            </p>
          </div>

          {/* Main image with gold frame */}
          {event.ogpImage && (
            <div className="relative max-w-3xl mx-auto mb-16">
              <span className="absolute -top-2 -left-2 w-6 h-6 border-t border-l border-[#C9A961]"></span>
              <span className="absolute -top-2 -right-2 w-6 h-6 border-t border-r border-[#C9A961]"></span>
              <span className="absolute -bottom-2 -left-2 w-6 h-6 border-b border-l border-[#C9A961]"></span>
              <span className="absolute -bottom-2 -right-2 w-6 h-6 border-b border-r border-[#C9A961]"></span>
              <div className="relative bg-[#141414] border border-[#C9A961]/40 p-2">
                <img src={event.ogpImage} className="w-full h-auto max-h-[60vh] object-contain" alt="Main Visual" />
              </div>
            </div>
          )}

          {/* Information bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#C9A961]/30 border border-[#C9A961]/30">
            <div className="bg-[#0A0A0A] px-6 py-6 text-center">
              <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase mb-2 ${serifEn.className}`}>Date</p>
              <p className={`text-lg ${serifEn.className} text-[#EAEAEA] tracking-wide`}>{dateStr}</p>
              <p className={`text-xs text-[#9A9A9A] mt-1 ${serifEn.className} tracking-widest`}>{weekDay}</p>
            </div>
            <div className="bg-[#0A0A0A] px-6 py-6 text-center">
              <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase mb-2 ${serifEn.className}`}>Time</p>
              <p className={`text-lg ${serifEn.className} text-[#EAEAEA] tracking-wide`}>{event.startTime} – {event.endTime}</p>
            </div>
            <div className="bg-[#0A0A0A] px-6 py-6 text-center">
              <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase mb-2 ${serifEn.className}`}>Venue</p>
              <p className="text-base text-[#EAEAEA] tracking-wide">{event.venueName}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 2. MAIN CONTENT ===== */}
      <main className="max-w-6xl mx-auto px-6 pb-24 grid lg:grid-cols-12 gap-12">

        {/* 左カラム */}
        <div className="lg:col-span-8 space-y-16">

          {/* EVENT INFO */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <p className={`text-[11px] tracking-[0.5em] text-[#C9A961] uppercase ${serifEn.className}`}>
                ─ Overview
              </p>
              <span className="h-px flex-1 bg-[#C9A961]/40"></span>
            </div>
            <div className="text-[#C8C8C8] leading-loose whitespace-pre-wrap text-base"
                 style={{ letterSpacing: "0.04em" }}>
              {event.content}
            </div>
          </section>

          {/* SCHEDULE */}
          <section>
            <div className="flex items-center gap-4 mb-10">
              <p className={`text-[11px] tracking-[0.5em] text-[#C9A961] uppercase ${serifEn.className}`}>
                ─ Programme
              </p>
              <span className="h-px flex-1 bg-[#C9A961]/40"></span>
            </div>
            {hasTimeTableData ? (
              <div className="space-y-8">
                {event.schedule.map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-[80px_1fr] gap-6 items-start group">
                    <div className="text-right">
                      <p className={`text-base text-[#C9A961] tracking-wide ${serifEn.className}`}>{item.time}</p>
                      <span className="inline-block w-2 h-2 bg-[#C9A961] rounded-full mt-2"></span>
                    </div>
                    <div className="border-l border-[#C9A961]/30 pl-6 pb-2">
                      <h4 className={`text-xl font-medium mb-2 text-[#EAEAEA] ${serifJp.className}`}>
                        {item.title}
                      </h4>
                      {item.speaker && (
                        <p className={`text-xs text-[#C9A961] mb-2 italic ${serifEn.className}`}>
                          — {item.speaker}
                        </p>
                      )}
                      <p className="text-sm text-[#9A9A9A] leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[#9A9A9A] italic whitespace-pre-wrap">{event.timeTable || "Programme details to follow."}</div>
            )}
          </section>

          {/* SPEAKERS */}
          {lecturersList.length > 0 && (
            <section>
              <div className="flex items-center gap-4 mb-10">
                <p className={`text-[11px] tracking-[0.5em] text-[#C9A961] uppercase ${serifEn.className}`}>
                  ─ Speakers
                </p>
                <span className="h-px flex-1 bg-[#C9A961]/40"></span>
              </div>
              <div className="space-y-10">
                {lecturersList.map((lec: any, index: number) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-8 items-center sm:items-start text-center sm:text-left">
                    <div className="relative shrink-0">
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-[#C9A961]"></span>
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t border-r border-[#C9A961]"></span>
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b border-l border-[#C9A961]"></span>
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-[#C9A961]"></span>
                      <div className="w-32 h-32 border border-[#C9A961]/40 overflow-hidden bg-[#141414]">
                        {lec.image ? (
                          <img src={lec.image} className="w-full h-full object-cover" />
                        ) : (
                          <User size={56} className="m-auto mt-9 text-[#5A5A5A]"/>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      {lec.title && (
                        <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase mb-2 whitespace-pre-line ${serifEn.className}`}>
                          {lec.title}
                        </p>
                      )}
                      <h3 className={`text-2xl font-medium mb-3 text-[#EAEAEA] ${serifJp.className}`}
                          style={{ letterSpacing: "0.05em" }}>
                        {lec.name}
                      </h3>
                      <p className="text-sm text-[#9A9A9A] leading-relaxed">{lec.profile || lec.lecturerProfile}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* 右カラム */}
        <div className="lg:col-span-4 space-y-10">

          {/* Format badge */}
          {(event.hasOnline || event.hasOffline) && (
            <div className="flex justify-center">
              {event.hasOnline && event.hasOffline && (
                <span className={`inline-flex items-center gap-2 border border-[#C9A961] text-[#C9A961] px-6 py-2 text-xs tracking-[0.3em] uppercase ${serifEn.className}`}>
                  <Users size={14}/> Hybrid
                </span>
              )}
              {event.hasOnline && !event.hasOffline && (
                <span className={`inline-flex items-center gap-2 border border-[#C9A961] text-[#C9A961] px-6 py-2 text-xs tracking-[0.3em] uppercase ${serifEn.className}`}>
                  <Video size={14}/> Online
                </span>
              )}
              {!event.hasOnline && event.hasOffline && (
                <span className={`inline-flex items-center gap-2 border border-[#C9A961] text-[#C9A961] px-6 py-2 text-xs tracking-[0.3em] uppercase ${serifEn.className}`}>
                  <MapPin size={14}/> On-site
                </span>
              )}
            </div>
          )}

          {/* RESERVATION CARD */}
          <div id="reservation-area" className="sticky top-8">
            <div className="relative bg-[#141414] border border-[#C9A961]/40 p-8">
              <span className="absolute -top-2 -left-2 w-5 h-5 border-t border-l border-[#C9A961]"></span>
              <span className="absolute -top-2 -right-2 w-5 h-5 border-t border-r border-[#C9A961]"></span>
              <span className="absolute -bottom-2 -left-2 w-5 h-5 border-b border-l border-[#C9A961]"></span>
              <span className="absolute -bottom-2 -right-2 w-5 h-5 border-b border-r border-[#C9A961]"></span>

              <div className="text-center mb-8">
                <p className={`text-[10px] tracking-[0.5em] text-[#C9A961] uppercase mb-4 ${serifEn.className}`}>
                  ─ Reservation ─
                </p>

                <div className="space-y-4 mb-6">
                  {event.tickets && event.tickets.length > 0 ? (
                    event.tickets.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-3 border-b border-[#C9A961]/20 last:border-0">
                        <p className="text-sm text-[#EAEAEA] tracking-wide">{t.name}</p>
                        <p className={`text-lg text-[#C9A961] ${serifEn.className}`}>
                          {t.price === 0 ? "Complimentary" : `¥${t.price.toLocaleString()}`}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className={`text-[10px] tracking-[0.3em] text-[#9A9A9A] uppercase mb-2 ${serifEn.className}`}>Participation Fee</p>
                      <p className={`text-3xl text-[#C9A961] ${serifEn.className}`} style={{ letterSpacing: "0.05em" }}>
                        {displayPrice}
                      </p>
                    </div>
                  )}
                </div>

                {event.capacity && (
                  <p className={`text-[10px] tracking-[0.3em] text-[#9A9A9A] uppercase ${serifEn.className}`}>
                    Limited to {Number(event.capacity).toLocaleString()} guests
                  </p>
                )}
              </div>

              <div className="mb-2">
                <ReservationForm
                  tenantId={tenantId} eventId={eventId} event={event}
                  tenantData={tenant || undefined} onSuccess={handleFormSuccess}
                />
              </div>
            </div>
          </div>

          {/* MAP */}
          <div className="bg-[#141414] border border-[#C9A961]/40 p-5">
            <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase mb-3 text-center ${serifEn.className}`}>
              ─ Access ─
            </p>
            <div className="border border-[#C9A961]/30 overflow-hidden h-44 mb-4 grayscale opacity-90 hover:opacity-100 hover:grayscale-0 transition-all">
              {event.venueAddress && (
                <iframe
                  width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}>
                </iframe>
              )}
            </div>
            <div className="text-center space-y-2 mb-5">
              <p className="text-base text-[#EAEAEA] tracking-wide">{event.venueName}</p>
              <p className="text-xs text-[#9A9A9A]">{event.venueAddress}</p>
            </div>
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className={`block text-center border border-[#C9A961] text-[#C9A961] py-3 text-xs tracking-[0.3em] uppercase hover:bg-[#C9A961] hover:text-[#0A0A0A] transition-colors ${serifEn.className}`}
            >
              Open in Maps <ExternalLink size={12} className="inline ml-1"/>
            </a>
          </div>

          {/* CONTACT */}
          <div className="bg-[#141414] border border-[#C9A961]/40 p-7 space-y-5">
            <p className={`text-[10px] tracking-[0.4em] text-[#C9A961] uppercase text-center ${serifEn.className}`}>
              ─ Contact ─
            </p>
            <div className="space-y-3">
              <div className="text-center">
                <p className={`text-[10px] tracking-[0.3em] text-[#5A5A5A] uppercase mb-1 ${serifEn.className}`}>担当</p>
                <p className="text-sm text-[#EAEAEA] tracking-wide">{event.contactName || tenant?.name || "運営事務局"}</p>
              </div>
              {event.contactEmail && (
                <a href={`mailto:${event.contactEmail}`}
                   className="flex items-center justify-center gap-3 py-3 border border-[#C9A961]/40 text-xs text-[#EAEAEA] hover:border-[#C9A961] hover:text-[#C9A961] transition-colors">
                  <Mail size={14}/> <span className="truncate">{event.contactEmail}</span>
                </a>
              )}
              {event.contactPhone && (
                <a href={`tel:${event.contactPhone}`}
                   className="flex items-center justify-center gap-3 py-3 border border-[#C9A961]/40 text-xs text-[#EAEAEA] hover:border-[#C9A961] hover:text-[#C9A961] transition-colors">
                  <Phone size={14}/> {event.contactPhone}
                </a>
              )}
            </div>
          </div>

          {/* SHARE */}
          <div className="flex justify-center gap-6">
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${shareUrl}`}
               target="_blank" rel="noopener noreferrer"
               className="w-11 h-11 border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A0A0A] transition-all">
              <Twitter size={18}/>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
               target="_blank" rel="noopener noreferrer"
               className="w-11 h-11 border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A0A0A] transition-all">
              <Facebook size={18}/>
            </a>
            <button onClick={handleCopyLink}
                    className="w-11 h-11 border border-[#C9A961]/40 flex items-center justify-center text-[#C9A961] hover:bg-[#C9A961] hover:text-[#0A0A0A] transition-all">
              {copied ? <Check size={18}/> : <LinkIcon size={18}/>}
            </button>
          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#050505] py-20 border-t border-[#C9A961]/30">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-10">

          {/* Pinstripe divider */}
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-[#C9A961]"></span>
            <span className={`text-[10px] tracking-[0.5em] text-[#C9A961] uppercase ${serifEn.className}`}>
              ─ Organiser ─
            </span>
            <span className="h-px w-12 bg-[#C9A961]"></span>
          </div>

          {tenant?.logoUrl && (
            <img src={tenant.logoUrl} className="h-8 mx-auto opacity-60 brightness-0 invert" alt="logo"/>
          )}
          <h2 className={`text-2xl font-medium text-[#EAEAEA] tracking-wide ${serifJp.className}`}>
            {tenant?.name}
          </h2>

          <div className="flex justify-center">
            <Link
              href={`/${tenantId}/legal`}
              className={`border border-[#C9A961] text-[#C9A961] px-8 py-3 text-[10px] tracking-[0.4em] uppercase hover:bg-[#C9A961] hover:text-[#0A0A0A] transition-colors ${serifEn.className}`}
            >
              特定商取引法に基づく表記
            </Link>
          </div>

          <div className="space-y-4 pt-10 border-t border-[#2A2A2A]">
            <p className={`text-[10px] tracking-[0.5em] text-[#5A5A5A] uppercase ${serifEn.className}`}>
              © {new Date().getFullYear()} {tenant?.name || "Kizuna-Taro Event Manager"}
            </p>
            <p className={`text-[10px] tracking-[0.5em] text-[#5A5A5A] uppercase ${serifEn.className}`}>
              Powered by 絆太郎 Event Manager
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
