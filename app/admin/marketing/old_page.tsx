// 📂 app/admin/marketing/page.tsx (SaaS完全対応・名残消去版)
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { fetchAllTenants, type Tenant } from "../../../lib/tenants";
import { ArrowLeft, LogOut, Mail, Users, Send, Filter, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

type Recipient = { email: string; name: string };

export default function MarketingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [currentUserTenant, setCurrentUserTenant] = useState("");
  // 自分の支部名（表示用）
  const [myBranchLabel, setMyBranchLabel] = useState(""); 
  
  const [tenantList, setTenantList] = useState<Tenant[]>([]);
  
  const [targetBranch, setTargetBranch] = useState("all"); 
  const [loadingTargets, setLoadingTargets] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const [recipients, setRecipients] = useState<Recipient[]>([]);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser?.email) { router.push("/admin/login"); return; }
      
      const email = currentUser.email.replace(/\s+/g, '').toLowerCase();
      const superEmail = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();
      
      const allTenants = await fetchAllTenants();
      setTenantList(allTenants);

      if (email === superEmail) {
        setUser(currentUser);
        setIsSuperAdmin(true);
        setMyBranchLabel("システム管理者"); // ★修正: 本部事務局などを汎用的な名称に
      } else {
        const d = await getDoc(doc(db, "admin_users", currentUser.email));
        if (d.exists()) {
          const data = d.data();
          setUser(currentUser);
          if (data.branchId === "全国本部") {
            setIsSuperAdmin(true);
            setMyBranchLabel("本部事務局"); // 必要ならここも変更可能
          } else {
            setIsSuperAdmin(false);
            const myTenantId = data.tenantId || "demo";
            setCurrentUserTenant(myTenantId);
            
            // テナント名を取得して表示に使う
            const myTenantName = allTenants.find(t => t.id === myTenantId)?.name || "所属不明";
            // 支部IDがあればそれを、なければ会社名(テナント名)を表示
            setMyBranchLabel(data.branchId || myTenantName); 
            
            setTargetBranch(data.branchId || "all"); 
          }
        } else {
          router.push("/");
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchTargets = async () => {
    setLoadingTargets(true);
    setRecipients([]);
    try {
      let q;
      if (isSuperAdmin) {
        if (targetBranch === "all") {
          q = query(collection(db, "events")); 
        } else {
          const targetTenantObj = tenantList.find(t => (t.branches || []).includes(targetBranch));
          const targetTenantId = targetTenantObj ? targetTenantObj.id : null;

          if (!targetTenantId) {
             alert(`支部「${targetBranch}」のデータが見つかりません。`);
             setLoadingTargets(false);
             return;
          }
          q = query(collection(db, "events"), where("tenantId", "==", targetTenantId));
        }
      } else {
        q = query(collection(db, "events"), where("tenantId", "==", currentUserTenant));
      }

      const eventSnaps = await getDocs(q);
      const events = eventSnaps.docs.map(d => d.id);

      if (events.length === 0) {
        alert("対象となるイベントデータがありませんでした。");
        setLoadingTargets(false);
        return;
      }

      const emailMap = new Map<string, string>(); 

      await Promise.all(events.map(async (eventId) => {
        const resSnap = await getDocs(collection(db, "events", eventId, "reservations"));
        resSnap.forEach(doc => {
          const data = doc.data();
          if (data.email && data.name) {
            emailMap.set(data.email, data.name);
          }
        });
      }));

      const uniqueList = Array.from(emailMap.entries()).map(([email, name]) => ({ email, name }));
      setRecipients(uniqueList);

    } catch (e) {
      console.error(e);
      alert("リストの抽出に失敗しました。");
    } finally {
      setLoadingTargets(false);
    }
  };

  const handleSend = async () => {
    if (recipients.length === 0) return alert("宛先リストが空です。");
    if (!subject || !body) return alert("件名と本文を入力してください。");
    
    // ★修正: 固定文字列を削除し、純粋に組織名・支部名のみを差出人にする
    const senderName = myBranchLabel || "事務局";

    if (!confirm(`【最終確認】\n\n差出人: ${senderName}\n宛先数: ${recipients.length} 名\n件名: ${subject}\n\n本当に一斉送信しますか？`)) return;

    setSending(true);
    try {
      const res = await fetch('/api/send-thankyou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipients, 
          subject: subject,
          body: body,
          eventTitle: `${senderName}よりお知らせ`, 
          eventDate: new Date().toLocaleDateString(), 
          venueName: "―", 
        }),
      });

      if (res.ok) {
        alert("送信リクエスト完了！\n順次配信されます。");
        setSubject("");
        setBody("");
      } else {
        alert("送信エラーが発生しました。");
      }
    } catch (e) {
      alert("通信エラー");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans pb-20">
      <header className="bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => router.push("/admin")} className="hover:text-cyan-400 transition-colors">
               <ArrowLeft />
             </button>
             <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide">
               <Mail className="text-violet-500"/> MARKETING MAIL
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {myBranchLabel ? `Login: ${myBranchLabel}` : '...'}
            </span>
            <button onClick={() => signOut(auth)} className="hover:text-red-400"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左カラム: ターゲット抽出 */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-violet-500"></div>
              <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Filter size={18} className="text-violet-400"/> 配信ターゲット抽出</h2>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">対象範囲 (Branch)</label>
                    <select 
                      value={targetBranch}
                      onChange={(e) => setTargetBranch(e.target.value)}
                      disabled={!isSuperAdmin}
                      className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-bold outline-none ${!isSuperAdmin && 'opacity-50'}`}
                    >
                       {isSuperAdmin && <option value="all">👑 全国の全ユーザー</option>}
                       {tenantList.map(tenant => (
                         <optgroup key={tenant.id} label={tenant.name}>
                           {(tenant.branches || []).map(b => <option key={b} value={b}>{b}</option>)}
                         </optgroup>
                       ))}
                    </select>
                 </div>

                 <button 
                   onClick={fetchTargets}
                   disabled={loadingTargets}
                   className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-violet-500/20"
                 >
                   {loadingTargets ? <RefreshCw className="animate-spin"/> : <Users size={18}/>}
                   リストを抽出・名寄せ
                 </button>
              </div>
           </div>

           {/* 抽出結果ステータス */}
           <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-xl text-center">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Total Recipients</div>
              <div className="text-4xl font-mono font-bold text-white mb-2">
                 {recipients.length.toLocaleString()}
              </div>
              <div className="text-xs text-emerald-400 flex justify-center items-center gap-1">
                 <CheckCircle size={12}/> 重複アドレス除去済み
              </div>
              
              {recipients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 text-left max-h-[200px] overflow-y-auto custom-scrollbar">
                   <p className="text-[10px] text-slate-500 mb-2">抽出プレビュー:</p>
                   {recipients.slice(0, 50).map((r, i) => (
                      <div key={i} className="text-xs text-slate-400 truncate border-b border-slate-800/50 py-1">
                        {r.name} <span className="text-slate-600">&lt;{r.email}&gt;</span>
                      </div>
                   ))}
                   {recipients.length > 50 && <div className="text-xs text-slate-600 py-1 text-center">...他 {recipients.length - 50} 名</div>}
                </div>
              )}
           </div>
        </div>

        {/* 右カラム: メール作成・送信 */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-[#0f172a] border border-slate-700 p-6 rounded-xl h-full flex flex-col">
              <h2 className="text-white font-bold mb-6 flex items-center gap-2"><Mail size={18} className="text-cyan-400"/> メール作成</h2>
              
              <div className="space-y-4 flex-1">
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">件名 (Subject)</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="例: 【重要】セミナーのご案内"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors"
                    />
                 </div>
                 <div className="h-full flex flex-col">
                    <label className="block text-xs text-slate-500 font-bold mb-2">本文 (Body)</label>
                    <div className="text-[10px] text-slate-500 mb-2 bg-slate-900 p-2 rounded border border-slate-800">
                       💡 ヒント: 本文中の「参加者各位」は、自動的に「〇〇 様」に置き換わります。<br/>
                       {/* ★修正: 表示文言からも固定名を削除 */}
                       送信者名: <span className="text-cyan-400 font-bold">{myBranchLabel || "..."}</span> として送信されます。
                    </div>
                    <textarea 
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="本文を入力してください..."
                      className="w-full flex-1 min-h-[300px] bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:border-cyan-500 outline-none transition-colors resize-none font-sans leading-relaxed"
                    />
                 </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between items-center">
                 <div className="text-xs text-slate-500 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-orange-500"/>
                    送信後の取り消しはできません
                 </div>
                 <button 
                   onClick={handleSend}
                   disabled={sending || recipients.length === 0}
                   className="px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {sending ? <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"/> : <Send size={18}/>}
                   一斉送信を実行
                 </button>
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}