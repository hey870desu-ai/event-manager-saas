// 📂 app/admin/scan/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { doc, getDoc, updateDoc, collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, User, Calendar, ArrowLeft, ScanBarcode, ShieldAlert, Search, XCircle, Users, Clock } from "lucide-react";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

type Reservation = {
  id: string;
  name: string;
  email: string;
  company?: string;
  type?: string;
  status: string;
  checkedIn: boolean;
  attendedAt?: string;
  selectedTicket?: string;
  customAnswers?: Record<string, any>;
};

export default function AdminScanPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentUserTenant, setCurrentUserTenant] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const router = useRouter();

  // イベント選択
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  // 参加者名簿（リアルタイム）
  const [participants, setParticipants] = useState<Reservation[]>([]);
  const [nameFilter, setNameFilter] = useState("");

  // スキャン
  const [inputCode, setInputCode] = useState("");
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'already' | 'error' | 'not_found'; name: string; message: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scanCooldown = useRef(false);
  const lastScannedId = useRef("");

  // 1. 権限チェック
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) { router.push("/admin/login"); return; }
      const email = user.email.replace(/\s+/g, '').toLowerCase();
      const superEmail = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();

      if (email === superEmail) {
        setIsSuperAdmin(true);
        setCurrentUserTenant("super_admin");
      } else {
        const d = await getDoc(doc(db, "admin_users", user.email));
        if (d.exists()) {
          const data = d.data();
          if (data.branchId === "全国本部" || data.branchId === "sys_master_v9Xk2_secret") {
            setIsSuperAdmin(true);
            setCurrentUserTenant("super_admin");
          } else {
            setCurrentUserTenant(data.tenantId || "demo");
          }
        } else {
          router.push("/");
          return;
        }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  // 2. イベント一覧取得
  useEffect(() => {
    if (loadingAuth || !currentUserTenant) return;
    const unsub = onSnapshot(collection(db, "events"), (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(e => isSuperAdmin || e.tenantId === currentUserTenant)
        .filter(e => e.status === 'published')
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setEvents(list);
      // 今日のイベントがあれば自動選択
      if (!selectedEventId && list.length > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const todayEvent = list.find(e => e.date === today);
        if (todayEvent) setSelectedEventId(todayEvent.id);
      }
    });
    return () => unsub();
  }, [loadingAuth, currentUserTenant, isSuperAdmin]);

  // 3. 選択イベントの参加者をリアルタイム取得
  useEffect(() => {
    if (!selectedEventId) { setParticipants([]); setSelectedEvent(null); return; }

    const ev = events.find(e => e.id === selectedEventId);
    setSelectedEvent(ev || null);

    const q = query(collection(db, "events", selectedEventId, "reservations"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Reservation))
        .filter(r => r.status !== 'cancelled');
      setParticipants(list);
    });
    return () => unsub();
  }, [selectedEventId, events]);

  // 4. スキャン処理（高速・連続対応）
  const processCheckIn = useCallback(async (code: string) => {
    const cleanId = code.trim();
    if (!cleanId || !selectedEventId || isProcessing) return;

    // 連続スキャン防止（同じIDを2秒以内に再スキャン）
    if (scanCooldown.current && lastScannedId.current === cleanId) return;

    setIsProcessing(true);
    setScanResult(null);

    try {
      // 選択中イベントの予約から直接検索（collectionGroup不要で高速）
      const resRef = doc(db, "events", selectedEventId, "reservations", cleanId);
      const resSnap = await getDoc(resRef);

      if (!resSnap.exists()) {
        setScanResult({ type: 'not_found', name: '', message: `ID「${cleanId.slice(0, 8)}...」が見つかりません` });
        setIsProcessing(false);
        return;
      }

      const resData = resSnap.data();
      const participantName = resData.name || "ゲスト";

      // 既に受付済み
      if (resData.checkedIn === true || resData.status === 'attended') {
        setScanResult({ type: 'already', name: participantName, message: '受付済みです' });
        setIsProcessing(false);
        lastScannedId.current = cleanId;
        scanCooldown.current = true;
        setTimeout(() => { scanCooldown.current = false; }, 2000);
        return;
      }

      // 受付実行（checkedInとstatusの両方を更新して整合性を保つ）
      await updateDoc(resRef, {
        checkedIn: true,
        status: "attended",
        attendedAt: new Date().toISOString(),
      });

      setScanResult({ type: 'success', name: participantName, message: '受付完了！' });
      lastScannedId.current = cleanId;
      scanCooldown.current = true;
      setTimeout(() => { scanCooldown.current = false; }, 2000);

    } catch (error) {
      console.error("CheckIn Error:", error);
      setScanResult({ type: 'error', name: '', message: 'エラーが発生しました' });
    } finally {
      setIsProcessing(false);
      setInputCode("");
      // 自動的に入力欄にフォーカスを戻す（連続スキャン対応）
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [selectedEventId, isProcessing]);

  // 受付取り消し
  const handleUndoCheckIn = async (participantId: string, participantName: string) => {
    if (!selectedEventId) return;
    if (!confirm(`${participantName} さんの受付を取り消しますか？`)) return;
    try {
      const resRef = doc(db, "events", selectedEventId, "reservations", participantId);
      await updateDoc(resRef, {
        checkedIn: false,
        status: "confirmed",
        attendedAt: null,
      });
      setScanResult({ type: 'error', name: participantName, message: '受付を取り消しました' });
    } catch (e) {
      console.error("Undo Error:", e);
    }
  };

  // フォームSubmit（Enter or ボタン）
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processCheckIn(inputCode);
  };

  // 結果バナー自動消去
  useEffect(() => {
    if (scanResult) {
      const timer = setTimeout(() => setScanResult(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [scanResult]);

  // customAnswersから会社名・役職を抽出
  const getCompanyInfo = (p: Reservation) => {
    const answers = p.customAnswers || {};
    const company = p.company || answers['会社名'] || answers['所属'] || answers['団体名'] || '';
    const role = answers['役職'] || answers['肩書き'] || answers['部署'] || '';
    return { company: String(company), role: String(role) };
  };

  // 名簿フィルタ
  const filteredParticipants = nameFilter
    ? participants.filter(p => {
        const { company, role } = getCompanyInfo(p);
        const q = nameFilter.toLowerCase();
        return p.name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          company.toLowerCase().includes(q) ||
          role.toLowerCase().includes(q);
      })
    : participants;

  // 集計
  const checkedInCount = participants.filter(p => p.checkedIn || p.status === 'attended').length;
  const totalCount = participants.length;

  if (loadingAuth) return <div className="min-h-screen bg-[#0B0D17] flex items-center justify-center text-indigo-500"><div className="animate-spin h-8 w-8 border-2 border-current border-t-transparent rounded-full"/></div>;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0B0D17] text-white font-sans overflow-hidden flex flex-col">

      {/* ヘッダー */}
      <header className="bg-[#0f1219] border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={18}/>
            </Link>
            <ScanBarcode size={20} className="text-indigo-400"/>
            <h1 className="text-sm font-bold text-white">QR受付</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* イベント選択 */}
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-indigo-500 max-w-[250px]"
            >
              <option value="">イベントを選択...</option>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.date} | {ev.title.length > 20 ? ev.title.slice(0, 20) + '…' : ev.title}
                </option>
              ))}
            </select>
            {/* 受付カウンター */}
            {selectedEventId && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                <Users size={14} className="text-indigo-400"/>
                <span className="font-bold text-emerald-400">{checkedInCount}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-300">{totalCount}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* イベント未選択 */}
      {!selectedEventId && (
        <div className="flex flex-col items-center justify-center h-[70vh] text-slate-500 gap-4">
          <Calendar size={48} className="opacity-30"/>
          <p className="text-sm font-bold">受付するイベントを選択してください</p>
        </div>
      )}

      {/* メインコンテンツ */}
      {selectedEventId && (
        <div className="flex-1 overflow-hidden max-w-7xl mx-auto px-4 py-4 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">

            {/* 左側: スキャンエリア */}
            <div className="lg:col-span-1 space-y-4">

              {/* スキャン入力 */}
              <div className="bg-[#151926] p-5 rounded-2xl border border-slate-800">
                <form onSubmit={handleSubmit}>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="QRコード / ID入力"
                      className="w-full bg-[#0B0D17] border border-slate-700 rounded-xl py-4 pl-12 pr-20 text-lg text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-all"
                      autoFocus
                    />
                    <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                    <button type="submit" disabled={isProcessing || !inputCode}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors">
                      {isProcessing ? "..." : "受付"}
                    </button>
                  </div>
                </form>
                <p className="text-[10px] text-slate-600 mt-2 text-center">バーコードリーダーで読み取ると自動で受付されます</p>
              </div>

              {/* スキャン結果バナー */}
              {scanResult && (
                <div className={`p-5 rounded-2xl border text-center animate-in zoom-in-95 duration-200 ${
                  scanResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  scanResult.type === 'already' ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-red-500/10 border-red-500/30'
                }`}>
                  {scanResult.type === 'success' && <CheckCircle2 size={40} className="mx-auto mb-2 text-emerald-400"/>}
                  {scanResult.type === 'already' && <Clock size={40} className="mx-auto mb-2 text-amber-400"/>}
                  {scanResult.type === 'error' || scanResult.type === 'not_found' ? <XCircle size={40} className="mx-auto mb-2 text-red-400"/> : null}

                  {scanResult.name && (
                    <p className="text-xl font-black text-white mb-1">{scanResult.name} 様</p>
                  )}
                  <p className={`text-sm font-bold ${
                    scanResult.type === 'success' ? 'text-emerald-400' :
                    scanResult.type === 'already' ? 'text-amber-400' :
                    'text-red-400'
                  }`}>{scanResult.message}</p>
                </div>
              )}

              {/* イベント情報 */}
              {selectedEvent && (
                <div className="bg-[#151926] p-4 rounded-2xl border border-slate-800 text-sm">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">開催イベント</p>
                  <p className="text-white font-bold mb-2">{selectedEvent.title}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{selectedEvent.date}</span>
                    <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                  </div>
                  {selectedEvent.venueName && (
                    <p className="text-xs text-slate-500 mt-1">{selectedEvent.venueName}</p>
                  )}
                  {/* プログレスバー */}
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>受付進捗</span>
                      <span className="font-bold text-indigo-400">{totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalCount > 0 ? (checkedInCount / totalCount) * 100 : 0}%` }}/>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右側: 参加者名簿 */}
            <div className="lg:col-span-2">
              <div className="bg-[#151926] rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-full">
                {/* 名簿ヘッダー */}
                <div className="p-4 border-b border-slate-800 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
                    <input
                      type="text"
                      value={nameFilter}
                      onChange={(e) => setNameFilter(e.target.value)}
                      placeholder="名前・メール・会社名で検索..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
                    />
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap">
                    {filteredParticipants.length}件
                  </div>
                </div>

                {/* 名簿リスト */}
                <div className="overflow-y-auto flex-1">
                  {filteredParticipants.length === 0 ? (
                    <div className="p-8 text-center text-slate-600">
                      <Users size={32} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-sm">参加者がいません</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-800/50">
                      {/* 受付済みを下に、未受付を上に */}
                      {[...filteredParticipants]
                        .sort((a, b) => {
                          const aChecked = a.checkedIn || a.status === 'attended';
                          const bChecked = b.checkedIn || b.status === 'attended';
                          // 直近の受付を一番上に
                          if (aChecked && !bChecked) return 1;
                          if (!aChecked && bChecked) return -1;
                          // 受付済み同士は受付時間の降順
                          if (aChecked && bChecked) return (b.attendedAt || '').localeCompare(a.attendedAt || '');
                          return 0;
                        })
                        .map((p) => {
                          const isChecked = p.checkedIn || p.status === 'attended';
                          const isJustCheckedIn = isChecked && lastScannedId.current === p.id;
                          const { company, role } = getCompanyInfo(p);
                          return (
                            <div key={p.id}
                              className={`flex items-center gap-3 px-4 py-2.5 transition-all ${
                                isJustCheckedIn ? 'bg-emerald-500/10 animate-in fade-in duration-300' :
                                isChecked ? 'bg-slate-900/20' : ''
                              }`}
                            >
                              {/* チェックマーク */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isChecked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-600'
                              }`}>
                                {isChecked ? <CheckCircle2 size={14}/> : <User size={14}/>}
                              </div>

                              {/* 参加者情報 */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-bold truncate ${isChecked ? 'text-slate-400' : 'text-white'}`}>
                                    {p.name}
                                  </p>
                                  {p.type && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                      p.type === 'online' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-violet-500/20 text-violet-400'
                                    }`}>
                                      {p.type === 'online' ? 'Online' : '会場'}
                                    </span>
                                  )}
                                </div>
                                {(company || role) && (
                                  <p className={`text-[11px] truncate ${isChecked ? 'text-slate-600' : 'text-indigo-400/70'}`}>
                                    {company}{company && role ? ' / ' : ''}{role}
                                  </p>
                                )}
                                <p className="text-[10px] text-slate-600 truncate">{p.email}</p>
                              </div>

                              {/* ステータス */}
                              <div className="flex-shrink-0 flex items-center gap-2">
                                {isChecked ? (
                                  <>
                                    <div className="text-right">
                                      <p className="text-[10px] text-emerald-400 font-bold">受付済</p>
                                      {p.attendedAt && (
                                        <p className="text-[9px] text-slate-600">{new Date(p.attendedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</p>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleUndoCheckIn(p.id, p.name)}
                                      className="text-[9px] text-slate-600 hover:text-red-400 px-1.5 py-1 rounded hover:bg-red-500/10 transition-colors"
                                      title="受付を取り消す"
                                    >
                                      <XCircle size={14}/>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => processCheckIn(p.id)}
                                    className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-bold transition-colors"
                                  >
                                    受付
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
