// 📂 components/admin/CardPaymentSetup.tsx
// 📝 役割：設定の「参加費の受け取り口座」（2026-11-03）。Stripe の画面で口座と本人確認を入れると、イベントの「参加費の払い方」で
//   「申込のときにカードで」を選べるようになる。受け取った参加費から5%（決済の手数料を含む）を引いて、毎週金曜日に口座へ入る
//   様子は tenants/{id}.cardPayment（サーバーが Stripe に聞いて書く・/api/stripe/express）
//   Stripe の画面から戻ると /admin?cardpay=return（様子を確かめる）・リンクの期限切れは ?cardpay=refresh（もう一度リンクを作る）
"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { CARD_FEE_RATE, cardFeeFor } from "@/lib/plans";

type Status = { ready?: boolean; detailsSubmitted?: boolean; payoutsEnabled?: boolean; due?: number } | null | undefined;
type LegalInfo = { companyName?: string; representative?: string; address?: string; phone?: string; email?: string };

const LEGAL_FIELDS: { key: keyof LegalInfo; label: string }[] = [
  { key: "companyName", label: "事業者名" },
  { key: "representative", label: "代表者名" },
  { key: "address", label: "所在地" },
  { key: "phone", label: "電話番号" },
  { key: "email", label: "メールアドレス" },
];

export default function CardPaymentSetup({ tenantId, cardPayment, legalInfo }: { tenantId: string; cardPayment?: Status; legalInfo?: LegalInfo }) {
  const [st, setSt] = useState<Status>(cardPayment);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { setSt(cardPayment); }, [cardPayment]);

  const call = async (action: "onboard" | "status" | "dashboard") => {
    setBusy(action);
    setErr("");
    try {
      const res = await fetch("/api/stripe/express", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` },
        body: JSON.stringify({ tenantId, action }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data.error || "うまくいきませんでした");
      if (action === "status") setSt(data.cardPayment || null);
      else if (data.url) {
        if (action === "dashboard") window.open(data.url, "_blank", "noopener");
        else window.location.href = data.url;
      }
    } catch (e: any) {
      setErr(e?.message || "うまくいきませんでした");
    } finally {
      setBusy("");
    }
  };

  // Stripe の画面から戻ったとき：様子を確かめる。リンクの期限が切れていたら、もう一度登録の画面へ
  useEffect(() => {
    if (!tenantId || typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    const v = p.get("cardpay");
    if (!v) return;
    p.delete("cardpay");
    window.history.replaceState(null, "", `${window.location.pathname}${p.toString() ? `?${p}` : ""}`);
    if (v === "refresh") call("onboard");
    else call("status");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const missing = LEGAL_FIELDS.filter(f => !legalInfo?.[f.key]?.trim());
  const pct = Math.round(CARD_FEE_RATE * 100);
  const started = !!st;

  return (
    <div className="bg-white border border-indigo-100 rounded-xl p-4 space-y-3 text-xs text-slate-600">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold text-slate-900 flex items-center gap-1.5"><CreditCard size={14} className="text-indigo-500" /> 参加費の受け取り口座（カード払い）</p>
        {st?.ready
          ? <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 flex items-center gap-1"><CheckCircle2 size={12} /> 使えます</span>
          : started
            ? <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">登録の途中</span>
            : <span className="text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">まだ</span>}
      </div>
      <p className="leading-relaxed">
        口座を登録すると、イベントの「参加費の払い方」で「申込のときにカードで」を選べます。受け取った参加費から{pct}%（決済の手数料を含む）を引いて、毎週金曜日に口座へ入ります。参加者からは手数料をいただきません。
        <span className="block text-slate-400 mt-1">例：参加費 5,000円 → 口座へ {(5000 - cardFeeFor(5000)).toLocaleString()}円</span>
      </p>
      {started && !st?.ready && (
        <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
          {st?.detailsSubmitted ? "Stripe が確かめています。少し時間がかかることがあります。" : "Stripe の画面の登録が終わっていません。「登録を続ける」から最後まで進めてください。"}
          {st?.due ? `（あと${st.due}項目）` : ""}
        </p>
      )}
      {missing.length > 0 && (
        <p className="text-amber-700 flex items-start gap-1.5 leading-relaxed">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          カードで受け取る前に、上の「特定商取引法」の欄（{missing.map(m => m.label).join("・")}）を入れてください。参加者から見える申込のページに載ります。
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!st?.ready && (
          <button onClick={() => call("onboard")} disabled={!!busy} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50">
            {busy === "onboard" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} {started ? "登録を続ける" : "受け取りの口座を登録する"}
          </button>
        )}
        {st?.detailsSubmitted && (
          <button onClick={() => call("dashboard")} disabled={!!busy} className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 disabled:opacity-50">
            {busy === "dashboard" ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} 入金の記録を見る（Stripe）
          </button>
        )}
        {started && (
          <button onClick={() => call("status")} disabled={!!busy} className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 disabled:opacity-50">
            <RefreshCw size={14} className={busy === "status" ? "animate-spin" : ""} /> いまの様子を確かめる
          </button>
        )}
      </div>
      {err && <p className="text-red-600">{err}</p>}
      <p className="text-[10px] text-slate-400 leading-relaxed">登録は Stripe（決済の会社）の画面で、口座・代表者の本人確認などを入れます。絆太郎がカードの番号を持つことはありません。</p>
    </div>
  );
}
