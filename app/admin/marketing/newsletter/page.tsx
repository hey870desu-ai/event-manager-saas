"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Send, Instagram, MessageCircle, Facebook, Link, PlusCircle, Trash2, ChevronDown } from 'lucide-react';
import { doc, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function NewsletterStudio() {
  // 🏆 テナント情報を保持するState
  const [tenantData, setTenantData] = useState<any>(null);
  
  // 🏆 編集用のState（写真は最大5枚まで想定）
  const [subject, setSubject] = useState('【絆レター】最新号をお届けします');
  const [mainTitle, setMainTitle] = useState('今月のトピックス');
  const [mainMessage, setMainMessage] = useState('いつも大変お世話になっております。今月の活動報告をお届けいたします。');
  
  // スナップ写真とコメントのセット（4枚分）
  const [snaps, setSnaps] = useState([
    { id: 1, title: '日常の風景', comment: 'スタッフと一緒に撮影しました。' },
    { id: 2, title: '季節のイベント', comment: '綺麗な花が咲いていました。' },
  ]);

  // ログインユーザーのテナント情報を取得（本番用ロジック）
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // テナント名・SNS情報をFirestoreから監視するっぺ
    const unsub = onSnapshot(doc(db, "tenants", "ケアデザインワークス等のID"), (docSnap) => {
      if (docSnap.exists()) {
        setTenantData(docSnap.data());
      }
    });
    return () => unsub();
  }, []);

  // 汎用のテナント名表示（データがなければ「絆太郎」を出すぞい）
  const displayTenantName = tenantData?.orgName || tenantData?.name || "CARE DESIGN WORKS";

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      
      {/* 🛠️ 左側：入力フォーム（絆太郎 システムUI） */}
      <div className="w-full lg:w-1/2 p-6 border-r border-slate-200 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter italic">KIZUNAJIRO <span className="text-slate-400 text-lg font-bold not-italic">Marketing Studio</span></h1>
        </div>

        <div className="space-y-8 pb-20">
          {/* 基本設定 */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="h-px w-4 bg-slate-300"></div> 基本設定
            </h3>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <label className="block text-xs font-bold text-slate-500 mb-2">メールの件名（受信箱に表示）</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
            </div>
          </section>

          {/* メインセクション */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="h-px w-4 bg-slate-300"></div> メインビジュアル
            </h3>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="w-full h-48 bg-slate-100 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center mb-4 group cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all">
                <Camera className="text-slate-300 group-hover:text-blue-500 mb-2" size={32} />
                <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">メイン写真をアップロード</span>
              </div>
              <input type="text" placeholder="メインの見出し" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold mb-3 outline-none" />
              <textarea rows={4} placeholder="導入の文章..." value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed outline-none resize-none" />
            </div>
          </section>

          {/* 追加スナップ（最大4枚まで増やせる） */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <div className="h-px w-4 bg-slate-300"></div> 追加スナップ写真（最大4枚）
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {snaps.map((snap, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group">
                  <button className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12}/></button>
                  <div className="w-full aspect-video bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center mb-3">
                    <Camera size={20} className="text-slate-300" />
                  </div>
                  <input type="text" placeholder="写真のタイトル" value={snap.title} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold mb-2 outline-none" />
                  <textarea placeholder="説明文..." value={snap.comment} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] leading-relaxed outline-none resize-none" />
                </div>
              ))}
              {snaps.length < 4 && (
                <button 
                  onClick={() => setSnaps([...snaps, { id: Date.now(), title: '', comment: '' }])}
                  className="h-full min-h-[150px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50 transition-all gap-2"
                >
                  <PlusCircle size={24} />
                  <span className="text-xs font-bold">写真を追加する</span>
                </button>
              )}
            </div>
          </section>

          <div className="pt-6">
            <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]">
              <Send size={24} /> この内容で一斉配信する
            </button>
          </div>
        </div>
      </div>

      {/* 📱 右側：リアルタイムプレビュー（メールクライアントの見た目） */}
      <div className="hidden lg:flex w-1/2 p-8 justify-center bg-slate-200 overflow-y-auto custom-scrollbar">
        <div className="w-[400px] h-fit bg-white shadow-2xl rounded-[48px] border-[12px] border-slate-900 overflow-hidden relative mb-20">
          
          {/* 💌 メールヘッダー：英語名もそのまま対応だっぺ！ */}
          <div className="bg-[#1e293b] p-8 text-center border-b-4 border-blue-500">
             <div className="text-white font-black text-base tracking-[0.2em] uppercase">{displayTenantName}</div>
             <div className="text-blue-400 text-[10px] font-bold mt-2 tracking-[0.3em] opacity-80">DIGITAL NEWSLETTER</div>
          </div>

          {/* 💌 メールコンテンツ */}
          <div className="p-0">
            {/* メイン */}
            <div className="w-full aspect-[16/9] bg-slate-100 flex items-center justify-center text-slate-300 italic text-sm">
              Main Visual Image
            </div>
            <div className="p-8">
              <h2 className="text-2xl font-black text-slate-800 mb-4 leading-tight">{mainTitle}</h2>
              <div className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-wrap border-l-4 border-blue-500 pl-4 py-1">
                {mainMessage}
              </div>
            </div>

            {/* スナップ写真セクション（ここで縦にスクロールさせるっぺ！） */}
            <div className="px-8 pb-8 space-y-8">
              {snaps.map((snap, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="w-full aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 flex items-center justify-center text-slate-300">
                    Snap Photo {idx + 1}
                  </div>
                  <div className="px-2">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">■ {snap.title || '（タイトル未設定）'}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed italic">{snap.comment || '（コメント未設定）'}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* SNSセクション */}
            <div className="bg-slate-50 py-10 px-8 text-center border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Connect with us</p>
              <div className="flex justify-center gap-5">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 border border-slate-100"><Instagram size={20} /></div>
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 border border-slate-100"><MessageCircle size={20} /></div>
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 border border-slate-100"><Facebook size={20} /></div>
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 border border-slate-100"><Link size={20} /></div>
              </div>
            </div>
          </div>

          {/* 💌 メールフッター：ここを汎用的にしたぞい！ */}
          <div className="bg-slate-900 p-10 text-center">
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed mb-6">
              このメールは {displayTenantName} より<br />
              大切なお客様へお届けしています。
            </p>
            <div className="w-8 h-1 bg-blue-500 mx-auto mb-6"></div>
            <p className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">
              © {new Date().getFullYear()} {displayTenantName}
            </p>
          </div>

        </div>
      </div>
      
      {/* スマホ用プレビューボタン（画面が小さい時だけ出るっぺ） */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[100]">
        <button className="bg-slate-900 text-white p-4 rounded-full shadow-2xl flex items-center gap-2 font-bold text-sm">
          <Eye size={20} /> プレビュー
        </button>
      </div>

    </div>
  );
}

// 👁️ プレビュー用アイコン
function Eye(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
}