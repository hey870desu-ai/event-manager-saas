// 📂 app/admin/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, Calendar, TrendingUp, DollarSign, Filter, ArrowLeft } from "lucide-react"; // ArrowLeftを追加
import { fetchTenantData, type Tenant } from "@/lib/tenants";
import Link from "next/link"; // Linkコンポーネントを追加

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AnalyticsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [branchFilter, setBranchFilter] = useState("all");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          let tenantId = "demo";
          if (user.email !== SUPER_ADMIN_EMAIL) {
            const userDoc = await getDoc(doc(db, "admin_users", user.email!));
            if (userDoc.exists()) {
              tenantId = userDoc.data().tenantId || "demo";
            }
          }
          
          const tData = await fetchTenantData(tenantId);
          setTenantData(tData);

          const eventsRef = collection(db, "events");
          const eventSnaps = await getDocs(eventsRef);
          
          const eventsList = eventSnaps.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as any))
            .filter(e => e.tenantId === tenantId);

          setEvents(eventsList);

          let allReservations: any[] = [];
          await Promise.all(eventsList.map(async (event) => {
            const resRef = collection(db, "events", event.id, "reservations");
            const resSnap = await getDocs(resRef);
            const eventRes = resSnap.docs.map(d => ({
              ...d.data(),
              eventId: event.id,
              eventTitle: event.title,
              price: event.price
            }));
            allReservations = [...allReservations, ...eventRes];
          }));
          
          setReservations(allReservations);
        } catch (e) {
          console.error("Analytics Load Error:", e);
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

  const filteredEvents = branchFilter === "all" 
    ? events 
    : events.filter(e => e.branchTag === branchFilter);

  const filteredReservations = branchFilter === "all"
    ? reservations
    : reservations.filter(r => {
        const ev = events.find(e => e.id === r.eventId);
        return ev && ev.branchTag === branchFilter;
    });

  const totalParticipants = filteredReservations.length;
  const totalRevenue = filteredReservations.reduce((acc, cur) => {
    const price = parseInt(cur.price?.replace(/[^0-9]/g, '') || "0", 10);
    return acc + (isNaN(price) ? 0 : price);
  }, 0);

  const onlineCount = filteredReservations.filter(r => r.type === 'online').length;
  const offlineCount = filteredReservations.filter(r => r.type === 'offline').length;

  const dataByEvent = filteredEvents.slice(0, 5).map(e => ({
     name: e.title.length > 10 ? e.title.substring(0, 10) + "..." : e.title,
     count: filteredReservations.filter(r => r.eventId === e.id).length
  }));

  const dataByType = [
    { name: 'オンライン', value: onlineCount },
    { name: '会場参加', value: offlineCount },
  ];

  if (loading) return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-slate-400">Loading analytics...</div>;

  return (
    // ★修正ポイント: 全体をダーク背景で包む (bg-[#0f111a] text-slate-300)
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 md:p-10 space-y-8 animate-in fade-in">
      
      {/* ★追加: ヘッダーエリア（戻るボタン） */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Analytics</h1>
            <p className="text-slate-400 text-sm">イベント参加状況と売上のリアルタイム分析</p>
          </div>
        </div>
        
        {/* 支部フィルタ */}
        <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
           <Filter size={16} className="text-slate-400"/>
           <select 
             value={branchFilter} 
             onChange={(e) => setBranchFilter(e.target.value)}
             className="bg-transparent text-white outline-none text-sm cursor-pointer min-w-[150px]"
           >
             <option value="all">すべての部署・支部</option>
             {safeBranches.map(b => (
               <option key={b} value={b}>{b}</option>
             ))}
           </select>
        </div>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-slate-500 text-xs uppercase font-bold tracking-wider">開催イベント数</p><h3 className="text-3xl font-bold text-white mt-1">{filteredEvents.length}</h3></div>
            <div className="p-3 bg-indigo-500/10 rounded-xl"><Calendar className="text-indigo-400" size={24}/></div>
          </div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-pink-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-slate-500 text-xs uppercase font-bold tracking-wider">総参加者数</p><h3 className="text-3xl font-bold text-white mt-1">{totalParticipants}</h3></div>
            <div className="p-3 bg-pink-500/10 rounded-xl"><Users className="text-pink-400" size={24}/></div>
          </div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-slate-500 text-xs uppercase font-bold tracking-wider">申込率 (CVR)</p><h3 className="text-3xl font-bold text-white mt-1">- %</h3></div>
            <div className="p-3 bg-emerald-500/10 rounded-xl"><TrendingUp className="text-emerald-400" size={24}/></div>
          </div>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 hover:border-amber-500/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div><p className="text-slate-500 text-xs uppercase font-bold tracking-wider">推定売上</p><h3 className="text-3xl font-bold text-white mt-1">¥{totalRevenue.toLocaleString()}</h3></div>
            <div className="p-3 bg-amber-500/10 rounded-xl"><DollarSign className="text-amber-400" size={24}/></div>
          </div>
        </div>
      </div>

      {/* グラフエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
           <h3 className="text-lg font-bold text-white mb-6">イベント別 集客数 (Top 5)</h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={dataByEvent}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false}/>
                 <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                 <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                 <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff'}} cursor={{fill: '#1e293b', opacity: 0.4}}/>
                 <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40}/>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
           <h3 className="text-lg font-bold text-white mb-6">参加形式の内訳</h3>
           <div className="h-[300px] w-full flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={dataByType} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value" stroke="none">
                   {dataByType.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', color: '#fff'}}/>
                 <Legend verticalAlign="bottom" height={36}/>
               </PieChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}