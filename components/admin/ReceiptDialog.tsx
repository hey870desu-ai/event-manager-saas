// 📂 components/admin/ReceiptDialog.tsx
// 📝 役割：参加者リストの「領収証」。宛名・金額・但し書き・お支払い方法・発行日を確かめて、PDF を保存する・メールで送る（2026-10-28）
//   作るのはサーバー（app/api/receipts）。番号を振ったあとは同じ番号で出し直す。直すときは「作り直す」（前の番号は無効）
"use client";

import React, { useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { X } from "lucide-react";
import { RECEIPT_METHODS, defaultReceiptMethod, defaultReceiptNote, receiptFileName, receiptInputError } from "@/lib/receipt";

const jstToday = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
const dateOf = (v: any) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const shortDate = (v: any) => { const d = dateOf(v); return d && !isNaN(d.getTime()) ? `${d.getMonth() + 1}/${d.getDate()}` : ""; };

export default function ReceiptDialog({ event, participant: p, onClose }: { event: any; participant: any; onClose: () => void }) {
  const issued = !!p.receiptNo;
  const [editing, setEditing] = useState(!issued);
  const [name, setName] = useState(String(p.name || ""));
  const [amount, setAmount] = useState(String(Math.round(Number(p.paidAmount ?? p.price) || 0)));
  const [note, setNote] = useState(defaultReceiptNote(event?.title || ""));
  const [method, setMethod] = useState(defaultReceiptMethod(event, p));
  const [issueDate, setIssueDate] = useState(jstToday());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // まだ受け取り済みでない申込（事前払いで印が無い・当日払いで受付前）
  const collected = p.paymentStatus === "paid" || (event?.payMode !== "link" && !p.stripeSessionId && (p.checkedIn === true || p.status === "attended"));

  // 「直して作り直す」：前の領収証の中身から始める（記録は会社の管理者だけが読める）
  const startEdit = async () => {
    try {
      if (p.receiptId && event?.tenantId) {
        const snap = await getDoc(doc(db, "tenants", event.tenantId, "receipts", p.receiptId));
        const d: any = snap.exists() ? (snap.data() as any).data : null;
        if (d) { setName(String(d.name || "")); setAmount(String(d.amount || "")); setNote(String(d.note || "")); setMethod(String(d.method || "")); }
      }
    } catch (e) {
      console.error("前の領収証の読み込みに失敗:", e);
    }
    setEditing(true);
  };

  const run = async (action: "pdf" | "email", remake: boolean) => {
    const input = { name: name.trim(), amount: Math.round(Number(amount)), note: note.trim(), method, issueDate };
    if (editing) { const err = receiptInputError(input); if (err) { setMsg({ ok: false, text: err }); return; } }
    if (action === "email" && !confirm(`${p.email} に領収証を送りますか？`)) return;
    setBusy(true); setMsg(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, remake, eventId: event.id, reservationId: p.id, ...input }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || "領収証を作れませんでした。"); }
      if (action === "pdf") {
        const no = res.headers.get("X-Receipt-No") || "";
        const url = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = url; a.download = receiptFileName(no); a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMsg({ ok: true, text: `No. ${no} の PDF を保存しました。` });
      } else {
        const j = await res.json();
        setMsg({ ok: true, text: `No. ${j.no} を ${j.sentTo} に送りました。` });
      }
      setEditing(false);
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "領収証を作れませんでした。" });
    }
    setBusy(false);
  };

  const field = "w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900";
  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 flex items-start justify-center overflow-y-auto p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl my-8 text-slate-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs text-slate-500">領収証</p>
            <h2 className="text-lg font-bold text-slate-900">{p.name} 様</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" aria-label="閉じる"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {issued && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="font-bold text-slate-900">発行済み：No. {p.receiptNo}（{shortDate(p.receiptIssuedAt)}）{p.receiptSentAt ? `・メールで送信済み（${shortDate(p.receiptSentAt)}）` : ""}</p>
              <p className="mt-1 text-slate-600">同じ領収証を、同じ番号でもう一度保存・送信できます。宛名や金額を直すときは「直して作り直す」を押してください（前の番号は無効になります）。</p>
            </div>
          )}
          {!collected && !issued && <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">この申込は、まだ受け取り済みになっていません。参加費を受け取ってから出してください。</p>}

          {editing && (
            <div className="space-y-3">
              <label className="block"><span className="text-xs font-bold text-slate-600">宛名（「様」は付きます）</span><input value={name} maxLength={100} onChange={e => setName(e.target.value)} className={field} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="text-xs font-bold text-slate-600">金額（円・税込）</span><input type="number" inputMode="numeric" min={1} step={1} value={amount} onChange={e => setAmount(e.target.value)} className={`${field} text-right tabular-nums`} /></label>
                <label className="block"><span className="text-xs font-bold text-slate-600">発行日</span><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={field} /></label>
              </div>
              <label className="block"><span className="text-xs font-bold text-slate-600">但し書き</span><input value={note} maxLength={120} onChange={e => setNote(e.target.value)} className={field} /></label>
              <label className="block"><span className="text-xs font-bold text-slate-600">お支払い方法</span>
                <select value={method} onChange={e => setMethod(e.target.value)} className={field}>
                  <option value="">選んでください</option>
                  {RECEIPT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
              <p className="text-xs text-slate-500">主催者の名前・住所・電話は、設定の「法人・特商法情報」から入ります。インボイスの登録番号を入れておくと、登録番号と消費税の額も載ります。</p>
            </div>
          )}

          {msg && <p className={`rounded-lg p-3 font-bold ${msg.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>{msg.text}</p>}

          <div className="flex flex-wrap gap-2 pt-1">
            {issued && !editing ? (
              <>
                <button type="button" disabled={busy} onClick={() => run("pdf", false)} className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white font-bold disabled:opacity-50">PDF を保存</button>
                <button type="button" disabled={busy || !p.email} onClick={() => run("email", false)} className="h-10 px-4 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{p.receiptSentAt ? "メールでもう一度送る" : "メールで送る"}</button>
                <button type="button" disabled={busy} onClick={startEdit} className="h-10 px-4 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">直して作り直す</button>
              </>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={() => run("pdf", issued)} className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-indigo-600 text-white font-bold disabled:opacity-50">{issued ? "作り直して PDF を保存" : "発行して PDF を保存"}</button>
                <button type="button" disabled={busy || !p.email} onClick={() => run("email", issued)} className="h-10 px-4 rounded-lg border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50">{issued ? "作り直してメールで送る" : "発行してメールで送る"}</button>
                {issued && <button type="button" disabled={busy} onClick={() => setEditing(false)} className="h-10 px-4 rounded-lg font-bold text-slate-500 hover:bg-slate-100">やめる</button>}
              </>
            )}
          </div>
          {p.email ? <p className="text-xs text-slate-500">メールの送り先：{p.email}（申込のときのアドレス）</p> : <p className="text-xs text-slate-500">この申込にはメールアドレスが無いので、PDF を保存してお渡しください。</p>}
        </div>
      </div>
    </div>
  );
}
