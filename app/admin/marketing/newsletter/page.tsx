"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Send, Instagram, MessageCircle, Facebook, Link, PlusCircle, Trash2, Sparkles, X } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function NewsletterStudio() {
  const [tenantData, setTenantData] = useState<any>(null);
  
  // 🏆 基本入力
  const [subject, setSubject] = useState('【絆レター】活動報告をお届けします');
  const [mainTitle, setMainTitle] = useState('今月のトピックス');
  const [mainMessage, setMainMessage] = useState('いつも大変お世話になっております。今月の様子をお伝えします。');
  
  // 🏆 写真プレビュー用
  const [mainImage, setMainImage] = useState<string | null>(null);
  
  // 🏆 スナップ写真配列（初期は2枚。最大10枚まで動的に増やすぞい！）
  const [snaps, setSnaps] = useState([
    { id: 1, title: '', comment: '', image: null as string | null },
    { id: 2, title: '', comment: '', image: null as string | null },
  ]);

  // テナント情報取得
  useEffect(() => {
    // ※本来はログインユーザーのtenantIdを入れるっぺ
    const unsub = onSnapshot(doc(db, "tenants", "demo_id"), (docSnap) => {
      if (docSnap.exists()) setTenantData(docSnap.data());
    });
    return () => unsub();
  }, []);

  const displayTenantName = tenantData?.orgName || tenantData?.name || "CARE DESIGN WORKS";

  // 📸 メイン写真選択
  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setMainImage(URL.createObjectURL(file));
  };

  // 📸 スナップ写真選択
  const handleSnapImageChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newSnaps = [...snaps];
      newSnaps[idx].image = URL.createObjectURL(file);
      setSnaps(newSnaps);
    }
  };

  // ➕ スナップ写真を追加（最大10枚制限だばい）
  const addSnap = () => {
    if (snaps.length >= 10) {
      alert("写真は最大10枚までだっぺ！");
      return;
    }
    setSnaps([...snaps, { id: Date.now(), title: '', comment: '', image: null }]);
  };

  // 🗑️ スナップ写真を削除
  const removeSnap = (idx: number) => {
    const newSnaps = snaps.filter((_, i) => i !== idx);
    setSnaps(newSnaps);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-100 font-sans text-slate-900">
      
      {/* 🛠️ 左側：入力フォーム（BANTARO Studio） */}
      <div className="w-full lg:w-1/2 p-6 lg:p-10 border-r border-slate-200 overflow-y-auto bg-white shadow-inner">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic flex items-center gap-2">
              <span className="text-blue-600">BANTARO</span> 
              <span className="text-slate-400 text-xl font-bold not-italic">Studio</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-[0.2em]">High-Quality Newsletter Creator</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full text-[10px] font-black shadow-sm border border-emerald-100">
            <Sparkles size={12} /> PREMIUM SUBSCRIBER
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
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold shadow-inner" placeholder="受信箱で最初に目にする文字だばい" />
            </div>
          </section>

          {/* 02. メインビジュアル */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">02</div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">メインビジュアル</h3>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <label className="relative w-full h-56 bg-white rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition-all overflow-hidden group shadow-inner">
                {mainImage ? (
                  <img src={mainImage} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="text-center">
                    <Camera className="text-slate-300 group-hover:text-blue-500 mb-2 mx-auto" size={40} />
                    <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">メイン写真を選択</span>
                  </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleMainImageChange} />
              </label>
              <input type="text" placeholder="記事の大きな見出し" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black outline-none shadow-sm" />
              <textarea rows={4} placeholder="心温まるメッセージを記入してくんちぇ..." value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm leading-relaxed outline-none resize-none shadow-sm" />
            </div>
          </section>

          {/* 03. スナップ写真（ここが10枚対応だぞい！） */}
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
                  {/* 削除ボタン */}
                  <button onClick={() => removeSnap(idx)} className="absolute -top-2 -right-2 bg-white text-red-500 p-2 rounded-full shadow-lg border border-slate-100 hover:bg-red-50 transition-colors z-10">
                    <Trash2 size={16} />
                  </button>

                  <label className="w-full aspect-square bg-white rounded-2xl border border-dashed border-slate-300 flex items-center justify-center mb-4 cursor-pointer overflow-hidden shadow-inner hover:border-blue-400 transition-all">
                    {snap.image ? (
                      <img src={snap.image} className="w-full h-full object-cover" alt="Snap" />
                    ) : (
                      <div className="text-center">
                        <Camera size={24} className="text-slate-300 mb-1 mx-auto" />
                        <span className="text-[10px] font-bold text-slate-400">SNAP {idx + 1}</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSnapImageChange(idx, e)} />
                  </label>
                  <input type="text" placeholder="写真のタイトル" value={snap.title} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].title = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-black mb-2 outline-none shadow-sm" />
                  <textarea placeholder="短い説明文..." value={snap.comment} onChange={(e) => {
                    const newSnaps = [...snaps];
                    newSnaps[idx].comment = e.target.value;
                    setSnaps(newSnaps);
                  }} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[10px] leading-relaxed outline-none resize-none shadow-sm" rows={2} />
                </div>
              ))}

              {/* 追加ボタン */}
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

          <button className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 hover:bg-blue-600 shadow-2xl shadow-blue-200 transition-all active:scale-[0.98] group">
            <Send size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
            一斉配信を開始するだばい！
          </button>
        </div>
      </div>

      {/* 📱 右側：リアルタイム・メールプレビュー */}
      <div className="w-full lg:w-1/2 p-4 lg:p-12 flex justify-center items-start bg-slate-200 overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-[600px] bg-white shadow-2xl min-h-screen lg:min-h-0 lg:rounded-[3rem] overflow-hidden border border-slate-300 animate-in slide-in-from-right duration-500">
          
          {/* Email Header */}
          <div className="bg-[#1e293b] p-12 text-center border-b-[10px] border-blue-500">
             <div className="text-white font-black text-2xl tracking-[0.4em] uppercase">{displayTenantName}</div>
             <div className="text-blue-400 text-[10px] font-black mt-4 tracking-[0.5em] opacity-80 uppercase">Official Digital Newsletter</div>
          </div>

          {/* Email Main Visual */}
          <div className="w-full aspect-[16/9] bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
            {mainImage ? (
              <img src={mainImage} className="w-full h-full object-cover" alt="Main" />
            ) : (
              <div className="flex flex-col items-center text-slate-300">
                <Camera size={48} strokeWidth={1} />
                <span className="text-xs italic font-bold mt-2 tracking-widest uppercase">Main Visual Area</span>
              </div>
            )}
          </div>

          {/* Email Body Text */}
          <div className="p-12">
            <h2 className="text-4xl font-black text-slate-800 mb-8 leading-[1.2] tracking-tight">{mainTitle}</h2>
            <div className="text-xl text-slate-600 leading-relaxed whitespace-pre-wrap border-l-[12px] border-blue-500 pl-8 py-4 bg-slate-50 rounded-r-2xl">
              {mainMessage}
            </div>
          </div>

          {/* Email Snaps (10枚までニョキニョキ伸びるっぺ！) */}
          <div className="px-12 pb-12 space-y-16">
            {snaps.map((snap, idx) => (
              <div key={idx} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-full aspect-square bg-slate-50 rounded-[3rem] overflow-hidden border border-slate-100 shadow-inner flex items-center justify-center">
                  {snap.image ? (
                    <img src={snap.image} className="w-full h-full object-cover" alt="Snap" />
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
          
          {/* Email Footer SNS */}
          <div className="bg-slate-50 py-16 px-12 text-center border-t border-slate-100">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mb-10">Follow our journey</p>
            <div className="flex justify-center gap-8">
              {[Instagram, MessageCircle, Facebook, Link].map((Icon, i) => (
                <div key={i} className="w-16 h-16 rounded-[1.5rem] bg-white shadow-lg flex items-center justify-center text-slate-400 border border-slate-100 hover:text-blue-500 hover:shadow-blue-100 transition-all cursor-pointer">
                  <Icon size={28} />
                </div>
              ))}
            </div>
          </div>

          {/* Email Final Footer */}
          <div className="bg-slate-900 p-16 text-center text-white/40">
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