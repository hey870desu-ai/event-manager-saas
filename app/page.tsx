import Link from "next/link";
import { Settings, Activity, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-6">
      
      {/* ヒーローセクション（製品紹介） */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-6">
        <div className="inline-block animate-pulse">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-4 py-2 rounded-full border border-indigo-500/30">
            Event Management System v1.0
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Event Manager
        </h1>
        <p className="text-slate-400 text-xl leading-relaxed">
          セミナー、勉強会、大規模カンファレンスまで。<br/>
          あらゆる組織のための、スマートなイベント管理プラットフォーム。
        </p>
      </div>

      {/* 機能カード（どんなことができるかアピール） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-16">
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <Activity className="w-8 h-8 text-blue-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">リアルタイム集計</h3>
          <p className="text-slate-400 text-sm">申し込み状況を瞬時に把握。定員管理も自動化。</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <Users className="w-8 h-8 text-pink-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">顧客管理 (CRM)</h3>
          <p className="text-slate-400 text-sm">参加者データを安全に蓄積し、CSVで簡単エクスポート。</p>
        </div>
        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <Settings className="w-8 h-8 text-emerald-400 mb-4" />
          <h3 className="text-lg font-bold mb-2">簡単セットアップ</h3>
          <p className="text-slate-400 text-sm">専門知識不要。フォーム作成から公開までわずか3分。</p>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Link 
          href="/admin" 
          className="flex-1 bg-white text-slate-900 hover:bg-slate-200 font-bold py-4 px-8 rounded-xl flex items-center justify-center transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          管理画面にログイン
        </Link>
        <button disabled className="flex-1 bg-slate-800 text-slate-500 border border-slate-700 py-4 px-8 rounded-xl cursor-not-allowed">
          新規アカウント作成
        </button>
      </div>

      <footer className="mt-20 border-t border-slate-800 pt-8 w-full max-w-5xl text-center text-slate-600 text-sm flex justify-between">
        <p>© 2026 Event Manager Inc.</p>
        <p>Developed for Universal Use</p>
      </footer>
    </div>
  );
}