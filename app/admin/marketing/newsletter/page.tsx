"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Send, Instagram, MessageCircle, Facebook, Link, PlusCircle, Trash2, Sparkles } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function NewsletterStudio() {
  const [tenantData, setTenantData] = useState<any>(null);
  
  // 🏆 入力State
  const [subject, setSubject] = useState('【絆レター】最新号をお届けします');
  const [mainTitle, setMainTitle] = useState('今月のトピックス');
  const [mainMessage, setMainMessage] = useState('いつも大変お世話になっております。今月の活動報告をお届けいたします。');
  
  // 🏆 写真プレビュー用State（URL.createObjectURLを使うっぺ）
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [snaps, setSnaps] = useState([
    { id: 1, title: '日常の風景', comment: 'スタッフと一緒に撮影しました。', image: null as string | null },
    { id: 2, title: '季節のイベント', comment: '綺麗な花が咲いていました。', image: null as string | null },
  ]);

  // テナント情報取得（SNSリンクなどもここから来るぞい）
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tenants", "ケアデザインワークス等のID"), (docSnap) => {
      if (docSnap.exists()) setTenantData(docSnap.data());
    });
    return () => unsub();
  }, []);

  const displayTenantName = tenantData?.orgName || tenantData?.name || "CARE DESIGN WORKS";

  // 📸 メイン写真の選択ハンドラ
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setMainImage(URL.createObjectURL(file));
  };

  // 📸 スナップ写真の選択ハンドラ
  const handleSnapImageChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSnaps = [...snaps];
      newSnaps[idx].image = URL.createObjectURL(file);
      setSnaps(newSnaps);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100">
      
      {/* 🛠️ 左側：入力フォーム（システム名：BANTARO） */}
      <div className="w-full lg:w-1/2 p-8 border-r border-slate-200 overflow-y-auto bg-white">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic flex items-center gap-2">
              <span className="text-blue-600">BANTARO</span> 
              <span className="text-slate-400 text-xl font-bold not-italic">Studio</span>
            </h1>
            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Premium Marketing Tool</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-xs font-black">
            <Sparkles size={14} /> SUBSCRIPTION ACTIVE
          </div>
        </div>

        <div className="space-y-10 pb-32">
          {/* 基本設定 */}
          <section className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">01. 基本設定</label>
            <div className="space-y-2">
              <span className="text-sm font-bold text-slate-700 ml-1">メール件名</span>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
            </div>
          </section>

          {/* メイン写真セクション */}
          <section className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">02. メインビジュアル</label>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
              <label className="relative w-full h-48 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all overflow-hidden group">
                {mainImage ? (
                  <img src={mainImage} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <>
                    <Camera className="text-slate-300 group-hover:text-blue-500 mb-2" size={32} />
                    <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">写真を選択（最大1枚）</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} />
              </label>
              <input type="text" placeholder="メインの見出し" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black outline-none" />
              <textarea rows={4} placeholder="メッセージを記入..." value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm leading-relaxed outline-none resize-none" />
            </div>
          </section>

          {/* スナップ写真セクション */}
          <section className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest">03. 現場のスナップ（最大4枚）</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snaps.map((snap, idx) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group">
                  <label className="w-full aspect-video bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-center mb-3 cursor-pointer overflow-hidden">
                    {snap.image ? (
                      <img src={snap.image} className="w-full h-full object-cover" alt="Snap" />
                    ) : (
                      <Camera size={20} className="text-slate-300" />
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSnapImageChange(idx, e)} />
                  </label>
                  <input type="text" placeholder="タイトル" value={snap.title} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].title = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold mb-2 outline-none" />
                  <textarea placeholder="説明文..." value={snap.comment} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].comment = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] leading-relaxed outline-none resize-none" />
                </div>
              ))}
            </div>
          </section>

          <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl flex items-center justify-center gap-3 hover:bg-blue-600 shadow-2xl transition-all active:scale-[0.98]">
            <Send size={24} /> 配信を開始する
          </button>
        </div>
      </div>

      {/* 📱 右側：プレビュー（枠なし・画面いっぱい表示） */}
      <div className="w-full lg:w-1/2 p-0 lg:p-12 flex justify-center items-start bg-slate-200 overflow-y-auto">
        {/* この白い箱が「メールそのもの」だっぺ！ */}
        <div className="w-full max-w-[600px] bg-white shadow-xl min-h-screen lg:min-h-0 lg:rounded-3xl overflow-hidden border border-slate-300">
          
          {/* Header */}
          <div className="bg-[#1e293b] p-10 text-center border-b-8 border-blue-500">
             <div className="text-white font-black text-xl tracking-[0.3em] uppercase">{displayTenantName}</div>
             <div className="text-blue-400 text-[10px] font-black mt-3 tracking-[0.4em] opacity-80 uppercase">Official Newsletter</div>
          </div>

          {/* Main Visual */}
          <div className="w-full aspect-[16/9] bg-slate-100 overflow-hidden flex items-center justify-center">
            {mainImage ? (
              <img src={mainImage} className="w-full h-full object-cover" alt="Main" />
            ) : (
              <span className="text-slate-300 italic font-bold">Main Photo Area</span>
            )}
          </div>

          <div className="p-10">
            <h2 className="text-3xl font-black text-slate-800 mb-6 leading-tight">{mainTitle}</h2>
            <div className="text-lg text-slate-600 leading-relaxed whitespace-pre-wrap border-l-8 border-blue-500 pl-6 py-2">
              {mainMessage}
            </div>
          </div>

          {/* Snaps */}
          <div className="px-10 pb-10 space-y-12">
            {snaps.map((snap, idx) => (
              <div key={idx} className="space-y-4">
                <div className="w-full aspect-square bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 flex items-center justify-center">
                  {snap.image ? (
                    <img src={snap.image} className="w-full h-full object-cover" alt="Snap" />
                  ) : (
                    <span className="text-slate-300 font-bold">Snap {idx + 1}</span>
                  )}
                </div>
                <div className="px-4">
                  <h4 className="font-black text-slate-800 text-lg mb-2">● {snap.title || '（タイトルなし）'}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{snap.comment || '（説明なし）'}</p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Footer SNS */}
          <div className="bg-slate-50 py-12 px-10 text-center border-t border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8">Follow our stories</p>
            <div className="flex justify-center gap-6">
              {[Instagram, MessageCircle, Facebook, Link].map((Icon, i) => (
                <div key={i} className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-500 transition-colors">
                  <Icon size={24} />
                </div>
              ))}
            </div>
          </div>

          {/* Final Footer */}
          <div className="bg-slate-900 p-12 text-center text-white/50">
            <p className="text-xs font-bold leading-relaxed mb-6">
              このメールは {displayTenantName} より<br />
              大切なお客様へお届けしています。
            </p>
            <div className="w-12 h-1 bg-blue-500 mx-auto mb-6"></div>
            <p className="text-[10px] font-black tracking-[0.3em] uppercase">
              © {new Date().getFullYear()} {displayTenantName}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}