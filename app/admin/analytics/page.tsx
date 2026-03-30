// 📂 app/admin/analytics/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, Calendar, TrendingUp, DollarSign, Filter, ArrowLeft, UserCheck, UserX, Repeat, Eye, Target, CheckCircle2 } from "lucide-react";
import { fetchTenantData, type Tenant } from "@/lib/tenants";
import Link from "next/link";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";
const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f43f5e'];

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
          let tenantId = "";
          if (user.email === SUPER_ADMIN_EMAIL) {
            const userDoc = await getDoc(doc(db, "admin_users", user.email!));
            tenantId = userDoc.exists() ? (userDoc.data().tenantId || "demo") : "demo";
          } else {
            const userDoc = await getDoc(doc(db, "admin_users", user.email!));
            if (userDoc.exists()) {
              tenantId = userDoc.data().tenantId || "demo";
            }
          }

          const tData = await fetchTenantData(tenantId);
          setTenantData(tData);

          const eventSnaps = await getDocs(collection(db, "events"));
          const eventsList = eventSnaps.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .filter(e => e.tenantId === tenantId);

          setEvents(eventsList);

          let allReservations: any[] = [];
          await Promise.all(eventsList.map(async (event) => {
            const resSnap = await getDocs(collection(db, "events", event.id, "reservations"));
            const eventRes = resSnap.docs.map(d => ({
              id: d.id,
              ...d.data(),
              eventId: event.id,
              eventTitle: event.title,
              eventPrice: event.price,
              eventDate: event.date,
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

  // --- フィルタ ---
  const safeBranches = Array.isArray(tenantData?.branches)
    ? tenantData.branches.flatMap((b: any) => typeof b === 'string' ? b : [])
    : [];

  const filteredEvents = branchFilter === "all"
    ? events
    : events.filter(e => e.branchTag === branchFilter);

  const filteredEventIds = new Set(filteredEvents.map(e => e.id));

  const filteredReservations = reservations.filter(r => filteredEventIds.has(r.eventId));

  // --- 精度の高い集計（キャンセル除外） ---
  const activeReservations = filteredReservations.filter(r => r.status !== 'cancelled');
  const cancelledReservations = filteredReservations.filter(r => r.status === 'cancelled');
  const checkedInReservations = activeReservations.filter(r => r.checkedIn === true);
  const paidReservations = activeReservations.filter(r => r.paymentStatus === 'paid' || r.paymentStatus === 'refunded');

  // 実売上（paidAmountベース、なければイベント価格から推定）
  const totalRevenue = activeReservations.reduce((acc, r) => {
    if (r.paidAmount && r.paymentStatus === 'paid') return acc + Number(r.paidAmount);
    if (r.paymentStatus === 'paid') {
      const p = parseInt(String(r.price || r.eventPrice || '0').replace(/[^0-9]/g, ''), 10);
      return acc + (isNaN(p) ? 0 : p);
    }
    return acc;
  }, 0);

  // PV合計 & 全体CVR
  const totalPV = filteredEvents.reduce((acc, e) => acc + (e.pageViews || 0), 0);
  const overallCVR = totalPV > 0 ? ((activeReservations.length / totalPV) * 100).toFixed(1) : "0.0";

  // 出席率
  const attendanceRate = activeReservations.length > 0
    ? ((checkedInReservations.length / activeReservations.length) * 100).toFixed(1)
    : "0.0";

  // キャンセル率
  const cancelRate = filteredReservations.length > 0
    ? ((cancelledReservations.length / filteredReservations.length) * 100).toFixed(1)
    : "0.0";

  // 参加者単価
  const revenuePerPerson = activeReservations.length > 0
    ? Math.round(totalRevenue / activeReservations.length)
    : 0;

  // --- リピーター分析 ---
  const emailCounts: Record<string, number> = {};
  activeReservations.forEach(r => {
    if (r.email) emailCounts[r.email] = (emailCounts[r.email] || 0) + 1;
  });
  const uniqueEmails = Object.keys(emailCounts);
  const repeatEmails = uniqueEmails.filter(e => emailCounts[e] >= 2);
  const repeatRate = uniqueEmails.length > 0
    ? ((repeatEmails.length / uniqueEmails.length) * 100).toFixed(1)
    : "0.0";
  const newCount = uniqueEmails.length - repeatEmails.length;

  // 参加形式
  const onlineCount = activeReservations.filter(r => r.type === 'online').length;
  const offlineCount = activeReservations.filter(r => r.type === 'offline').length;

  // --- グラフ用データ ---
  // イベント別集客（Top5, 日付順）
  const sortedEvents = [...filteredEvents].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const dataByEvent = sortedEvents.slice(0, 6).reverse().map(e => {
    const active = activeReservations.filter(r => r.eventId === e.id).length;
    const cancelled = cancelledReservations.filter(r => r.eventId === e.id).length;
    return {
      name: e.title.length > 8 ? e.title.substring(0, 8) + "…" : e.title,
      参加者: active,
      キャンセル: cancelled,
    };
  });

  // リピート vs 新規
  const dataRepeat = [
    { name: '新規', value: newCount },
    { name: 'リピーター', value: repeatEmails.length },
  ];

  // 参加形式
  const dataByType = [
    { name: 'オンライン', value: onlineCount },
    { name: '会場参加', value: offlineCount },
  ];

  // イベント別パフォーマンス
  const detailedEventStats = sortedEvents.map(event => {
    const eventActive = activeReservations.filter(r => r.eventId === event.id);
    const eventCancelled = cancelledReservations.filter(r => r.eventId === event.id);
    const eventCheckedIn = eventActive.filter(r => r.checkedIn === true);
    const revenue = eventActive.reduce((acc, r) => {
      if (r.paidAmount && r.paymentStatus === 'paid') return acc + Number(r.paidAmount);
      if (r.paymentStatus === 'paid') {
        const p = parseInt(String(r.price || r.eventPrice || '0').replace(/[^0-9]/g, ''), 10);
        return acc + (isNaN(p) ? 0 : p);
      }
      return acc;
    }, 0);
    const pv = event.pageViews || 0;
    const cvr = pv > 0 ? ((eventActive.length / pv) * 100).toFixed(1) : "-";
    const attend = eventActive.length > 0 ? ((eventCheckedIn.length / eventActive.length) * 100).toFixed(0) : "-";

    return {
      id: event.id, title: event.title, date: event.date,
      pv, cvr, total: eventActive.length, cancelled: eventCancelled.length,
      checkedIn: eventCheckedIn.length, attendRate: attend,
      revenue,
    };
  });

  // --- 月別推移データ ---
  const monthlyData: Record<string, { month: string, 参加者: number, 売上: number }> = {};
  activeReservations.forEach(r => {
    const date = r.eventDate || r.createdAt?.toDate?.()?.toISOString?.()?.slice(0, 7);
    if (!date) return;
    const month = date.slice(0, 7); // "YYYY-MM"
    if (!monthlyData[month]) monthlyData[month] = { month, 参加者: 0, 売上: 0 };
    monthlyData[month].参加者 += 1;
    if (r.paidAmount && r.paymentStatus === 'paid') monthlyData[month].売上 += Number(r.paidAmount);
  });
  const monthlyTrend = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">読み込み中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8 space-y-6 animate-in fade-in">

      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-white hover:bg-slate-100 rounded-lg text-slate-600 transition-colors border border-slate-200">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">マーケティング分析</h1>
            <p className="text-slate-500 text-sm">集客・収益・顧客データから次の戦略を見つける</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
          <Filter size={16} className="text-slate-400"/>
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
            className="bg-transparent text-slate-900 outline-none text-sm cursor-pointer min-w-[150px]">
            <option value="all">すべての部署・支部</option>
            {safeBranches.map((b: string) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* KPIカード: 1段目 - コア指標 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "総PV", value: totalPV.toLocaleString(), icon: <Eye size={20}/>, color: "indigo" },
          { label: "有効参加者", value: activeReservations.length.toString(), icon: <Users size={20}/>, color: "pink", sub: `(キャンセル ${cancelledReservations.length}件)` },
          { label: "申込率 (CVR)", value: `${overallCVR}%`, icon: <Target size={20}/>, color: "emerald" },
          { label: "売上", value: `¥${totalRevenue.toLocaleString()}`, icon: <DollarSign size={20}/>, color: "amber" },
        ].map((kpi, idx) => (
          <div key={idx} className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{kpi.label}</p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{kpi.value}</h3>
                {kpi.sub && <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>}
              </div>
              <div className={`p-2.5 bg-${kpi.color}-50 rounded-xl text-${kpi.color}-500`}>{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* KPIカード: 2段目 - 運営・顧客指標 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "出席率", value: `${attendanceRate}%`, icon: <UserCheck size={20}/>, color: "emerald", sub: `${checkedInReservations.length}/${activeReservations.length}` },
          { label: "キャンセル率", value: `${cancelRate}%`, icon: <UserX size={20}/>, color: "red" },
          { label: "リピーター率", value: `${repeatRate}%`, icon: <Repeat size={20}/>, color: "violet", sub: `${repeatEmails.length}/${uniqueEmails.length}人` },
          { label: "参加者単価", value: `¥${revenuePerPerson.toLocaleString()}`, icon: <TrendingUp size={20}/>, color: "cyan" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{kpi.label}</p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">{kpi.value}</h3>
                {kpi.sub && <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>}
              </div>
              <div className={`p-2.5 rounded-xl bg-slate-50 text-slate-400`}>{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* グラフ: 1段目 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* イベント別集客 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">イベント別 集客数（直近6件）</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataByEvent}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}/>
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}/>
                <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px'}}/>
                <Bar dataKey="参加者" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={32}/>
                <Bar dataKey="キャンセル" stackId="a" fill="#fecaca" radius={[4, 4, 0, 0]} barSize={32}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 月別推移 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">月別 参加者推移</h3>
          <div className="h-[280px] w-full">
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}/>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}/>
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px'}}/>
                  <Line type="monotone" dataKey="参加者" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }}/>
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">データが蓄積されると推移グラフが表示されます</div>
            )}
          </div>
        </div>
      </div>

      {/* グラフ: 2段目 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* リピーター分析 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">新規 vs リピーター</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataRepeat} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                  <Cell fill="#6366f1" />
                  <Cell fill="#f59e0b" />
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded-full"></span> 新規 {newCount}人</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-full"></span> リピーター {repeatEmails.length}人</span>
          </div>
        </div>

        {/* 参加形式 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">参加形式の内訳</h3>
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataByType} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                  <Cell fill="#10b981" />
                  <Cell fill="#ec4899" />
                </Pie>
                <Tooltip contentStyle={{backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px'}}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> 会場 {offlineCount}人</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-pink-500 rounded-full"></span> オンライン {onlineCount}人</span>
          </div>
        </div>

        {/* 戦略ヒント */}
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2"><CheckCircle2 size={16} className="text-indigo-500"/> 戦略ヒント</h3>
          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            {Number(overallCVR) < 5 && totalPV > 0 && (
              <p className="bg-white p-3 rounded-lg border border-slate-200">
                CVRが <strong className="text-indigo-600">{overallCVR}%</strong> です。イベントページの内容やCTAボタンの改善で申込率を上げられる可能性があります。
              </p>
            )}
            {Number(cancelRate) > 15 && (
              <p className="bg-white p-3 rounded-lg border border-slate-200">
                キャンセル率が <strong className="text-red-500">{cancelRate}%</strong> と高めです。リマインドメールの送信タイミングを見直してみましょう。
              </p>
            )}
            {Number(repeatRate) < 10 && uniqueEmails.length > 5 && (
              <p className="bg-white p-3 rounded-lg border border-slate-200">
                リピーター率が <strong className="text-violet-600">{repeatRate}%</strong> です。イベント後のフォローアップやニュースレターでリピート率を高めましょう。
              </p>
            )}
            {Number(repeatRate) >= 20 && (
              <p className="bg-white p-3 rounded-lg border border-slate-200">
                リピーター率 <strong className="text-emerald-600">{repeatRate}%</strong> は素晴らしい数値です！ファンが着実に育っています。
              </p>
            )}
            {Number(attendanceRate) < 70 && activeReservations.length > 0 && (
              <p className="bg-white p-3 rounded-lg border border-slate-200">
                出席率が <strong className="text-amber-600">{attendanceRate}%</strong> です。前日リマインドメールを活用してNo-Showを減らしましょう。
              </p>
            )}
            {activeReservations.length === 0 && (
              <p className="bg-white p-3 rounded-lg border border-slate-200 text-slate-400">
                イベントを開催してデータが蓄積されると、ここに戦略のヒントが自動で表示されます。
              </p>
            )}
          </div>
        </div>
      </div>

      {/* イベント別パフォーマンス詳細テーブル */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">イベント別パフォーマンス</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">イベント名</th>
                <th className="px-4 py-3">開催日</th>
                <th className="px-4 py-3 text-center">PV</th>
                <th className="px-4 py-3 text-center">CVR</th>
                <th className="px-4 py-3 text-center">参加者</th>
                <th className="px-4 py-3 text-center">出席率</th>
                <th className="px-4 py-3 text-center">キャンセル</th>
                <th className="px-4 py-3 text-right">売上</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detailedEventStats.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 max-w-[200px] truncate">{ev.title}</td>
                  <td className="px-4 py-3 text-slate-500">{ev.date}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{ev.pv}</td>
                  <td className="px-4 py-3 text-center font-bold text-indigo-600">{ev.cvr}{ev.cvr !== '-' && '%'}</td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900">{ev.total}</td>
                  <td className="px-4 py-3 text-center text-emerald-600">{ev.attendRate}{ev.attendRate !== '-' && '%'}</td>
                  <td className="px-4 py-3 text-center text-red-400">{ev.cancelled > 0 ? ev.cancelled : '-'}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{ev.revenue > 0 ? `¥${ev.revenue.toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
