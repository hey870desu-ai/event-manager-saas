"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { ArrowLeft, Mail, Users, Send, Filter, CheckCircle, RefreshCw, AlertTriangle, PlayCircle } from "lucide-react";
import Link from "next/link";
import { fetchTenantData, type Tenant } from "@/lib/tenants";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

type Recipient = { email: string; name: string };

export default function MarketingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // 抽出条件
  const [targetBranch, setTargetBranch] = useState("all"); 
  const [targetEventId, setTargetEventId] = useState("all");
  const [events, setEvents] = useState<any[]>([]);

  // 抽出結果
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [extracted, setExtracted] = useState(false);
  
  // メール作成
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // 1. テナントID特定
          let tenantId = "demo";
          if (currentUser.email !== SUPER_ADMIN_EMAIL) {
            const userDoc = await getDoc(doc(db, "admin_users", currentUser.email!));
            if (userDoc.exists()) {
              tenantId = userDoc.data().tenantId || "demo";
            }
          }
          
          // 2. テナント情報取得
          const tData = await fetchTenantData(tenantId);
          setTenantData(tData);

          // 3. イベント一覧取得 (自社データのみ)
          const q = query(collection(db, "events"), where("tenantId", "==", tenantId));
          const snap = await getDocs(q);
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
          setEvents(list);

        } catch (e) {
          console.error("Load Error:", e);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 支部リスト（安全な配列変換）
  const safeBranches = Array.isArray(tenantData?.branches) 
    ? tenantData.branches.flatMap((b: any) => {
        if (typeof b === 'string') return b; 
        if (b && typeof b === 'object' && Array.isArray(b.branches)) return b.branches; 
        return [];
      })
    : [];

  // ★リスト抽出・名寄せロジック
  const fetchTargets = async () => {
    if (!tenantData) return;
    setLoadingTargets(true);
    setRecipients([]);
    setExtracted(false);

    try {
      // 1. 対象イベントを絞り込み
      let targetEvents = events;
      
      // 支部フィルター
      if (targetBranch !== "all") {
        targetEvents = targetEvents.filter(e => e.branchTag === targetBranch);
      }
      // イベント単体フィルター
      if (targetEventId !== "all") {
        targetEvents = targetEvents.filter(e => e.id === targetEventId);
      }

      if (targetEvents.length === 0) {
        alert("条件に一致するイベントがありません。");
        setLoadingTargets(false);
        return;
      }

      // 2. 予約データを全取得してMapで重複除去
      const emailMap = new Map<string, string>(); 

      await Promise.all(targetEvents.map(async (event) => {
        // サブコレクション "reservations" を取得
        const resSnap = await getDocs(collection(db, "events", event.id, "reservations"));
        resSnap.forEach(doc => {
          const data = doc.data();
          // メールと名前がある有効なデータのみ
          if (data.email && data.name) {
            // 重複があれば上書き（最新の名前になる...が、順序保証はないので「あるもの」を使う）
            emailMap.set(data.email, data.name);
          }
        });
      }));

      const uniqueList = Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
      
      setRecipients(uniqueList);
      setExtracted(true); // 抽出完了フラグ

    } catch (e) {
      console.error(e);
      alert("リストの抽出に失敗しました。");
    } finally {
      setLoadingTargets(false);
    }
  };

  // 送信処理
  const handleSend = async (isTest: boolean = false) => {
    if (!subject || !body) return alert("件名と本文を入力してください。");
    
    // テスト送信の場合は自分宛てのみ
    const finalRecipients = isTest 
      ? [{ email: user?.email || "", name: "管理者(テスト)" }] 
      : recipients;

    if (finalRecipients.length === 0) return alert("宛先がありません。");

    // 確認ダイアログ
    if (!isTest) {
      if (!confirm(`【最終確認】\n\n宛先数: ${finalRecipients.length} 名\n件名: ${subject}\n\n本当に一斉送信しますか？`)) return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/send-thankyou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: finalRecipients, 
          subject: isTest ? `[TEST] ${subject}` : subject,
          body: body,
          senderName: tenantData?.name || "Event Manager",
          eventTitle: `${tenantData?.name}よりお知らせ`, 
          eventDate: new Date().toLocaleDateString(), 
          venueName: "―", 
        }),
      });

      if (res.ok) {
        alert(isTest ? "テスト送信完了！メールを確認してください。" : "一斉送信リクエスト完了！順次配信されます。");
        if (!isTest) {
          setSubject("");
          setBody("");
          setExtracted(false); // 送信したらリストをリセット
          setRecipients([]);
        }
      } else {
        alert("送信エラーが発生しました。");
      }
    } catch (e) {
      alert("通信エラー");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-slate-400">Loading marketing tools...</div>;

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 md:p-10 space-y-8 animate-in fade-in">
      
      {/* ヘッダー */}
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <Link href="/admin" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Mail className="text-indigo-500"/> Marketing Mail
          </h1>
          <p className="text-slate-400 text-sm">顧客リスト抽出 & 一斉配信システム</p>
        </div>
      </div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左カラム: リスト抽出 */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Filter size={18} className="text-indigo-400"/> 配信ターゲット抽出</h2>
              
              <div className="space-y-4">
                 {/* 支部選択 */}
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">対象範囲 (Branch)</label>
                    <select 
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none cursor-pointer hover:border-indigo-500/50 transition-colors"
                    >
                       <option value="all">👑 全部署・全イベント</option>
                       {safeBranches.map(b => (
                         <option key={b} value={b}>{b}</option>
                       ))}
                    </select>
                 </div>

                 {/* イベント選択 */}
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">特定のイベント (任意)</label>
                    <select 
                      value={targetEventId}
                      onChange={(e) => setTargetEventId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none cursor-pointer hover:border-indigo-500/50 transition-colors"
                    >
                       <option value="all">指定なし（範囲内の全イベント）</option>
                       {events
                         .filter(e => targetBranch === "all" || e.branchTag === targetBranch)
                         .map(e => (
                           <option key={e.id} value={e.id}>{e.title}</option>
                         ))}
                    </select>
                 </div>

                 <button 
                   onClick={fetchTargets}
                   disabled={loadingTargets}
                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {loadingTargets ? <RefreshCw className="animate-spin" size={18}/> : <Users size={18}/>}
                   リストを抽出・名寄せ
                 </button>
              </div>
           </div>

           {/* 抽出結果ステータス */}
           <div className={`bg-slate-900/50 border border-slate-800 p-6 rounded-xl text-center transition-all duration-500 ${extracted ? "opacity-100 translate-y-0" : "opacity-50 translate-y-2"}`}>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Total Recipients</div>
              <div className="text-4xl font-mono font-bold text-white mb-2">
                 {recipients.length.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-400 flex justify-center items-center gap-1 font-bold">
                 <CheckCircle size={12}/> 重複アドレス除去済み
              </div>
              
              {recipients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 text-left max-h-[250px] overflow-y-auto custom-scrollbar bg-slate-950/50 rounded-lg p-2">
                   <p className="text-[10px] text-slate-500 mb-2 sticky top-0 bg-slate-950 pb-1 border-b border-slate-800">抽出プレビュー:</p>
                   {recipients.slice(0, 50).map((r, i) => (
                      <div key={i} className="text-xs text-slate-400 truncate border-b border-slate-800/50 py-1.5 flex justify-between">
                        <span className="text-white">{r.name}</span> 
                        <span className="text-slate-600 ml-2 text-[10px]">{r.email}</span>
                      </div>
                   ))}
                   {recipients.length > 50 && <div className="text-xs text-slate-600 py-2 text-center font-bold">...他 {recipients.length - 50} 名</div>}
                </div>
              )}
           </div>
        </div>

        {/* 右カラム: メール作成・送信 */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl h-full flex flex-col relative">
              
              {/* オーバーレイ（抽出前は操作不可にする） */}
              {!extracted && (
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl border border-slate-800/50">
                    <Filter className="text-slate-600 mb-2" size={48}/>
                    <p className="text-slate-400 font-bold">左側のメニューからリストを抽出してください</p>
                 </div>
              )}

              <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Mail size={18} className="text-indigo-400"/> メール作成</h2>
              
              <div className="space-y-4 flex-1">
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">件名 (Subject)</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="例: 【重要】セミナーのご案内"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors"
                    />
                 </div>
                 <div className="h-full flex flex-col">
                    <label className="block text-xs text-slate-500 font-bold mb-2">本文 (Body)</label>
                    <div className="text-[10px] text-slate-500 mb-2 bg-slate-950 p-3 rounded border border-slate-800 flex items-start gap-2">
                       <span className="text-yellow-500">💡</span> 
                       <div>
                         本文中の「参加者各位」は、送信時に自動で「〇〇 様」に置き換わります。<br/>
                         送信者名: <span className="text-indigo-400 font-bold">{tenantData?.name || "..."}</span>
                       </div>
                    </div>
                    <textarea 
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="いつも大変お世話になっております。..."
                      className="w-full flex-1 min-h-[300px] bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors resize-none font-sans leading-relaxed"
                    />
                 </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                    <AlertTriangle size={14} className="text-amber-500"/>
                    一度送信すると取り消しはできません
                 </div>
                 
                 <div className="flex gap-3 w-full md:w-auto">
                    {/* テスト送信ボタン */}
                    <button 
                      onClick={() => handleSend(true)}
                      disabled={sending}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all flex items-center gap-2 border border-slate-700 w-full md:w-auto justify-center"
                    >
                      <PlayCircle size={18}/> テスト送信 (自分のみ)
                    </button>

                    {/* 本番送信ボタン */}
                    <button 
                      onClick={() => handleSend(false)}
                      disabled={sending || recipients.length === 0}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center"
                    >
                      {sending ? <RefreshCw className="animate-spin" size={18}/> : <Send size={18}/>}
                      {recipients.length}名に一斉送信
                    </button>
                 </div>
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}