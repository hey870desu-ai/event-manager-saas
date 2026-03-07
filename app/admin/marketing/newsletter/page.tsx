import React, { useState } from 'react';
import { Camera, Send, Facebook, Instagram, MessageCircle, Link, Info } from 'lucide-react';

export default function NewsletterStudio() {
  // 🏆 テナント名は本来、ログイン情報から引っ張るげっちょ、一旦変数にしておくっぺ
  const tenantName = "ケアデザインワークス"; 
  
  const [subject, setSubject] = useState(`【${tenantName}】3月のデジタル広報誌`);
  const [mainTitle, setMainTitle] = useState('春が来ました！お花見レクの様子');
  const [message, setMessage] = useState('皆様いかがお過ごしでしょうか。今月は中庭で賑やかにお花見を楽しみました...');

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* 🛠️ 左側：入力フォーム（ここはシステム「絆太郎」のUIだっぺ！） */}
      <div className="w-full lg:w-1/2 p-6 border-r border-slate-200 overflow-y-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-blue-600 tracking-tighter">絆太郎 <span className="text-slate-400 text-lg font-bold">リッチメール</span></h1>
            <p className="text-xs text-slate-500 font-medium mt-1">営業ツール・プレミアムプラン提供機能</p>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black shadow-lg shadow-blue-200">
            SUBSCRIPTION ACTIVE
          </div>
        </div>

        <div className="space-y-6">
          {/* メールの基本情報 */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <Info size={16} className="text-blue-500" /> メールの件名
            </label>
            <input 
              type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </section>

          {/* メイン写真 */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="text-sm font-bold text-slate-700 mb-3 block">メインビジュアル ＆ 見出し</label>
            <div className="w-full h-40 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all mb-4 group">
              <Camera className="text-slate-300 group-hover:text-blue-500 mb-2 transition-colors" size={32} />
              <span className="text-xs text-slate-400 group-hover:text-blue-600 font-bold">写真をアップロード</span>
            </div>
            <input 
              type="text" placeholder="大きな見出しタイトル" value={mainTitle} onChange={(e) => setMainTitle(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            />
          </section>

          {/* 本文エリア */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <label className="text-sm font-bold text-slate-700 mb-3 block">スタッフからのメッセージ</label>
            <textarea 
              rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed"
            />
          </section>

          <button className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-[0.98]">
            <Send size={24} /> 配信を開始する
          </button>
        </div>
      </div>

      {/* 📱 右側：リアルタイムプレビュー（ここは「テナントさんのメール」だっぺ！） */}
      <div className="hidden lg:flex w-1/2 p-8 justify-center bg-slate-200 overflow-y-auto">
        <div className="w-[375px] h-fit min-h-[700px] bg-white shadow-2xl rounded-[48px] border-[10px] border-slate-900 overflow-hidden relative">
          
          {/* メールヘッダー */}
          <div className="bg-[#1e293b] p-6 text-center border-b-4 border-blue-500">
             <div className="text-white font-black text-sm tracking-widest uppercase">{tenantName}</div>
             <div className="text-blue-400 text-[10px] font-bold mt-1 tracking-tighter opacity-80">DIGITAL NEWSLETTER</div>
          </div>

          {/* メールコンテンツ */}
          <div className="p-6">
            <h2 className="text-xl font-black text-slate-800 mb-4 leading-tight">{mainTitle}</h2>
            <div className="w-full aspect-[4/3] bg-slate-100 rounded-2xl mb-6 flex items-center justify-center text-slate-300 italic text-sm">
              Photo Placeholder
            </div>
            <div className="text-[15px] text-slate-600 leading-relaxed mb-8 whitespace-pre-wrap">
              {message}
            </div>
            
            {/* 🏆 SNSボタンセクションだっぺ！ */}
            <div className="border-t border-slate-100 pt-8 pb-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Follow our SNS</p>
              <div className="flex justify-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Instagram size={18} /></div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><MessageCircle size={18} /></div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Facebook size={18} /></div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><Link size={18} /></div>
              </div>
            </div>
          </div>

          {/* メールフッター */}
          <div className="bg-slate-50 p-8 text-center border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
              このメールは {tenantName} より、<br />大切なご家族様へお届けしています。
            </p>
            <p className="mt-4 text-[9px] font-bold text-slate-300 tracking-widest">
              © {new Date().getFullYear()} {tenantName.toUpperCase()}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}