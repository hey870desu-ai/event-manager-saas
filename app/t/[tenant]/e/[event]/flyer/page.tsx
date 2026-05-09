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
      <div className="flyer-page w-[210mm] h-[297mm] mx-auto bg-white overflow-hidden print:shadow-none shadow-2xl font-sans flex flex-col" style={{ fontFamily: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif" }}>

        {/* ヘッダーバー */}
        <div className="h-2" style={{ backgroundColor: themeColor }} />

        {/* バナー画像 */}
        {event.ogpImage && (
          <div className="w-full h-[380px] overflow-hidden">
            <img src={event.ogpImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="px-10 py-4 flex-1 overflow-hidden">

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

          {/* 講師紹介 + 内容：2カラム */}
          <div className="grid grid-cols-2 gap-5 mb-3">
            {/* 左：講師情報 */}
            <div>
              {lecturers.length > 0 && (
                <>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-6 h-px" style={{ backgroundColor: themeColor }} />
                    講師紹介
                  </h3>
                  <div className="space-y-3">
                    {lecturers.map((lec: any, i: number) => (
                      <div key={i}>
                        <div className="flex items-center gap-3 mb-1">
                          {lec.image && (
                            <img src={lec.image} alt={lec.name} className="w-16 h-16 rounded-lg object-cover border-2 shrink-0" style={{ borderColor: themeColor }} />
                          )}
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 text-sm">{lec.name}</p>
                            {lec.title && <p className="text-[10px] text-slate-500 leading-snug">{lec.title}</p>}
                          </div>
                        </div>
                        {(lec.profile || lec.lecturerProfile) && (
                          <p className="text-[10px] text-slate-600 leading-relaxed">{lec.profile || lec.lecturerProfile}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 右：内容 */}
            <div>
              {event.content && (
                <>
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span className="w-6 h-px" style={{ backgroundColor: themeColor }} />
                    内容
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {event.content}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* タイムスケジュール */}
          {event.timeTable && (
            <div className="mb-3 pl-[1cm]">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="w-6 h-px" style={{ backgroundColor: themeColor }} />
                タイムスケジュール
              </h3>
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {event.timeTable}
              </div>
            </div>
          )}
        </div>

        {/* フッター：3カラム */}
        <div className="px-10 pb-4 mt-auto shrink-0">
          <div className="border-t-2 pt-3" style={{ borderColor: themeColor }}>
            <div className="grid grid-cols-3 gap-2">
              {/* 左：お問い合わせ */}
              <div>
                <p className="text-sm font-black text-slate-900 mb-1">お問い合わせ</p>
                {event.contactName && (
                  <p className="text-xs text-slate-700 font-bold">{event.contactName}</p>
                )}
                {event.contactPhone && (
                  <p className="text-xs text-slate-600">TEL: {event.contactPhone}</p>
                )}
                {event.contactEmail && (
                  <p className="text-xs text-slate-600">MAIL: {event.contactEmail}</p>
                )}
              </div>

              {/* 中央：料金 */}
              <div className="text-center">
                <p className="text-sm font-black text-slate-900 mb-1">料金</p>
                {event.tickets && event.tickets.length > 0 ? (
                  <div className="space-y-0.5">
                    {event.tickets.map((t: any, i: number) => (
                      <p key={i} className="text-xs font-bold" style={{ color: themeColor }}>
                        {t.name}: {t.price === 0 ? "無料" : `¥${Number(t.price).toLocaleString()}`}
                      </p>
                    ))}
                  </div>
                ) : event.price ? (
                  <p className="text-sm font-black" style={{ color: themeColor }}>
                    {event.price === "0" || event.price === "無料" ? "参加無料" : `参加費 ${Number(event.price).toLocaleString()}円`}
                  </p>
                ) : null}
              </div>

              {/* 右：申し込み + QR */}
              <div className="text-center flex flex-col items-center justify-center">
                <p className="text-xs font-black text-slate-900 mb-1">お申し込みはこちら</p>
                <div className="bg-white p-1.5 border border-slate-200 rounded-lg">
                  <img src={qrUrl} alt="QR" width={70} height={70} />
                </div>
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
