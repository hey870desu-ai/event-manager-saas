// 📂 app/admin/finance/page.tsx
// 📝 役割：収支。イベントごと・月ごとに、参加費（売上予定・受け取り済み・未回収）と、手で入れた経費・その他の収入から差し引きを出す
//   （2026-10-28 塙さん「テナントさんからは金銭管理もしたいという声も」「経費（会場費・講師への謝礼など）まで入れて差し引きを見たい」）
//   数え方は lib/finance.ts（分析の「売上」も同じ）。経費・その他の収入は tenants/{tenantId}/finance_entries（会社の管理者だけが読み書き）
//   数字の表はマス目・折り返さない・数字は右寄せ・狭い画面では表を横に動かす（列を縦に積まない）
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AlertTriangle, ArrowLeft, Download, X } from "lucide-react";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, eventMoney, monthlyMoney, sumMoney, toCsv, type EventMoney, type FinanceEntry, type MoneyTotals } from "@/lib/finance";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

// 金額の書き方：3けた区切り。マイナスは ▲
const fmt = (n: number) => (n < 0 ? `▲${(-n).toLocaleString("ja-JP")}` : n.toLocaleString("ja-JP"));
const jstToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());

// 表のマス（右と下に線・表の上と左に線＝どの行も同じ側に線を引く）
const TH = "sticky top-0 z-10 bg-slate-100 border-r border-b border-slate-300 px-3 h-9 font-bold text-slate-700 whitespace-nowrap";
const TD = "border-r border-b border-slate-300 px-3 h-9 whitespace-nowrap";
const NUM = "text-right tabular-nums";

function downloadCsv(name: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MONEY_HEAD = ["申込", "売上予定", "受け取り済み", "未回収", "その他の収入", "経費", "差し引き"];
const moneyCells = (t: MoneyTotals) => [t.applicants, t.expected, t.collected, t.uncollected, t.otherIncome, t.expense, t.net];

// 経費・その他の収入の入力（イベントの中と、イベント以外の両方で使う）
type Draft = { id: string; type: "expense" | "income"; category: string; amount: string; date: string; note: string };
const emptyDraft = (date: string): Draft => ({ id: "", type: "expense", category: EXPENSE_CATEGORIES[0], amount: "", date, note: "" });

function EntryEditor({ list, eventId, fixedDate, onSave, onDelete }: {
  list: FinanceEntry[];
  eventId: string;
  fixedDate?: string;
  onSave: (d: Draft, eventId: string) => Promise<boolean>;
  onDelete: (e: FinanceEntry) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft(fixedDate || jstToday()));
  const [busy, setBusy] = useState(false);
  const cats = draft.type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const save = async () => {
    setBusy(true);
    const ok = await onSave({ ...draft, date: fixedDate || draft.date }, eventId);
    setBusy(false);
    if (ok) setDraft(emptyDraft(fixedDate || draft.date));
  };
  const sorted = [...list].sort((a, b) => (a.type === b.type ? a.date.localeCompare(b.date) : a.type === "expense" ? -1 : 1));
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-0 border-t border-l border-slate-300 text-sm table-fixed" style={{ width: fixedDate ? 640 : 760 }}>
          <colgroup>
            {!fixedDate && <col style={{ width: 110 }} />}
            <col style={{ width: 80 }} /><col style={{ width: 130 }} /><col style={{ width: 110 }} /><col /><col style={{ width: 110 }} />
          </colgroup>
          <thead>
            <tr>
              {!fixedDate && <th className={`${TH} text-left`}>日付</th>}
              <th className={`${TH} text-left`}>区分</th><th className={`${TH} text-left`}>項目</th><th className={`${TH} text-right`}>金額</th><th className={`${TH} text-left`}>メモ</th><th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr><td colSpan={fixedDate ? 5 : 6} className={`${TD} text-slate-400`}>まだありません</td></tr>
            )}
            {sorted.map(e => (
              <tr key={e.id} className={draft.id === e.id ? "bg-amber-50" : ""}>
                {!fixedDate && <td className={`${TD} tabular-nums`}>{e.date}</td>}
                <td className={TD}>{e.type === "expense" ? "経費" : "収入"}</td>
                <td className={`${TD} overflow-hidden text-ellipsis`} title={e.category}>{e.category}</td>
                <td className={`${TD} ${NUM}`}>{fmt(e.amount)}</td>
                <td className={`${TD} overflow-hidden text-ellipsis`} title={e.note}>{e.note}</td>
                <td className={`${TD} text-center`}>
                  <button type="button" onClick={() => setDraft({ id: e.id, type: e.type, category: e.category, amount: String(e.amount), date: e.date, note: e.note })} className="text-indigo-600 font-bold hover:underline">直す</button>
                  <button type="button" onClick={() => onDelete(e)} className="ml-3 text-red-600 font-bold hover:underline">消す</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 入れる・直す */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-bold text-slate-600 mb-2">{draft.id ? "選んだ記録を直す" : "経費・その他の収入を入れる"}</p>
        <div className="flex flex-wrap items-end gap-2 text-sm">
          {!fixedDate && (
            <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">日付</span>
              <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} className="h-9 rounded border border-slate-300 bg-white px-2" />
            </label>
          )}
          <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">区分</span>
            <select value={draft.type} onChange={e => { const type = e.target.value as Draft["type"]; setDraft({ ...draft, type, category: (type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES)[0] }); }} className="h-9 rounded border border-slate-300 bg-white px-2">
              <option value="expense">経費</option><option value="income">その他の収入</option>
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">項目</span>
            <select value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })} className="h-9 rounded border border-slate-300 bg-white px-2">
              {cats.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1"><span className="text-xs text-slate-500">金額（円）</span>
            <input type="number" inputMode="numeric" min={1} step={1} value={draft.amount} onChange={e => setDraft({ ...draft, amount: e.target.value })} className="h-9 w-32 rounded border border-slate-300 bg-white px-2 text-right tabular-nums" />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[160px]"><span className="text-xs text-slate-500">メモ（任意）</span>
            <input type="text" maxLength={200} value={draft.note} onChange={e => setDraft({ ...draft, note: e.target.value })} placeholder="例：第2会議室 3時間" className="h-9 rounded border border-slate-300 bg-white px-2" />
          </label>
          <button type="button" disabled={busy} onClick={save} className="h-9 px-4 rounded bg-slate-900 hover:bg-indigo-600 text-white font-bold disabled:opacity-50">{draft.id ? "保存する" : "入れる"}</button>
          {draft.id && <button type="button" onClick={() => setDraft(emptyDraft(fixedDate || jstToday()))} className="h-9 px-3 rounded border border-slate-300 bg-white font-bold text-slate-600">やめる</button>}
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [reservations, setReservations] = useState<Record<string, any[]>>({});
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [year, setYear] = useState(jstToday().slice(0, 4));
  const [openId, setOpenId] = useState("");

  // ログインした人の会社のイベントと申込を読む
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) { router.push("/admin/login"); return; }
      try {
        const me = await getDoc(doc(db, "admin_users", user.email));
        const tid = me.exists() ? String(me.data().tenantId || "") : (user.email === SUPER_ADMIN_EMAIL ? "demo" : "");
        if (!tid) { setError("会社の管理者として登録されていません。"); setLoading(false); return; }
        setEmail(user.email); setTenantId(tid);
        const evSnap = await getDocs(query(collection(db, "events"), where("tenantId", "==", tid)));
        const evs = evSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const byEvent: Record<string, any[]> = {};
        await Promise.all(evs.map(async ev => {
          const rs = await getDocs(collection(db, "events", ev.id, "reservations"));
          byEvent[ev.id] = rs.docs.map(d => ({ id: d.id, ...d.data() }));
        }));
        setEvents(evs); setReservations(byEvent);
        // 参加者リストの「このイベントの収支」から来たときは、そのイベントを開く
        const want = new URLSearchParams(window.location.search).get("event") || "";
        const hit = evs.find(e => e.id === want);
        if (hit) { if (/^\d{4}-/.test(hit.date || "")) setYear(String(hit.date).slice(0, 4)); setOpenId(hit.id); }
      } catch (e) {
        console.error("収支の読み込みに失敗:", e);
        setError("読み込めませんでした。通信状況を確かめて、ページを開き直してください。");
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // 経費・その他の収入（入れたらすぐ表に出るよう、変わったら読み直す）
  useEffect(() => {
    if (!tenantId) return;
    return onSnapshot(collection(db, "tenants", tenantId, "finance_entries"), snap => {
      setEntries(snap.docs.map(d => {
        const x: any = d.data();
        return { id: d.id, type: x.type === "income" ? "income" : "expense", category: String(x.category || ""), amount: Number(x.amount) || 0, date: String(x.date || ""), eventId: String(x.eventId || ""), note: String(x.note || "") };
      }));
    }, e => console.error("経費の読み込みに失敗:", e));
  }, [tenantId]);

  // 消したイベントの経費は、イベント以外の経費として数える（どこにも入らなくなるのを防ぐ）
  const known = useMemo(() => new Set(events.map(e => e.id)), [events]);
  const normEntries = useMemo(() => entries.map(e => (e.eventId && !known.has(e.eventId) ? { ...e, eventId: "" } : e)), [entries, known]);
  const moneys: EventMoney[] = useMemo(() => events.map(ev => eventMoney(ev, reservations[ev.id] || [], normEntries)), [events, reservations, normEntries]);
  const years = useMemo(() => {
    const ys = new Set<string>([jstToday().slice(0, 4)]);
    for (const e of events) if (/^\d{4}-/.test(e.date || "")) ys.add(String(e.date).slice(0, 4));
    for (const e of entries) if (/^\d{4}-/.test(e.date)) ys.add(e.date.slice(0, 4));
    return Array.from(ys).sort().reverse();
  }, [events, entries]);
  const yearEvents = moneys.filter(m => m.date.startsWith(`${year}-`)).sort((a, b) => a.date.localeCompare(b.date));
  const months = monthlyMoney(moneys, normEntries, year);
  const total = sumMoney(months);
  const looseEntries = normEntries.filter(e => !e.eventId && e.date.startsWith(`${year}-`));
  const draftTitle = (id: string) => events.find(e => e.id === id)?.status === "draft";
  const open = moneys.find(m => m.eventId === openId);

  const saveEntry = async (d: Draft, eventId: string) => {
    const amount = Math.round(Number(d.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 100000000) { alert("金額は1円から1億円までの数字で入れてください。"); return false; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) { alert("日付を入れてください。"); return false; }
    const data = { type: d.type, category: d.category, amount, date: d.date, eventId, note: d.note.trim().slice(0, 200) };
    try {
      if (d.id) await updateDoc(doc(db, "tenants", tenantId, "finance_entries", d.id), { ...data, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, "tenants", tenantId, "finance_entries"), { ...data, createdAt: serverTimestamp(), createdBy: email });
      return true;
    } catch (e) {
      console.error("経費の保存に失敗:", e);
      alert("保存できませんでした。通信状況を確かめて、もう一度押してください。");
      return false;
    }
  };
  const deleteEntry = async (e: FinanceEntry) => {
    if (!confirm(`「${e.category} ${fmt(e.amount)}円」を消しますか？`)) return;
    try { await deleteDoc(doc(db, "tenants", tenantId, "finance_entries", e.id)); }
    catch (err) { console.error("経費の削除に失敗:", err); alert("消せませんでした。もう一度押してください。"); }
  };

  const csvMonths = () => downloadCsv(`収支_月ごと_${year}.csv`, [
    ["月", ...MONEY_HEAD],
    ...months.map(m => [m.month, ...moneyCells(m)]),
    ["合計", ...moneyCells(total)],
  ]);
  const csvEvents = () => downloadCsv(`収支_イベントごと_${year}.csv`, [
    ["開催日", "イベント", ...MONEY_HEAD],
    ...yearEvents.map(m => [m.date, m.title, ...moneyCells(m)]),
  ]);
  const csvEntries = () => downloadCsv(`収支_経費と収入の明細_${year}.csv`, [
    ["日付", "区分", "項目", "金額", "イベント", "メモ"],
    ...normEntries.filter(e => e.date.startsWith(`${year}-`)).sort((a, b) => a.date.localeCompare(b.date))
      .map(e => [e.date, e.type === "expense" ? "経費" : "その他の収入", e.category, e.amount, events.find(x => x.id === e.eventId)?.title || "（イベント以外）", e.note]),
  ]);

  const needsCheck = yearEvents.filter(m => m.needsCheck > 0);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={18} /> 管理画面に戻る
          </Link>
          <Link href="/admin/analytics" className="ml-auto text-sm font-bold text-indigo-600 hover:underline">分析を見る</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">収支</h1>
          <p className="mt-2 text-slate-600 leading-relaxed">参加費の入り具合と、手で入れた経費・その他の収入から、イベントごと・月ごとの差し引きを出します。</p>
          {error && <p className="mt-4 text-red-600 font-bold">{error}</p>}
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700">年
              <select value={year} onChange={e => setYear(e.target.value)} className="h-9 rounded border border-slate-300 bg-white px-2 font-normal">
                {years.map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            </label>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">CSV：</span>
            <button type="button" onClick={csvMonths} className="h-9 px-3 rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><Download size={14} /> 月ごと</button>
            <button type="button" onClick={csvEvents} className="h-9 px-3 rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><Download size={14} /> イベントごと</button>
            <button type="button" onClick={csvEntries} className="h-9 px-3 rounded border border-slate-300 bg-white font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5"><Download size={14} /> 経費と収入の明細</button>
          </div>
        </div>

        {needsCheck.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>返金したかを確かめてほしい取り消しが {needsCheck.reduce((s, m) => s + m.needsCheckCount, 0)}件（{fmt(needsCheck.reduce((s, m) => s + m.needsCheck, 0))}円）あります。支払い済みのまま取り消した申込です。返金しなかった分は、そのイベントの「経費・収入」で、その他の収入の「キャンセル料」として入れてください。</p>
          </div>
        )}

        {/* 月ごと */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">月ごと</h2>
          <p className="text-xs text-slate-500 mb-3">単位：円。イベントは開催日の月に入ります。</p>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-0 border-t border-l border-slate-300 bg-white text-sm table-fixed" style={{ width: 860 }}>
              <colgroup><col style={{ width: 100 }} /><col style={{ width: 70 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /></colgroup>
              <thead><tr><th className={`${TH} text-left`}>月</th>{MONEY_HEAD.map(h => <th key={h} className={`${TH} text-right`}>{h}</th>)}</tr></thead>
              <tbody>
                {months.length === 0 && <tr><td colSpan={8} className={`${TD} text-slate-400`}>{year}年の記録はまだありません</td></tr>}
                {months.map(m => (
                  <tr key={m.month}>
                    <td className={`${TD} tabular-nums`}>{m.month.slice(0, 4)}年{Number(m.month.slice(5, 7))}月</td>
                    {moneyCells(m).map((v, i) => <td key={i} className={`${TD} ${NUM} ${i === 6 && v < 0 ? "text-red-600" : ""}`}>{fmt(v)}</td>)}
                  </tr>
                ))}
                {months.length > 0 && (
                  <tr className="bg-slate-50 font-bold">
                    <td className={TD}>合計</td>
                    {moneyCells(total).map((v, i) => <td key={i} className={`${TD} ${NUM} ${i === 6 && v < 0 ? "text-red-600" : ""}`}>{fmt(v)}</td>)}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* イベントごと */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">イベントごと</h2>
          <p className="text-xs text-slate-500 mb-3">単位：円。経費や協賛金などは、右の「経費・収入」から入れます。</p>
          <div className="overflow-auto max-h-[70vh]">
            <table className="border-separate border-spacing-0 border-t border-l border-slate-300 bg-white text-sm table-fixed" style={{ width: 1226 }}>
              <colgroup><col style={{ width: 110 }} /><col style={{ width: 300 }} /><col style={{ width: 60 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 110 }} /><col style={{ width: 96 }} /></colgroup>
              <thead><tr><th className={`${TH} text-left`}>開催日</th><th className={`${TH} text-left`}>イベント</th>{MONEY_HEAD.map(h => <th key={h} className={`${TH} text-right`}>{h}</th>)}<th className={TH}></th></tr></thead>
              <tbody>
                {yearEvents.length === 0 && <tr><td colSpan={10} className={`${TD} text-slate-400`}>{year}年のイベントはまだありません</td></tr>}
                {yearEvents.map(m => (
                  <tr key={m.eventId}>
                    <td className={`${TD} tabular-nums`}>{m.date}</td>
                    <td className={`${TD} overflow-hidden text-ellipsis`} title={m.title}>{draftTitle(m.eventId) ? "（下書き）" : ""}{m.title}</td>
                    {moneyCells(m).map((v, i) => <td key={i} className={`${TD} ${NUM} ${i === 6 && v < 0 ? "text-red-600" : ""}`}>{fmt(v)}</td>)}
                    <td className={`${TD} text-center`}><button type="button" onClick={() => setOpenId(m.eventId)} className="text-indigo-600 font-bold hover:underline">経費・収入</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* イベント以外 */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-1">イベント以外の経費・収入</h2>
          <p className="text-xs text-slate-500 mb-3">広告・年会費など、どのイベントにも入らないもの。月ごとの表には、入れた日付の月で入ります。</p>
          <EntryEditor list={looseEntries} eventId="" onSave={saveEntry} onDelete={deleteEntry} />
        </section>

        {/* 数え方 */}
        <section className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700 leading-relaxed">
          <h2 className="font-bold text-slate-900 mb-2">数え方</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr><td className="py-1.5 pr-4 align-top whitespace-nowrap text-slate-500">売上予定</td><td className="py-1.5">取り消していない申込の参加費の合計です。</td></tr>
              <tr><td className="py-1.5 pr-4 align-top whitespace-nowrap text-slate-500">受け取り済み</td><td className="py-1.5">当日払いのイベントは受付を済ませた申込、事前払いのイベントは参加者リストで「支払い済み」の印を付けた申込の参加費です。カードで払われた申込は決済した額で、取り消しで返金しなかった分（キャンセル料）も入ります。</td></tr>
              <tr><td className="py-1.5 pr-4 align-top whitespace-nowrap text-slate-500">未回収</td><td className="py-1.5">売上予定のうち、まだ受け取っていない分です。当日払いのイベントで来られなかった方の分も入ります。</td></tr>
              <tr><td className="py-1.5 pr-4 align-top whitespace-nowrap text-slate-500">差し引き</td><td className="py-1.5">受け取り済み＋その他の収入−経費です。</td></tr>
            </tbody>
          </table>
          <p className="mt-3">払い方ごとの確かめ方は、<Link href="/admin/guide/payments" className="text-indigo-600 font-bold underline underline-offset-2">参加費の受け取り方</Link>をご覧ください。</p>
        </section>
      </main>

      {/* イベントの経費・収入 */}
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-start justify-center overflow-y-auto p-4" onClick={() => setOpenId("")}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-xs text-slate-500 tabular-nums">{open.date}</p>
                <h2 className="text-lg font-bold text-slate-900">{open.title}</h2>
              </div>
              <button type="button" onClick={() => setOpenId("")} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" aria-label="閉じる"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-2">参加費（{open.payLink ? "申込のあと、事前に" : "当日、会場で"}）</h3>
                <div className="overflow-x-auto">
                  <table className="border-separate border-spacing-0 border-t border-l border-slate-300 text-sm table-fixed" style={{ width: 600 }}>
                    <colgroup><col /><col style={{ width: 70 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /><col style={{ width: 115 }} /></colgroup>
                    <thead><tr><th className={`${TH} text-left`}>チケット</th><th className={`${TH} text-right`}>人数</th><th className={`${TH} text-right`}>売上予定</th><th className={`${TH} text-right`}>受け取り済み</th><th className={`${TH} text-right`}>未回収</th></tr></thead>
                    <tbody>
                      {open.tickets.length === 0 && <tr><td colSpan={5} className={`${TD} text-slate-400`}>申込はまだありません</td></tr>}
                      {open.tickets.map(t => (
                        <tr key={t.name}><td className={`${TD} overflow-hidden text-ellipsis`} title={t.name}>{t.name}</td><td className={`${TD} ${NUM}`}>{t.count}</td><td className={`${TD} ${NUM}`}>{fmt(t.expected)}</td><td className={`${TD} ${NUM}`}>{fmt(t.collected)}</td><td className={`${TD} ${NUM}`}>{fmt(t.expected - t.collected)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(open.cancelKept > 0 || open.refund > 0) && <p className="mt-2 text-sm text-slate-600">取り消し：カードで返金 {fmt(open.refund)}円・返金しなかった分（キャンセル料）{fmt(open.cancelKept)}円。キャンセル料は受け取り済みに入っています。</p>}
                {open.needsCheck > 0 && <p className="mt-2 text-sm text-amber-800">支払い済みのまま取り消した申込が {open.needsCheckCount}件（{fmt(open.needsCheck)}円）あります。返金しなかった分は、下で「その他の収入」の「キャンセル料」として入れてください。</p>}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">経費・その他の収入</h3>
                <EntryEditor key={open.eventId} list={normEntries.filter(e => e.eventId === open.eventId)} eventId={open.eventId} fixedDate={open.date || jstToday()} onSave={saveEntry} onDelete={deleteEntry} />
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm tabular-nums space-y-1">
                <p>差し引き：受け取り済み {fmt(open.collected)} ＋ その他の収入 {fmt(open.otherIncome)} − 経費 {fmt(open.expense)} ＝ <span className={`font-bold ${open.net < 0 ? "text-red-600" : "text-slate-900"}`}>{fmt(open.net)}円</span></p>
                {open.uncollected > 0 && <p className="text-slate-500">未回収の {fmt(open.uncollected)}円 をすべて受け取ると {fmt(open.net + open.uncollected)}円 です。</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
