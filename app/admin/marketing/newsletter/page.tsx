"use client";

import React, { useState, useEffect } from 'react';
import { 
  Camera, Send, Instagram, MessageCircle, Facebook, 
  Link as LinkIcon, PlusCircle, Trash2, Sparkles, Loader2, X ,CheckCircle2,Users,Clock,ChevronLeft,ChevronRight,FileText
} from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";

export default function NewsletterStudio() {
  // 🏆 テナント情報（SNSや住所などの設定）を保持
  const [tenantData, setTenantData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  // 🏆 顧客リスト（絆リスト）用のStateを追加だばい！
  const [allRecipients, setAllRecipients] = useState<any[]>([]); 
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]); 
  const [eventFilter, setEventFilter] = useState<string>("all"); 
  const [events, setEvents] = useState<any[]>([]);
  
  // 📝 メール本文の入力用
  const [subject, setSubject] = useState('【絆レター】活動報告をお届けします');
  const [mainTitle, setMainTitle] = useState('今月のトピックス');
  const [mainMessage, setMainMessage] = useState('いつも大変お世話になっております。今月の様子をお伝えします。');
  
  // 📸 メイン写真用
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  
  // 🎯 layout: 'full' を書き足して、パソコンを安心させるぞい
  const [snaps, setSnaps] = useState([
    { id: 1, title: '', comment: '', preview: null as string | null, file: null as File | null, layout: 'full' },
  ]);

  // 🏆 過去の履歴を保存しておくための箱だばい！
  const [archives, setArchives] = useState<any[]>([]);

  const [lastVisible, setLastVisible] = useState<any>(null); // 🎯 どこまで読み込んだか覚える
  const [firstVisible, setFirstVisible] = useState<any>(null); // 🎯 戻る用

// 🏆 1. ログインメアドから tenantId を自動取得して連動させるぞい！
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        // 🎯 塙さんのFirestoreは「メアド」がドキュメントIDだっぺ！
        console.log("🔥 ログインメアドで検索中:", user.email);
        const { getDoc, doc } = await import("firebase/firestore");

        // admin_users コレクションをメアドで直撃だばい
        const userSnap = await getDoc(doc(db, "admin_users", user.email));
        
        if (userSnap.exists()) {
          const tid = userSnap.data().tenantId; // 🎯 ここで "caredesignworks" が取れる！
          console.log("🎯 取得成功！tenantId:", tid);

          if (tid) {
            // テナント情報をリアルタイム取得（プレビューの社名に反映！）
            onSnapshot(doc(db, "tenants", tid), (docSnap) => {
              if (docSnap.exists()) {
                console.log("🏢 テナントデータ確定:", docSnap.data().orgName);
                setTenantData({ ...docSnap.data(), id: tid });
              }
            });

            // 絆リスト（全イベント参加者）を収集
            fetchKizunaList(tid);

            fetchArchives(tid);
          }
        } else {
          console.error("❌ admin_usersの中にこのメアドのデータがねぇぞい:", user.email);
        }
      }
    });

    const fetchKizunaList = async (tid: string) => {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      
      // 🎯 1. まずは「配信停止」を希望した人のリストを読み込むぞい
      const optOutSnap = await getDocs(collection(db, "marketing_optouts"));
      const blockedEmails = new Set(optOutSnap.docs.map(d => d.id));
      // 🎯 ここ！ループの前に箱を作るのを忘れちゃいけねぇだばい！
      const evList: any[] = [];

      const q = query(collection(db, "events"), where("tenantId", "==", tid));
      const evSnap = await getDocs(q);
      const userMap = new Map();

      for (const edoc of evSnap.docs) {
        const resSnap = await getDocs(collection(db, "events", edoc.id, "reservations"));
        resSnap.forEach(rdoc => {
          const data = rdoc.data();
          // 🎯 2. メアドがあって、かつ「配信停止リスト」に入っていない人だけを抽出！
          if (data.email && !blockedEmails.has(data.email)) {
            userMap.set(data.email, { 
              email: data.email, name: data.name, 
              eventId: edoc.id, eventTitle: edoc.data().title 
            });
          }
        });
      }
      setEvents(evList);
      setAllRecipients(Array.from(userMap.values()));
    };

    return () => unsubAuth();
  }, []);

  const displayTenantName = tenantData?.orgName || tenantData?.name || "BANTARO Partner";

  // --- 📸 写真選択の処理 ---
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImagePreview(URL.createObjectURL(file));
      setMainFile(file);
    }
  };

  const handleSnapImageChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSnaps = [...snaps];
      newSnaps[idx].preview = URL.createObjectURL(file);
      newSnaps[idx].file = file;
      setSnaps(newSnaps);
    }
  };

  // 🏆 パート①：1枚、3枚、6枚を一気に読み込む魔法だばい！
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>, count: number) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 枚数制限（最大12枚）
    const actualFiles = files.slice(0, count);
    
    const newItems = actualFiles.map((file, i) => ({
      id: Date.now() + i,
      title: '',
      comment: '',
      preview: URL.createObjectURL(file),
      file: file,
      // 🎯 ここで「何枚並びか」を覚えさせるのがコラージュのコツ！
      layout: count === 1 ? 'full' : count === 3 ? 'triple' : 'grid'
    }));

    setSnaps([...snaps, ...newItems]);
  };

  // 🏆 パート①：文章だけのブロックを追加する魔法だばい！
  const addTextBlock = () => {
    if (snaps.length >= 12) return alert("枠がいっぱいだっぺ！");
    
    const newTextItem = {
      id: Date.now(),
      title: 'おしらせ', // 初期値
      comment: '',
      preview: null,
      file: null,
      layout: 'text' // 🎯 「text」というレイアウト名を付けるのがコツだばい！
    };
    
    setSnaps([...snaps, newTextItem]);
  };

  const removeSnap = (idx: number) => {
    setSnaps(snaps.filter((_, i) => i !== idx));
  };

  // --- 📦 Firebase Storageへアップロードする魔法 ---
  const uploadPhoto = async (file: File, folder: string) => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `newsletters/${folder}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // 絞り込み後のリスト
  const filteredList = eventFilter === "all" 
    ? allRecipients 
    : allRecipients.filter(r => r.eventId === eventFilter);

  // 全選択・解除
  const toggleAll = () => {
    if (selectedEmails.length === filteredList.length) setSelectedEmails([]);
    else setSelectedEmails(filteredList.map(r => r.email));
  };

  const toggleOne = (email: string) => {
    setSelectedEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  // 🏆 ページめくり対応の履歴取得
  const fetchArchives = async (tid: string, direction: "next" | "prev" | "first" = "first") => {
    const { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } = await import("firebase/firestore");
    
    let q = query(
      collection(db, "newsletter_archives"), 
      where("tenantId", "==", tid),
      orderBy("createdAt", "desc"),
      limit(10)
    );

    if (direction === "next" && lastVisible) {
      q = query(q, startAfter(lastVisible));
    } else if (direction === "prev" && firstVisible) {
      q = query(
        collection(db, "newsletter_archives"), 
        where("tenantId", "==", tid),
        orderBy("createdAt", "desc"),
        endBefore(firstVisible),
        limitToLast(10)
      );
    }

    const snap = await getDocs(q);
    if (!snap.empty) {
      setArchives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFirstVisible(snap.docs[0]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    }
  };

  // 🏆 必殺技②：一時保存（下書き）する
  const handleSaveDraft = async () => {
    if (!tenantData) return;
    setIsUploading(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
      await addDoc(collection(db, "newsletter_archives"), {
        tenantId: tenantData.id,
        subject, mainTitle, mainMessage, 
        mainImageUrl: mainImagePreview,
        snaps: snaps.map(s => ({ title: s.title, comment: s.comment, imageUrl: s.preview,layout: s.layout || 'full' })),
        status: "draft",
        createdAt: serverTimestamp()
      });
      alert("下書きとして保存したぞい！");
      fetchArchives(tenantData.id);
    } catch (e) {
      alert("保存失敗だっぺ...");
    } finally {
      setIsUploading(false);
    }
  };

  // 🏆 必殺技③：過去の内容を画面に呼び戻す（復元）
  const loadArchive = (data: any) => {
    if (!confirm("今の入力内容を消して、過去のデータを読み込むべか？")) return;
    setSubject(data.subject || "");
    setMainTitle(data.mainTitle || "");
    setMainMessage(data.mainMessage || "");
    setMainImagePreview(data.mainImageUrl || null);
    setSnaps(data.snaps.map((s: any, i: number) => ({
      id: i, title: s.title, comment: s.comment, preview: s.imageUrl, file: null,layout: s.layout || 'full' 
    })));
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };


// --- 🚀 配信開始ボタン（履歴保存もバッチリ統合版！） ---
  const handleSend = async () => {
    if (selectedEmails.length === 0) return alert("送る相手を一人以上選んでくんちぇ！");
    if (!confirm(`${selectedEmails.length}名のお客様に一斉配信を開始します。よろしいですか？`)) return;
    
    setIsUploading(true);

    try {
      // 1. 写真アップロード
      let mainImageUrl = "";
      if (mainFile) mainImageUrl = await uploadPhoto(mainFile, "main");

      // 🎯 ここ！ else if (snap.preview) の中にも layout を追加するんだばい！
const uploadedSnaps = await Promise.all(snaps.map(async (snap) => {
  if (snap.file) {
    const url = await uploadPhoto(snap.file, "snaps");
    return { title: snap.title, comment: snap.comment, imageUrl: url, layout: snap.layout || 'full' };
  } else if (snap.preview) {
    return { 
      title: snap.title, 
      comment: snap.comment, 
      imageUrl: snap.preview, 
      layout: snap.layout || 'full' // 👈 これを追加！
    };
  }
  return null;
}));

      const finalSnaps = uploadedSnaps.filter(s => s !== null);

      // 2. APIを叩いてメール発射！！
      const response = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, mainTitle, mainMessage, mainImageUrl,
          snaps: finalSnaps,
          tenantData,
          recipients: selectedEmails 
        }),
      });

      if (response.ok) {
        // 🏆 3. 【ここが大事！】成功したら try の中で履歴を保存するぞい！
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        await addDoc(collection(db, "newsletter_archives"), {
          tenantId: tenantData.id,
          subject,
          mainTitle,
          mainMessage,
          mainImageUrl,
          snaps: finalSnaps,
          status: "sent",
          createdAt: serverTimestamp()
        });

        alert(`${selectedEmails.length}名のお客様に届け、履歴に保存したぞい！！`);
        fetchArchives(tenantData.id); // 履歴リストを更新
      } else {
        throw new Error("配信エラーだばい");
      }

    } catch (e) {
      console.error(e);
      alert("送信中に問題が発生したっぺ...");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* 🛠️ 左側：入力フォーム（BANTARO Studio） */}
      <div className="w-full lg:w-1/2 p-6 lg:p-10 border-r border-slate-200 overflow-y-auto bg-white shadow-inner">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
              <span className="text-blue-600">BANTARO</span> 
              <span className="text-slate-400 text-xl font-bold">Studio</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Premium Newsletter Creator</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black border border-blue-100 shadow-sm">
            <Sparkles size={12} /> SUBSCRIPTION ACTIVE
          </div>
        </div>

        <div className="space-y-12 pb-40">
          {/* 基本設定 */}
          <section className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</div>
              基本設定
            </label>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
              <label className="block text-[10px] font-black text-slate-500 mb-2 ml-1 uppercase">Email Subject</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
            </div>
          </section>

          {/* メイン写真 */}
          <section className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</div>
              メインビジュアル
            </label>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <label className="relative w-full h-56 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-all overflow-hidden group">
                {mainImagePreview ? (
                  <img src={mainImagePreview} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="text-center">
                    <Camera className="text-slate-300 group-hover:text-blue-500 mb-2 mx-auto" size={40} />
                    <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">メイン写真を選択</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} />
              </label>
              <input type="text" placeholder="大きな見出し" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black outline-none shadow-sm" />
              <textarea rows={4} placeholder="導入の文章..." value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed outline-none resize-none shadow-sm" />
            </div>
          </section>

          {/* 🎯 スナップ写真セクション：ボタンもカードも完全復活だばい！ */}
          <section className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</div>
                スナップ写真（最大10枚）
              </label>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">現在 {snaps.length} / 10 枚</span>
            </div>
            
            <div className="flex flex-wrap gap-6 items-start">
              {snaps.map((snap: any, idx) => (
                <div 
                  key={idx} 
                  className={`bg-white p-5 rounded-none border border-slate-200 relative group animate-in fade-in zoom-in-95 duration-300 shadow-sm ${
                    snap.layout === 'triple' ? 'w-full md:w-[calc(33.333%-16px)]' : 
                    snap.layout === 'grid' ? 'w-full md:w-[calc(50%-12px)]' : 'w-full'
                  }`}
                >
                  <button onClick={() => removeSnap(idx)} className="absolute -top-2 -right-2 bg-white text-red-500 p-2 rounded-full shadow-lg border border-slate-100 hover:bg-red-50 transition-colors z-10">
                    <Trash2 size={16} />
                  </button>

                  {/* 🎯 写真枠：直角（rounded-none）だばい！ */}
                  {snap.layout !== 'text' && (
                    <label className="w-full aspect-square bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center mb-4 cursor-pointer overflow-hidden shadow-inner hover:border-blue-400 transition-all rounded-none">
                      {snap.preview ? (
                        <img src={snap.preview} className="w-full h-full object-cover rounded-none" alt="Snap" />
                      ) : (
                        <div className="text-center">
                          <Camera size={24} className="text-slate-300 mb-1 mx-auto" />
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">写真を選択</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSnapImageChange(idx, e)} />
                    </label>
                  )}

                  <input 
                    type="text" 
                    placeholder="タイトル" 
                    value={snap.title} 
                    onChange={(e) => {
                      const newSnaps = [...snaps];
                      newSnaps[idx].title = e.target.value;
                      setSnaps(newSnaps);
                    }} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-none text-xs font-black mb-2 outline-none" 
                  />
                  <textarea 
                    placeholder="本文メッセージ..." 
                    value={snap.comment} 
                    onChange={(e) => {
                      const newSnaps = [...snaps];
                      newSnaps[idx].comment = e.target.value;
                      setSnaps(newSnaps);
                    }} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-none text-[10px] leading-relaxed outline-none resize-none" 
                    rows={snap.layout === 'text' ? 4 : 2} 
                  />
                </div>
              ))}

              {/* 🏆 おもてなしボタン群：ここを端折らずに全部書いたぞい！！ */}
              {snaps.length < 12 && (
                <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                  {/* 1枚 */}
                  <label className="h-32 border-2 border-dashed border-slate-200 rounded-none flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-all gap-1 bg-white/50 shadow-sm">
                    <PlusCircle size={20} /><span className="text-[8px] font-black uppercase">1枚追加</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBatchUpload(e, 1)} />
                  </label>
                  {/* 3枚 */}
                  <label className="h-32 border-2 border-dashed border-blue-200 rounded-none flex flex-col items-center justify-center text-blue-500 hover:bg-blue-50 cursor-pointer transition-all gap-1 bg-blue-50/30 shadow-sm">
                    <div className="flex gap-1"><Camera size={14}/><Camera size={14}/></div>
                    <span className="text-[8px] font-black uppercase">3枚セット</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleBatchUpload(e, 3)} />
                  </label>
                  {/* 6枚 */}
                  <label className="h-32 border-2 border-dashed border-indigo-200 rounded-none flex flex-col items-center justify-center text-indigo-500 hover:bg-indigo-50 cursor-pointer transition-all gap-1 bg-indigo-50/30 shadow-sm">
                    <Sparkles size={20} /><span className="text-[8px] font-black uppercase">6枚セット</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleBatchUpload(e, 6)} />
                  </label>
                  {/* 文章 */}
                  <button onClick={addTextBlock} className="h-32 border-2 border-dashed border-emerald-200 rounded-none flex flex-col items-center justify-center text-emerald-500 hover:bg-emerald-50 transition-all gap-1 bg-emerald-50/30 shadow-sm">
                    <FileText size={20} /><span className="text-[8px] font-black uppercase">文章のみ</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* 🏆 04. 送信先の選択 */}
          <section className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">4</div>
              送信先の選択
            </label>
            
            <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {/* フィルタと全選択 */}
              <div className="p-5 border-b border-slate-200 bg-white flex justify-between items-center gap-4">
                <select 
                  value={eventFilter} 
                  onChange={(e)=>setEventFilter(e.target.value)}
                  className="bg-slate-100 border-none rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                >
                  <option value="all">すべての参加者（重複なし）</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                <button onClick={toggleAll} className="text-[10px] font-black text-blue-600 uppercase hover:underline whitespace-nowrap">
                  {selectedEmails.length === filteredList.length ? "解除" : "全選択"}
                </button>
              </div>

              {/* スクロールする名簿リスト */}
              <div className="max-h-60 overflow-y-auto p-2 bg-white/50">
                {filteredList.map(r => (
                  <div 
                    key={r.email} onClick={()=>toggleOne(r.email)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedEmails.includes(r.email) ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-100'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{r.name || '名前なし'}</p>
                      <p className="text-[9px] font-bold opacity-60 truncate">{r.email}</p>
                    </div>
                    {selectedEmails.includes(r.email) && <CheckCircle2 size={16}/>}
                  </div>
                ))}
              </div>

              {/* 統計バー */}
              <div className="p-4 bg-slate-900 text-white flex justify-between items-center font-black rounded-b-3xl">
                <div className="flex items-center gap-2 text-xs">
                  <Users size={16} className="text-blue-400"/>
                  <span>送信対象 : {selectedEmails.length} 名</span>
                </div>
              </div>
            </div>
          </section>

          {/* --- 🚀 アクションエリア --- */}
          <div className="space-y-4 pt-10">
            {/* 一時保存（下書き）ボタン */}
            <button 
              onClick={handleSaveDraft} 
              disabled={isUploading}
              className="w-full py-4 text-blue-600 text-xs font-black uppercase tracking-widest bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all border border-blue-100 flex items-center justify-center gap-2"
            >
              <PlusCircle size={14}/> 今の内容を下書きとして保存する
            </button>

            {/* 本番配信ボタン */}
            <button 
              onClick={handleSend} 
              disabled={isUploading || selectedEmails.length === 0} 
              className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-600 shadow-2xl transition-all disabled:bg-slate-300"
            >
              {isUploading ? (
                <><Loader2 className="animate-spin" /> 送信・保存中だっぺ...</>
              ) : (
                <><Send size={24} /> {selectedEmails.length > 0 ? `${selectedEmails.length}名に一斉配信を開始！` : "一斉配信を開始する"}</>
              )}
            </button>
          </div>

          {/* --- 📜 過去のバックナンバー（履歴） --- */}
          <section className="mt-16 pt-10 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16}/> 配信履歴・バックナンバー
              </h3>
              <span className="text-[10px] font-black text-slate-400">最新10件を表示中</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {archives.map(arch => (
                <button 
                  key={arch.id} 
                  onClick={() => loadArchive(arch)}
                  className="flex justify-between items-center p-5 bg-white hover:bg-blue-50 rounded-[1.5rem] transition-all group border border-slate-100 hover:border-blue-300 shadow-sm"
                >
                  <div className="flex flex-col items-start gap-1 min-w-0">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${arch.status === 'draft' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      {arch.status === 'draft' ? '下書き' : '送信済み'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 truncate w-full">
                      {arch.subject || "(無題)"}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 whitespace-nowrap ml-4">
                    {arch.createdAt?.toDate().toLocaleDateString() || "Date Unknown"}
                  </span>
                </button>
              ))}
              {archives.length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                  <p className="text-[10px] text-slate-300 font-bold italic">まだ履歴はありません。最初の一歩を刻もう！</p>
                </div>
              )}
            </div>
          </section>
          {/* 🎯 ページネーションコントロール（矢印版だばい！） */}
            <div className="flex justify-center items-center gap-8 mt-8 pb-10">
              <button 
                onClick={() => fetchArchives(tenantData.id, "prev")} 
                disabled={!firstVisible}
                className="p-3 bg-white rounded-full text-slate-400 hover:text-blue-600 disabled:opacity-20 shadow-sm border border-slate-100 transition-all"
              >
                <ChevronLeft size={20}/>
              </button>

              <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">ページ切り替え</span>

              <button 
                onClick={() => fetchArchives(tenantData.id, "next")} 
                disabled={!lastVisible || archives.length < 10}
                className="p-3 bg-white rounded-full text-slate-400 hover:text-blue-600 disabled:opacity-20 shadow-sm border border-slate-100 transition-all"
              >
                <ChevronRight size={20}/>
              </button>
            </div>
        </div>
      </div>

      {/* 📱 右側：プロフェッショナル・メールプレビュー */}
      <div className="w-full lg:w-1/2 p-4 lg:p-12 flex justify-center items-start bg-slate-200 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[600px] bg-white shadow-2xl lg:rounded-[3rem] overflow-hidden border border-slate-300 animate-in slide-in-from-right duration-500">
          
          {/* Header */}
          <div className="bg-[#1e293b] p-12 text-center border-b-[10px] border-blue-500">
             <div className="text-white font-black text-2xl tracking-[0.4em] uppercase">{displayTenantName}</div>
             <div className="text-blue-400 text-[10px] font-black mt-4 tracking-[0.5em] opacity-80 uppercase">公式ニュースレター</div>
          </div>

          {/* Main Visual */}
          <div className="w-full aspect-[16/9] bg-slate-100 flex items-center justify-center">
            {mainImagePreview ? (
              <img src={mainImagePreview} className="w-full h-full object-cover" alt="Main" />
            ) : (
              <span className="text-slate-300 font-bold italic">Main Visual Area</span>
            )}
          </div>

          <div className="p-12">
            <h2 className="text-4xl font-black text-slate-800 mb-8 leading-tight tracking-tight">{mainTitle}</h2>
            <div className="text-xl text-slate-600 leading-relaxed whitespace-pre-wrap border-l-[12px] border-blue-500 pl-8 py-2 bg-slate-50 rounded-r-2xl">
              {mainMessage}
            </div>
          </div>

          {/* 🏆 右側：ここが「直角」＆「レイアウト連動」のプレビューだばい！！ */}
          <div className="px-12 pb-12 flex flex-wrap gap-y-12 gap-x-4 items-start">
            {snaps.map((snap: any, idx) => (
              <div 
                key={idx} 
                className={`space-y-4 ${
                  snap.layout === 'triple' ? 'w-[calc(33.333%-11px)]' : // 🎯 3枚並び
                  snap.layout === 'grid' ? 'w-[calc(50%-8px)]' :        // 🎯 2枚並び（6枚セット）
                  'w-full'                                             // 🎯 1枚（フル）
                }`}
              >
                {/* 🎯 写真：rounded-[1.5rem] を消して rounded-none にしたっぺ！ */}
                {snap.layout !== 'text' && (
                  <div className="w-full aspect-square bg-slate-50 rounded-none overflow-hidden border border-slate-100 shadow-inner flex items-center justify-center">
                    {snap.preview ? (
                      <img src={snap.preview} className="w-full h-full object-cover rounded-none" />
                    ) : (
                      <span className="text-slate-200 font-black italic uppercase text-center text-xl">SNAP {idx + 1}</span>
                    )}
                  </div>
                )}
                
                {/* 🎯 文章部分：ここも rounded-none で直角だばい！ */}
                <div className={`${
                  snap.layout === 'text' 
                    ? 'p-10 bg-blue-50/50 rounded-none border border-blue-100 shadow-inner w-full flex flex-col justify-center min-h-[160px]' 
                    : 'px-2'
                } text-left`}>
                  <h4 className={`font-black text-slate-900 ${snap.layout === 'text' ? 'text-2xl mb-3' : 'text-[14px] mb-2'}`}>
                    {snap.title || (snap.layout === 'text' ? 'おしらせ' : `SCENE ${idx + 1}`)}
                  </h4>
                  {snap.comment && (
                    <p className={`text-slate-500 leading-relaxed whitespace-pre-wrap ${snap.layout === 'text' ? 'text-lg' : 'text-[12px]'}`}>
                      {snap.comment}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Email Footer SNS (設定があるものだけ自動表示！) */}
          {(tenantData?.instagramUrl || tenantData?.lineUrl || tenantData?.facebookUrl || tenantData?.homepage) && (
            <div className="bg-slate-50 py-16 px-12 text-center border-t border-slate-100">
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mb-10 text-center">Follow our journey</p>
              <div className="flex justify-center gap-8">
                {tenantData?.instagramUrl && (
                  <a href={tenantData.instagramUrl} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center text-pink-500 border border-slate-100 hover:scale-110 transition-all">
                    <Instagram size={28} />
                  </a>
                )}
                {tenantData?.lineUrl && (
                  <a href={tenantData.lineUrl} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center text-green-500 border border-slate-100 hover:scale-110 transition-all">
                    <MessageCircle size={28} />
                  </a>
                )}
                {tenantData?.facebookUrl && (
                  <a href={tenantData.facebookUrl} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center text-blue-600 border border-slate-100 hover:scale-110 transition-all">
                    <Facebook size={28} />
                  </a>
                )}
                {tenantData?.homepage && (
                  <a href={tenantData.homepage} target="_blank" rel="noreferrer" className="w-16 h-16 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center text-slate-500 border border-slate-100 hover:scale-110 transition-all">
                    <LinkIcon size={28} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Email Final Footer (メルカリ・マネフォ級の信頼性だばい！) */}
          <div className="bg-slate-900 p-16 text-center text-white/50 border-t border-slate-800">
            <p className="text-[10px] leading-relaxed mb-6 opacity-60">
              ※本メールは送信専用のため、ご返信いただいてもお答えできません。<br />
              お問い合わせは、公式サイトまたは各SNSよりお願いいたします。
            </p>
            <div className="w-12 h-px bg-slate-700 mx-auto mb-8"></div>
            <p className="text-xs font-bold text-white mb-2 tracking-widest">{displayTenantName.toUpperCase()}</p>
            {tenantData?.address && <p className="text-[10px] mb-1">〒 {tenantData.address}</p>}
            <div className="flex justify-center gap-4 mt-6 text-[10px] font-bold text-blue-400">
              {tenantData?.homepage && <a href={tenantData.homepage} target="_blank" rel="noreferrer" className="hover:underline">公式ホームページ</a>}
              <span className="text-slate-700">|</span>
              <a href="#" className="hover:underline text-slate-500">配信停止（Unsubscribe）</a>
            </div>
            <div className="w-16 h-1 bg-blue-500 mx-auto my-10 rounded-full"></div>
            <p className="text-[9px] font-black tracking-[0.4em] uppercase opacity-20">
              © {new Date().getFullYear()} {displayTenantName.toUpperCase()}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}