"use client";

import React, { useState } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, User, Check,
  Facebook, CheckCircle2, Copy,
  Twitter, Mail, Phone, Users, Video,
  Leaf, Sun, Wind,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function NatureLayout({ event, tenant, eventId, tenantId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [copied, setCopied] = useState(false);

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

  const { full, week } = formatDate(event.date);
  const lecturersList = event.lecturers || (event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage, profile: event.lecturerProfile }] : []);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleShareX = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(event.title)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleShareFB = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleShareLINE = () => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`, '_blank');
  const handleCopyLink = () => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  if (submitted) {
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${reservationId}`;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#faf8f5]">
        <div className="bg-white max-w-lg w-full p-10 rounded-[2rem] shadow-xl text-center space-y-6 border border-stone-200">
          <CheckCircle2 size={64} className="mx-auto text-emerald-600" />
          <h2 className="text-3xl font-bold text-stone-800" style={{ fontFamily: "'Georgia', serif" }}>お申し込み完了</h2>
          <div className="p-6 bg-stone-50 rounded-2xl border border-stone-100">
            <img src={qrImageUrl} alt="QR" className="w-40 h-40 mx-auto mb-4" />
            <p className="text-xs text-stone-600 leading-relaxed bg-white p-3 rounded-lg border border-stone-100">
              【当日受付用】<br/>この画面をスクリーンショットで保存し、<br/>受付で提示してください。
            </p>
          </div>
          {(event.preSurveyFields?.length > 0 || event.preSurveyUrl) && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-center">
              <p className="text-sm font-bold text-purple-700 mb-1">📝 事前アンケートのお願い</p>
              <p className="text-xs text-slate-500 mb-3">イベントをより良いものにするため、ご協力ください。</p>
              <a href={event.preSurveyFields?.length > 0 ? `/t/${tenantId}/e/${eventId}/pre-survey?rid=${reservationId}` : event.preSurveyUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm">アンケートに回答する</a>
            </div>
          )}
          <button onClick={() => window.location.reload()} className="px-10 py-4 rounded-full bg-emerald-700 text-white font-bold shadow-md hover:bg-emerald-800 transition-colors">ページに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf8f5]" style={{ fontFamily: "'Hiragino Mincho ProN', 'Noto Serif JP', Georgia, serif" }}>

      {/* ===== ヒーローセクション ===== */}
      <section className="relative overflow-hidden">
        {/* 淡い自然グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/80 via-[#faf8f5] to-[#faf8f5]" />
        {/* 葉のパターン（装飾） */}
        <div className="absolute top-10 left-10 text-emerald-200/40"><Leaf size={120} strokeWidth={0.5} /></div>
        <div className="absolute bottom-10 right-10 text-emerald-200/30 rotate-45"><Wind size={100} strokeWidth={0.5} /></div>

        <div className="relative z-10 container mx-auto px-4 pt-16 pb-12 max-w-4xl">
          {/* テナント名 */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center gap-2 text-emerald-700/60 text-xs tracking-[0.3em] uppercase font-medium">
              <Leaf size={12} /> {tenant?.name}
            </span>
          </div>

          {/* イベント画像 */}
          {event.ogpImage && (
            <div className="mb-10 rounded-[1.5rem] overflow-hidden shadow-lg max-w-3xl mx-auto border border-stone-200/50">
              <img src={event.ogpImage} className="w-full h-auto max-h-[55vh] object-contain bg-white" alt="Event" />
            </div>
          )}

          {/* タイトル */}
          <h1 className="text-3xl md:text-4xl font-bold text-stone-800 text-center leading-relaxed mb-4 tracking-wide">
            {event.title}
          </h1>

          {event.subtitle && (
            <p className="text-base md:text-lg text-stone-500 text-center max-w-2xl mx-auto mb-10 leading-relaxed font-light">{event.subtitle}</p>
          )}

          {/* 日時・場所（横並びのシンプルな表示） */}
          <div className="flex flex-wrap justify-center gap-8 text-stone-600 text-sm mb-6">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-emerald-600" />
              <span>{full}（{week}）</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-emerald-600" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
            {event.venueName && (
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" />
                <span>{event.venueName}</span>
              </div>
            )}
          </div>

          {/* 区切り線 */}
          <div className="flex items-center justify-center gap-4 mt-10">
            <div className="w-16 h-px bg-stone-300" />
            <Leaf size={16} className="text-emerald-400" />
            <div className="w-16 h-px bg-stone-300" />
          </div>
        </div>
      </section>

      {/* ===== SNSシェア ===== */}
      <div className="container mx-auto px-4 py-6 max-w-4xl flex justify-center gap-3">
        <button onClick={handleShareX} className="w-9 h-9 rounded-full bg-stone-700 text-white flex items-center justify-center hover:scale-110 transition-transform"><Twitter size={15}/></button>
        <button onClick={handleShareLINE} className="w-9 h-9 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M12 2c-5.522 0-10 3.91-10 8.73 0 2.82 1.515 5.33 3.896 7l-.585 2.14c-.067.245.163.456.387.357l2.527-1.12c.594.16 1.22.25 1.775.25 5.522 0 10-3.91 10-8.73s-4.478-8.73-10-8.73z"/></svg>
        </button>
        <button onClick={handleShareFB} className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform"><Facebook size={15}/></button>
        <button onClick={handleCopyLink} className="h-9 px-4 rounded-full border border-stone-300 flex items-center gap-2 text-xs text-stone-500 hover:border-emerald-400 bg-white transition-all" style={{ fontFamily: "sans-serif" }}>
          {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12}/>} {copied ? "OK" : "Link"}
        </button>
      </div>

      {/* ===== 開催形式 ===== */}
      <div className="container mx-auto px-4 pb-8 max-w-4xl flex justify-center">
        {event.hasOnline && event.hasOffline && (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium tracking-wider"><Users size={14}/> ハイブリッド開催</div>
        )}
        {event.hasOnline && !event.hasOffline && (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-medium tracking-wider"><Video size={14}/> オンライン開催</div>
        )}
        {!event.hasOnline && event.hasOffline && (
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium tracking-wider"><MapPin size={14}/> 会場開催</div>
        )}
      </div>

      {/* ===== イベント概要 ===== */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <Sun size={20} className="mx-auto text-emerald-400 mb-3" />
          <h2 className="text-xl md:text-2xl font-bold text-stone-800 tracking-wider">イベントについて</h2>
        </div>
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-stone-100">
          <div className="text-stone-600 leading-[2] whitespace-pre-wrap text-base" style={{ fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif" }}>
            {event.content}
          </div>
        </div>
      </section>

      {/* ===== タイムテーブル ===== */}
      {event.timeTable && (
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="text-center mb-8">
            <Clock size={20} className="mx-auto text-emerald-400 mb-3" />
            <h2 className="text-xl md:text-2xl font-bold text-stone-800 tracking-wider">当日の流れ</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-stone-100">
            <div className="text-stone-600 leading-[2] whitespace-pre-wrap text-base border-l-2 border-emerald-200 pl-6" style={{ fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif" }}>
              {event.timeTable}
            </div>
          </div>
        </section>
      )}

      {/* ===== 講師紹介 ===== */}
      {lecturersList.length > 0 && (
        <section className="py-16 bg-gradient-to-b from-[#faf8f5] to-emerald-50/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-10">
              <User size={20} className="mx-auto text-emerald-400 mb-3" />
              <h2 className="text-xl md:text-2xl font-bold text-stone-800 tracking-wider">講師紹介</h2>
            </div>
            <div className="space-y-8">
              {lecturersList.map((lec: any, i: number) => (
                <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 text-center md:text-left md:flex md:gap-8">
                  {lec.image && (
                    <div className="shrink-0 mb-6 md:mb-0 flex justify-center">
                      <img src={lec.image} className="w-28 h-36 object-cover rounded-xl shadow-sm border border-stone-100" alt={lec.name} />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium mb-3 whitespace-pre-line border border-emerald-100">{lec.title}</div>
                    <h3 className="text-xl font-bold text-stone-800 mb-3 tracking-wide">{lec.name}</h3>
                    <p className="text-stone-500 leading-relaxed text-sm" style={{ fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif" }}>{lec.profile}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== 会場情報 ===== */}
      {event.venueName && (
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <div className="text-center mb-8">
            <MapPin size={20} className="mx-auto text-emerald-400 mb-3" />
            <h2 className="text-xl md:text-2xl font-bold text-stone-800 tracking-wider">会場アクセス</h2>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-2">{event.venueName}</h3>
            {event.venueAddress && <p className="text-stone-500 text-sm mb-4">{event.venueAddress}</p>}
            {event.venueAccess && (
              <div className="text-sm text-stone-500 bg-emerald-50/50 p-4 rounded-xl border-l-2 border-emerald-300 mb-6 leading-relaxed" style={{ fontFamily: "'Hiragino Kaku Gothic ProN', sans-serif" }}>
                {event.venueAccess}
              </div>
            )}
            {event.venueAddress && (
              <div className="rounded-xl overflow-hidden border border-stone-200 aspect-video">
                <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://www.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== 申し込みセクション ===== */}
      <section className="py-16 bg-gradient-to-b from-[#faf8f5] to-emerald-50/40">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <Leaf size={20} className="mx-auto text-emerald-400 mb-3" />
            <h2 className="text-xl md:text-2xl font-bold text-stone-800 tracking-wider">お申し込み</h2>
          </div>

          {/* チケット・料金 */}
          <div className="mb-8 space-y-3">
            {(event.tickets && event.tickets.length > 0) ? (
              event.tickets.map((t: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-5 rounded-xl bg-white border border-stone-100 shadow-sm">
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider">Ticket</span>
                    <div className="text-sm font-bold text-stone-800">{t.name}</div>
                  </div>
                  <span className="text-lg font-bold text-emerald-700">{t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center p-5 rounded-xl bg-white border border-stone-100 shadow-sm">
                <span className="font-bold text-stone-800">参加費</span>
                <span className="text-lg font-bold text-emerald-700">{event.price === "無料" ? "無料" : `¥${Number(event.price).toLocaleString()}`}</span>
              </div>
            )}
            {event.capacity && (
              <div className="text-center text-xs text-stone-400 font-medium flex items-center justify-center gap-1">
                <Users size={12} /> 定員 {event.capacity}名
              </div>
            )}
          </div>

          {/* フォーム */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100">
            <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess} />
          </div>
        </div>
      </section>

      {/* ===== お問い合わせ ===== */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-stone-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600"><Mail size={20} /></div>
            <div>
              <h3 className="text-base font-bold text-stone-800">お問い合わせ</h3>
              <p className="text-[10px] text-stone-400 tracking-wider">Contact</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-5 text-sm text-stone-600" style={{ fontFamily: "sans-serif" }}>
            <div className="flex items-center gap-2"><User size={14} className="text-emerald-500" /> {event.contactName || tenant?.name}</div>
            {event.contactEmail && <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-2 hover:text-emerald-600 transition-colors"><Mail size={14} className="text-emerald-500" /> {event.contactEmail}</a>}
            {event.contactPhone && <a href={`tel:${event.contactPhone}`} className="flex items-center gap-2 hover:text-emerald-600 transition-colors"><Phone size={14} className="text-emerald-500" /> {event.contactPhone}</a>}
          </div>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer className="text-center py-12 border-t border-stone-200/50">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-12 h-px bg-stone-300" />
          <Leaf size={14} className="text-emerald-300" />
          <div className="w-12 h-px bg-stone-300" />
        </div>
        {tenant?.logoUrl && <img src={tenant.logoUrl} className="h-8 mx-auto mb-4 opacity-50 grayscale hover:grayscale-0 transition-all" alt="logo" />}
        <div className="flex justify-center gap-6 mb-4">
          <Link href={`/${tenantId}/legal`} className="text-[10px] text-stone-400 hover:text-stone-600 underline decoration-stone-200 underline-offset-4" style={{ fontFamily: "sans-serif" }}>特定商取引法に基づく表記</Link>
        </div>
        <p className="text-[10px] text-stone-400 tracking-[0.4em]" style={{ fontFamily: "sans-serif" }}>© {new Date().getFullYear()} {tenant?.name || "Event Manager"}</p>
        <div className="mt-3 px-4 py-1 rounded-full bg-stone-800 text-white text-[8px] tracking-widest uppercase opacity-10 inline-block" style={{ fontFamily: "sans-serif" }}>Powered by 絆太郎 Event Manager</div>
      </footer>
    </div>
  );
}
