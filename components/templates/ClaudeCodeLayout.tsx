"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, User, AlignLeft, Check, Copy,
  Mail, Phone, CheckCircle2, ChevronRight,
  Link as LinkIcon, Facebook, Twitter,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

const ORANGE = "#D97757";
const ORANGE_BRIGHT = "#F08856";
const ORANGE_GLOW = "#FF8E61";

export default function ClaudeCodeLayout({
  event, tenant, eventId, tenantId,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState("");

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = event ? `${event.title} | イベント申し込み` : "";

  const handleShareLine = () =>
    window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, "_blank");
  const handleShareFB = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event?.title, text: event?.title, url: shareUrl });
        return;
      } catch {}
    }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank");
  };
  const handleShareTwitter = () =>
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { full: "----年--月--日", week: "-" };
    const d = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return {
      full: `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`,
      week: days[d.getDay()],
    };
  };

  const handleFormSuccess = (id: string) => {
    setReservationId(id);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 等幅フォント（プロジェクト共通の Geist Mono を利用）
  const monoStack = "var(--font-geist-mono), 'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', monospace";

  // ===== 完了画面 =====
  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F0F] text-[#E8E8E8] relative overflow-hidden"
        style={{ fontFamily: monoStack }}
      >
        {/* 背景：グリッド + オレンジグロー */}
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(217,119,87,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.04) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div
          aria-hidden
          className="fixed left-1/2 -translate-x-1/2 -top-[200px] w-[900px] h-[400px] pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(217,119,87,0.2), transparent 70%)",
          }}
        />

        <div
          className="relative z-10 max-w-lg w-full rounded-xl overflow-hidden border border-[#2A2A2A]"
          style={{
            background: "#1A1A1A",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,119,87,0.1)",
          }}
        >
          {/* ターミナルバー */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2A2A2A] bg-[#1E1E1E]">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            <span className="flex-1 text-center text-[11px] text-[#888] tracking-wider">
              reservation ~ confirmation
            </span>
            <span className="text-[11px] text-[#555]">200 OK</span>
          </div>

          <div className="p-8 md:p-10 text-center space-y-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)" }}
            >
              <CheckCircle2 size={32} className="text-[#4ADE80]" />
            </div>
            <div>
              <p className="text-[11px] text-[#4ADE80] tracking-widest mb-1">$ status: COMPLETED</p>
              <h2 className="text-xl font-bold text-[#E8E8E8]">お申し込み完了</h2>
            </div>

            <div
              className="rounded-lg p-4 text-left"
              style={{
                background: "rgba(217,119,87,0.05)",
                border: "1px solid rgba(217,119,87,0.25)",
                borderLeft: `3px solid ${ORANGE}`,
              }}
            >
              <p className="text-xs text-[#E8E8E8] leading-relaxed text-center">
                <span className="text-[#F08856] font-bold"># 当日の受付用QRコード</span><br />
                この画面をスクリーンショット等で保存し、<br />
                当日受付にてスタッフへご提示ください。
              </p>
            </div>

            {/* イベント情報 */}
            <div
              className="rounded-lg p-4 text-left space-y-2 border border-[#2A2A2A]"
              style={{ background: "#1E1E1E" }}
            >
              <div className="text-[10px] text-[#F08856] font-bold uppercase tracking-widest mb-1">
                ▸ EVENT INFO
              </div>
              <h3 className="text-sm font-bold text-[#E8E8E8] leading-snug">{event.title}</h3>
              <div className="pt-2 border-t border-[#2A2A2A] space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Calendar size={14} style={{ color: ORANGE_BRIGHT }} />
                  <span className="text-[#E8E8E8]">{formatDate(event.date).full}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#888]">
                  <Clock size={14} style={{ color: ORANGE_BRIGHT }} />
                  <span className="text-[#E8E8E8]">{event.startTime} - {event.endTime}</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-[#888]">
                  <MapPin size={14} className="mt-0.5" style={{ color: ORANGE_BRIGHT }} />
                  <span className="text-[#E8E8E8]">{event.venueName || "会場未定"}</span>
                </div>
              </div>
            </div>

            {/* QR */}
            <div
              className="inline-block p-5 rounded-xl"
              style={{ background: "#0F0F0F", border: "1px solid #2A2A2A" }}
            >
              <div className="text-[9px] text-[#F08856] font-bold mb-2 tracking-[0.2em]">
                ▸ CHECK-IN TICKET
              </div>
              <div className="bg-white p-2 rounded-lg">
                {reservationId ? (
                  <img src={qrImageUrl} alt="QR" className="w-[140px] h-[140px] object-contain" />
                ) : (
                  <div className="w-[140px] h-[140px] bg-slate-100 flex items-center justify-center text-xs">Loading...</div>
                )}
              </div>
              <div className="text-[9px] text-[#555] mt-2">ID: {reservationId}</div>
            </div>

            {(event.preSurveyFields?.length > 0 || event.preSurveyUrl) && (
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.3)" }}
              >
                <p className="text-sm font-bold text-[#60A5FA] mb-1">▸ 事前アンケートのお願い</p>
                <p className="text-xs text-[#888] mb-3">イベントをより良いものにするため、ご協力ください。</p>
                <a
                  href={event.preSurveyFields?.length > 0
                    ? `/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}`
                    : event.preSurveyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-2.5 rounded-lg text-white font-bold text-sm transition-all hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
                    boxShadow: "0 4px 20px rgba(217,119,87,0.4)",
                  }}
                >
                  ▶ アンケートに回答する
                </a>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-bold py-2.5 px-6 rounded-lg text-[#E8E8E8] transition-colors"
                style={{ background: "transparent", border: "1px solid #444" }}
              >
                イベントページに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { full, week } = formatDate(event.date);

  // ===== 通常のイベント詳細画面 =====
  return (
    <div
      className="min-h-screen pb-32 relative overflow-x-hidden bg-[#0F0F0F] text-[#E8E8E8] selection:bg-[#D97757]/30 selection:text-white"
      style={{ fontFamily: monoStack, lineHeight: 1.6 }}
    >
      {/* グリッド背景 */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(217,119,87,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* 上部オレンジグロー */}
      <div
        aria-hidden
        className="fixed left-1/2 -translate-x-1/2 -top-[200px] w-[900px] h-[400px] pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(217,119,87,0.22), transparent 70%)",
        }}
      />

      <div className="relative z-10 container mx-auto px-3 md:px-4 pt-10 md:pt-16 max-w-6xl">
        {/* テナント帯 */}
        <div className="text-center mb-8 px-4">
          <div
            className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-xs tracking-widest mb-6"
            style={{ background: "rgba(217,119,87,0.06)", border: `1px solid ${ORANGE}` }}
          >
            {tenant?.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-5 object-contain" />
            ) : (
              <span className="text-[#4ADE80]">$</span>
            )}
            <span className="text-[#888]">event</span>
            <ChevronRight size={12} style={{ color: ORANGE }} />
            <span className="text-[#F08856] font-semibold uppercase tracking-widest">
              {tenant?.name || tenantId}
            </span>
          </div>

          {/* タイトル */}
          <h1
            className="text-2xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-4 text-[#E8E8E8]"
          >
            {event.title}
          </h1>
          {event.subtitle && (
            <p className="text-[#888] text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
              {event.subtitle}
            </p>
          )}
        </div>

        {/* ターミナルウィンドウ枠で2カラム */}
        <div
          className="overflow-hidden rounded-xl border border-[#2A2A2A]"
          style={{
            background: "#1A1A1A",
            boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,119,87,0.1)",
          }}
        >
          {/* ターミナルバー */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2A2A2A] bg-[#1E1E1E]">
            <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
            <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
            <span className="w-3 h-3 rounded-full bg-[#28C840]" />
            <span className="flex-1 text-center text-[11px] text-[#888] tracking-wider truncate">
              event ~ {event.slug || eventId}
            </span>
            <span className="text-[11px] text-[#555]">v1</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* 左カラム */}
            <div className="p-5 md:p-10 lg:border-r border-[#2A2A2A] flex flex-col gap-8">
              {/* 講師 */}
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-[11px] mb-3" style={{ color: ORANGE_BRIGHT }}>
                  <span style={{ color: ORANGE }}>▸</span>
                  <User size={13} /> LECTURER / 講師
                </div>
                <div
                  className="rounded-lg p-4 md:p-5 flex flex-row gap-4 items-start border border-[#2A2A2A]"
                  style={{ background: "#0F0F0F" }}
                >
                  {event.lecturerImage && (
                    <div className="shrink-0">
                      <img
                        src={event.lecturerImage}
                        alt={event.lecturer}
                        className="w-20 h-28 md:w-24 md:h-32 rounded-lg object-cover border border-[#2A2A2A]"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold text-[#E8E8E8] mb-1 tracking-wide leading-tight">
                      {event.lecturer ? `${event.lecturer} ${event.lecturerSuffix || ""}` : "講師調整中"}
                    </h3>
                    <p
                      className="text-xs font-medium mb-3 tracking-wider whitespace-pre-line"
                      style={{ color: ORANGE_BRIGHT }}
                    >
                      {event.lecturerTitle}
                    </p>
                    <p className="text-[#888] text-xs leading-relaxed whitespace-pre-wrap">
                      {event.lecturerProfile}
                    </p>
                  </div>
                </div>
              </div>

              {/* 内容 */}
              <div className="flex-1">
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-[11px] mb-3" style={{ color: ORANGE_BRIGHT }}>
                  <span style={{ color: ORANGE }}>▸</span>
                  <AlignLeft size={13} /> CONTENT / セミナー内容
                </div>
                <div
                  className="p-4 rounded-lg border border-[#2A2A2A] mb-4"
                  style={{ background: "#0F0F0F" }}
                >
                  <div className="text-[#E8E8E8] text-sm leading-7 whitespace-pre-wrap">{event.content}</div>
                </div>

                {event.timeTable && (
                  <div className="mt-6">
                    <div className="text-[10px] text-[#F08856] font-bold tracking-widest uppercase mb-2">
                      ▸ TIME TABLE
                    </div>
                    <div
                      className="text-[#E8E8E8] text-sm leading-7 whitespace-pre-wrap pl-3"
                      style={{ borderLeft: `2px solid ${ORANGE}` }}
                    >
                      {event.timeTable}
                    </div>
                  </div>
                )}
              </div>

              {/* シェアボタン */}
              <div className="pt-6 border-t border-[#2A2A2A]">
                <div className="flex gap-3">
                  <button
                    onClick={handleShareLine}
                    className="w-11 h-11 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-105 transition-transform"
                    title="LINEで送る"
                  >
                    <LinkIcon size={18} />
                  </button>
                  <button
                    onClick={handleShareFB}
                    className="w-11 h-11 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-105 transition-transform"
                    title="Facebookでシェア"
                  >
                    <Facebook size={18} />
                  </button>
                  <button
                    onClick={handleShareTwitter}
                    className="w-11 h-11 rounded-full bg-black border border-[#444] text-white flex items-center justify-center hover:scale-105 transition-transform"
                    title="Xでポスト"
                  >
                    <Twitter size={18} />
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-105 ${
                      copied ? "bg-[#E8E8E8] text-[#0F0F0F]" : "text-[#888]"
                    }`}
                    style={
                      copied
                        ? undefined
                        : { background: "#0F0F0F", border: "1px solid #2A2A2A" }
                    }
                    title="リンクをコピー"
                  >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* 右カラム */}
            <div className="p-5 md:p-10 space-y-8" style={{ background: "rgba(15,15,15,0.6)" }}>
              {/* 日時 */}
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-[11px] mb-3" style={{ color: ORANGE_BRIGHT }}>
                  <span style={{ color: ORANGE }}>▸</span>
                  <Calendar size={13} /> DATE / 開催日時
                </div>
                <div className="text-2xl md:text-4xl font-bold tracking-tight text-[#E8E8E8] mb-2">
                  {full}
                  <span className="text-xl text-[#888] ml-2">({week})</span>
                </div>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 text-sm md:text-base text-[#E8E8E8] pl-1">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-[#888]" />
                    <span>{event.startTime} - {event.endTime}</span>
                  </div>
                  {event.openTime && (
                    <span
                      className="text-[11px] text-white font-bold px-2 py-1 rounded w-fit"
                      style={{
                        background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
                      }}
                    >
                      受付 {event.openTime}〜
                    </span>
                  )}
                </div>
              </div>

              {/* 会場 */}
              <div>
                <div className="flex items-center gap-2 font-bold tracking-[0.2em] text-[11px] mb-3" style={{ color: ORANGE_BRIGHT }}>
                  <span style={{ color: ORANGE }}>▸</span>
                  <MapPin size={13} /> VENUE / 会場
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#E8E8E8] mb-2 leading-snug tracking-wide">
                  {event.venueName || "会場未定"}
                </h3>
                {event.venueAddress && (
                  <div className="w-full h-40 md:h-48 rounded-lg overflow-hidden border border-[#2A2A2A] bg-[#0F0F0F] mt-2 relative z-0">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`}
                    />
                  </div>
                )}
              </div>

              {/* お問い合わせ */}
              <div
                className="rounded-lg p-6 border border-[#2A2A2A] space-y-5 mt-4"
                style={{ background: "#0F0F0F" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 rounded-full" style={{ background: ORANGE_BRIGHT }} />
                  <h3 className="font-bold text-[#E8E8E8] tracking-widest text-sm uppercase">
                    ▸ CONTACT
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[#888] uppercase tracking-widest">Organizer</p>
                    <p className="font-bold text-[#E8E8E8]">
                      {event.contactName || tenant?.name || "Support Team"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {event.contactEmail && (
                      <a
                        href={`mailto:${event.contactEmail}`}
                        className="flex items-center gap-3 p-3 rounded-lg text-xs font-bold text-[#888] hover:text-[#F08856] transition-all group"
                        style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                      >
                        <Mail size={14} />
                        <span className="truncate">{event.contactEmail}</span>
                      </a>
                    )}
                    {event.contactPhone && (
                      <a
                        href={`tel:${event.contactPhone}`}
                        className="flex items-center gap-3 p-3 rounded-lg text-xs font-bold text-[#888] hover:text-[#F08856] transition-all group"
                        style={{ background: "#1A1A1A", border: "1px solid #2A2A2A" }}
                      >
                        <Phone size={14} />
                        {event.contactPhone}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* チケット */}
              <div className="space-y-4 pt-4 border-t border-[#2A2A2A]">
                <div className="text-xs font-bold tracking-widest mb-2" style={{ color: ORANGE_BRIGHT }}>
                  ▸ TICKETS / チケット・参加費用
                </div>

                <div className="space-y-3">
                  {(event.tickets && event.tickets.length > 0) ? (
                    event.tickets.map((t: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center p-4 rounded-lg border border-[#2A2A2A]"
                        style={{ background: "#1A1A1A" }}
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#888] uppercase tracking-tighter mb-0.5">
                            参加チケット
                          </span>
                          <span className="text-sm font-bold text-[#E8E8E8]">{t.name}</span>
                        </div>
                        <div className="text-right">
                          <span
                            className="text-xl font-bold"
                            style={{
                              background: `linear-gradient(135deg, ${ORANGE_BRIGHT}, ${ORANGE_GLOW})`,
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                            }}
                          >
                            {t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className="flex justify-between items-center p-4 rounded-lg border border-[#2A2A2A]"
                      style={{ background: "#1A1A1A" }}
                    >
                      <span className="text-sm font-bold text-[#E8E8E8]">参加費</span>
                      <span
                        className="text-xl font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${ORANGE_BRIGHT}, ${ORANGE_GLOW})`,
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        {(!event.price || event.price === "0" || event.price === "無料")
                          ? "無料"
                          : isNaN(Number(event.price))
                            ? event.price
                            : `¥${Number(event.price).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 px-1 py-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ORANGE }} />
                  <p className="text-sm font-bold text-[#888] tracking-wider">
                    定員：{event.capacity ? `${Number(event.capacity).toLocaleString()}名` : "制限なし"}
                  </p>
                </div>
              </div>

              {/* 申込フォーム */}
              <div className="mt-6 relative z-50 isolate">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3
                    className="text-xs font-bold tracking-widest"
                    style={{ color: ORANGE_BRIGHT }}
                  >
                    ▸ APPLY / イベントへの参加申し込み
                  </h3>
                </div>
                <div
                  className="rounded-lg p-3 md:p-5 border"
                  style={{
                    background: "#1A1A1A",
                    borderColor: "#2A2A2A",
                    borderLeft: `3px solid ${ORANGE}`,
                  }}
                >
                  <ReservationForm
                    tenantId={tenantId}
                    eventId={eventId}
                    event={event}
                    tenantData={tenant || undefined}
                    onSuccess={handleFormSuccess}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer className="mt-20 mb-12 text-center relative z-10 space-y-8">
          <div className="flex justify-center">
            <Link
              href={`/${tenantId}/legal`}
              className="text-[10px] font-bold text-[#555] hover:text-[#F08856] transition-all tracking-[0.2em] uppercase"
              style={{
                textDecoration: "underline",
                textDecorationColor: "#333",
                textUnderlineOffset: "6px",
              }}
            >
              特定商取引法に基づく表記
            </Link>
          </div>

          <div className="space-y-4">
            <p className="text-[#555] text-[10px] tracking-[0.3em] font-medium uppercase">
              © {new Date().getFullYear()} {tenant?.name || "絆太郎 Event Manager"}
            </p>
            <div
              className="inline-block px-5 py-1.5 rounded-full text-[10px] font-bold tracking-[0.3em] uppercase"
              style={{
                color: ORANGE_BRIGHT,
                background: "rgba(217,119,87,0.06)",
                border: "1px solid rgba(217,119,87,0.3)",
              }}
            >
              Powered by 絆太郎 Event Manager
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
