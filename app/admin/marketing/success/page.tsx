"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, Rocket, ArrowRight, Heart } from "lucide-react";
import confetti from "canvas-confetti"; // 💡 もし入ってなければ npm install canvas-confetti

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // 🎊 お祝いの紙吹雪を飛ばすっぺ！
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f111a] flex items-center justify-center px-4 overflow-hidden">
      {/* 背景の装飾 */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/20 rounded-full blur-[120px]" />

      <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl text-center relative z-10 shadow-2xl">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500/20 rounded-full mb-6">
          <CheckCircle2 className="text-emerald-400" size={40} />
        </div>

        <h1 className="text-2xl font-black text-white mb-3 tracking-tight">
    アップグレードが完了しました
  </h1>
  <p className="text-slate-400 mb-8 leading-relaxed text-sm">
    この度はスタンダードプランへのお申し込み、<br />
    誠にありがとうございます。<br />
    全てのスタンダード機能をご利用いただけるようになりました。<br />
    引き続き「絆太郎」をよろしくお願いいたします。
  </p>

        <div className="space-y-4 mb-8">
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4 text-left">
            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">利用可能プラン</p>
              <p className="text-white font-bold">スタンダードプラン</p>
            </div>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4 text-left">
            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
              <Rocket size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase">ステータス</p>
              <p className="text-white font-bold">全ての機能が解放されました</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push("/admin/marketing")}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 group"
        >
          管理画面へ戻る
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-600 text-xs font-bold">
          <Heart size={14} className="text-pink-500/50" />
          <span>絆太郎 - Bantaro Project</span>
        </div>
      </div>
    </div>
  );
}