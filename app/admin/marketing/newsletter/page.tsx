"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, Send, Instagram, MessageCircle, Facebook, 
  Link as LinkIcon, PlusCircle, Trash2, Sparkles, Loader2, X ,CheckCircle2,Users,Clock,ChevronLeft,ChevronRight,ChevronsLeft, ChevronsRight,FileText, RotateCcw
} from 'lucide-react';
import { doc, onSnapshot,getCountFromServer } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";

interface SnapItem {
  id: number;
  title: string;
  comment: string;
  preview: string | null;
  file: File | null;
  layout: string;
  scale: number;
  position?: { x: number; y: number };
  titleColor?: string;
  titleSize?: string;
  bgColor?: string;
  brightness?: number;
  contrast?: number;
  saturate?: number;
  blur?: number;
  filterPreset?: string;
}

const FILTER_PRESETS = [
  { id: 'none', label: 'なし', filter: '' },
  { id: 'warm', label: '暖色', filter: 'sepia(0.2) saturate(1.3) brightness(1.05)' },
  { id: 'cool', label: '寒色', filter: 'saturate(0.8) hue-rotate(15deg) brightness(1.05)' },
  { id: 'vivid', label: '鮮やか', filter: 'saturate(1.6) contrast(1.1)' },
  { id: 'soft', label: 'ソフト', filter: 'brightness(1.1) contrast(0.9) saturate(0.9)' },
  { id: 'mono', label: 'モノクロ', filter: 'grayscale(1)' },
  { id: 'sepia', label: 'セピア', filter: 'sepia(0.8)' },
  { id: 'dramatic', label: 'ドラマ', filter: 'contrast(1.3) brightness(0.95) saturate(1.2)' },
];

const buildFilterStyle = (snap: SnapItem) => {
  if (snap.filterPreset && snap.filterPreset !== 'none') {
    return FILTER_PRESETS.find(p => p.id === snap.filterPreset)?.filter || '';
  }
  const parts = [];
  if (snap.brightness !== undefined && snap.brightness !== 100) parts.push(`brightness(${snap.brightness / 100})`);
  if (snap.contrast !== undefined && snap.contrast !== 100) parts.push(`contrast(${snap.contrast / 100})`);
  if (snap.saturate !== undefined && snap.saturate !== 100) parts.push(`saturate(${snap.saturate / 100})`);
  if (snap.blur !== undefined && snap.blur > 0) parts.push(`blur(${snap.blur}px)`);
  return parts.join(' ');
};

export default function NewsletterStudio() {
  // 🏆 テナント情報（SNSや住所などの設定）を保持
  const [tenantData, setTenantData] = useState<any>(null);
  const [isSending, setIsSending] = useState(false); // 送信用
  const [isSaving, setIsSaving] = useState(false);   // 保存用
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
  
  // 🎯 <SnapItem[]> を書き足して、初期値にも scale と position を入れる
  const [snaps, setSnaps] = useState<SnapItem[]>([
    { 
      id: 1, title: '', comment: '', preview: null, file: null, layout: 'full',
      scale: 1, position: { x: 50, y: 50 } 
    },
  ]);

  // 🏆 過去の履歴を保存しておくための箱だばい！
  const [totalCount, setTotalCount] = useState(0); // 🎯 全データ数を覚える箱
  const [archives, setArchives] = useState<any[]>([]);

  const [lastVisible, setLastVisible] = useState<any>(null); // 🎯 どこまで読み込んだか覚える
  const [firstVisible, setFirstVisible] = useState<any>(null); // 🎯 戻る用
  const [currentPage, setCurrentPage] = useState(1); // 🎯 いま何ページ目か数える箱だばい！

// 🏆 1. ログインメアドから tenantId を自動取得して連動させるぞい！
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        // 🎯 塙さんのFirestoreは「メアド」がドキュメントIDだっぺ！
        const { getDoc, doc } = await import("firebase/firestore");

        // admin_users コレクションをメアドで直撃だばい
        const userSnap = await getDoc(doc(db, "admin_users", user.email));
        
        if (userSnap.exists()) {
          const tid = userSnap.data().tenantId; // 🎯 ここで "caredesignworks" が取れる！

          if (tid) {
            // テナント情報をリアルタイム取得（プレビューの社名に反映！）
            onSnapshot(doc(db, "tenants", tid), (docSnap) => {
              if (docSnap.exists()) {
                setTenantData({ ...docSnap.data(), id: tid });
              }
            });

            // 絆リスト（全イベント参加者）を収集
            fetchKizunaList(tid);

            fetchArchives(tid);
          }
        } else {
          console.error("admin_users not found:", user.email);
        }
      }
    });

    const fetchKizunaList = async (tid: string) => {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      
      // 🎯 1. まずは「配信停止」を希望した人のリストを読み込むぞい
      const optOutSnap = await getDocs(collection(db, "marketing_optouts"));
      const blockedEmails = new Set(optOutSnap.docs.map(d => d.id));
      // 🎯 ここ！ループの前に箱を作るのを忘れちゃいけねぇだばい！
      const q = query(collection(db, "events"), where("tenantId", "==", tid));
      const evSnap = await getDocs(q);
      const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      const userMap = new Map();

      for (const edoc of evSnap.docs) {
        const resSnap = await getDocs(collection(db, "events", edoc.id, "reservations"));
        resSnap.forEach(rdoc => {
          const data = rdoc.data();
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
    
    const newItems: SnapItem[] = actualFiles.map((file, i) => ({
      id: Date.now() + i,
      title: '',
      comment: '',
      preview: URL.createObjectURL(file),
      file: file,
      // 🎯 ここで「何枚並びか」を覚えさせるのがコラージュのコツ！
      layout: count === 1 ? 'full' : count === 3 ? 'triple' : 'grid',
      scale: 1,
      position: { x: 50, y: 50 }
    }));

    setSnaps([...snaps, ...newItems]);
  };

  // 🏆 パート①：文章だけのブロックを追加する魔法だばい！
  const addTextBlock = () => {
    if (snaps.length >= 12) return alert("枠がいっぱいだっぺ！");
    
    const newTextItem: SnapItem = {
      id: Date.now(),
      title: 'おしらせ', // 初期値
      comment: '',
      preview: null,
      file: null,
      layout: 'text',
      scale: 1,
      position: { x: 50, y: 50 } // 🎯 「text」というレイアウト名を付けるのがコツだばい！
    };
    
    setSnaps([...snaps, newTextItem]);
  };

  // 写真ドラッグ/タッチで位置調整
  const dragState = useRef<{ idx: number; startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);

  const handleDragStart = (idx: number, clientX: number, clientY: number) => {
    if ((snaps[idx].scale || 1) <= 1) return; // ズームしてない時はドラッグ不要
    dragState.current = {
      idx,
      startX: clientX,
      startY: clientY,
      startPosX: snaps[idx].position?.x ?? 50,
      startPosY: snaps[idx].position?.y ?? 50,
    };
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!dragState.current) return;
    const { idx, startX, startY, startPosX, startPosY } = dragState.current;
    // 移動量をパーセントに変換（感度調整）
    const sensitivity = 0.15;
    const dx = (clientX - startX) * sensitivity;
    const dy = (clientY - startY) * sensitivity;
    const newX = Math.max(0, Math.min(100, startPosX - dx));
    const newY = Math.max(0, Math.min(100, startPosY - dy));
    const newSnaps = [...snaps];
    newSnaps[idx].position = { x: Math.round(newX), y: Math.round(newY) };
    setSnaps(newSnaps);
  };

  const handleDragEnd = () => {
    dragState.current = null;
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => {
      if (dragState.current) e.preventDefault();
      if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  });

  const removeSnap = (idx: number) => {
    setSnaps(snaps.filter((_, i) => i !== idx));
  };

  const moveSnap = (idx: number, direction: 'up' | 'down') => {
    const newSnaps = [...snaps];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSnaps.length) return;
    [newSnaps[idx], newSnaps[targetIdx]] = [newSnaps[targetIdx], newSnaps[idx]];
    setSnaps(newSnaps);
  };

  const addDividerBlock = () => {
    if (snaps.length >= 12) return;
    setSnaps([...snaps, {
      id: Date.now(), title: '', comment: '', preview: null, file: null,
      layout: 'divider', scale: 1, position: { x: 50, y: 50 }
    }]);
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

// 🏆 履歴取得（迷子にならない＆最古ワープ対応版！）
  const fetchArchives = async (tid: string, direction: "next" | "prev" | "first" | "last" = "first") => {
    const { collection, query, where, getDocs, orderBy, limit, startAfter, endBefore, limitToLast } = await import("firebase/firestore");

    // 🎯 1. 最初に全件数を数える（ページ番号を正しく出すためだばい！）
    const coll = collection(db, "newsletter_archives");
    const countQuery = query(coll, where("tenantId", "==", tid));
    const countSnap = await getCountFromServer(countQuery);
    const total = countSnap.data().count;
    setTotalCount(total);
    
    // 基本は「新しい順（desc）」
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
    } else if (direction === "last") {
      // 🎯 【ワープ魔法】逆転させて「古い順（asc）」で最初の10件を呼ぶぞい！
      q = query(
        collection(db, "newsletter_archives"),
        where("tenantId", "==", tid),
        orderBy("createdAt", "asc"),
        limit(10)
      );
    }

    const snap = await getDocs(q);
    if (!snap.empty) {
      let docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 🎯 「古い順」で取った時は、リスト内を「新しい順」に見えるよう逆転させるべ！
      if (direction === "last") { docs = docs.reverse(); }

      setArchives(docs);
      setFirstVisible(snap.docs[0]);
      setLastVisible(snap.docs[snap.docs.length - 1]);
    } else {
      if (direction === "first") setArchives([]);
    }
  };

// 🏆 必殺技②：一時保存（下書き）する（写真も確実に保存する鉄壁版！）
  const handleSaveDraft = async () => {
    if (!tenantData) return;
    setIsSaving(true);
    try {
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

      // 🎯 保存前に、まだ送ってない写真を全部アップロードするぞい！
      let finalMainImageUrl = mainFile ? await uploadPhoto(mainFile, "main") : mainImagePreview;

      const uploadedSnaps = await Promise.all(snaps.map(async (snap) => {
        let imageUrl = snap.preview || "";
        if (snap.file) {
          imageUrl = await uploadPhoto(snap.file, "snaps");
        }
        return { 
          title: snap.title, 
          comment: snap.comment, 
          imageUrl: imageUrl, 
          layout: snap.layout || 'full' 
        };
      }));

      await addDoc(collection(db, "newsletter_archives"), {
        tenantId: tenantData.id,
        subject, mainTitle, mainMessage, 
        mainImageUrl: finalMainImageUrl, // 🎯 修正！
        snaps: uploadedSnaps, // 🎯 修正！
        status: "draft",
        createdAt: serverTimestamp()
      });
      alert("下書きとして保存したぞい！");
      fetchArchives(tenantData.id);
    } catch (e) {
      alert("保存失敗だっぺ...");
    } finally {
      setIsSaving(false);
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

  // 🏆 必殺技④：履歴を削除する（間違えて送ったやつも整理だばい！）
  const handleDeleteArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 🎯 親のボタンクリック（読み込み）が動かないようにガードするぞい！
    if (!confirm("この履歴を完全に消しますか？元には戻せません！")) return;
    
    try {
      const { deleteDoc, doc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "newsletter_archives", id));
      
      // 🎯 画面からもサッと消す
      setArchives(prev => prev.filter(arch => arch.id !== id));
      alert("きれいに消したぞい！");
    } catch (error) {
      alert("消すのに失敗しちまったっぺ...");
    }
  };


// --- 🚀 配信開始ボタン（こだわり調整データを1ミリも漏らさない版！） ---
  const handleSend = async () => {
    if (selectedEmails.length === 0) return alert("送る相手を一人以上選んでください！");
    if (!confirm(`${selectedEmails.length}名のお客様に一斉配信を開始します。よろしいですか？`)) return;
    
    setIsSending(true);

    try {
      // メイン写真の確定
      let finalMainImageUrl = mainFile ? await uploadPhoto(mainFile, "main") : mainImagePreview;

      // スナップ写真の確定
      const uploadedSnaps = await Promise.all(snaps.map(async (snap) => {
        let imageUrl = snap.preview || "";
        if (snap.file) {
          imageUrl = await uploadPhoto(snap.file, "snaps");
        }
        if (snap.layout === 'text' || imageUrl) {
          // 🎯 ここ！ scale と position を追加して API に渡すぞい！
          return { 
            title: snap.title, 
            comment: snap.comment, 
            imageUrl: imageUrl, 
            layout: snap.layout || 'full',
            scale: snap.scale || 1,
            position: snap.position || { x: 50, y: 50 }
          };
        }
        return null;
      }));

      const finalSnaps = uploadedSnaps.filter(s => s !== null);

      // 2. APIを叩いてメール発射！！（調整データが finalSnaps に入ってるぞい）
      const response = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject, mainTitle, mainMessage, 
          mainImageUrl: finalMainImageUrl,
          snaps: finalSnaps,
          tenantData,
          recipients: selectedEmails 
        }),
      });

      if (response.ok) {
        const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
        await addDoc(collection(db, "newsletter_archives"), {
          tenantId: tenantData.id,
          subject, mainTitle, mainMessage,
          mainImageUrl: finalMainImageUrl,
          snaps: finalSnaps, // 🎯 履歴にも調整データが保存されるっぺ！
          status: "sent",
          createdAt: serverTimestamp()
        });

        alert(`${selectedEmails.length}名のお客様に送信し、履歴に保存したぞい！！`);
        setSelectedEmails([]);
        fetchArchives(tenantData.id);
      } else {
        throw new Error("配信エラー");
      }
    } catch (e) {
      console.error(e);
      alert("送信中に問題が発生...");
    } finally {
      setIsSending(false);
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
          {/* 🎯 285行目付近：ここをまるごと差し替えだっぺ！ */}
          <section className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</div>
                基本設定
              </label>
              
              {/* 🏆 迷子脱出！新規作成ボタンだばい！ */}
              <button 
                onClick={() => {
                  if(confirm("今の入力を全部消して、新しいレターを作り始めるべか？")) {
                    setSubject('【絆レター】活動報告をお届けします');
                    setMainTitle('今月のトピックス');
                    setMainMessage('いつも大変お世話になっております。今月の様子をお伝えします。');
                    setMainImagePreview(null);
                    setMainFile(null);
                    setSnaps([{ id: Date.now(), title: '', comment: '', preview: null, file: null, layout: 'full',scale: 1,position: { x: 50, y: 50 } }]);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm"
              >
                <RotateCcw size={12}/> 新規作成に戻る
              </button>
            </div>
            
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
                  <div className="absolute -top-2 -right-2 flex gap-1 z-10">
                    {idx > 0 && (
                      <button onClick={() => moveSnap(idx, 'up')} className="bg-white text-slate-400 p-1.5 rounded-full shadow-lg border border-slate-100 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="上に移動">
                        <ChevronLeft size={14}/>
                      </button>
                    )}
                    {idx < snaps.length - 1 && (
                      <button onClick={() => moveSnap(idx, 'down')} className="bg-white text-slate-400 p-1.5 rounded-full shadow-lg border border-slate-100 hover:bg-blue-50 hover:text-blue-500 transition-colors" title="下に移動">
                        <ChevronRight size={14}/>
                      </button>
                    )}
                    <button onClick={() => removeSnap(idx)} className="bg-white text-red-500 p-1.5 rounded-full shadow-lg border border-slate-100 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* 🎯 写真枠：比率を 4:3 に合わせてギャップを埋めるっぺ！ */}
                  {snap.layout !== 'text' && snap.layout !== 'divider' && (
                    <>
                      <div className="w-full aspect-[4/3] bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center mb-4 overflow-hidden rounded-none relative shadow-inner">
                        {snap.preview ? (
                          <div
                            className={`w-full h-full relative ${(snap.scale || 1) > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            onMouseDown={(e) => { if ((snap.scale || 1) > 1) { e.preventDefault(); handleDragStart(idx, e.clientX, e.clientY); } }}
                            onTouchStart={(e) => { if ((snap.scale || 1) > 1 && e.touches[0]) { handleDragStart(idx, e.touches[0].clientX, e.touches[0].clientY); } }}
                          >
                            <img
                              src={snap.preview}
                              className="w-full h-full object-cover rounded-none transition-none select-none pointer-events-none"
                              style={{
                                transform: `scale(${snap.scale || 1})`,
                                transformOrigin: `${snap.position?.x || 50}% ${snap.position?.y || 50}%`,
                                filter: buildFilterStyle(snap),
                              }}
                              alt="Snap"
                              draggable={false}
                            />
                            {(snap.scale || 1) > 1 && (
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[8px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                                ドラッグで位置調整
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                            <Camera size={24} className="text-slate-300 mb-1 mx-auto" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">写真を選択</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSnapImageChange(idx, e)} />
                          </label>
                        )}
                        {/* 写真差し替え用（写真がある時） */}
                        {snap.preview && (
                          <label className="absolute top-2 left-2 bg-white/80 backdrop-blur-sm text-slate-500 p-1.5 rounded-lg cursor-pointer hover:bg-white transition-all shadow-sm z-10" title="写真を変更">
                            <Camera size={14}/>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSnapImageChange(idx, e)} />
                          </label>
                        )}
                      </div>

                      {/* 🏆 写真調整スライダー（ここも1セットに集約！） */}
                      {snap.preview && (
                        <div className="bg-slate-50 p-4 mb-4 rounded-xl border border-slate-200 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image Adjust</span>
                            <button 
                              onClick={() => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].scale = 1;
                                newSnaps[idx].position = { x: 50, y: 50 };
                                newSnaps[idx].brightness = 100;
                                newSnaps[idx].contrast = 100;
                                newSnaps[idx].saturate = 100;
                                newSnaps[idx].blur = 0;
                                newSnaps[idx].filterPreset = 'none';
                                setSnaps(newSnaps);
                              }}
                              className="text-[9px] font-black text-blue-600 hover:text-blue-800 transition-colors"
                            >
                              RESET
                            </button>
                          </div>
                          
                          {/* フィルタープリセット */}
                          <div className="space-y-2">
                            <span className="text-[8px] font-bold text-slate-500 uppercase">Filter Preset</span>
                            <div className="flex flex-wrap gap-1.5">
                              {FILTER_PRESETS.map(preset => (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    const newSnaps = [...snaps];
                                    newSnaps[idx].filterPreset = preset.id;
                                    if (preset.id !== 'none') {
                                      newSnaps[idx].brightness = 100;
                                      newSnaps[idx].contrast = 100;
                                      newSnaps[idx].saturate = 100;
                                      newSnaps[idx].blur = 0;
                                    }
                                    setSnaps(newSnaps);
                                  }}
                                  className={`text-[8px] font-bold px-2 py-1 rounded transition-all ${
                                    (snap.filterPreset || 'none') === preset.id
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 手動調整（プリセットが「なし」の時のみ） */}
                          {(!snap.filterPreset || snap.filterPreset === 'none') && (
                          <>
                          {/* 明るさ */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                              <span>Brightness</span>
                              <span>{snap.brightness ?? 100}%</span>
                            </div>
                            <input type="range" min="50" max="150" value={snap.brightness ?? 100}
                              onChange={(e) => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].brightness = parseInt(e.target.value);
                                setSnaps(newSnaps);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                          </div>

                          {/* コントラスト */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                              <span>Contrast</span>
                              <span>{snap.contrast ?? 100}%</span>
                            </div>
                            <input type="range" min="50" max="150" value={snap.contrast ?? 100}
                              onChange={(e) => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].contrast = parseInt(e.target.value);
                                setSnaps(newSnaps);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                            />
                          </div>

                          {/* 彩度 */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                              <span>Saturation</span>
                              <span>{snap.saturate ?? 100}%</span>
                            </div>
                            <input type="range" min="0" max="200" value={snap.saturate ?? 100}
                              onChange={(e) => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].saturate = parseInt(e.target.value);
                                setSnaps(newSnaps);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                            />
                          </div>
                          </>
                          )}

                          {/* ズーム調整 */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                              <span>Zoom</span>
                              <span>{Math.round((snap.scale || 1) * 100)}%</span>
                            </div>
                            <input type="range" min="1" max="3" step="0.05" value={snap.scale || 1} 
                              onChange={(e) => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].scale = parseFloat(e.target.value);
                                setSnaps(newSnaps);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                            />
                          </div>

                          {/* 左右位置（Horizontal） */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                              <span>Horizontal</span>
                              <span>{snap.position?.x || 50}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={snap.position?.x || 50} 
                              onChange={(e) => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].position = { 
                                  ...newSnaps[idx].position!, 
                                  x: parseInt(e.target.value) 
                                };
                                setSnaps(newSnaps);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400" 
                            />
                          </div>

                          {/* 上下位置（Vertical） */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-bold text-slate-500 uppercase">
                              <span>Vertical</span>
                              <span>{snap.position?.y || 50}%</span>
                            </div>
                            <input type="range" min="0" max="100" value={snap.position?.y || 50} 
                              onChange={(e) => {
                                const newSnaps = [...snaps];
                                newSnaps[idx].position = { 
                                  ...newSnaps[idx].position!, 
                                  y: parseInt(e.target.value) 
                                };
                                setSnaps(newSnaps);
                              }}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-400" 
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {snap.layout === 'divider' ? (
                    <div className="flex items-center gap-2 py-2">
                      <div className="flex-1 h-px bg-slate-300"></div>
                      <span className="text-[9px] text-slate-400 font-bold uppercase">区切り線</span>
                      <div className="flex-1 h-px bg-slate-300"></div>
                    </div>
                  ) : (
                  <>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="タイトル"
                      value={snap.title}
                      onChange={(e) => {
                        const newSnaps = [...snaps];
                        newSnaps[idx].title = e.target.value;
                        setSnaps(newSnaps);
                      }}
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-none text-xs font-black outline-none"
                      style={{ color: snap.titleColor || '#0f172a' }}
                    />
                    <input
                      type="color"
                      value={snap.titleColor || '#0f172a'}
                      onChange={(e) => {
                        const newSnaps = [...snaps];
                        newSnaps[idx].titleColor = e.target.value;
                        setSnaps(newSnaps);
                      }}
                      className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                      title="タイトル色"
                    />
                  </div>
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
                  </>
                  )}
                </div>
              ))}

              {/* 🏆 おもてなしボタン群：ここを端折らずに全部書いたぞい！！ */}
              {snaps.length < 12 && (
                <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
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
                  {/* 区切り線 */}
                  <button onClick={addDividerBlock} className="h-32 border-2 border-dashed border-slate-200 rounded-none flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-all gap-1 bg-slate-50/30 shadow-sm">
                    <div className="w-12 h-px bg-slate-400"></div><span className="text-[8px] font-black uppercase">区切り線</span>
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
            {/* 🎯 一時保存ボタン：isSaving を見るように変更！ */}
            <button 
              onClick={handleSaveDraft} 
              disabled={isSaving || isSending}
              className="w-full py-4 text-blue-600 text-xs font-black uppercase tracking-widest bg-blue-50 hover:bg-blue-100 rounded-none transition-all border border-blue-100 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <><Loader2 className="animate-spin" size={14}/> 保存中...</>
              ) : (
                <><PlusCircle size={14}/> 今の内容を下書きとして保存する</>
              )}
            </button>

            {/* 🎯 本番配信ボタン：isSending だけを見るから、もう勝手にクルクルしないぞい！ */}
            <button 
              onClick={handleSend} 
              disabled={isSending || isSaving || selectedEmails.length === 0} 
              className="w-full bg-slate-900 text-white py-6 rounded-none font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-600 shadow-2xl transition-all disabled:bg-slate-300"
            >
              {isSending ? (
                <><Loader2 className="animate-spin" /> 送信中...</>
              ) : (
                <><Send size={24} /> {selectedEmails.length > 0 ? `${selectedEmails.length}名に一斉配信を開始！` : "一斉配信を開始する"}</>
              )}
            </button>
          </div>

          {/* --- 📜 配信履歴・バックナンバー（時間＆削除ボタン付きだばい！） --- */}
          <section className="mt-16 pt-10 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Clock size={16}/> 配信履歴・バックナンバー
              </h3>
              <span className="text-[10px] font-black text-slate-400">最新10件を表示中</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {archives.map(arch => (
                <div 
                  key={arch.id} 
                  className="flex items-center bg-white hover:bg-blue-50 rounded-[1.5rem] transition-all group border border-slate-100 hover:border-blue-300 shadow-sm overflow-hidden"
                >
                  {/* 🎯 左側：クリックで内容を読み込むエリア */}
                  <button 
                    onClick={() => loadArchive(arch)}
                    className="flex-1 flex justify-between items-center p-5 text-left border-none outline-none"
                  >
                    <div className="flex flex-col items-start gap-1 min-w-0">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                        arch.status === 'draft' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {arch.status === 'draft' ? '下書き' : '送信済み'}
                      </span>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 truncate w-full">
                        {arch.subject || "(無題)"}
                      </span>
                    </div>
                    
                    {/* 🎯 修正：日付だけでなく「時間（時:分）」も表示するぞい！ */}
                    <span className="text-[10px] font-black text-slate-400 whitespace-nowrap ml-4">
                      {arch.createdAt?.toDate().toLocaleString('ja-JP', { 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      }) || "時刻不明"}
                    </span>
                  </button>

                  {/* 🎯 右側：削除ボタン（ゴミ箱アイコン） */}
                  <button 
                    onClick={(e) => handleDeleteArchive(arch.id, e)}
                    className="p-5 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all border-l border-slate-50"
                    title="履歴から削除"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              {archives.length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-slate-200 rounded-[2rem]">
                  <p className="text-[10px] text-slate-300 font-bold italic">まだ履歴はありません。</p>
                </div>
              )}
            </div>
          </section>
          {/* 🎯 正真正銘、完結版のページネーションだばい！ */}
<div className="flex justify-center items-center gap-2 mt-10 pb-10">
  
  {/* 最初へ (<<) */}
  <button 
    onClick={() => { fetchArchives(tenantData.id, "first"); setCurrentPage(1); }}
    disabled={currentPage === 1}
    className="p-2 bg-white rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-20 border border-slate-200 shadow-sm"
  >
    <ChevronsLeft size={18}/>
  </button>

  {/* 前へ (<) */}
  <button 
    onClick={() => { fetchArchives(tenantData.id, "prev"); setCurrentPage(prev => Math.max(1, prev - 1)); }} 
    disabled={currentPage === 1}
    className="p-2 bg-white rounded-lg text-slate-400 border border-slate-200"
  >
    <ChevronLeft size={18}/>
  </button>

  {/* 🏆 ページ番号（今ある分だけを表示するぞい！） */}
  <div className="flex gap-1 mx-2">
    {Array.from({ length: Math.ceil(totalCount / 10) }).map((_, i) => {
      const pageNum = i + 1;
      // 🎯 今のページの前後1ページだけ出すプロ仕様だばい！
      if (pageNum < currentPage - 1 || pageNum > currentPage + 1) {
        if (pageNum === 1 || pageNum === Math.ceil(totalCount / 10)) { /* 端っこは出す */ }
        else return null;
      }

      return (
        <button
          key={pageNum}
          onClick={() => {
            if (pageNum === 1) fetchArchives(tenantData.id, "first");
            else if (pageNum === Math.ceil(totalCount / 10)) fetchArchives(tenantData.id, "last");
            else fetchArchives(tenantData.id, pageNum > currentPage ? "next" : "prev");
            setCurrentPage(pageNum);
          }}
          className={`w-10 h-8 rounded-lg text-[10px] font-black border transition-all ${
            currentPage === pageNum ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'
          }`}
        >
          {pageNum}
        </button>
      );
    })}
  </div>

  {/* 🏆 最後のページへワープ (>>) */}
  <button 
    onClick={() => { 
      const lastPage = Math.ceil(totalCount / 10);
      fetchArchives(tenantData.id, "last"); 
      setCurrentPage(lastPage); // 🎯 999 ではなく「本当の最後」を教えるぞい！
    }} 
    disabled={currentPage === Math.ceil(totalCount / 10) || totalCount === 0}
    className="p-2 bg-white rounded-lg text-slate-400 border border-slate-200"
  >
    <ChevronsRight size={18}/>
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

          {/* 🏆 右側：ここが「比率も調整もメールと同じ」プレビューだばい！！ */}
          <div className="px-12 pb-12 flex flex-wrap gap-y-12 gap-x-4 items-start">
            {snaps.map((snap: any, idx) => (
              <div 
                key={idx} 
                className={`space-y-4 ${
                  snap.layout === 'triple' ? 'w-[calc(33.333%-11px)]' : 
                  snap.layout === 'grid' ? 'w-[calc(50%-8px)]' : 
                  'w-full'
                }`}
              >
                {/* 区切り線ブロック */}
                {snap.layout === 'divider' ? (
                  <div className="w-full py-6 flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>
                ) : (
                <>
                {snap.layout !== 'text' && (
                  <div className="w-full aspect-[4/3] bg-slate-50 rounded-none overflow-hidden border border-slate-100 shadow-inner flex items-center justify-center relative">
                    {snap.preview ? (
                      <img
                        src={snap.preview}
                        className="w-full h-full object-cover rounded-none transition-all duration-100"
                        style={{
                          transform: `scale(${snap.scale || 1})`,
                          transformOrigin: `${snap.position?.x || 50}% ${snap.position?.y || 50}%`,
                          filter: buildFilterStyle(snap),
                        }}
                      />
                    ) : (
                      <span className="text-slate-200 font-black italic uppercase text-center text-xl">SNAP {idx + 1}</span>
                    )}
                  </div>
                )}
                
                <div className={`${
                  snap.layout === 'text'
                    ? 'p-10 bg-blue-50/50 rounded-none border border-blue-100 shadow-inner w-full flex flex-col justify-center min-h-[160px]'
                    : 'px-2'
                } text-left`}>
                  <h4 className={`font-black ${snap.layout === 'text' ? 'text-2xl mb-3' : 'text-[14px] mb-2'}`}
                    style={{ color: snap.titleColor || '#0f172a' }}>
                    {snap.title || (snap.layout === 'text' ? 'おしらせ' : `SCENE ${idx + 1}`)}
                  </h4>
                  {snap.comment && (
                    <p className={`text-slate-500 leading-relaxed whitespace-pre-wrap ${snap.layout === 'text' ? 'text-lg' : 'text-[12px]'}`}>
                      {snap.comment}
                    </p>
                  )}
                </div>
                </>
                )}
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
              <a href="https://www.event-manager.app/unsubscribe" className="hover:underline text-slate-500">配信停止（Unsubscribe）</a>
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