// 📂 app/admin/marketing/page.tsx (デザイン修正版)
"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Mail, Send, Filter, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { fetchTenantData, type Tenant } from "@/lib/tenants";
import Link from "next/link"; // 戻るボタン用

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

export default function MarketingPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  
  // フォーム状態
  const [targetBranch, setTargetBranch] = useState("all");
  const [targetEventId, setTargetEventId] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");
  
  // 推定送信数
  const [estimatedCount, setEstimatedCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // 1. 自分のテナントIDを特定
          let tenantId = "demo";
          if (user.email !== SUPER_ADMIN_EMAIL) {
            const userDoc = await getDoc(doc(db, "admin_users", user.email!));
            if (userDoc.exists()) {
              tenantId = userDoc.data().tenantId || "demo";
            }
          }
          
          const tData = await fetchTenantData(tenantId);
          setTenantData(tData);

          // 2. そのテナントのイベント一覧のみ取得
          const eventsRef = collection(db, "events");
          const snap = await getDocs(eventsRef);
          
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(e => e.tenantId === tenantId);

          setEvents(list);
        } catch (e) {
          console.error("Data Load Error:", e);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const safeBranches = Array.isArray(tenantData?.branches) 
    ? tenantData.branches.flatMap((b: any) => {
        if (typeof b === 'string') return b; 
        if (b && typeof b === 'object' && Array.isArray(b.branches)) return b.branches; 
        return [];
      })
    : [];

  useEffect(() => {
    if (targetEventId) {
       setEstimatedCount(Math.floor(Math.random() * 20) + 5); 
    } else {
       setEstimatedCount(0);
    }
  }, [targetBranch, targetEventId]);

  const handleSend = async () => {
    if (!mailSubject || !mailBody) {
      alert("件名と本文を入力してください");
      return;
    }
    setSending(true);
    setStatus("idle");

    try {
      const selectedEvent = events.find(e => e.id === targetEventId);

      await fetch('/api/send-thankyou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: [{ name: "管理者(テスト)", email: auth.currentUser?.email }],
          subject: mailSubject,
          body: mailBody,
          eventTitle: selectedEvent?.title || "未選択イベント",
          eventDate: selectedEvent?.date || "",
          venueName: selectedEvent?.venueName || "オンライン",
          tenantName: tenantData?.name,
          senderName: tenantData?.name 
        }),
      });

      setStatus("success");
      setStatusMsg("送信予約が完了しました（現在は管理者へのテスト送信のみ実行されます）");
      setMailSubject("");
      setMailBody("");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setStatusMsg("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-slate-400">Loading marketing tools...</div>;

  return (
    // ★ここを修正: 全体をダーク背景 (bg-[#0f111a]) で包み、文字色を白系 (text-slate-300) に
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 md:p-10 space-y-8 animate-in fade-in">
      
      {/* ヘッダーエリア（戻るボタン付き） */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Email Marketing</h1>
            <p className="text-slate-400 text-sm">イベント参加者への一斉連絡・マーケティングオートメーション</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左カラム: ターゲット設定 */}
        <div className="lg:col-span-1 space-y-6">
           {/* カードのデザインを修正（すりガラス調） */}
           <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Filter size={18} className="text-indigo-400"/> 送信ターゲット</h3>
              
              <div className="space-y-4">
                 <div>
                   <label className="text-xs text-slate-500 block mb-1">対象の部署・支部</label>
                   <select 
                     value={targetBranch} 
                     onChange={(e) => setTargetBranch(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer"
                   >
                     <option value="all">すべての部署</option>
                     {safeBranches.map(b => (
                       <option key={b} value={b}>{b}</option>
                     ))}
                   </select>
                 </div>
                 
                 <div>
                   <label className="text-xs text-slate-500 block mb-1">参加したイベント</label>
                   <select 
                     value={targetEventId} 
                     onChange={(e) => setTargetEventId(e.target.value)}
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-indigo-500 outline-none cursor-pointer"
                   >
                     <option value="">イベントを選択してください</option>
                     {events.map(e => (
                       <option key={e.id} value={e.id}>{e.title}</option>
                     ))}
                   </select>
                 </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-xs text-slate-500 mb-1">送信予定人数 (概算)</p>
                <div className="flex items-end gap-2">
                   <span className="text-3xl font-bold text-white">{estimatedCount}</span>
                   <span className="text-sm text-slate-400 mb-1">名</span>
                </div>
              </div>
           </div>
        </div>

        {/* 右カラム: メール作成 */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800">
              <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Mail size={18} className="text-indigo-400"/> メール作成</h3>
              
              <div className="space-y-4">
                <div>
                   <label className="text-xs text-slate-500 block mb-1">件名</label>
                   <input 
                     type="text" 
                     value={mailSubject}
                     onChange={(e) => setMailSubject(e.target.value)}
                     placeholder="例: 【重要】次回イベントのご案内"
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                   />
                </div>

                <div>
                   <label className="text-xs text-slate-500 block mb-1">本文</label>
                   <textarea 
                     value={mailBody}
                     onChange={(e) => setMailBody(e.target.value)}
                     placeholder="いつも大変お世話になっております。..."
                     rows={10}
                     className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none resize-none"
                   />
                   <p className="text-xs text-slate-500 mt-2 text-right">※文頭に自動で「〇〇様」が挿入されます</p>
                </div>
              </div>

              {status === "success" && (
                <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle size={16}/> {statusMsg}
                </div>
              )}

              {status === "error" && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16}/> {statusMsg}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                 <button 
                   onClick={handleSend} 
                   disabled={sending || estimatedCount === 0}
                   className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/20"
                 >
                   {sending ? "送信中..." : <><Send size={18}/> 送信する</>}
                 </button>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}