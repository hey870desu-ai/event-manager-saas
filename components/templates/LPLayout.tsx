"use client";

import React, { useState, useEffect } from "react";
import ReservationForm from "@/components/ReservationForm";
import Link from "next/link";
import {
  Calendar, Clock, MapPin, User, Check,
  Facebook, CheckCircle2, Copy,
  Twitter, Mail, Phone, Users, Video,
  ChevronDown, AlertCircle, Zap, Star,
} from "lucide-react";

type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function LPLayout({ event, tenant, eventId, tenantId }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [reservationId, setReservationId] = useState("");
  const [copied, setCopied] = useState(false);
  const [showSticky, setShowSticky] = useState(false);

  const ACCENT = "#2563eb";
  const CTA = "#f97316";

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

  const scrollToForm = () => {
    document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white max-w-lg w-full p-10 rounded-3xl shadow-2xl text-center space-y-6 border-4 border-blue-500">
          <CheckCircle2 size={64} className="mx-auto text-blue-600" />
          <h2 className="text-3xl font-black text-slate-900">お申し込み完了!</h2>
          <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <img src={qrImageUrl} alt="QR" className="w-40 h-40 mx-auto mb-4" />
            <p className="text-xs font-bold text-slate-600 leading-relaxed bg-white p-3 rounded-lg shadow-sm">
              【当日受付用】<br/>この画面をスクリーンショットで保存し、<br/>受付で提示してください。
            </p>
          </div>
          {event.preSurveyUrl && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <p className="text-sm font-bold text-purple-700 mb-1">📝 事前アンケートのお願い</p>
              <p className="text-xs text-slate-500 mb-3">イベントをより良いものにするため、ご協力ください。</p>
              <a href={event.preSurveyUrl} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm">アンケートに回答する</a>
            </div>
          )}
          <button onClick={() => window.location.reload()} className="px-10 py-4 rounded-full bg-blue-600 text-white font-bold shadow-lg hover:bg-blue-700 transition-colors">ページに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">

      {/* ===== ヒーローセクション ===== */}
      <section className="relative overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 container mx-auto px-4 pt-8 pb-16 max-w-5xl">
          {/* テナント名 */}
          <div className="text-center mb-6">
            <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white/80 text-xs font-bold tracking-wider border border-white/20">
              {tenant?.name}
            </span>
          </div>

          {/* イベント画像 */}
          {event.ogpImage && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 max-w-3xl mx-auto">
              <img src={event.ogpImage} className="w-full h-auto max-h-[50vh] object-contain bg-white" alt="Event" />
            </div>
          )}

          {/* タイトル */}
          <h1 className="text-3xl md:text-5xl font-black text-white text-center leading-tight mb-6 drop-shadow-lg">
            {event.title}
          </h1>

          {event.subtitle && (
            <p className="text-lg md:text-xl text-blue-100 text-center max-w-2xl mx-auto mb-8 font-medium">{event.subtitle}</p>
          )}

          {/* 日時・場所バッジ */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full text-white border border-white/20">
              <Calendar size={16} /> <span className="font-bold text-sm">{full}（{week}）</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full text-white border border-white/20">
              <Clock size={16} /> <span className="font-bold text-sm">{event.startTime} - {event.endTime}</span>
            </div>
            {event.venueName && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-5 py-2.5 rounded-full text-white border border-white/20">
                <MapPin size={16} /> <span className="font-bold text-sm">{event.venueName}</span>
              </div>
            )}
          </div>

          {/* CTAボタン */}
          <div className="text-center">
            <button
              onClick={scrollToForm}
              className="inline-flex items-center gap-3 px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white text-lg font-black rounded-full shadow-[0_8px_30px_rgba(249,115,22,0.4)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.6)] transition-all hover:scale-105 active:scale-95"
            >
              今すぐ申し込む <ChevronDown size={20} />
            </button>
            {event.capacity && (
              <div className="mt-4 inline-flex items-center gap-2 text-orange-200 text-sm font-bold">
                <AlertCircle size={14} /> 定員{event.capacity}名・先着順
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== SNSシェア ===== */}
      <div className="bg-slate-50 border-b border-slate-100">
        <div className="container mx-auto px-4 py-4 max-w-5xl flex justify-center gap-3">
          <button onClick={handleShareX} className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center hover:scale-110 transition-transform"><Twitter size={18}/></button>
          <button onClick={handleShareLINE} className="w-10 h-10 rounded-full bg-[#06C755] text-white flex items-center justify-center hover:scale-110 transition-transform">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2c-5.522 0-10 3.91-10 8.73 0 2.82 1.515 5.33 3.896 7l-.585 2.14c-.067.245.163.456.387.357l2.527-1.12c.594.16 1.22.25 1.775.25 5.522 0 10-3.91 10-8.73s-4.478-8.73-10-8.73z"/></svg>
          </button>
          <button onClick={handleShareFB} className="w-10 h-10 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform"><Facebook size={18}/></button>
          <button onClick={handleCopyLink} className="h-10 px-4 rounded-full border-2 border-slate-200 flex items-center gap-2 font-bold text-xs text-slate-500 hover:border-blue-300 bg-white transition-all">
            {copied ? <Check size={14} className="text-blue-600" /> : <Copy size={14}/>} {copied ? "コピーしました" : "リンクをコピー"}
          </button>
        </div>
      </div>

      {/* ===== 開催形式バッジ ===== */}
      <div className="container mx-auto px-4 py-8 max-w-5xl flex justify-center">
        {event.hasOnline && event.hasOffline && (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-50 border-2 border-blue-200 text-blue-700 font-black text-sm"><Users size={18}/> ハイブリッド開催（会場 + オンライン）</div>
        )}
        {event.hasOnline && !event.hasOffline && (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-50 border-2 border-sky-200 text-sky-700 font-black text-sm"><Video size={18}/> オンライン開催</div>
        )}
        {!event.hasOnline && event.hasOffline && (
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-black text-sm"><MapPin size={18}/> 会場開催</div>
        )}
      </div>

      {/* ===== イベント概要 ===== */}
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <span className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">About</span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">イベント概要</h2>
          <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full" />
        </div>
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-slate-100">
          <div className="text-slate-700 leading-8 whitespace-pre-wrap font-medium text-lg">{event.content}</div>
        </div>
      </section>

      {/* ===== タイムテーブル ===== */}
      {event.timeTable && (
        <section className="bg-slate-50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <span className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">Schedule</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">タイムスケジュール</h2>
              <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full" />
            </div>
            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-slate-100">
              <div className="text-slate-700 leading-8 whitespace-pre-wrap font-bold text-lg flex items-start gap-4">
                <Clock size={24} className="text-blue-600 shrink-0 mt-1" />
                <div>{event.timeTable}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== 講師紹介 ===== */}
      {lecturersList.length > 0 && (
        <section className="container mx-auto px-4 py-16 max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">Speaker</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">講師紹介</h2>
            <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full" />
          </div>
          <div className="space-y-8">
            {lecturersList.map((lec: any, i: number) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100 flex flex-col md:flex-row gap-8">
                {lec.image && (
                  <div className="shrink-0">
                    <img src={lec.image} className="w-32 h-40 object-cover rounded-xl shadow-md" alt={lec.name} />
                  </div>
                )}
                <div className="flex-1">
                  <div className="inline-block px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-black mb-3 whitespace-pre-line">{lec.title}</div>
                  <h3 className="text-2xl font-black text-slate-900 mb-3">{lec.name}</h3>
                  <p className="text-slate-600 leading-relaxed">{lec.profile}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== 会場情報 ===== */}
      {event.venueName && (
        <section className="bg-slate-50 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-10">
              <span className="text-xs font-black text-blue-600 uppercase tracking-[0.3em]">Venue</span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">会場アクセス</h2>
              <div className="w-16 h-1 bg-blue-600 mx-auto mt-4 rounded-full" />
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
              <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2"><MapPin size={20} className="text-blue-600" /> {event.venueName}</h3>
              {event.venueAddress && <p className="text-slate-600 font-medium mb-4">{event.venueAddress}</p>}
              {event.venueAccess && <div className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border-l-4 border-blue-600 mb-6 font-bold leading-relaxed">{event.venueAccess}</div>}
              {event.venueAddress && (
                <div className="rounded-xl overflow-hidden border border-slate-200 aspect-video">
                  <iframe width="100%" height="100%" style={{ border: 0 }} src={`https://www.google.com/maps?q=${encodeURIComponent(event.venueAddress)}&z=15&output=embed`} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ===== 申し込みセクション ===== */}
      <section id="entry-form" className="py-16 bg-gradient-to-b from-white to-blue-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-10">
            <span className="text-xs font-black text-orange-500 uppercase tracking-[0.3em]">Entry</span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 mt-2">お申し込みフォーム</h2>
            <div className="w-16 h-1 bg-orange-500 mx-auto mt-4 rounded-full" />
          </div>

          {/* チケット・料金 */}
          <div className="mb-8 space-y-3">
            {(event.tickets && event.tickets.length > 0) ? (
              event.tickets.map((t: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-5 rounded-xl bg-white border-2 border-slate-100 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase">Ticket</span>
                    <div className="text-sm font-black text-slate-900">{t.name}</div>
                  </div>
                  <span className="text-xl font-black text-blue-600">{t.price === 0 ? "無料" : `¥${t.price.toLocaleString()}`}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between items-center p-5 rounded-xl bg-white border-2 border-slate-100 shadow-sm">
                <span className="font-black text-slate-900">参加費</span>
                <span className="text-xl font-black text-blue-600">{event.price === "無料" ? "無料" : `¥${Number(event.price).toLocaleString()}`}</span>
              </div>
            )}
            {event.capacity && (
              <div className="flex items-center justify-center gap-2 text-sm text-orange-600 font-bold bg-orange-50 p-3 rounded-xl border border-orange-100">
                <AlertCircle size={16} /> 定員 {event.capacity}名（先着順・残席わずか）
              </div>
            )}
          </div>

          {/* フォーム */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-slate-100">
            <ReservationForm tenantId={tenantId} eventId={eventId} event={event} tenantData={tenant} onSuccess={handleFormSuccess} />
          </div>
        </div>
      </section>

      {/* ===== お問い合わせ ===== */}
      <section className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-100 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Mail size={24} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900">お問い合わせ</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</p>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700"><User size={14} className="text-blue-600" /> {event.contactName || tenant?.name}</div>
            {event.contactEmail && <a href={`mailto:${event.contactEmail}`} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors"><Mail size={14} className="text-blue-600" /> {event.contactEmail}</a>}
            {event.contactPhone && <a href={`tel:${event.contactPhone}`} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-blue-600 transition-colors"><Phone size={14} className="text-blue-600" /> {event.contactPhone}</a>}
          </div>
        </div>
      </section>

      {/* ===== フッター ===== */}
      <footer className="text-center py-12 border-t border-slate-100">
        {tenant?.logoUrl && <img src={tenant.logoUrl} className="h-8 mx-auto mb-4 opacity-60 grayscale hover:grayscale-0 transition-all" alt="logo" />}
        <div className="flex justify-center gap-6 mb-4">
          <Link href={`/${tenantId}/legal`} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline decoration-slate-200 underline-offset-4">特定商取引法に基づく表記</Link>
        </div>
        <p className="text-[10px] font-black text-slate-400 tracking-[0.5em] uppercase">© {new Date().getFullYear()} {tenant?.name || "Event Manager"}</p>
        <div className="mt-3 px-4 py-1 rounded-full bg-slate-900 text-white text-[8px] font-bold tracking-widest uppercase opacity-20 inline-block">Powered by 絆太郎 Event Manager</div>
      </footer>

      {/* ===== モバイル固定CTAボタン ===== */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-white/90 backdrop-blur-md border-t border-slate-200 md:hidden">
          <button onClick={scrollToForm} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Zap size={20} /> 今すぐ申し込む
          </button>
        </div>
      )}
    </div>
  );
}
