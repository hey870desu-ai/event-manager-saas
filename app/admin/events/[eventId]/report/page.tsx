"use client";

// イベントのまとめ（/admin/events/{イベントのID}/report）：読み込みだけをここで行い、中身は components/admin/EventReport.tsx
//   読むのはログインした管理の人の権限のまま（Firestore のルールで、自分のテナントの分だけ読める）

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import EventReportView, { type ReportData } from "@/components/admin/EventReport";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";
const emailKey = (e: any) => String(e || "").trim().toLowerCase();

export default function EventReportPage() {
  const params = useParams();
  const eventId = String((params as any)?.eventId || "");
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [data, setData] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthChecked(true); }), []);

  useEffect(() => {
    if (!user || !eventId || eventId.includes("/")) return;
    let stop = false;
    (async () => {
      try {
        const evSnap = await getDoc(doc(db, "events", eventId));
        if (!evSnap.exists()) throw new Error("イベントが見つかりません");
        const event: any = { id: evSnap.id, ...evSnap.data() };
        const tenantId = String(event.tenantId || "");
        const [resSnap, fbSnap, preSnap, mailSnap, tenantSnap, tenantEvents] = await Promise.all([
          getDocs(collection(db, "events", eventId, "reservations")),
          getDocs(collection(db, "events", eventId, "feedbacks")),
          getDocs(collection(db, "events", eventId, "pre_feedbacks")),
          getDocs(query(collection(db, "mail_queue"), where("eventId", "==", eventId), where("tenantId", "==", tenantId))),
          getDoc(doc(db, "tenants", tenantId)),
          getDocs(query(collection(db, "events"), where("tenantId", "==", tenantId))),
        ]);
        // 初めての方と2回目以上を分けるため、この回より前の回の申込者のメールを集める
        const pastEmails = new Set<string>();
        const earlier = tenantEvents.docs.filter(d => d.id !== eventId && String(d.data().date || "") < String(event.date || ""));
        await Promise.all(earlier.map(async d => {
          const s = await getDocs(collection(db, "events", d.id, "reservations"));
          s.docs.forEach(r => {
            const x: any = r.data();
            if (x.status !== "cancelled" && x.email) pastEmails.add(emailKey(x.email));
          });
        }));
        if (stop) return;
        setData({
          event,
          tenant: tenantSnap.exists() ? tenantSnap.data() : {},
          reservations: resSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          feedbacks: fbSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          preFeedbacks: preSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          mails: mailSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          pastEmails,
        });
      } catch (e: any) {
        console.error("イベントのまとめの読み込みに失敗:", e);
        if (!stop) setError(e?.code === "permission-denied" ? "このイベントを見る権限がありません" : (e?.message || "読み込めませんでした"));
      }
    })();
    return () => { stop = true; };
  }, [user, eventId]);

  if (authChecked && !user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 text-center text-slate-700 shadow">
          <p className="mb-4">ログインしてからお開きください。</p>
          <Link href="/admin/login" className="text-indigo-600 font-bold underline">ログインの画面へ</Link>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl p-8 text-center text-slate-700 shadow">
          <p className="mb-4">{error}</p>
          <Link href="/admin" className="text-indigo-600 font-bold underline">イベントの一覧へ</Link>
        </div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">
        <div className="animate-spin w-6 h-6 border-2 border-indigo-500 rounded-full border-t-transparent mr-3" />
        読み込んでいます
      </div>
    );
  }

  const isSuper = (user?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;
  return <EventReportView data={data} isSuper={isSuper} />;
}
