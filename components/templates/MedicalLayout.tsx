"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, User, Check,
  Link as LinkIcon, Facebook, CheckCircle2, Copy,
  Twitter, Mail, Phone, Users, Heart, Shield,
  Video, ClipboardList, UserCircle, Activity,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function MedicalLayout({ event, tenant, eventId, tenantId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [copied, setCopied] = useState(false);

  const PRIMARY = "#0d9488";
  const PRIMARY_LIGHT = "#ccfbf1";
  const SECONDARY = "#0ea5e9";

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr || new Date());
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return { full: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`, week: days[d.getDay()] };
  };

  const handleFormSuccess = (id: string) => {
    setReservationId(id);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { full, week } = formatDate(event.date);
  const lecturersList = event.lecturers || (event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }] : []);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const handleShareX = () => {
    const shareText = `${event.title} | イベント申し込み`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleShareFB = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleShareLINE = () => {
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ===== Submitted / Success Screen ===== */
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-teal-50/40">
        <div className="bg-white max-w-lg w-full p-10 rounded-3xl shadow-xl text-center space-y-6 border-2 border-teal-200">
          <CheckCircle2 size={64} className="mx-auto text-teal-600" />
          <h2 className="text-3xl font-bold text-slate-800">お申し込み完了</h2>
          <p className="text-sm text-slate-500">ご参加ありがとうございます。下記QRコードを当日ご提示ください。</p>
          <div className="p-6 bg-teal-50 rounded-2xl border border-dashed border-teal-200">
            <img src={qrImageUrl} alt="QR" className="w-40 h-40 mx-auto mb-4" />
            <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-white p-3 rounded-xl shadow-sm">
              【当日受付用】<br />
              この画面をスクリーンショットで保存し、<br />
              受付で提示してください。
            </p>
          </div>
          {(event.preSurveyFields?.length > 0 || event.preSurveyUrl) && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-purple-700 mb-1">📝 事前アンケートのお願い</p>
              <p className="text-xs text-slate-500 mb-3">イベントをより良いものにするため、ご協力ください。</p>
              <a href={event.preSurveyFields?.length > 0 ? `/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}` : event.preSurveyUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm">アンケートに回答する</a>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-10 py-4 rounded-full text-white font-bold shadow-md bg-teal-600 hover:bg-teal-700 transition-colors"
          >
            ページに戻る
          </button>
        </div>
      </div>
    );
  }

  /* ===== Main Layout ===== */
  return (
    <div className="min-h-screen bg-white pb-20">

      {/* ---- Soft gradient banner ---- */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 40%, #e0f2fe 100%)" }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #0d9488 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-6">
          <div className="flex items-center gap-3">
            {tenant?.logoUrl && <img src={tenant.logoUrl} className="h-8 rounded" alt="logo" />}
            <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm">
              <Shield size={16} className="text-teal-500" />
              <span>{tenant?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Hero: Image + Title ---- */}
      <div className="max-w-5xl mx-auto px-4 -mt-2">
        {event.ogpImage && (
          <div className="relative mb-8">
            <div className="bg-white p-2 rounded-2xl shadow-lg border border-teal-100">
              <img
                src={event.ogpImage}
                className="w-full h-auto max-h-[56vh] object-contain rounded-xl"
                alt="Event"
              />
            </div>
          </div>
        )}

        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 leading-snug mb-4">{event.title}</h1>
          {event.subtitle && (
            <p className="text-base md:text-lg text-slate-500 leading-relaxed border-l-4 border-teal-400 pl-5">
              {event.subtitle}
            </p>
          )}

          {/* SNS share buttons */}
          <div className="flex flex-wrap gap-3 mt-6">
            <button onClick={handleShareX} className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:scale-105 transition-transform shadow-sm">
              <Twitter size={17} />
            </button>
            <button onClick={handleShareLINE} className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-sm">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
                <path d="M12 2c-5.522 0-10 3.91-10 8.73 0 2.82 1.515 5.33 3.896 7l-.585 2.14c-.067.245.163.456.387.357l2.527-1.12c.594.16 1.22.25 1.775.25 5.522 0 10-3.91 10-8.73s-4.478-8.73-10-8.73z" />
              </svg>
            </button>
            <button onClick={handleShareFB} className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-105 transition-transform shadow-sm">
              <Facebook size={17} />
            </button>
            <button
              onClick={handleCopyLink}
              className="h-10 px-4 rounded-full border-2 flex items-center gap-2 font-semibold text-xs transition-all shadow-sm bg-white"
              style={{ borderColor: copied ? PRIMARY : "#e2e8f0", color: copied ? PRIMARY : "#64748b" }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "OK" : "Link"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---- Info Cards Grid ---- */}
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">

          {/* Date / Time Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600"><Calendar size={20} /></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">日時</span>
            </div>
            <p className="text-xl font-bold text-slate-800 mb-1">{full}<span className="text-sm font-semibold text-slate-400 ml-2">({week})</span></p>
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mt-2">
              <Clock size={15} className="text-teal-500" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
            {/* Online/Offline/Hybrid badge */}
            <div className="mt-4">
              {event.hasOnline && event.hasOffline && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  <Users size={13} /> ハイブリッド開催
                </span>
              )}
              {event.hasOnline && !event.hasOffline && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  <Video size={13} /> オンライン開催
                </span>
              )}
              {!event.hasOnline && event.hasOffline && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MapPin size={13} /> 会場開催
                </span>
              )}
            </div>
          </div>

          {/* Venue Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600"><MapPin size={20} /></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">会場</span>
            </div>
            <p className="text-lg font-bold text-slate-800 mb-1">{event.venueName}</p>
            {event.venueAddress && <p className="text-sm text-slate-500 leading-relaxed">{event.venueAddress}</p>}
            {event.venueAccess && <p className="text-xs text-slate-400 mt-2 leading-relaxed">{event.venueAccess}</p>}
            {event.venueAddress && (
              <div className="rounded-xl overflow-hidden border border-slate-100 mt-4 aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  src={`https://www.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}
                />
              </div>
            )}
          </div>

          {/* Price / Capacity Card */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600"><Heart size={20} /></div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">参加費</span>
            </div>
            <div className="space-y-2.5">
              {(event.tickets && event.tickets.length > 0) ? (
                event.tickets.map((t: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                    <span className="text-sm font-semibold text-slate-700">{t.name}</span>
                    <span className="text-lg font-bold text-teal-700 font-mono">
                      {t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between items-center p-3 rounded-xl bg-teal-50/50 border border-teal-100">
                  <span className="text-sm font-semibold text-slate-700">参加費</span>
                  <span className="text-lg font-bold text-teal-700 font-mono">
                    {event.price === "無料" ? "無料" : `¥${Number(event.price).toLocaleString()}`}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 font-medium">
              <Users size={13} />
              <span>定員：{event.capacity ? `${event.capacity}名（先着順）` : "制限なし"}</span>
            </div>
          </div>
        </div>

        {/* ---- Content Section ---- */}
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-md border border-slate-100 mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600"><ClipboardList size={22} /></div>
            <h2 className="text-xl font-bold text-slate-800">イベント概要</h2>
          </div>
          <div className="text-slate-600 leading-8 whitespace-pre-wrap text-base">{event.content}</div>
        </div>

        {/* ---- Timeline Section ---- */}
        {event.timeTable && (
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-md border border-slate-100 mb-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04]"><Activity size={120} /></div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600"><Clock size={22} /></div>
              <h2 className="text-xl font-bold text-slate-800">タイムスケジュール</h2>
            </div>
            <div className="bg-teal-50/40 rounded-xl p-6 border border-teal-100 text-slate-700 leading-8 whitespace-pre-wrap font-medium">
              {event.timeTable}
            </div>
          </div>
        )}

        {/* ---- Lecturer Section ---- */}
        {lecturersList.length > 0 && (
          <div className="bg-white rounded-2xl p-8 md:p-10 shadow-md border border-slate-100 mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600"><UserCircle size={22} /></div>
              <h2 className="text-xl font-bold text-slate-800">講師紹介</h2>
            </div>
            <div className="grid gap-6">
              {lecturersList.map((lec: any, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row gap-6 p-6 rounded-2xl bg-gradient-to-br from-teal-50/60 to-white border border-teal-100 hover:shadow-md transition-shadow">
                  {lec.image && (
                    <div className="shrink-0">
                      <img src={lec.image} className="w-28 h-36 object-cover rounded-xl shadow-sm border-2 border-white" alt={lec.name} />
                    </div>
                  )}
                  <div className="flex-1">
                    {lec.title && (
                      <div className="inline-block px-3 py-1 rounded-lg text-[11px] font-bold text-white mb-3 whitespace-pre-line bg-teal-600">
                        {lec.title}
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{lec.name}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{lec.profile}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Reservation Form Section ---- */}
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-md border border-slate-100 mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5" style={{ background: `linear-gradient(90deg, ${PRIMARY}, ${SECONDARY})` }} />
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-teal-600 mb-2">
              <Heart size={18} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">お申し込みフォーム</span>
              <Heart size={18} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">参加申し込み</h2>
          </div>
          <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess} />
        </div>
      </div>

      {/* ---- Contact Bar ---- */}
      <div className="max-w-5xl mx-auto px-4 mt-16 mb-12">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-teal-500" />
          <div className="flex items-center gap-4 shrink-0">
            <div className="p-3 rounded-xl bg-teal-50 text-teal-600"><Mail size={22} /></div>
            <div className="text-left">
              <h3 className="text-lg font-bold text-slate-800 leading-tight">お問い合わせ</h3>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Contact</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 flex-1 justify-end">
            <div className="flex flex-col items-center md:items-start">
              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight mb-1">Organizer</span>
              <div className="flex items-center gap-2">
                <User size={14} className="text-teal-500" />
                <span className="text-sm font-semibold text-slate-700">{event.contactName || tenant?.name}</span>
              </div>
            </div>
            {event.contactEmail && (
              <div className="flex flex-col items-center md:items-start">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight mb-1">Email</span>
                <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <Mail size={14} className="text-teal-500" />
                  <span className="text-sm font-semibold text-slate-700 underline decoration-slate-200 underline-offset-4">{event.contactEmail}</span>
                </a>
              </div>
            )}
            {event.contactPhone && (
              <div className="flex flex-col items-center md:items-start">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tight mb-1">Phone</span>
                <a href={`tel:${event.contactPhone}`} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <Phone size={14} className="text-teal-500" />
                  <span className="text-sm font-semibold text-slate-700">{event.contactPhone}</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---- Footer ---- */}
      <footer className="max-w-5xl mx-auto px-4">
        <div className="text-center pt-10 border-t border-slate-100">
          <div className="flex flex-col items-center gap-5">
            {tenant?.logoUrl && (
              <img src={tenant.logoUrl} className="h-8 opacity-50 grayscale hover:grayscale-0 transition-all" alt="logo" />
            )}
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
              <Link
                href={`/${tenantId}/legal`}
                className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors underline decoration-slate-200 underline-offset-4"
              >
                特定商取引法に基づく表記
              </Link>
            </div>
            <div className="text-[10px] font-bold text-slate-400 tracking-[0.4em] uppercase">
              &copy; {new Date().getFullYear()} {tenant?.name || "Event Manager"}
            </div>
            <div className="px-4 py-1 rounded-full bg-slate-800 text-white text-[8px] font-semibold tracking-widest uppercase opacity-15">
              Powered by 絆太郎 Event Manager
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
