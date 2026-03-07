"use client";

import React, { useState, useEffect } from 'react';
// ✨ Loader2（ぐるぐる）を追加したぞい
import { Camera, Send, Instagram, MessageCircle, Facebook, Link, PlusCircle, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
// ✨ Storageの道具を追加だばい
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "@/lib/firebase";

export default function NewsletterStudio() {
  const [tenantData, setTenantData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false); // 🚀 送信中フラグだっぺ
  
  const [subject, setSubject] = useState('【絆レター】活動報告をお届けします');
  const [mainTitle, setMainTitle] = useState('今月のトピックス');
  const [mainMessage, setMainMessage] = useState('いつも大変お世話になっております。今月の様子をお伝えします。');
  
  // 📸 メイン写真用（プレビューURLと、生データFileを分けるのがコツだぞい！）
  const [mainImagePreview, setMainImagePreview] = useState<string | null>(null);
  const [mainFile, setMainFile] = useState<File | null>(null);
  
  // 🏆 スナップ写真配列（fileプロパティを追加したっぺ！）
  const [snaps, setSnaps] = useState([
    { id: 1, title: '', comment: '', preview: null as string | null, file: null as File | null },
    { id: 2, title: '', comment: '', preview: null as string | null, file: null as File | null },
  ]);

  // テナント情報取得（※ログイン中のユーザーIDに合わせる必要ありだぞい）
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tenants", "demo_id"), (docSnap) => {
      if (docSnap.exists()) setTenantData(docSnap.data());
    });
    return () => unsub();
  }, []);

  const displayTenantName = tenantData?.orgName || tenantData?.name || "CARE DESIGN WORKS";

  // --- 📸 メイン写真選択ハンドラ ---
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImagePreview(URL.createObjectURL(file)); // 画面表示用
      setMainFile(file); // 倉庫アップロード用
    }
  };

  // --- 📸 スナップ写真選択ハンドラ ---
  const handleSnapImageChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSnaps = [...snaps];
      newSnaps[idx].preview = URL.createObjectURL(file); // 画面表示用
      newSnaps[idx].file = file; // 倉庫アップロード用
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

  // --- 📦 Firebase Storageにアップして「住所(URL)」をもらう魔法の関数 ---
  const uploadPhoto = async (file: File, folder: string) => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `newsletters/${folder}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  // --- 🚀 配信開始ボタン（本番ロジック！） ---
  const handleSend = async () => {
    if (!auth.currentUser) return alert("ログインしてくんちぇ！");
    setIsUploading(true);

    try {
      // 1️⃣ メイン写真のアップロード
      let mainImageUrl = "";
      if (mainFile) {
        mainImageUrl = await uploadPhoto(mainFile, "main");
      }

      // 2️⃣ 10枚のスナップを一気に並列アップロード（Promise.allで時短だばい！）
      const uploadedSnaps = await Promise.all(
        snaps.map(async (snap) => {
          if (snap.file) {
            const url = await uploadPhoto(snap.file, "snaps");
            return { title: snap.title, comment: snap.comment, imageUrl: url };
          }
          return null;
        })
      );

      // 有効な（写真がある）データだけ抽出
      const finalSnaps = uploadedSnaps.filter(s => s !== null);

      console.log("🔥 全写真の住所(URL)が確定したぞい！:", { mainImageUrl, finalSnaps });

      // 3️⃣ ここでResendのAPIを叩く（次のステップだっぺ！）
      alert("全写真のアップロードに成功！1,650円の価値があるメールを送る準備ができたぞい！");

    } catch (error) {
      console.error(error);
      alert("アップロード中にエラーが出ちった。通信環境を確認してくんちぇ。");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* 🛠️ 左側：入力フォーム */}
      <div className="w-full lg:w-1/2 p-6 lg:p-10 border-r border-slate-200 overflow-y-auto bg-white shadow-inner">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic flex items-center gap-2">
              <span className="text-blue-600">BANTARO</span> 
              <span className="text-slate-400 text-xl font-bold not-italic">Studio</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">Premium Marketing Studio</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black border border-emerald-100">
            <Sparkles size={12} /> SUBSCRIPTION ACTIVE
          </div>
        </div>

        <div className="space-y-12 pb-40">
          {/* 01. メール設定 */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">01</div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">基本設定</h3>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
              <label className="block text-xs font-black text-slate-500 mb-2 ml-1">メールの件名</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
            </div>
          </section>

          {/* 02. メインビジュアル */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">02</div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">メインビジュアル</h3>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <label className="relative w-full h-56 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all overflow-hidden group">
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
              <textarea rows={4} placeholder="導入の文章..." value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm outline-none resize-none shadow-sm" />
            </div>
          </section>

          {/* 03. スナップ写真（最大10枚） */}
          <section className="space-y-4">
            <div className="flex justify-between items-end mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">03</div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">現場のスナップ（最大10枚）</h3>
              </div>
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
                  }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-black mb-2 outline-none" />
                  <textarea placeholder="説明文..." value={snap.comment} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].comment = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[10px] outline-none resize-none" rows={2} />
                </div>
              ))}

              {snaps.length < 10 && (
                <button 
                  onClick={addSnap}
                  className="aspect-square md:aspect-auto h-full min-h-[200px] border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all gap-3 bg-white/50"
                >
                  <PlusCircle size={40} strokeWidth={1} />
                  <span className="text-xs font-black uppercase tracking-tighter">さらに写真を追加する</span>
                </button>
              )}
            </div>
          </section>

          {/* 🚀 送信ボタン（おもてなしLoader付き） */}
          <button 
            onClick={handleSend}
            disabled={isUploading}
            className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-600 shadow-2xl transition-all active:scale-[0.98] disabled:bg-slate-400"
          >
            {isUploading ? (
              <><Loader2 className="animate-spin" /> 写真を倉庫に預けてるっぺ...</>
            ) : (
              <><Send size={24} /> 一斉配信を開始するだばい！</>
            )}
          </button>
        </div>
      </div>

      {/* 📱 右側：プレビュー（そのまま表示） */}
      <div className="w-full lg:w-1/2 p-4 lg:p-12 flex justify-center items-start bg-slate-200 overflow-y-auto">
        <div className="w-full max-w-[600px] bg-white shadow-2xl lg:rounded-[3rem] overflow-hidden border border-slate-300">
          
          {/* Email Header */}
          <div className="bg-[#1e293b] p-12 text-center border-b-[10px] border-blue-500">
             <div className="text-white font-black text-2xl tracking-[0.4em] uppercase">{displayTenantName}</div>
             <div className="text-blue-400 text-[10px] font-black mt-4 tracking-[0.5em] opacity-80 uppercase tracking-widest">Official Digital Newsletter</div>
          </div>

          {/* Email Content */}
          <div className="w-full aspect-[16/9] bg-slate-100 flex items-center justify-center">
            {mainImagePreview ? (
              <img src={mainImagePreview} className="w-full h-full object-cover" alt="Main" />
            ) : (
              <span className="text-slate-300 font-bold italic">Main Visual Area</span>
            )}
          </div>

          <div className="p-12">
            <h2 className="text-4xl font-black text-slate-800 mb-8 leading-tight">{mainTitle}</h2>
            <div className="text-xl text-slate-600 leading-relaxed whitespace-pre-wrap border-l-[12px] border-blue-500 pl-8 py-2 bg-slate-50 rounded-r-2xl">
              {mainMessage}
            </div>
          </div>

          {/* Snaps Preview */}
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
                  <h4 className="font-black text-slate-900 text-2xl mb-3 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    {snap.title || `SCENE ${idx + 1}`}
                  </h4>
                  <p className="text-lg text-slate-500 leading-relaxed font-medium italic">{snap.comment || '（説明はここに表示されます）'}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Final Footer */}
          <div className="bg-slate-900 p-16 text-center text-white/40 border-t border-slate-800">
            <p className="text-sm font-bold leading-relaxed mb-8">
              このメールは {displayTenantName} より<br />
              大切なお客様へお届けしています。
            </p>
            <div className="w-16 h-1 bg-blue-600 mx-auto mb-8 rounded-full"></div>
            <p className="text-[11px] font-black tracking-[0.4em] uppercase text-white/20">
              © {new Date().getFullYear()} {displayTenantName}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}