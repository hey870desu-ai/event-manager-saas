"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import { Playfair_Display, Noto_Serif_JP, Inter, Noto_Sans_JP } from "next/font/google";
import {
  Clock, MapPin, User, Calendar,
  Check, ExternalLink, ArrowRight, ArrowUpRight,
  Mail, Phone, Users, Video,
  Link as LinkIcon, Facebook, Twitter,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

const serifEn = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const serifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

const sansEn = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const sansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

// Editorial palette
const BG = "#FAFAF6";       // warm white
const TEXT = "#1A1A1A";     // charcoal
const DIM = "#6B6B6B";
const FAINT = "#9C9A93";
const LINE = "#D8D6D0";
const ACCENT = "#B83B3B";   // editorial red (HBR-style)
const NAVY = "#1A2942";     // secondary navy

export default function EditorialLayout({ event, tenant, eventId, tenantId }: Props) {
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

  const d = new Date(event.date);
  const yearStr = d.getFullYear();
  const monthName = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
                     "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"][d.getMonth()];
  const monthShort = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][d.getMonth()];
  const dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const weekDay = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()];
  // 号番風（year × 100 + month）
  const issueNo = String(d.getFullYear() % 100 * 100 + d.getMonth() + 1).padStart(3, "0");

  // ===== 完了画面 =====
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${reservationId}`;
    return (
      <div className={`min-h-screen bg-[${BG}] text-[${TEXT}] flex items-center justify-center p-6 ${sansJp.className}`}
           style={{ backgroundColor: BG, color: TEXT }}>
        <div className="max-w-xl w-full text-center space-y-10 bg-white p-12 md:p-14 border border-[#D8D6D0]">
          <div>
            <p className={`text-[10px] tracking-[0.5em] mb-3 ${sansEn.className}`} style={{ color: ACCENT }}>
              ─ SUBSCRIPTION CONFIRMED ─
            </p>
            <h2 className={`text-3xl md:text-4xl font-medium mb-4 ${serifJp.className}`}
                style={{ color: TEXT, letterSpacing: "0.02em" }}>
              ご予約ありがとうございます
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: DIM }}>
              確認メールをお送りしました。<br/>当日はこちらのコードをご提示ください。
            </p>
          </div>

          <div className="border border-[#D8D6D0] p-6 inline-block">
            <p className={`text-[10px] tracking-[0.4em] uppercase mb-3 ${sansEn.className}`} style={{ color: FAINT }}>
              Issue No. {issueNo} · Your Pass
            </p>
            <img src={qrImageUrl} alt="QR" className="w-44 h-44 mx-auto"/>
            <p className={`mt-3 text-[10px] tracking-widest ${sansEn.className}`} style={{ color: DIM }}>
              ID&nbsp;:&nbsp;{reservationId.slice(0, 12)}
            </p>
          </div>

          {(event.preSurveyFields?.length > 0 || event.preSurveyUrl) && (
            <div className="border-t border-b border-[#D8D6D0] py-6">
              <p className={`text-xs font-medium mb-2 ${serifJp.className}`} style={{ color: ACCENT }}>
                事前アンケートのご協力をお願いします
              </p>
              <a href={event.preSurveyFields?.length > 0 ? `/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}` : event.preSurveyUrl}
                 target="_blank" rel="noopener noreferrer"
                 className={`inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase border-b-2 pb-1 transition-colors ${sansEn.className}`}
                 style={{ color: TEXT, borderColor: ACCENT }}>
                Proceed <ArrowRight size={14}/>
              </a>
            </div>
          )}

          <button onClick={() => window.location.reload()}
                  className={`text-xs tracking-[0.4em] uppercase border-b pb-1 transition-colors ${sansEn.className}`}
                  style={{ color: DIM, borderColor: DIM }}>
            return
          </button>
        </div>
      </div>
    );
  }

  // ===== 通常画面 =====
  const lecturersList = event.lecturers && Array.isArray(event.lecturers)
    ? event.lecturers
    : event.lecturer
      ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }]
      : [];

  const hasTimeTableData = event.schedule && Array.isArray(event.schedule);
  const rawPrice = String(event.price || "").trim();
  const priceNum = Number(rawPrice);
  const isFree = !rawPrice || rawPrice === "0" || rawPrice === "無料";
  const displayPrice = isFree ? "Free of charge" : isNaN(priceNum) ? rawPrice : `¥${priceNum.toLocaleString()}`;

  return (
    <div className={`min-h-screen overflow-x-hidden ${sansJp.className}`}
         style={{ backgroundColor: BG, color: TEXT }}>

      {/* ===== 1. MASTHEAD ===== */}
      <header className="border-b border-[#D8D6D0]">
        <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-3 items-center gap-4">
          <div className={`text-[10px] tracking-[0.4em] uppercase ${sansEn.className}`} style={{ color: DIM }}>
            No.{issueNo} · {monthShort} {yearStr}
          </div>
          <div className="text-center">
            <p className={`text-base md:text-xl font-black tracking-[0.4em] uppercase ${serifEn.className}`}
               style={{ color: TEXT }}>
              {tenant?.name || "BUSINESS"}
            </p>
          </div>
          <div className={`text-[10px] tracking-[0.4em] uppercase text-right ${sansEn.className}`} style={{ color: DIM }}>
            Edition · Seminar
          </div>
        </div>
      </header>

      {/* ===== 2. HERO ===== */}
      <section className="border-b border-[#1A1A1A]">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">

          {/* Section kicker */}
          <div className="flex items-center gap-4 mb-10">
            <span className="h-px w-12" style={{ backgroundColor: ACCENT }}></span>
            <p className={`text-[10px] tracking-[0.5em] uppercase font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
              Feature · Special Event
            </p>
          </div>

          {/* Title */}
          <h1 className={`text-4xl md:text-6xl lg:text-7xl font-medium leading-tight mb-8 ${serifJp.className}`}
              style={{ color: TEXT, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
            {event.title}
          </h1>

          {/* Standfirst (subtitle line) */}
          <p className={`text-lg md:text-xl leading-relaxed max-w-3xl mb-12 ${sansJp.className}`}
             style={{ color: DIM, fontWeight: 300 }}>
            {dateStr}（{weekDay}） · {event.startTime}–{event.endTime} · {event.venueName}
          </p>

          {/* Byline */}
          <div className="flex items-center gap-3 text-xs">
            <span className={`tracking-[0.3em] uppercase font-medium ${sansEn.className}`} style={{ color: TEXT }}>
              Hosted by
            </span>
            <span className="h-px w-6" style={{ backgroundColor: TEXT }}></span>
            <span className={`tracking-wide ${sansJp.className}`} style={{ color: TEXT }}>
              {tenant?.name}
            </span>
          </div>
        </div>

        {/* Main image (full width) */}
        {event.ogpImage && (
          <div className="border-t border-[#D8D6D0]">
            <div className="max-w-6xl mx-auto px-6 py-12">
              <img src={event.ogpImage} className="w-full max-h-[70vh] object-cover" alt="Main Visual" />
              <p className={`mt-3 text-[10px] tracking-widest uppercase ${sansEn.className}`} style={{ color: FAINT }}>
                — Image · {event.title}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ===== 3. MAIN CONTENT ===== */}
      <main className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-12 gap-12">

        {/* 左カラム */}
        <div className="lg:col-span-8 space-y-20">

          {/* Article body */}
          <article>
            <div className="mb-8 flex items-center gap-4">
              <span className={`text-[10px] tracking-[0.4em] uppercase font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
                01 — Overview
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: LINE }}></span>
            </div>

            {/* Drop cap on first paragraph (simulated via styling) */}
            <div className={`text-base leading-loose whitespace-pre-wrap first-letter:text-7xl first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:leading-none first-letter:mt-1 ${serifJp.className}`}
                 style={{ color: TEXT, letterSpacing: "0.02em", fontWeight: 400 }}>
              {event.content}
            </div>
          </article>

          {/* Programme */}
          <section>
            <div className="mb-10 flex items-center gap-4">
              <span className={`text-[10px] tracking-[0.4em] uppercase font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
                02 — Programme
              </span>
              <span className="h-px flex-1" style={{ backgroundColor: LINE }}></span>
            </div>
            {hasTimeTableData ? (
              <div className="space-y-10">
                {event.schedule.map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-[80px_1fr] gap-8 items-start border-b border-[#E8E5DE] pb-8 last:border-0">
                    <div className="text-right">
                      <p className={`text-2xl font-medium ${serifEn.className}`} style={{ color: NAVY, letterSpacing: "0.02em" }}>
                        {item.time}
                      </p>
                      <p className={`text-[10px] tracking-[0.3em] uppercase mt-1 ${sansEn.className}`} style={{ color: FAINT }}>
                        Session {String(i + 1).padStart(2, "0")}
                      </p>
                    </div>
                    <div>
                      <h4 className={`text-xl font-semibold mb-2 ${serifJp.className}`}
                          style={{ color: TEXT, letterSpacing: "0.02em", lineHeight: 1.4 }}>
                        {item.title}
                      </h4>
                      {item.speaker && (
                        <p className={`text-xs mb-3 italic ${serifEn.className}`} style={{ color: ACCENT }}>
                          — {item.speaker}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed" style={{ color: DIM }}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`italic whitespace-pre-wrap ${serifJp.className}`} style={{ color: DIM }}>
                {event.timeTable || "Programme details to be announced."}
              </div>
            )}
          </section>

          {/* Speakers */}
          {lecturersList.length > 0 && (
            <section>
              <div className="mb-10 flex items-center gap-4">
                <span className={`text-[10px] tracking-[0.4em] uppercase font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
                  03 — Contributors
                </span>
                <span className="h-px flex-1" style={{ backgroundColor: LINE }}></span>
              </div>
              <div className="space-y-12">
                {lecturersList.map((lec: any, index: number) => (
                  <div key={index} className="grid sm:grid-cols-[160px_1fr] gap-8 items-start">
                    <div>
                      <div className="aspect-[3/4] bg-[#EEEBE3] overflow-hidden">
                        {lec.image ? (
                          <img src={lec.image} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                        ) : (
                          <User size={56} className="m-auto mt-20" style={{ color: FAINT }}/>
                        )}
                      </div>
                      <p className={`mt-3 text-[10px] tracking-[0.3em] uppercase ${sansEn.className}`} style={{ color: FAINT }}>
                        Contributor No.{String(index + 1).padStart(2, "0")}
                      </p>
                    </div>
                    <div>
                      {lec.title && (
                        <p className={`text-[10px] tracking-[0.4em] uppercase mb-3 whitespace-pre-line ${sansEn.className}`}
                           style={{ color: ACCENT }}>
                          {lec.title}
                        </p>
                      )}
                      <h3 className={`text-3xl font-semibold mb-4 ${serifJp.className}`}
                          style={{ color: TEXT, letterSpacing: "0.02em" }}>
                        {lec.name}
                      </h3>
                      <p className={`text-sm leading-loose ${serifJp.className}`} style={{ color: DIM }}>
                        {lec.profile || lec.lecturerProfile}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ===== 4. SIDEBAR ===== */}
        <aside className="lg:col-span-4 space-y-8">

          {/* Format badge */}
          {(event.hasOnline || event.hasOffline) && (
            <div className="flex gap-2">
              {event.hasOnline && event.hasOffline && (
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] tracking-[0.3em] uppercase font-medium ${sansEn.className}`}
                      style={{ backgroundColor: TEXT, color: BG }}>
                  <Users size={12}/> Hybrid
                </span>
              )}
              {event.hasOnline && !event.hasOffline && (
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] tracking-[0.3em] uppercase font-medium ${sansEn.className}`}
                      style={{ backgroundColor: TEXT, color: BG }}>
                  <Video size={12}/> Online
                </span>
              )}
              {!event.hasOnline && event.hasOffline && (
                <span className={`inline-flex items-center gap-2 px-3 py-1 text-[10px] tracking-[0.3em] uppercase font-medium ${sansEn.className}`}
                      style={{ backgroundColor: TEXT, color: BG }}>
                  <MapPin size={12}/> In-person
                </span>
              )}
            </div>
          )}

          {/* Reservation card */}
          <div id="reservation-area" className="sticky top-8">
            <div className="bg-white border border-[#1A1A1A] p-7">
              <p className={`text-[10px] tracking-[0.5em] uppercase mb-2 ${sansEn.className}`} style={{ color: ACCENT }}>
                ─ Reservation
              </p>
              <h3 className={`text-2xl font-medium mb-6 ${serifJp.className}`} style={{ color: TEXT }}>
                参加お申込み
              </h3>

              <div className="space-y-3 mb-6 border-t border-b border-[#D8D6D0] py-4">
                {event.tickets && event.tickets.length > 0 ? (
                  event.tickets.map((t: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span style={{ color: TEXT }}>{t.name}</span>
                      <span className={`font-semibold ${serifEn.className}`} style={{ color: NAVY }}>
                        {t.price === 0 ? "Free" : `¥${t.price.toLocaleString()}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] tracking-[0.3em] uppercase ${sansEn.className}`} style={{ color: DIM }}>
                      Fee
                    </span>
                    <span className={`text-3xl font-medium ${serifEn.className}`} style={{ color: NAVY }}>
                      {displayPrice}
                    </span>
                  </div>
                )}
              </div>

              {event.capacity && (
                <p className={`text-[10px] tracking-[0.3em] uppercase mb-5 ${sansEn.className}`} style={{ color: FAINT }}>
                  Capacity · {Number(event.capacity).toLocaleString()} seats
                </p>
              )}

              <ReservationForm
                tenantId={tenantId} eventId={eventId} event={event}
                tenantData={tenant || undefined} onSuccess={handleFormSuccess}
              />
            </div>
          </div>

          {/* Venue */}
          <div className="bg-white border border-[#D8D6D0] p-5">
            <p className={`text-[10px] tracking-[0.5em] uppercase mb-3 ${sansEn.className}`} style={{ color: ACCENT }}>
              ─ Venue
            </p>
            <div className="aspect-[4/3] overflow-hidden border border-[#D8D6D0] mb-4 grayscale hover:grayscale-0 transition-all">
              {event.venueAddress && (
                <iframe
                  width="100%" height="100%" style={{ border: 0 }} loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}>
                </iframe>
              )}
            </div>
            <p className={`text-base font-medium mb-1 ${serifJp.className}`} style={{ color: TEXT }}>
              {event.venueName}
            </p>
            <p className="text-xs leading-relaxed mb-4" style={{ color: DIM }}>{event.venueAddress}</p>
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(event.venueAddress)}`}
              target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase border-b pb-0.5 transition-colors ${sansEn.className}`}
              style={{ color: TEXT, borderColor: ACCENT }}>
              Open in Maps <ArrowUpRight size={12}/>
            </a>
          </div>

          {/* Contact */}
          <div className="bg-white border border-[#D8D6D0] p-5">
            <p className={`text-[10px] tracking-[0.5em] uppercase mb-3 ${sansEn.className}`} style={{ color: ACCENT }}>
              ─ Inquiries
            </p>
            <p className={`text-sm mb-4 ${serifJp.className}`} style={{ color: TEXT }}>
              {event.contactName || tenant?.name || "運営事務局"}
            </p>
            <div className="space-y-2">
              {event.contactEmail && (
                <a href={`mailto:${event.contactEmail}`}
                   className="flex items-center gap-2 text-xs hover:underline" style={{ color: NAVY }}>
                  <Mail size={12}/> <span className="truncate">{event.contactEmail}</span>
                </a>
              )}
              {event.contactPhone && (
                <a href={`tel:${event.contactPhone}`}
                   className="flex items-center gap-2 text-xs hover:underline" style={{ color: NAVY }}>
                  <Phone size={12}/> {event.contactPhone}
                </a>
              )}
            </div>
          </div>

          {/* Share */}
          <div className="flex items-center gap-4">
            <p className={`text-[10px] tracking-[0.4em] uppercase ${sansEn.className}`} style={{ color: FAINT }}>
              Share
            </p>
            <span className="h-px flex-1" style={{ backgroundColor: LINE }}></span>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${shareUrl}`}
               target="_blank" rel="noopener noreferrer"
               className="hover:opacity-60 transition-opacity" style={{ color: TEXT }}>
              <Twitter size={16}/>
            </a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
               target="_blank" rel="noopener noreferrer"
               className="hover:opacity-60 transition-opacity" style={{ color: TEXT }}>
              <Facebook size={16}/>
            </a>
            <button onClick={handleCopyLink}
                    className="hover:opacity-60 transition-opacity" style={{ color: TEXT }}>
              {copied ? <Check size={16}/> : <LinkIcon size={16}/>}
            </button>
          </div>
        </aside>
      </main>

      {/* ===== 5. COLOPHON / FOOTER ===== */}
      <footer className="border-t-2 mt-12" style={{ borderColor: TEXT }}>
        <div className="max-w-6xl mx-auto px-6 py-16">

          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <p className={`text-[10px] tracking-[0.5em] uppercase mb-3 font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
                ─ Publisher
              </p>
              <h3 className={`text-xl font-medium mb-2 ${serifJp.className}`} style={{ color: TEXT }}>
                {tenant?.name}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: DIM }}>
                {tenant?.address || ""}
              </p>
            </div>
            <div>
              <p className={`text-[10px] tracking-[0.5em] uppercase mb-3 font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
                ─ Issue
              </p>
              <p className={`text-2xl ${serifEn.className}`} style={{ color: TEXT }}>
                No.{issueNo}
              </p>
              <p className={`text-xs tracking-widest uppercase mt-1 ${sansEn.className}`} style={{ color: DIM }}>
                {monthName} {yearStr}
              </p>
            </div>
            <div>
              <p className={`text-[10px] tracking-[0.5em] uppercase mb-3 font-bold ${sansEn.className}`} style={{ color: ACCENT }}>
                ─ Legal
              </p>
              <Link
                href={`/${tenantId}/legal`}
                className={`text-xs tracking-[0.2em] uppercase border-b pb-0.5 transition-colors ${sansEn.className}`}
                style={{ color: TEXT, borderColor: TEXT }}
              >
                特定商取引法に基づく表記
              </Link>
            </div>
          </div>

          <div className="border-t border-[#D8D6D0] pt-8 flex flex-col md:flex-row md:justify-between items-center gap-4">
            <p className={`text-[10px] tracking-[0.5em] uppercase ${sansEn.className}`} style={{ color: FAINT }}>
              © {yearStr} {tenant?.name || "Editorial Edition"}. All rights reserved.
            </p>
            <p className={`text-[10px] tracking-[0.5em] uppercase ${sansEn.className}`} style={{ color: FAINT }}>
              Powered by 絆太郎 Event Manager
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
