"use client";

import React, { useState, useEffect } from 'react';
import { 
  Camera, Send, Instagram, MessageCircle, Facebook, 
  Link as LinkIcon, PlusCircle, Trash2, Sparkles, Loader2, X ,CheckCircle2,Users
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
  
  // 🏆 スナップ写真配列（最大10枚まで増えるぞい！）
  const [snaps, setSnaps] = useState([
    { id: 1, title: '', comment: '', preview: null as string | null, file: null as File | null },
  ]);

// 🏆 ログインユーザーの所属（テナントID）を自動判別してデータを取るぞい！
  useEffect(() => {
    // 1. ログイン状態を監視するっぺ
    const unsubAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // 2. ログインしたユーザーの「プロフィール」をFirestoreから読み込む
        const { getDoc, doc } = await import("firebase/firestore");
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const tid = userData.tenantId; // 🎯 ここで「所属先ID」をゲットだばい！

          if (tid) {
            // 3. 所属先IDを使って、テナント基本情報を取得
            onSnapshot(doc(db, "tenants", tid), (docSnap) => {
              if (docSnap.exists()) setTenantData({ ...docSnap.data(), id: tid });
            });

            // 4. その所属先の「絆リスト（全イベント参加者）」を収集！
            fetchKizunaList(tid);
          }
        }
      } else {
        // ログアウトしてたら追い出すか、アラートだっぺ
        console.log("ログインしてねぇぞい！");
      }
    });

    // 🏆 絆リストをガバッと集める関数（引数に tid をもらうようにしたぞい）
    const fetchKizunaList = async (tid: string) => {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      
      // そのテナントの全イベントを取得
      const q = query(collection(db, "events"), where("tenantId", "==", tid));
      const evSnap = await getDocs(q);
      const evList: any[] = [];
      const userMap = new Map();

      for (const edoc of evSnap.docs) {
        evList.push({ id: edoc.id, title: edoc.data().title });
        
        // 各イベントの予約者（reservations）を回収
        const resSnap = await getDocs(collection(db, "events", edoc.id, "reservations"));
        resSnap.forEach(rdoc => {
          const data = rdoc.data();
          if (data.email) {
            userMap.set(data.email, { 
              email: data.email, 
              name: data.name, 
              eventId: edoc.id, 
              eventTitle: edoc.data().title 
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

  const addSnap = () => {
    if (snaps.length >= 10) return alert("写真は最大10枚までだっぺ！");
    setSnaps([...snaps, { id: Date.now(), title: '', comment: '', preview: null, file: null }]);
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

// --- 🚀 配信開始ボタン（エラー修正・最終形態！） ---
  const handleSend = async () => {
    // 1. まずは「送る相手がいるか」を確認するおもてなし設計だっぺ
    if (selectedEmails.length === 0) {
      alert("送る相手（絆リスト）を一人以上選んでくんちぇ！");
      return;
    }

    if (!confirm(`${selectedEmails.length}名のお客様に一斉配信を開始します。よろしいですか？`)) return;
    
    setIsUploading(true);

    try {
      // 2. 写真のアップロード（Storageへ）
      let mainImageUrl = "";
      if (mainFile) {
        mainImageUrl = await uploadPhoto(mainFile, "main");
      }

      const uploadedSnaps = await Promise.all(
        snaps.map(async (snap) => {
          if (snap.file) {
            const url = await uploadPhoto(snap.file, "snaps");
            return { title: snap.title, comment: snap.comment, imageUrl: url };
          }
          return null;
        })
      );
      const finalSnaps = uploadedSnaps.filter(s => s !== null);

      // 3. APIを叩いてメール発射！！（responseは1回だけ宣言だばい！）
      const response = await fetch("/api/send-newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          mainTitle,
          mainMessage,
          mainImageUrl,
          snaps: finalSnaps,
          tenantData,
          recipients: selectedEmails // 🚀 画面で選んだ精鋭部隊を送るぞい！
        }),
      });

      if (response.ok) {
        alert(`${selectedEmails.length}名のお客様に、魂のメールを届けたぞい！！お疲れ様だっぺ！`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "配信エラーだばい");
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

          {/* スナップ写真（最大10枚） */}
          <section className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">3</div>
                スナップ写真（最大10枚）
              </label>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">現在 {snaps.length} / 10 枚</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {snaps.map((snap, idx) => (
                <div key={idx} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 relative group animate-in fade-in zoom-in-95 duration-300 shadow-sm">
                  <button onClick={() => removeSnap(idx)} className="absolute -top-2 -right-2 bg-white text-red-500 p-2 rounded-full shadow-lg border border-slate-100 hover:bg-red-50 transition-colors z-10">
                    <Trash2 size={16} />
                  </button>

                  <label className="w-full aspect-square bg-white rounded-2xl border border-dashed border-slate-300 flex items-center justify-center mb-4 cursor-pointer overflow-hidden shadow-inner hover:border-blue-400 transition-all">
                    {snap.preview ? (
                      <img src={snap.preview} className="w-full h-full object-cover" alt="Snap" />
                    ) : (
                      <div className="text-center">
                        <Camera size={24} className="text-slate-300 mb-1 mx-auto" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">SNAP {idx + 1}</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSnapImageChange(idx, e)} />
                  </label>
                  <input type="text" placeholder="タイトル" value={snap.title} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].title = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-black mb-2 outline-none shadow-sm" />
                  <textarea placeholder="説明文..." value={snap.comment} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].comment = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[10px] leading-relaxed outline-none resize-none shadow-sm" rows={2} />
                </div>
              ))}

              {snaps.length < 10 && (
                <button onClick={addSnap} className="h-full min-h-[200px] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all gap-3 bg-white/50">
                  <PlusCircle size={40} strokeWidth={1} />
                  <span className="text-xs font-black uppercase tracking-tighter">写真を追加する</span>
                </button>
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

          <button onClick={handleSend} disabled={isUploading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-600 shadow-2xl transition-all disabled:bg-slate-400">
            {isUploading ? (
              <><Loader2 className="animate-spin" /> 写真を倉庫に預けてるっぺ...</>
            ) : (
              <><Send size={24} /> 一斉配信を開始するだばい！</>
            )}
          </button>
        </div>
      </div>

      {/* 📱 右側：プロフェッショナル・メールプレビュー */}
      <div className="w-full lg:w-1/2 p-4 lg:p-12 flex justify-center items-start bg-slate-200 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[600px] bg-white shadow-2xl lg:rounded-[3rem] overflow-hidden border border-slate-300 animate-in slide-in-from-right duration-500">
          
          {/* Header */}
          <div className="bg-[#1e293b] p-12 text-center border-b-[10px] border-blue-500">
             <div className="text-white font-black text-2xl tracking-[0.4em] uppercase">{displayTenantName}</div>
             <div className="text-blue-400 text-[10px] font-black mt-4 tracking-[0.5em] opacity-80 uppercase">Official Digital Newsletter</div>
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

          {/* Snaps (10枚まで縦に並ぶっぺ！) */}
          <div className="px-12 pb-12 space-y-16">
            {snaps.map((snap, idx) => (
              <div key={idx} className="space-y-6">
                <div className="w-full aspect-square bg-slate-50 rounded-[3rem] overflow-hidden border border-slate-100 flex items-center justify-center shadow-inner">
                  {snap.preview ? (
                    <img src={snap.preview} className="w-full h-full object-cover" alt="Snap" />
                  ) : (
                    <span className="text-slate-200 font-black text-4xl italic uppercase">SNAP {idx + 1}</span>
                  )}
                </div>
                <div className="px-6 border-b border-slate-100 pb-8">
                  <h4 className="font-black text-slate-900 text-2xl mb-3 flex items-center gap-3">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    {snap.title || `SCENE ${idx + 1}`}
                  </h4>
                  <p className="text-lg text-slate-500 leading-relaxed font-medium italic">{snap.comment || '活動の様子をここに記載します。'}</p>
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