"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Calendar, Clock, MapPin, Users, Printer } from "lucide-react";

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${weekdays[d.getDay()]})`;
  } catch {
    return dateStr;
  }
}

export default function FlyerPage() {
  const params = useParams();
  const tenantId = (Array.isArray(params?.tenant) ? params.tenant[0] : params?.tenant) || "";
  const eventId = (Array.isArray(params?.event) ? params.event[0] : params?.event) || "";

  const [event, setEvent] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId || !tenantId) return;
      try {
        const [eventSnap, tenantSnap] = await Promise.all([
          getDoc(doc(db, "events", eventId)),
          getDoc(doc(db, "tenants", tenantId)),
        ]);
        if (eventSnap.exists()) setEvent({ id: eventSnap.id, ...eventSnap.data() });
        if (tenantSnap.exists()) setTenant({ id: tenantSnap.id, ...tenantSnap.data() });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, tenantId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">読み込み中...</div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-slate-400">イベントが見つかりません</div>;

  const themeColor = tenant?.themeColor || "#3b82f6";
  const orgName = tenant?.orgName || tenant?.name || "";
  const eventUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/t/${tenantId}/e/${eventId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(eventUrl)}`;

  const lecturers = event.lecturers || (event.lecturer ? [{ name: event.lecturer, title: event.lecturerTitle, image: event.lecturerImage }] : []);

  return (
    <>
      {/* 印刷ボタン（印刷時は非表示） */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-colors"
        >
          <Printer size={18} /> 印刷 / PDF保存
        </button>
      </div>

      {/* チラシ本体 */}
      <div className="flyer-page w-[210mm] min-h-[297mm] mx-auto bg-white relative overflow-hidden print:shadow-none shadow-2xl font-sans" style={{ fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>

        {/* ヘッダーバー */}
        <div className="h-2" style={{ backgroundColor: themeColor }} />

        {/* バナー画像 */}
        {event.ogpImage && (
          <div className="w-full h-[380px] overflow-hidden">
            <img src={event.ogpImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="px-10 py-4">

          {/* 主催者名 */}
          {orgName && (
            <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: themeColor }}>
              {orgName}
            </p>
          )}

          {/* タイトル */}
          <h1 className="text-2xl font-black text-slate-900 leading-tight mb-4" style={{ borderLeft: `5px solid ${themeColor}`, paddingLeft: "14px" }}>
            {event.title}
          </h1>

          {/* イベント情報カード */}
          <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: themeColor }} className="shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">開催日</p>
                  <p className="text-xs font-bold text-slate-800">{formatDate(event.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} style={{ color: themeColor }} className="shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">時間</p>
                  <p className="text-xs font-bold text-slate-800">{event.startTime} - {event.endTime}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} style={{ color: themeColor }} className="shrink-0" />
                <div>
                  <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">会場</p>
                  <p className="text-xs font-bold text-slate-800">{event.venueName || "オンライン"}</p>
                </div>
              </div>
              {event.capacity && (
                <div className="flex items-center gap-2">
                  <Users size={14} style={{ color: themeColor }} className="shrink-0" />
                  <div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase leading-none">定員</p>
                    <p className="text-xs font-bold text-slate-800">{event.capacity}名</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 講師情報 */}
          {lecturers.length > 0 && (
            <div className="mb-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-6 h-px" style={{ backgroundColor: themeColor }} />
                講師紹介
              </h3>
              <div className="space-y-2">
                {lecturers.map((lec: any, i: number) => (
                  <div key={i} className="flex items-start gap-3">
                    {lec.image && (
                      <img src={lec.image} alt={lec.name} className="w-12 h-12 rounded-full object-cover border-2 shrink-0" style={{ borderColor: themeColor }} />
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-slate-900 text-sm">{lec.name}</p>
                      {lec.title && <p className="text-[10px] text-slate-500 leading-snug">{lec.title}</p>}
                      {(lec.profile || lec.lecturerProfile) && (
                        <p className="text-[10px] text-slate-600 leading-relaxed mt-1 line-clamp-3">{lec.profile || lec.lecturerProfile}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 概要テキスト */}
          {event.content && (
            <div className="mb-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-6 h-px" style={{ backgroundColor: themeColor }} />
                内容
              </h3>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-[8]">
                {event.content}
              </div>
            </div>
          )}

          {/* タイムスケジュール */}
          {event.timeTable && (
            <div className="mb-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-6 h-px" style={{ backgroundColor: themeColor }} />
                タイムスケジュール
              </h3>
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {event.timeTable}
              </div>
            </div>
          )}
        </div>

        {/* フッター：QRコード + 参加費 + 申し込み案内 */}
        <div className="absolute bottom-0 left-0 right-0 px-10 pb-4">
          <div className="border-t-2 pt-3 flex items-center justify-between" style={{ borderColor: themeColor }}>
            <div className="flex-1">
              <p className="text-base font-black text-slate-900 mb-0.5">お申し込みはこちら</p>
              {event.price && (
                <p className="text-sm font-black mb-1" style={{ color: themeColor }}>
                  {event.price === "0" || event.price === "無料" ? "参加無料" : `参加費 ${Number(event.price).toLocaleString()}円`}
                </p>
              )}
              <p className="text-[10px] text-slate-500 mb-1">QRコードを読み取るか、下記URLからお申し込みください。</p>
              <p className="text-[9px] text-slate-400 break-all font-mono">{eventUrl}</p>
              {event.contactEmail && (
                <p className="text-[9px] text-slate-400 mt-1">お問い合わせ: {event.contactEmail}</p>
              )}
            </div>
            <div className="shrink-0 ml-4">
              <div className="bg-white p-1.5 border border-slate-200 rounded-lg">
                <img src={qrUrl} alt="QR" width={80} height={80} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 印刷用CSS */}
      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .flyer-page { width: 210mm; min-height: 297mm; margin: 0; padding: 0; box-shadow: none; }
          @page { size: A4; margin: 0; }
        }
        @media screen {
          body { background-color: #e2e8f0; }
          .flyer-page { margin-top: 40px; margin-bottom: 40px; }
        }
      `}</style>
    </>
  );
}
