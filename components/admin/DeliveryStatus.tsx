// 📂 components/admin/DeliveryStatus.tsx
// 📝 役割：配信履歴の「相手に届いたか」（2026-11-02）。一覧の1行に短いまとめ（届いた 22・届かなかった 1）、
//   詳細に返信先と1人ずつの表。記録は履歴の記録の delivery（サーバーが書く・lib/mail-delivery.ts）。
//   「いま確かめる」は /api/admin/mail-delivery（Resend に問い合わせる）。ふだんは10分ごとにサーバーが確かめる
"use client";

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { RefreshCw } from "lucide-react";
import { DELIVERY_HINT, DELIVERY_LABEL, deliveryParts, type DeliveryStatus } from "@/lib/mail-delivery-status";

type Tone = "light" | "dark";
type Source = "mail_queue" | "scheduled_emails" | "newsletter_archives";

const dateOf = (v: any) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const shortTime = (v: any) => {
  const d = dateOf(v);
  return d && !isNaN(d.getTime()) ? d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
};

const COLOR: Record<DeliveryStatus, Record<Tone, string>> = {
  delivered: { light: "text-emerald-700", dark: "text-emerald-300" },
  sent: { light: "text-slate-500", dark: "text-slate-400" },
  delivery_delayed: { light: "text-amber-700", dark: "text-amber-300" },
  bounced: { light: "text-red-600", dark: "text-red-300" },
  complained: { light: "text-orange-700", dark: "text-orange-300" },
  failed: { light: "text-red-600", dark: "text-red-300" },
  suppressed: { light: "text-orange-700", dark: "text-orange-300" },
  skipped: { light: "text-slate-500", dark: "text-slate-400" },
  untracked: { light: "text-slate-500", dark: "text-slate-400" },
  unknown: { light: "text-slate-500", dark: "text-slate-400" },
};

// 一覧の1行のまとめ（例：届いた 22・届かなかった 1・確かめ中 1）。記録の無い古い配信は何も出さない（ボタンの中にも置けるよう span）
export function DeliveryLine({ delivery, tone = "light" }: { delivery?: any; tone?: Tone }) {
  const parts = deliveryParts(delivery?.counts);
  if (!parts.length) return null;
  const sep = tone === "dark" ? "text-slate-600" : "text-slate-300";
  return (
    <span className="block text-[10px] font-bold">
      {parts.map((p, i) => (
        <React.Fragment key={p.status}>
          {i > 0 && <span className={sep}>・</span>}
          <span className={COLOR[p.status][tone]}>{p.label} {p.n}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

// 詳細：返信先と、1人ずつ届いたか。記録の無い古い配信は宛先だけを出す
export function DeliveryDetail({ source, sourceId, tenantId, delivery, replyTo, recipients, tone = "dark", onUpdate }: {
  source: Source; sourceId: string; tenantId?: string; delivery?: any; replyTo?: string | null;
  recipients?: { name?: string; email?: string }[]; tone?: Tone; onUpdate?: (d: any) => void;
}) {
  const [d, setD] = useState<any>(delivery || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { setD(delivery || null); }, [delivery]);

  const check = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/mail-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await auth.currentUser?.getIdToken()}` },
        body: JSON.stringify({ source, sourceId, tenantId }),
      });
      const r = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(r.error || "確かめられませんでした");
      if (r.delivery) { setD(r.delivery); onUpdate?.(r.delivery); }
    } catch (e: any) {
      setErr(e?.message || "確かめられませんでした");
    } finally {
      setBusy(false);
    }
  };

  // 開いたとき、まだ確かめ中の人がいて、最後に確かめてから2分たっていれば確かめる
  useEffect(() => {
    if (!delivery || delivery.done) return;
    const last = dateOf(delivery.checkedAt);
    if (!last || Date.now() - last.getTime() > 120_000) check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId]);

  const dark = tone === "dark";
  const box = dark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200";
  const line = dark ? "border-slate-800" : "border-slate-200";
  const sub = dark ? "text-slate-500" : "text-slate-400";
  const main = dark ? "text-slate-300" : "text-slate-700";
  const reply = d?.replyTo || replyTo;
  const items: { name?: string; email?: string; status?: DeliveryStatus }[] = d?.items || recipients || [];
  const notes = d ? deliveryParts(d.counts).filter(p => p.status !== "delivered" && p.status !== "sent") : [];

  return (
    <div className="space-y-2">
      {reply && (
        <p className={`text-xs ${main}`}><span className={sub}>返信先：</span>{reply}</p>
      )}
      <div className="flex items-center justify-between gap-2">
        <p className={`text-[10px] ${sub} font-bold`}>{d ? "相手に届いたか" : `宛先（${items.length}名）`}</p>
        {d && (
          <button
            onClick={check}
            disabled={busy}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border disabled:opacity-50 ${dark ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700" : "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"}`}
          >
            <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> いま確かめる
          </button>
        )}
      </div>
      {d && <DeliveryLine delivery={d} tone={tone} />}
      <div className={`border rounded-lg ${box} max-h-60 overflow-y-auto`}>
        <table className="w-full text-xs">
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className={`border-b last:border-0 ${line}`}>
                <td className={`px-3 py-1.5 ${main} whitespace-nowrap align-top`}>{it.name || "—"}</td>
                <td className={`px-3 py-1.5 ${sub} break-all align-top`}>{it.email}</td>
                {d && (
                  <td className={`px-3 py-1.5 font-bold whitespace-nowrap align-top text-right ${it.status ? COLOR[it.status]?.[tone] : sub}`}>
                    {it.status ? DELIVERY_LABEL[it.status] || it.status : ""}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {d ? (
        <div className={`text-[10px] ${sub} space-y-0.5`}>
          <p>「届いた」は、相手のメールサーバーが受け取ったことです（迷惑メールのフォルダに入ることはあります）。{d.checkedAt ? `${shortTime(d.checkedAt)} に確かめました。` : ""}</p>
          {notes.map(p => <p key={p.status}><span className={COLOR[p.status][tone]}>{p.label}</span>：{DELIVERY_HINT[p.status]}</p>)}
          {err && <p className="text-red-400">{err}</p>}
        </div>
      ) : (
        <p className={`text-[10px] ${sub}`}>このメールは、届いたかを記録する前に送ったものです。</p>
      )}
    </div>
  );
}
