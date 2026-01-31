// 📂 app/admin/scan/page.tsx (SaaSセキュリティ強化版)
"use client";

import React, { useState, useEffect } from "react";
// 👇 collectionGroup, query, getDocs を追加
import { doc, getDoc, updateDoc, collectionGroup, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CheckCircle2, User, Calendar, MapPin, AlertCircle, ArrowLeft, ScanBarcode, ShieldAlert } from "lucide-react";

// スーパー管理者メアド（他のファイルと共通）
const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

export default function AdminScanPage() {
  const [inputCode, setInputCode] = useState("");
  const [reservation, setReservation] = useState<any>(null);
  const [eventData, setEventData] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "already_checked" | "permission_error">("idle");
  const [message, setMessage] = useState("");

  // ★追加：ログインユーザー情報の管理
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentUserTenant, setCurrentUserTenant] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  // 1. 権限チェック（他の画面と同様）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) { router.push("/admin/login"); return; }

      const email = user.email.replace(/\s+/g, '').toLowerCase();
      const superEmail = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();

      if (email === superEmail) {
        setIsSuperAdmin(true);
        setCurrentUserTenant("super_admin");
        setLoadingAuth(false);
      } else {
        const d = await getDoc(doc(db, "admin_users", user.email));
        if (d.exists()) {
          const data = d.data();
          if (data.branchId === "全国本部") {
             setIsSuperAdmin(true);
             setCurrentUserTenant("super_admin");
          } else {
             setIsSuperAdmin(false);
             // ここで自分の所属テナントIDをセット
             setCurrentUserTenant(data.tenantId || "demo");
          }
        } else {
          router.push("/");
        }
        setLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [router]);


  // 🔍 IDから予約情報を検索する
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode) return;

    setStatus("loading");
    setReservation(null);
    setEventData(null);
    setMessage("");

    const cleanId = inputCode.trim();

    try {
      // ---------------------------------------------------------
      // ⚠️ 注意: データ量が増えると collectionGroup 全件取得は遅くなります。
      // 将来的には、予約ドキュメント内に「searchId」のようなフィールドを作り
      // where("searchId", "==", cleanId) で検索できるようにすると高速です。
      // ---------------------------------------------------------
      
      // 1. 全予約から該当IDを探す
      const q = query(collectionGroup(db, "reservations"));
      const querySnapshot = await getDocs(q);
      const targetDoc = querySnapshot.docs.find(doc => doc.id === cleanId);

      if (!targetDoc) {
        setStatus("error");
        setMessage(`ID:「${cleanId}」が見つかりませんでした。`);
        return;
      }

      const resData = targetDoc.data();
      const pathSegments = targetDoc.ref.path.split("/");
      const parentEventId = pathSegments[1]; // events/{eventId}/reservations/...

      // 2. 親イベント情報を取得
      const eventIdToFetch = resData.eventId || parentEventId;
      let loadedEvent: any = null;

      if (eventIdToFetch) {
        const eventRef = doc(db, "events", eventIdToFetch);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          loadedEvent = { id: eventSnap.id, ...eventSnap.data() };
        }
      }

      if (!loadedEvent) {
        setStatus("error");
        setMessage("関連するイベント情報が見つかりませんでした。");
        return;
      }

      // ★★★ SaaSセキュリティチェック ★★★
      // 「自分の会社のイベント」か、または「スーパー管理者」でなければエラーにする
      if (!isSuperAdmin && loadedEvent.tenantId !== currentUserTenant) {
        console.error("Permission Denied: Tenant Mismatch", loadedEvent.tenantId, currentUserTenant);
        setStatus("permission_error");
        setMessage("他店舗・他社のイベントのため、操作権限がありません。");
        return;
      }

      // チェックOKならデータをセット
      setReservation({ id: targetDoc.id, ...resData, eventId: parentEventId });
      setEventData(loadedEvent);

      if (resData.status === "attended") {
        setStatus("already_checked");
        setMessage("このお客様は既に受付済みです。");
      } else {
        setStatus("idle");
      }

    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("データの取得に失敗しました。");
    }
  };

  // ✅ 受付を実行する
  const handleCheckIn = async () => {
    if (!reservation) return;

    try {
      if (!reservation.eventId) throw new Error("イベントID不明");

      const resRef = doc(db, "events", reservation.eventId, "reservations", reservation.id);
      
      await updateDoc(resRef, {
        status: "attended",
        attendedAt: new Date().toISOString()
      });

      setStatus("success");
      setMessage("受付が完了しました！");
      setInputCode(""); 
    } catch (error) {
      console.error("Update Error:", error);
      setStatus("error");
      setMessage("更新に失敗しました。");
    }
  };

  const handleReset = () => {
    setReservation(null);
    setEventData(null);
    setStatus("idle");
    setMessage("");
    setInputCode("");
  };

  if (loadingAuth) return <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center text-indigo-500"><div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full"/></div>;

  return (
    <div className="min-h-screen bg-[#0B0D17] text-white p-4 flex flex-col items-center relative font-sans">
      
      {/* 戻るボタン */}
      <div className="absolute top-4 left-4 z-10">
        <Link href="/admin" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold group bg-slate-900/50 px-3 py-2 rounded-full border border-slate-800">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform"/>
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
      </div>

      <div className="max-w-md w-full space-y-8 mt-12 pb-20">
        
        {/* ヘッダー */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 mb-4">
             <ScanBarcode size={32} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold tracking-wide text-white">QR Reception</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">イベント当日受付システム</p>
          {!isSuperAdmin && (
             <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-500 border border-slate-700">
               Tenant Check Active
             </span>
          )}
        </div>

        {/* 検索エリア */}
        <div className="bg-[#151926] p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
          <form onSubmit={handleSearch} className="relative">
             <input 
               type="text" 
               value={inputCode}
               onChange={(e) => setInputCode(e.target.value)}
               placeholder="IDを入力 (またはQRスキャン)"
               className="w-full bg-[#0B0D17] border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-lg text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all shadow-inner"
               autoFocus
             />
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
             <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors shadow-lg shadow-indigo-500/20">
               検索
             </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-3 text-center">
            バーコードリーダー使用時は、入力欄をクリックしてフォーカスを当ててください
          </p>
        </div>

        {/* エラー表示 */}
        {status === "error" && (
          <div className="bg-red-500/10 text-red-400 p-4 rounded-xl border border-red-500/20 flex items-center gap-3 animate-in slide-in-from-bottom-2">
            <AlertCircle className="shrink-0" /> <span className="text-sm font-bold">{message}</span>
          </div>
        )}

        {/* 権限エラー（SaaSガード） */}
        {status === "permission_error" && (
          <div className="bg-red-950/30 text-red-400 p-6 rounded-xl border border-red-900/50 flex flex-col items-center gap-3 animate-in zoom-in-95 text-center">
            <ShieldAlert size={40} /> 
            <div>
               <h3 className="font-bold text-lg mb-1">アクセス権限がありません</h3>
               <p className="text-xs opacity-80">{message}</p>
            </div>
            <button onClick={handleReset} className="mt-2 text-xs bg-red-900/50 px-4 py-2 rounded hover:bg-red-900 text-white transition-colors">閉じる</button>
          </div>
        )}

        {/* 既に受付済み */}
        {status === "already_checked" && (
           <div className="bg-yellow-500/10 text-yellow-400 p-6 rounded-xl border border-yellow-500/20 text-center animate-in zoom-in-95">
             <AlertCircle size={40} className="mx-auto mb-2" />
             <h3 className="text-lg font-bold">受付済みです</h3>
             <p className="text-xs text-yellow-200/70 mt-1 mb-4">受付日時: {reservation?.attendedAt ? new Date(reservation.attendedAt).toLocaleString() : "-"}</p>
             
             <div className="bg-yellow-950/20 p-4 rounded-lg text-left border border-yellow-500/10">
                <p className="text-xs text-yellow-500/70 mb-1">参加者名</p>
                <p className="text-xl font-bold text-white">{reservation?.name || "ゲスト"}</p>
             </div>
             
             <button onClick={handleReset} className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-bold transition-colors">
               次の人を読み取る
             </button>
           </div>
        )}

        {/* 受付成功！ */}
        {status === "success" && (
          <div className="bg-emerald-500/10 text-emerald-400 p-8 rounded-xl border border-emerald-500/20 text-center animate-in zoom-in-95 relative overflow-hidden">
             <div className="absolute inset-0 bg-emerald-500/5 animate-pulse"></div>
             <CheckCircle2 size={60} className="mx-auto mb-4 relative z-10" />
             <h2 className="text-2xl font-bold mb-1 relative z-10">受付完了！</h2>
             <p className="text-emerald-200/70 text-xs mb-6 relative z-10">Welcome to the event</p>
             
             <div className="text-white text-xl font-bold mb-8 relative z-10 bg-emerald-900/20 py-2 rounded-lg border border-emerald-500/20">
               {reservation?.name} 様
             </div>

             <button onClick={handleReset} className="relative z-10 w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2">
               <ScanBarcode size={18}/> 次の人を読み取る
             </button>
          </div>
        )}

        {/* 検索ヒット（未受付）の場合 */}
        {reservation && status === "idle" && (
          <div className="bg-white text-slate-900 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-3 flex justify-between items-center px-6">
               <span className="text-[10px] font-bold text-white/80 tracking-widest uppercase">Check-in Required</span>
               <span className="bg-white/20 text-white text-[10px] px-2 py-0.5 rounded font-mono">ID: {reservation.id.slice(0,6)}...</span>
            </div>
            
            <div className="p-6 space-y-6">
              
              <div className="flex items-start gap-4">
                 <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-100">
                    <User size={28} />
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-400 mb-1">PARTICIPANT</div>
                    <h2 className="text-2xl font-bold leading-tight">{reservation.name || "名称未設定"}</h2>
                    <p className="text-slate-500 text-sm mt-1 font-mono">{reservation.email}</p>
                    {reservation.company && <p className="text-slate-500 text-xs mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">🏢 {reservation.company}</p>}
                 </div>
              </div>

              {eventData && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 relative">
                   <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Calendar size={10}/> Target Event</div>
                   <h3 className="font-bold text-slate-800 mb-2 text-sm md:text-base line-clamp-2">{eventData.title}</h3>
                   <div className="space-y-1.5 border-t border-slate-200 pt-2 mt-2">
                     <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar size={12} className="text-indigo-500"/>
                        <span className="font-bold">{eventData.date}</span>
                        <span className="text-slate-400">|</span>
                        <span>{eventData.startTime} - {eventData.endTime}</span>
                     </div>
                     <div className="flex items-center gap-2 text-xs text-slate-600">
                        <MapPin size={12} className="text-indigo-500"/>
                        <span className="line-clamp-1">{eventData.venueName}</span>
                     </div>
                   </div>
                </div>
              )}

              <button 
                onClick={handleCheckIn}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg rounded-xl shadow-xl shadow-indigo-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20}/>
                受付する（Check In）
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}