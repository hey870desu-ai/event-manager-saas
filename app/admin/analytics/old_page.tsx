// 📂 app/admin/analytics/page.tsx (完全SaaS対応版)
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from "firebase/firestore";
// ★相対パスで正しくインポート
import { fetchAllTenants, type Tenant } from "../../../lib/tenants";
import { ArrowLeft, LogOut, Download, TrendingUp, Users, Calendar, Eye, MousePointerClick, Target, PieChart as PieIcon, Briefcase, Filter, X, Activity, MapPin } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

type EventData = { id: string; title: string; date: string; tenantId?: string; branchTag?: string; views?: number; };
type ReservationData = { id: string; checkedIn: boolean; type: string; jobTitles: string | string[]; };

export default function AnalyticsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [currentUserTenant, setCurrentUserTenant] = useState("");
  
  // ★重要：DBから取得したテナント一覧を入れる場所
  const [tenantList, setTenantList] = useState<Tenant[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

  const [kpi, setKpi] = useState({ pv: 0, cv: 0, attended: 0, online: 0, venue: 0 });
  const [jobDistribution, setJobDistribution] = useState<{name: string, value: number}[]>([]);
  const [recentStats, setRecentStats] = useState<any[]>([]);
  
  const [selectedEventStats, setSelectedEventStats] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser?.email) { router.push("/admin/login"); return; }
      
      const currentEmailClean = currentUser.email.replace(/\s+/g, '').toLowerCase();
      const superAdminEmailClean = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();
      const isSuper = currentEmailClean === superAdminEmailClean;

      if (isSuper) {
        setUser(currentUser);
        setIsSuperAdminMode(true);
        // ★スーパー管理者は全テナントを取得してリストにセット
        const tenants = await fetchAllTenants();
        setTenantList(tenants);
        
        // データ読み込み（テナントリストを渡して処理させる）
        loadAnalyticsData(true, "", "all", tenants);
        return;
      }

      const d = await getDoc(doc(db, "admin_users", currentUser.email));
      if (d.exists()) {
        const data = d.data();
        setUser(currentUser);
        if (data.branchId === "全国本部") {
          setIsSuperAdminMode(true);
          const tenants = await fetchAllTenants();
          setTenantList(tenants);
          loadAnalyticsData(true, "", "all", tenants);
        } else {
          // ★修正：古い関数を使わず、DBの値をそのまま使う
          // もしDBに tenantId が入っていなければ demo になる
          const myTenantId = data.tenantId || "demo";
          setCurrentUserTenant(myTenantId);
          setIsSuperAdminMode(false);
          loadAnalyticsData(false, myTenantId, "all", []);
        }
      } else {
        router.push("/");
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    if (isSuperAdminMode) {
      // フィルター変更時に再検索（tenantListを渡す）
      loadAnalyticsData(true, "", selectedBranchFilter, tenantList);
    }
  }, [selectedBranchFilter]); // tenantList は基本変わらないので依存配列から外してもOK

  // ★修正：tenantList を引数で受け取るように変更（stateだとタイミングがずれることがあるため）
  const loadAnalyticsData = async (isSuper: boolean, myTenantId: string, branchFilter: string, currentTenants: Tenant[]) => {
    setLoading(true);
    
    setKpi({ pv: 0, cv: 0, attended: 0, online: 0, venue: 0 });
    setRecentStats([]);
    setJobDistribution([]);

    try {
      let q;
      if (isSuper) {
        if (branchFilter !== "all") {
          // ★修正：古い getTenantIdFromBranchName を廃止。
          // tenantList (currentTenants) から、その支部名を持つテナントを探す
          const targetTenantObj = currentTenants.find(t => (t.branches || []).includes(branchFilter));
          const targetTenantId = targetTenantObj ? targetTenantObj.id : null;
          
          if (!targetTenantId) {
             console.log("テナントが見つかりません:", branchFilter);
             setLoading(false);
             return;
          }

          q = query(collection(db, "events"), where("tenantId", "==", targetTenantId), orderBy("date", "desc"), limit(50));
        } else {
          q = query(collection(db, "events"), orderBy("date", "desc"), limit(50));
        }
      } else {
        q = query(collection(db, "events"), where("tenantId", "==", myTenantId), orderBy("date", "desc"), limit(50));
      }

      const snapshot = await getDocs(q);
      const loadedEvents = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as EventData[];

      let totalPV = 0;
      let totalCV = 0;
      let totalAttended = 0;
      let totalOnline = 0;
      let totalVenue = 0;
      const globalJobCounts: {[key: string]: number} = {};
      const statsList = [];

      for (const ev of loadedEvents) {
        const resSnap = await getDocs(collection(db, "events", ev.id, "reservations"));
        const reservations = resSnap.docs.map(d => d.data() as ReservationData);
        
        const views = ev.views || 0;
        const cv = reservations.length;
        const attended = reservations.filter(r => r.checkedIn).length;
        
        let evOnline = 0;
        let evVenue = 0;
        const evJobCounts: {[key: string]: number} = {};

        reservations.forEach(r => {
          if (r.type === 'online') { evOnline++; totalOnline++; } 
          else { evVenue++; totalVenue++; }
          
          const jobs = Array.isArray(r.jobTitles) ? r.jobTitles : [r.jobTitles || "未回答"];
          jobs.forEach(j => {
            const cleanJob = j.trim() || "未回答";
            globalJobCounts[cleanJob] = (globalJobCounts[cleanJob] || 0) + 1;
            evJobCounts[cleanJob] = (evJobCounts[cleanJob] || 0) + 1;
          });
        });

        totalPV += views;
        totalCV += cv;
        totalAttended += attended;

        statsList.push({
          id: ev.id,
          title: ev.title,
          date: ev.date,
          branch: ev.branchTag || "不明",
          pv: views,
          cv: cv,
          attended: attended,
          cvr: views > 0 ? ((cv / views) * 100).toFixed(1) : "0.0",
          attendanceRate: cv > 0 ? ((attended / cv) * 100).toFixed(1) : "0.0",
          online: evOnline,
          venue: evVenue,
          jobData: Object.entries(evJobCounts).map(([n, v]) => ({ name: n, value: v })).sort((a,b)=>b.value-a.value)
        });
      }

      setKpi({ pv: totalPV, cv: totalCV, attended: totalAttended, online: totalOnline, venue: totalVenue });
      setRecentStats(statsList);

      const sortedJobs = Object.entries(globalJobCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([name, value]) => ({ name, value }));
      
      if (sortedJobs.length > 5) {
        const top5 = sortedJobs.slice(0, 5);
        const others = sortedJobs.slice(5).reduce((acc, cur) => acc + cur.value, 0);
        setJobDistribution([...top5, { name: "その他", value: others }]);
      } else {
        setJobDistribution(sortedJobs);
      }

    } catch (e: any) {
      console.error(e);
      if (e.message.includes("index")) {
         alert("【管理者用】インデックス作成が必要です。\nコンソールのリンクを確認してください。");
         console.log(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!confirm("CSVデータを抽出しますか？")) return;
    setIsDownloading(true);
    try {
      let q;
      if (isSuperAdminMode) {
         if (selectedBranchFilter !== "all") {
            // ★修正：ここも動的ロジックに変更
            const targetTenantObj = tenantList.find(t => (t.branches || []).includes(selectedBranchFilter));
            const targetTenant = targetTenantObj ? targetTenantObj.id : null;

            if (!targetTenant) { alert("データなし"); setIsDownloading(false); return; }
            q = query(collection(db, "events"), where("tenantId", "==", targetTenant), orderBy("date", "desc"));
         } else {
            q = query(collection(db, "events"), orderBy("date", "desc"));
         }
      } else {
        q = query(collection(db, "events"), where("tenantId", "==", currentUserTenant), orderBy("date", "desc"));
      }
      
      const eventSnap = await getDocs(q);
      const allEvents = eventSnap.docs.map(d => ({ id: d.id, ...d.data() })) as EventData[];
      
      console.log(`CSV出力開始: 対象イベント数 ${allEvents.length}件`);

      let csvContent = "\uFEFFイベント日,主催支部,イベント名,PV数,氏名,会社名,部署,役職,メール,電話,会員種別,参加形式,きっかけ,紹介者,申込日時,ステータス\n";

      const chunkSize = 5;
      for (let i = 0; i < allEvents.length; i += chunkSize) {
        const chunk = allEvents.slice(i, i + chunkSize);
        const promises = chunk.map(async (ev) => {
          try {
            const resSnap = await getDocs(collection(db, "events", ev.id, "reservations"));
            return resSnap.docs.map(doc => {
              const r = doc.data() as any;
              const dateStr = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : "";
              
              const escape = (val: any) => {
                if (val === null || val === undefined) return '""';
                if (Array.isArray(val)) return `"${val.join(' / ').replace(/"/g, '""')}"`;
                return `"${String(val).replace(/"/g, '""')}"`;
              };
              
              const cleanPhone = (r.phone || "").toString().replace(/[^0-9]/g, ""); 
              let formattedPhone = cleanPhone;
              if (cleanPhone.length === 11) formattedPhone = cleanPhone.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
              else if (cleanPhone.length === 10) {
                  if (cleanPhone.startsWith("03") || cleanPhone.startsWith("06")) formattedPhone = cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, "$1-$2-$3");
                  else formattedPhone = cleanPhone.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");
              }

              return [
                escape(ev.date), escape(ev.branchTag || "不明"), escape(ev.title), ev.views || 0,
                escape(r.name), escape(r.company), escape(r.department), escape(r.jobTitles),
                escape(r.email), escape(formattedPhone), escape(r.membership), escape(r.type),
                escape(r.source), escape(r.referrer), escape(dateStr), escape(r.checkedIn ? "参加済" : "未")
              ].join(",");
            }).join("\n");
          } catch (err) {
            console.error("イベント処理中にエラー:", ev.title, err);
            return ""; 
          }
        });
        const results = await Promise.all(promises);
        const chunkCsv = results.filter(s => s).join("\n");
        if (chunkCsv) csvContent += chunkCsv + "\n";
      }

      if (allEvents.length > 0 && csvContent.split('\n').length <= 1) {
         alert("データが見つかりませんでした。");
      }

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Marketing_Data_${selectedBranchFilter}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (e: any) { 
       console.error(e);
       alert("CSVダウンロードに失敗しました: " + e.message); 
    } finally { setIsDownloading(false); }
  };
  

  const handleRowClick = (stats: any) => {
    setSelectedEventStats(stats);
    setIsDetailOpen(true);
  };

  const funnelData = [
    { name: '閲覧 (PV)', value: kpi.pv, fill: '#64748b' },
    { name: '申込 (CV)', value: kpi.cv, fill: '#06b6d4' },
    { name: '参加 (Active)', value: kpi.attended, fill: '#10b981' },
  ];
  
  const typeData = [
    { name: 'オンライン', value: kpi.online },
    { name: '会場参加', value: kpi.venue },
  ];

  if (loading) return <div className="min-h-screen bg-[#020617] flex items-center justify-center text-cyan-500 font-mono tracking-widest"><div className="animate-pulse">LOADING DATA...</div></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-cyan-900 selection:text-white pb-20">
      <header className="bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <button onClick={() => router.push("/admin")} className="hover:text-cyan-400 transition-colors">
               <ArrowLeft />
             </button>
             <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-wide">
               <Activity className="text-cyan-500"/> 分析コックピット
             </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {isSuperAdminMode && (
               <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1.5">
                  <Filter size={14} className="text-slate-500"/>
                  {/* ★修正：DBから取得したテナントリストでセレクトボックスを作成 */}
                  <select 
                    value={selectedBranchFilter}
                    onChange={(e) => setSelectedBranchFilter(e.target.value)}
                    className="bg-transparent text-sm text-white outline-none cursor-pointer font-bold"
                  >
                    <option value="all">全国の支部を表示</option>
                    {tenantList.map(tenant => (
                       <optgroup key={tenant.id} label={tenant.name}>
                         {(tenant.branches || []).map(b => <option key={b} value={b}>{b}</option>)}
                       </optgroup>
                    ))}
                  </select>
               </div>
             )}
             <button onClick={() => signOut(auth)} className="hover:text-red-400"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        
        {/* KPI ROW */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-slate-800 border border-slate-700">
           {/* PV */}
           <div className="bg-[#0f172a] p-6 group hover:bg-[#1e293b] transition-colors relative">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">総閲覧数 (PV)</div>
              <div className="text-3xl font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">{kpi.pv.toLocaleString()}</div>
              <div className="absolute top-4 right-4 text-slate-700 group-hover:text-slate-600"><Eye/></div>
           </div>
           {/* CV */}
           <div className="bg-[#0f172a] p-6 group hover:bg-[#1e293b] transition-colors relative">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">総申込数 (CV)</div>
              <div className="text-3xl font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">{kpi.cv.toLocaleString()}</div>
              <div className="absolute top-4 right-4 text-slate-700 group-hover:text-slate-600"><MousePointerClick/></div>
           </div>
           {/* CVR */}
           <div className="bg-[#0f172a] p-6 group hover:bg-[#1e293b] transition-colors relative">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">申込率 (CVR)</div>
              <div className="text-3xl font-mono font-bold text-cyan-400">{kpi.pv > 0 ? ((kpi.cv/kpi.pv)*100).toFixed(1) : "0.0"}%</div>
              <div className="absolute top-4 right-4 text-slate-700 group-hover:text-slate-600"><Target/></div>
           </div>
           {/* Active */}
           <div className="bg-[#0f172a] p-6 group hover:bg-[#1e293b] transition-colors relative">
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">参加者数</div>
              <div className="text-3xl font-mono font-bold text-emerald-400">{kpi.attended.toLocaleString()}</div>
              <div className="absolute top-4 right-4 text-slate-700 group-hover:text-slate-600"><Users/></div>
           </div>
           {/* Download */}
           <button 
             onClick={handleDownloadAll} 
             disabled={isDownloading}
             className="bg-[#0f172a] p-6 hover:bg-cyan-900/20 transition-colors flex flex-col items-center justify-center gap-2 group border-l border-slate-800"
           >
             {isDownloading ? <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full"/> : <Download className="text-slate-400 group-hover:text-cyan-400"/>}
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-white">CSV出力</span>
           </button>
        </div>

        {/* CHARTS ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Funnel Chart */}
          <div className="lg:col-span-2 bg-[#0f172a] border border-slate-700 p-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp size={16} className="text-cyan-500"/> 集客の歩留まり (ファネル分析)</h3>
            <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                   <XAxis type="number" stroke="#475569" fontSize={10} fontFamily="monospace"/>
                   <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} width={100} tick={{fontSize: 12, fill: '#cbd5e1'}}/>
                   <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />
                   <Bar dataKey="value" barSize={32}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>

          {/* Ratio & Jobs */}
          <div className="space-y-6">
             {/* Online/Venue */}
             <div className="bg-[#0f172a] border border-slate-700 p-6 h-[200px] flex items-center relative">
                <div className="absolute top-4 left-4 text-xs font-bold text-slate-400 uppercase tracking-widest">参加形式比率</div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={typeData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      <Cell fill="#06b6d4" /> <Cell fill="#f97316" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />
                    <Legend verticalAlign="bottom" height={24} iconSize={8} wrapperStyle={{fontSize:'11px'}}/>
                  </PieChart>
                </ResponsiveContainer>
             </div>

             {/* Job Distribution */}
             <div className="bg-[#0f172a] border border-slate-700 p-6 h-[200px]">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">参加者の職種分布</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} interval={0} tick={{width: 80}} height={20}/>
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />
                    <Bar dataKey="value" fill="#8b5cf6" barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="bg-[#0f172a] border border-slate-700">
           <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
             <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
               <Calendar size={16} className="text-cyan-500"/> イベント別詳細データ
             </h3>
             <span className="text-[10px] text-slate-500">行をクリックして詳細を表示</span>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm text-slate-400 font-mono">
               <thead className="bg-[#020617] text-slate-500 uppercase text-[10px] tracking-wider">
                 <tr>
                   <th className="px-6 py-3 font-medium">開催日</th>
                   <th className="px-6 py-3 font-medium">主催支部</th>
                   <th className="px-6 py-3 font-medium">イベント名</th>
                   <th className="px-6 py-3 text-right text-slate-300">閲覧 (PV)</th>
                   <th className="px-6 py-3 text-right text-cyan-400">申込 (CV)</th>
                   <th className="px-6 py-3 text-right">申込率</th>
                   <th className="px-6 py-3 text-right text-emerald-400">参加</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800">
                 {recentStats.map((item, idx) => (
                   <tr 
                     key={idx} 
                     onClick={() => handleRowClick(item)}
                     className="hover:bg-cyan-900/10 cursor-pointer transition-colors group"
                   >
                     <td className="px-6 py-4">{item.date}</td>
                     <td className="px-6 py-4 text-xs">{item.branch}</td>
                     <td className="px-6 py-4 text-slate-200 font-sans font-bold group-hover:text-cyan-300 transition-colors">{item.title}</td>
                     <td className="px-6 py-4 text-right">{item.pv.toLocaleString()}</td>
                     <td className="px-6 py-4 text-right font-bold">{item.cv}</td>
                     <td className="px-6 py-4 text-right">{item.cvr}%</td>
                     <td className="px-6 py-4 text-right font-bold">{item.attended}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

      </main>

      {/* MODAL */}
      {isDetailOpen && selectedEventStats && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsDetailOpen(false)}>
           <div className="bg-[#0f172a] border border-slate-600 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-700 flex justify-between items-start bg-slate-900">
                 <div>
                    <div className="text-[10px] text-cyan-500 uppercase tracking-widest font-bold mb-1">イベント分析詳細</div>
                    <h2 className="text-xl font-bold text-white">{selectedEventStats.title}</h2>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400 font-mono">
                       <span className="flex items-center gap-1"><Calendar size={12}/> {selectedEventStats.date}</span>
                       <span className="flex items-center gap-1"><MapPin size={12}/> {selectedEventStats.branch}</span>
                    </div>
                 </div>
                 <button onClick={() => setIsDetailOpen(false)}><X className="text-slate-500 hover:text-white"/></button>
              </div>
              
              <div className="p-8 space-y-8">
                 {/* Mini KPI */}
                 <div className="grid grid-cols-4 gap-4">
                    <div className="bg-[#020617] p-4 border border-slate-800 text-center">
                       <div className="text-[10px] text-slate-500 uppercase mb-1">閲覧数 (PV)</div>
                       <div className="text-2xl font-mono text-white">{selectedEventStats.pv}</div>
                    </div>
                    <div className="bg-[#020617] p-4 border border-slate-800 text-center">
                       <div className="text-[10px] text-slate-500 uppercase mb-1">申込数</div>
                       <div className="text-2xl font-mono text-cyan-400">{selectedEventStats.cv}</div>
                    </div>
                    <div className="bg-[#020617] p-4 border border-slate-800 text-center">
                       <div className="text-[10px] text-slate-500 uppercase mb-1">申込率 (CVR)</div>
                       <div className="text-2xl font-mono text-white">{selectedEventStats.cvr}%</div>
                    </div>
                    <div className="bg-[#020617] p-4 border border-slate-800 text-center">
                       <div className="text-[10px] text-slate-500 uppercase mb-1">実参加数</div>
                       <div className="text-2xl font-mono text-emerald-400">{selectedEventStats.attended}</div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">参加形式の内訳</h4>
                       <div className="h-[200px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={[
                                  { name: 'オンライン', value: selectedEventStats.online }, 
                                  { name: '会場参加', value: selectedEventStats.venue }
                               ]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                                  <Cell fill="#06b6d4" /> <Cell fill="#f97316" />
                               </Pie>
                               <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', color: '#fff' }} />
                               <Legend wrapperStyle={{fontSize:'11px'}}/>
                            </PieChart>
                          </ResponsiveContainer>
                       </div>
                    </div>

                    <div>
                       <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">職種の内訳</h4>
                       <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {selectedEventStats.jobData.length === 0 ? <p className="text-xs text-slate-600">データなし</p> :
                            selectedEventStats.jobData.map((j: any, idx: number) => (
                             <div key={idx} className="flex justify-between text-xs items-center group">
                                <span className="text-slate-400 group-hover:text-white">{j.name}</span>
                                <div className="flex items-center gap-2">
                                   <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-cyan-600" style={{ width: `${(j.value / selectedEventStats.cv) * 100}%` }}></div>
                                   </div>
                                   <span className="font-mono text-cyan-400 w-6 text-right">{j.value}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}