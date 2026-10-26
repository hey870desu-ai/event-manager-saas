"use client";

// イベントのまとめの中身（読み込みは app/admin/events/[eventId]/report/page.tsx）
//   1件のイベントの、申込から事後アンケートまでを1枚に集める。
//   申込・取り消し・出席・お金・送ったメール・事前アンケート・事後アンケート（・参加者の一覧）。
//   「印刷・PDFで保存」で A4 縦に出す。CSV で参加者（申込欄と事前アンケートの回答つき）と事後アンケートを出す

import React, { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { answerEntries, answerValue, customAnswerValue, fieldOptions, answerText } from "@/lib/survey-answers";
import { ArrowLeft, Printer, FileDown, Lock } from "lucide-react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export type ReportData = {
  event: any;
  tenant: any;
  reservations: any[];
  feedbacks: any[];
  preFeedbacks: any[];
  mails: any[];
  pastEmails: Set<string>; // この回より前の回に申し込んだ人（取り消しを除く）
};

type QSummary = {
  label: string;
  kind: "choice" | "text";
  answered: number;
  options: { label: string; count: number }[];
  texts: { text: string; who: string }[];
};

// 日本時間の YYYY-MM-DD
const jstDay = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(d);
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
const ymdLabel = (ymd: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  if (!m) return ymd || "";
  const w = WEEKDAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()];
  return `${+m[1]}年${+m[2]}月${+m[3]}日（${w}）`;
};
const mdLabel = (ymd: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || "");
  return m ? `${+m[2]}/${+m[3]}` : ymd;
};
const dateTimeLabel = (d: Date | null) =>
  d ? d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const csvDateTime = (d: Date | null) =>
  d ? d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
const yen = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;
// 質問の文は1行目だけ（同意の文のような長い質問は「…」で切る）
const shortLabel = (label: string) => {
  const lines = String(label || "").split("\n").map(l => l.trim()).filter(Boolean);
  const first = lines[0] || "";
  return first.length > 80 ? `${first.slice(0, 80)}…` : lines.length > 1 ? `${first}…` : first;
};
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");
const addDays = (ymd: string, days: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

// 選ぶ質問の回答を選択肢の名前にする（古い同意のチェックは true で入っていることがある）
const choiceKey = (x: any, options: string[]) => (x === true ? (options[0] ?? "はい") : String(x));

const isCancelled = (r: any) => r.status === "cancelled";
const isAttended = (r: any) => r.checkedIn === true || r.status === "attended";
const isPaidOnline = (r: any) => r.status === "paid" || r.paymentStatus === "paid";
const emailKey = (e: any) => String(e || "").trim().toLowerCase();

// 質問ごとに集計する（選ぶ質問は選択肢ごとの数・書く質問は回答の一覧）
function summarize(fields: any[], responses: any[], whoOf: (resp: any) => string): QSummary[] {
  const list = (Array.isArray(fields) ? fields : []).filter(f => f && f.type !== "link" && String(f.label || "").trim());
  const known = new Set(list.map(f => f.label));
  // 質問を消したり名前を変えたりした前の回答も落とさない
  const extra = Array.from(new Set(responses.flatMap(r => answerEntries(r.answers).map(([k]) => k))))
    .filter(k => k && !known.has(k));
  const questions = [
    ...list.map(f => ({ label: String(f.label), type: String(f.type || "text"), field: f })),
    ...extra.map(label => ({ label, type: "text", field: null as any })),
  ];
  return questions.map(q => {
    const answered = responses
      .map(r => ({ v: answerValue(r.answers, q.label), r }))
      .filter(x => answerText(x.v).trim() !== "");
    if (q.type === "select" || q.type === "checkbox") {
      const options = fieldOptions(q.field);
      const counts = new Map<string, number>(options.map(o => [o, 0]));
      answered.forEach(({ v }) => {
        (Array.isArray(v) ? v : [v]).forEach(x => {
          const k = choiceKey(x, options);
          counts.set(k, (counts.get(k) || 0) + 1);
        });
      });
      return {
        label: q.label, kind: "choice" as const, answered: answered.length,
        options: Array.from(counts, ([label, count]) => ({ label, count })), texts: [],
      };
    }
    return {
      label: q.label, kind: "text" as const, answered: answered.length, options: [],
      texts: answered.map(({ v, r }) => ({ text: answerText(v), who: whoOf(r) })),
    };
  });
}

export default function EventReportView({ data, isSuper }: { data: ReportData; isSuper: boolean }) {
  const [showNames, setShowNames] = useState(true);
  const [showList, setShowList] = useState(false);

  const report = useMemo(() => {
    if (!data) return null;
    const { event, reservations, feedbacks, preFeedbacks, mails, pastEmails } = data;
    const today = jstDay(new Date());
    const byCreated = (a: any, b: any) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0);
    const all = [...reservations].sort(byCreated);
    const active = all.filter(r => !isCancelled(r));
    const cancelled = all.filter(isCancelled);
    const attended = active.filter(isAttended);
    const eventDate = String(event.date || "");
    const held = !!eventDate && eventDate <= today;

    // チケットごと（イベントの設定の順。設定に無い名前はあとに）
    const ticketOrder: string[] = (Array.isArray(event.tickets) ? event.tickets : []).map((t: any) => String(t?.name || "")).filter(Boolean);
    const ticketMap = new Map<string, { name: string; count: number; attended: number; amount: number }>();
    ticketOrder.forEach(n => ticketMap.set(n, { name: n, count: 0, attended: 0, amount: 0 }));
    active.forEach(r => {
      const n = String(r.selectedTicket || "") || (ticketOrder[0] || "通常参加");
      const row = ticketMap.get(n) || { name: n, count: 0, attended: 0, amount: 0 };
      row.count += 1;
      row.attended += isAttended(r) ? 1 : 0;
      row.amount += Number(r.price) || 0;
      ticketMap.set(n, row);
    });
    const tickets = Array.from(ticketMap.values()).filter(t => t.count > 0 || ticketOrder.length > 1);
    const hasMoney = active.some(r => (Number(r.price) || 0) > 0) || (Array.isArray(event.tickets) && event.tickets.some((t: any) => Number(t?.price) > 0));
    const amountTotal = active.reduce((s, r) => s + (Number(r.price) || 0), 0);
    const amountOnline = active.filter(isPaidOnline).reduce((s, r) => s + (Number(r.price) || 0), 0);
    const refunds = all.reduce((s, r) => s + (Number(r.refundAmount) || 0), 0);

    // 参加の形（会場とオンラインの両方があるときだけ出す）
    const online = active.filter(r => r.type === "online").length;
    const repeaters = active.filter(r => pastEmails.has(emailKey(r.email))).length;

    // 申込の流れ（31日までは1日ごと・それより長いときは1週間ごと）
    const days = active.map(r => toDate(r.createdAt)).filter(Boolean).map(d => jstDay(d as Date)).sort();
    const first = days[0] || "";
    const last = days[days.length - 1] || "";
    let flow: { label: string; count: number }[] = [];
    if (first) {
      const span = Math.round((Date.parse(last) - Date.parse(first)) / 86400000) + 1;
      const step = span > 31 ? 7 : 1;
      const counts = new Map<string, number>();
      days.forEach(d => {
        const idx = Math.floor((Date.parse(d) - Date.parse(first)) / 86400000 / step);
        const key = addDays(first, idx * step);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      for (let k = first; k <= last; k = addDays(k, step)) flow.push({ label: k, count: counts.get(k) || 0 });
      if (flow.length > 40) flow = flow.slice(-40);
      if (step === 7) flow = flow.map(f => ({ ...f, label: `${mdLabel(f.label)}〜` }));
      else flow = flow.map(f => ({ ...f, label: mdLabel(f.label) }));
    }
    const weekBefore = eventDate ? active.filter(r => { const d = toDate(r.createdAt); return d && jstDay(d) <= addDays(eventDate, -7); }).length : 0;

    // 申込欄の選ぶ質問（プルダウン・チェックボックス）
    const formChoices: { label: string; answered: number; options: { label: string; count: number }[] }[] =
      (Array.isArray(event.customFields) ? event.customFields : [])
      .filter((f: any) => (f?.type === "select" || f?.type === "checkbox") && String(f?.label || "").trim())
      .map((f: any) => {
        const options = fieldOptions(f);
        const counts = new Map<string, number>(options.map(o => [o, 0]));
        let answered = 0;
        active.forEach(r => {
          const v = customAnswerValue(r.customAnswers, f.label);
          if (answerText(v).trim() === "") return;
          answered += 1;
          (Array.isArray(v) ? v : [v]).forEach(x => {
            const k = choiceKey(x, options);
            counts.set(k, (counts.get(k) || 0) + 1);
          });
        });
        return { label: String(f.label), answered, options: Array.from(counts, ([label, count]) => ({ label, count })) };
      });

    // 送ったメール（申込の確認メールは申込のたびに自動で送るので、ここには一斉に送った分が並ぶ）
    const mailRows = [...mails]
      .map(m => ({ ...m, at: toDate(m.sentAt) || toDate(m.scheduledAt) || toDate(m.createdAt) }))
      .sort((a, b) => (a.at?.getTime() || 0) - (b.at?.getTime() || 0));

    // 事前アンケート：申込の記録とつないで名前を出す
    const byId = new Map(all.map(r => [r.id, r]));
    const preWho = (p: any) => {
      const r = p.reservationId ? byId.get(p.reservationId) : null;
      return r ? String(r.name || "") : "";
    };
    const preIds = new Set(preFeedbacks.map(p => p.reservationId).filter(Boolean));
    const pre = summarize(event.preSurveyFields, preFeedbacks, preWho);
    const post = summarize(event.surveyFields, feedbacks, () => "");
    const ratings = feedbacks.map(f => Number(f.rating) || 0).filter(v => v > 0);
    const ratingAvg = ratings.length ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0;
    const ratingDist = [5, 4, 3, 2, 1].map(star => ({ star, count: ratings.filter(v => v === star).length }));

    return {
      today, held, all, active, cancelled, attended, tickets, hasMoney, amountTotal, amountOnline, refunds,
      online, repeaters, flow, first, last, weekBefore, formChoices, mailRows, pre, post, preIds,
      ratings, ratingAvg, ratingDist,
    };
  }, [data]);

  const plan = String(data?.tenant?.plan || "").toUpperCase();
  const locked = plan === "FREE" && !isSuper;

  const downloadCsv = (rows: string[][], filename: string) => {
    const esc = (s: string) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const csv = rows.map(r => r.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csv], { type: "text/csv" }));
    a.download = filename;
    a.click();
  };

  // 参加者（申込欄と事前アンケートの回答つき）。取り消しの方は最後に
  const downloadParticipantsCsv = () => {
    if (!data || !report) return;
    const { event, preFeedbacks, pastEmails } = data;
    const formFields = (Array.isArray(event.customFields) ? event.customFields : []).filter((f: any) => f?.type !== "link" && f?.label);
    const preFields = (Array.isArray(event.preSurveyFields) ? event.preSurveyFields : []).filter((f: any) => f?.type !== "link" && f?.label);
    const preById = new Map(preFeedbacks.filter(p => p.reservationId).map(p => [p.reservationId, p]));
    const header = ["状態", "名前", "メール", "電話", "参加の形", "チケット", "金額", "初めて／2回目以上",
      ...formFields.map((f: any) => String(f.label)), ...preFields.map((f: any) => `事前：${f.label}`), "申込日時"];
    const rows = [...report.active, ...report.cancelled].map(r => {
      const p = preById.get(r.id);
      return [
        isCancelled(r) ? "取り消し" : isAttended(r) ? "出席" : (report.held && report.attended.length > 0 ? "受付なし" : "申込"),
        String(r.name || ""), String(r.email || ""), String(r.phone || ""),
        r.type === "online" ? "オンライン" : "会場",
        String(r.selectedTicket || ""), String(Number(r.price) || 0),
        pastEmails.has(emailKey(r.email)) ? "2回目以上" : "初めて",
        ...formFields.map((f: any) => answerText(customAnswerValue(r.customAnswers, f.label))),
        ...preFields.map((f: any) => (p ? answerText(answerValue(p.answers, f.label)) : "")),
        csvDateTime(toDate(r.createdAt)),
      ];
    });
    downloadCsv([header, ...rows], `${event.title || "イベント"}_参加者と事前アンケート.csv`);
  };

  const downloadPostCsv = () => {
    if (!data) return;
    const { event, feedbacks } = data;
    const labels = Array.from(new Set([
      ...(Array.isArray(event.surveyFields) ? event.surveyFields : []).filter((f: any) => f?.type !== "link" && f?.label).map((f: any) => String(f.label)),
      ...feedbacks.flatMap(f => answerEntries(f.answers).map(([k]) => k)),
    ])).filter(Boolean);
    const sorted = [...feedbacks].sort((a, b) => (toDate(a.createdAt)?.getTime() || 0) - (toDate(b.createdAt)?.getTime() || 0));
    const rows = sorted.map(f => [
      csvDateTime(toDate(f.createdAt)),
      Number(f.rating) > 0 ? String(f.rating) : "",
      ...labels.map(l => answerText(answerValue(f.answers, l))),
    ]);
    downloadCsv([["回答日時", "満足度", ...labels], ...rows], `${event.title || "イベント"}_事後アンケート.csv`);
  };

  if (!report) return null;

  const { event, tenant } = data;
  const r = report;
  const tenantName = String(tenant?.orgName || tenant?.name || "").replace(/・$/, "");
  const lecturers = (Array.isArray(event.lecturers) ? event.lecturers : []).map((l: any) => String(l?.name || "")).filter(Boolean);
  const place = [event.hasOffline !== false && event.venueName ? `会場：${event.venueName}` : "", event.hasOnline ? "オンラインあり" : ""].filter(Boolean).join("・");
  const time = [event.startTime, event.endTime].filter(Boolean).join("〜");
  const flowMax = Math.max(1, ...r.flow.map(f => f.count));
  // 事後アンケートの回答の割合：出席の数で割る。出席の記録が回答より少ない（オンラインの方を受付していない など）ときは申込の数で割る
  const postBase = r.attended.length >= data.feedbacks.length && r.attended.length > 0
    ? { n: r.attended.length, label: "出席" }
    : { n: r.active.length, label: "申込" };
  const summaryRows: [string, React.ReactNode][] = [
    ["申込", `${r.active.length}名${event.capacity ? `（定員 ${event.capacity}名）` : ""}`],
    ["取り消し", `${r.cancelled.length}名`],
    ["出席", r.attended.length > 0 ? `${r.attended.length}名（${pct(r.attended.length, r.active.length)}）` : r.held ? "受付の記録なし" : "開催前"],
    ["初めての方", `${r.active.length - r.repeaters}名（2回目以上 ${r.repeaters}名）`],
    ["事前アンケート", (event.preSurveyFields?.length || 0) > 0 ? `${data.preFeedbacks.length}件（${pct(data.preFeedbacks.length, r.active.length)}）` : "設定なし"],
    // 「満足度」は途中で折れないように、かたまりごとに折り返す
    ["事後アンケート", <>
      <span className="inline-block">{data.feedbacks.length}件{r.held && data.feedbacks.length > 0 ? `（${postBase.label}の${pct(data.feedbacks.length, postBase.n)}）` : ""}</span>
      {r.ratings.length > 0 && <span className="inline-block">・満足度 {r.ratingAvg.toFixed(1)}</span>}
    </>],
    ...(r.hasMoney ? [
      ["申込の金額", yen(r.amountTotal)] as [string, React.ReactNode],
      ["うちカード決済", `${r.amountOnline > 0 || r.refunds > 0 ? yen(r.amountOnline) : "なし（当日払いなど）"}${r.refunds > 0 ? `（返金 ${yen(r.refunds)}）` : ""}`] as [string, React.ReactNode],
    ] : []),
  ];

  return (
    <div className="report-root min-h-screen bg-slate-100 text-slate-800 py-6 px-3 md:px-6">
      <style>{`
        .report-print-space { display: none; }
        .report-bar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #fff !important; margin: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .report-root { background: #fff !important; padding: 0 !important; min-height: 0 !important; }
          .report-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; max-width: none !important; padding: 0 14mm !important; border-radius: 0 !important; }
          .report-print-space { display: block; height: 12mm; }
          .report-block { break-inside: avoid; page-break-inside: avoid; }
          .report-keep-next { break-after: avoid; page-break-after: avoid; }
          .report-sheet tr { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* 画面だけの操作の帯（印刷には出ない） */}
      <div className="no-print max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center gap-2">
        <Link href="/admin" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 mr-auto">
          <ArrowLeft size={16} /> イベントの一覧へ
        </Link>
        {!locked && (
          <>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> 事前アンケートに名前を出す
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-300 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={showList} onChange={e => setShowList(e.target.checked)} /> 参加者の一覧を入れる
            </label>
            <button onClick={downloadParticipantsCsv} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2">
              <FileDown size={14} /> 参加者と事前アンケートのCSV
            </button>
            <button onClick={downloadPostCsv} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg px-3 py-2">
              <FileDown size={14} /> 事後アンケートのCSV
            </button>
            {/* window.print() は押したその場で呼ぶ（待ってから呼ぶと止められる） */}
            <button onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2">
              <Printer size={14} /> 印刷・PDFで保存
            </button>
          </>
        )}
      </div>

      <div className="report-sheet max-w-[210mm] mx-auto bg-white shadow-sm border border-slate-200 rounded-lg px-5 py-6 md:px-[14mm] md:py-[12mm]">
        {/* 印刷のとき、2枚目からも上下の余白が付くように thead・tfoot を毎ページくり返す */}
        <table className="w-full border-collapse">
          <thead><tr><td><div className="report-print-space" /></td></tr></thead>
          <tfoot><tr><td><div className="report-print-space" /></td></tr></tfoot>
          <tbody><tr><td className="align-top">

            {/* 見出し */}
            <header className="report-block border-b-2 border-slate-800 pb-3 mb-5">
              <p className="text-xs text-slate-500">{tenantName ? `${tenantName}　` : ""}イベントのまとめ（{ymdLabel(r.today)} 時点）</p>
              <h1 className="text-xl md:text-2xl font-black leading-snug mt-1">{event.title}</h1>
              <p className="text-sm text-slate-700 mt-1">
                {ymdLabel(String(event.date || ""))}{time ? `　${time}` : ""}{place ? `　${place}` : ""}
              </p>
              {lecturers.length > 0 && <p className="text-sm text-slate-700">講師：{lecturers.join("・")}</p>}
            </header>

            {/* 数字のまとめ */}
            <section className="report-block mb-6">
              <h2 className="text-base font-black border-l-4 border-indigo-600 pl-2 mb-2">数字のまとめ</h2>
              {/* スマホでは1行に1項目、PC と紙では1行に2項目（項目名は折り返さない） */}
              <div className="grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto_1fr] border-t border-l border-slate-300 text-sm">
                {summaryRows.map(([k, v]) => (
                  <Fragment key={k}>
                    <div className="bg-slate-50 font-bold px-3 py-2 border-r border-b border-slate-300 whitespace-nowrap">{k}</div>
                    <div className="px-3 py-2 border-r border-b border-slate-300">{v}</div>
                  </Fragment>
                ))}
              </div>
            </section>

            {locked ? (
              <section className="report-block mb-6 border border-indigo-200 bg-indigo-50 rounded-lg p-6 text-center">
                <Lock size={24} className="text-indigo-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800 mb-1">申込の内訳・送ったメール・アンケートの質問ごとの集計と、印刷・CSV は有料プランで使えます</p>
                {data.preFeedbacks.length + data.feedbacks.length > 0 && (
                  <p className="text-xs text-slate-600">事前アンケート {data.preFeedbacks.length}件・事後アンケート {data.feedbacks.length}件の回答が届いています。</p>
                )}
              </section>
            ) : (
              <>
                {/* 申込の内訳 */}
                <section className="mb-6">
                  <h2 className="report-keep-next text-base font-black border-l-4 border-indigo-600 pl-2 mb-2">申込の内訳</h2>
                  {r.tickets.length > 0 && (
                    <table className="w-full text-sm border border-slate-300 mb-3">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <th className="text-left font-bold px-3 py-1.5 border-r border-slate-300">チケット</th>
                          <th className="text-right font-bold px-3 py-1.5 border-r border-slate-300 whitespace-nowrap">申込</th>
                          <th className="text-right font-bold px-3 py-1.5 border-r border-slate-300 whitespace-nowrap">出席</th>
                          <th className="text-right font-bold px-3 py-1.5 whitespace-nowrap">金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.tickets.map(t => (
                          <tr key={t.name} className="border-b border-slate-200 last:border-b-0">
                            <td className="px-3 py-1.5 border-r border-slate-300">{t.name}</td>
                            <td className="px-3 py-1.5 text-right border-r border-slate-300 whitespace-nowrap">{t.count}名</td>
                            <td className="px-3 py-1.5 text-right border-r border-slate-300 whitespace-nowrap">{r.attended.length > 0 ? `${t.attended}名` : "—"}</td>
                            <td className="px-3 py-1.5 text-right whitespace-nowrap">{yen(t.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {event.hasOnline && event.hasOffline !== false && (
                    <p className="text-sm mb-2">参加の形：会場 {r.active.length - r.online}名・オンライン {r.online}名</p>
                  )}
                  {r.formChoices.map(q => (
                    <ChoiceBlock key={q.label} label={`申込欄：${q.label}`} answered={q.answered} options={q.options} />
                  ))}
                </section>

                {/* 申込の流れ */}
                {r.flow.length > 0 && (
                  <section className="report-block mb-6">
                    <h2 className="text-base font-black border-l-4 border-indigo-600 pl-2 mb-2">申込の流れ</h2>
                    <p className="text-sm mb-2">
                      最初の申込 {ymdLabel(r.first)}・最後の申込 {ymdLabel(r.last)}
                      {event.date ? `・開催の1週間前までに ${r.weekBefore}名（${pct(r.weekBefore, r.active.length)}）` : ""}
                    </p>
                    <div className="flex items-end gap-[2px] h-28 border-b border-slate-400">
                      {r.flow.map((f, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                          {f.count > 0 && <span className="text-[9px] text-slate-600 leading-none mb-0.5">{f.count}</span>}
                          <div className="report-bar w-full bg-indigo-400" style={{ height: `${(f.count / flowMax) * 85}%` }} />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-[2px] mt-0.5">
                      {r.flow.map((f, i) => (
                        <div key={i} className="flex-1 min-w-0 text-center text-[9px] text-slate-500 leading-tight overflow-hidden whitespace-nowrap">
                          {i === 0 || i === r.flow.length - 1 || i % Math.max(1, Math.ceil(r.flow.length / 8)) === 0 ? f.label : ""}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* 送ったメール */}
                <section className="mb-6">
                  <h2 className="report-keep-next text-base font-black border-l-4 border-indigo-600 pl-2 mb-2">送ったメール</h2>
                  <p className="text-xs text-slate-600 mb-2">申込の確認メール（QRコードつき）は、申込のたびに自動で送っています。下は一斉に送った分と予約した分です。</p>
                  {r.mailRows.length === 0 ? (
                    <p className="text-sm text-slate-500">一斉に送ったメールはまだありません。</p>
                  ) : (
                    <table className="w-full text-sm border border-slate-300">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <th className="text-left font-bold px-3 py-1.5 border-r border-slate-300 whitespace-nowrap">日時</th>
                          <th className="text-left font-bold px-3 py-1.5 border-r border-slate-300">件名</th>
                          <th className="text-right font-bold px-3 py-1.5 border-r border-slate-300 whitespace-nowrap">宛先</th>
                          <th className="text-left font-bold px-3 py-1.5 whitespace-nowrap">状態</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.mailRows.map(m => (
                          <tr key={m.id} className="border-b border-slate-200 last:border-b-0">
                            <td className="px-3 py-1.5 border-r border-slate-300 whitespace-nowrap">{dateTimeLabel(m.at)}</td>
                            <td className="px-3 py-1.5 border-r border-slate-300">{String(m.subject || "")}</td>
                            <td className="px-3 py-1.5 text-right border-r border-slate-300 whitespace-nowrap">{Array.isArray(m.recipients) ? `${m.recipients.length}名` : ""}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap">{m.status === "sent" ? "送った" : m.status === "pending" || m.status === "scheduled" ? "予約中" : m.status === "failed" ? "送れなかった" : String(m.status || "")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                {/* 事前アンケート */}
                <section className="mb-6">
                  <h2 className="report-keep-next text-base font-black border-l-4 border-purple-600 pl-2 mb-2">
                    事前アンケート{(event.preSurveyFields?.length || 0) > 0 ? `（回答 ${data.preFeedbacks.length}件／申込 ${r.active.length}名）` : ""}
                  </h2>
                  {(event.preSurveyFields?.length || 0) === 0 && data.preFeedbacks.length === 0 ? (
                    <p className="text-sm text-slate-500">事前アンケートは設定されていません。<span className="no-print">イベントの編集の「事前アンケート」で質問を作ると、申込の確認メールと申込のあとの画面に回答のボタンが出ます。</span></p>
                  ) : (
                    r.pre.map(q => q.kind === "choice"
                      ? <ChoiceBlock key={q.label} label={q.label} answered={q.answered} options={q.options} />
                      : <TextBlock key={q.label} label={q.label} texts={q.texts} showWho={showNames} />)
                  )}
                </section>

                {/* 事後アンケート */}
                <section className="mb-6">
                  <h2 className="report-keep-next text-base font-black border-l-4 border-emerald-600 pl-2 mb-2">
                    事後アンケート（回答 {data.feedbacks.length}件{r.attended.length > 0 ? `／出席 ${r.attended.length}名` : ""}）
                  </h2>
                  {data.feedbacks.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      {(event.surveyFields?.length || 0) > 0
                        ? <>まだ回答はありません。<span className="no-print">お礼のメールのテンプレート「事後アンケート」を使うと、回答のボタンが入ります。</span></>
                        : <>事後アンケートの質問は設定されていません。<span className="no-print">イベントの編集の「終了後アンケート」で質問を作り、お礼のメールで送れます。</span></>}
                    </p>
                  ) : (
                    <>
                      {r.ratings.length > 0 && (
                        <div className="report-block mb-3">
                          <p className="text-sm font-bold mb-1">満足度　平均 {r.ratingAvg.toFixed(1)}（{r.ratings.length}件）</p>
                          {r.ratingDist.map(d => (
                            <BarRow key={d.star} label={`${"★".repeat(d.star)}`} count={d.count} base={r.ratings.length} color="bg-amber-400" />
                          ))}
                        </div>
                      )}
                      {r.post.map(q => q.kind === "choice"
                        ? <ChoiceBlock key={q.label} label={q.label} answered={q.answered} options={q.options} color="bg-emerald-500" />
                        : <TextBlock key={q.label} label={q.label} texts={q.texts} showWho={false} />)}
                    </>
                  )}
                </section>

                {/* 参加者の一覧（入れるときだけ） */}
                {showList && (
                  <section className="mb-2">
                    <h2 className="report-keep-next text-base font-black border-l-4 border-slate-600 pl-2 mb-2">参加者の一覧（{r.active.length}名）</h2>
                    <table className="w-full text-xs border border-slate-300">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-300">
                          <th className="text-right font-bold px-2 py-1 border-r border-slate-300 w-8">No.</th>
                          <th className="text-left font-bold px-2 py-1 border-r border-slate-300">名前</th>
                          <th className="text-left font-bold px-2 py-1 border-r border-slate-300">チケット</th>
                          <th className="text-left font-bold px-2 py-1 border-r border-slate-300 whitespace-nowrap">状態</th>
                          <th className="text-left font-bold px-2 py-1 border-r border-slate-300 whitespace-nowrap">事前</th>
                          <th className="text-left font-bold px-2 py-1 whitespace-nowrap">回数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.active.map((p, i) => (
                          <tr key={p.id} className="border-b border-slate-200 last:border-b-0 break-inside-avoid">
                            <td className="px-2 py-1 text-right border-r border-slate-300">{i + 1}</td>
                            <td className="px-2 py-1 border-r border-slate-300">{String(p.name || "")}</td>
                            <td className="px-2 py-1 border-r border-slate-300">{String(p.selectedTicket || "")}</td>
                            <td className="px-2 py-1 border-r border-slate-300 whitespace-nowrap">{isAttended(p) ? "出席" : r.held && r.attended.length > 0 ? "受付なし" : "申込"}</td>
                            <td className="px-2 py-1 border-r border-slate-300 whitespace-nowrap">{r.preIds.has(p.id) ? "回答" : ""}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{data.pastEmails.has(emailKey(p.email)) ? "2回目以上" : "初めて"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}
              </>
            )}

          </td></tr></tbody>
        </table>
      </div>
    </div>
  );
}

function BarRow({ label, count, base, color = "bg-indigo-400" }: { label: string; count: number; base: number; color?: string }) {
  const w = base > 0 ? Math.round((count / base) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm py-0.5">
      <div className="w-[38%] shrink-0 leading-snug break-words">{label}</div>
      <div className="flex-1 h-3.5 bg-slate-100 report-bar">
        <div className={`report-bar h-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <div className="w-[72px] shrink-0 text-right whitespace-nowrap tabular-nums">{count}件（{w}%）</div>
    </div>
  );
}

function ChoiceBlock({ label, answered, options, color }: { label: string; answered: number; options: { label: string; count: number }[]; color?: string }) {
  return (
    <div className="report-block mb-3">
      <p className="text-sm font-bold mb-1">{shortLabel(label)}<span className="font-normal text-slate-500">（回答 {answered}件）</span></p>
      {options.length === 0
        ? <p className="text-sm text-slate-500">回答はまだありません</p>
        : options.map(o => <BarRow key={o.label} label={o.label} count={o.count} base={answered} color={color} />)}
    </div>
  );
}

function TextBlock({ label, texts, showWho }: { label: string; texts: { text: string; who: string }[]; showWho: boolean }) {
  return (
    <div className="mb-3">
      <p className="report-keep-next text-sm font-bold mb-1">{shortLabel(label)}<span className="font-normal text-slate-500">（回答 {texts.length}件）</span></p>
      {texts.length === 0 ? (
        <p className="text-sm text-slate-500">回答はまだありません</p>
      ) : (
        <ul className={texts.every(t => t.text.length <= 24 && !t.text.includes("\n"))
          ? "text-sm border-l-2 border-slate-200 pl-3 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1"
          : "text-sm border-l-2 border-slate-200 pl-3 space-y-1"}>
          {texts.map((t, i) => (
            <li key={i} className="break-inside-avoid whitespace-pre-wrap leading-relaxed">
              {t.text}{showWho && t.who ? <span className="text-slate-500">（{t.who}）</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
