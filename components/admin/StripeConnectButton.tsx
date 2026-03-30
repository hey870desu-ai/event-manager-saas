// 📂 components/admin/StripeConnectButton.tsx
'use client';

import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, CreditCard, FileText, Building2, Landmark, Shield, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  tenantId: string;
  isConnected?: boolean;
  legalPageUrl?: string;
};

export default function StripeConnectButton({ tenantId, isConnected, legalPageUrl }: Props) {
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    window.location.href = `/api/stripe/connect?tenantId=${tenantId}`;
  };

  const handleCopyUrl = () => {
    if (legalPageUrl) {
      navigator.clipboard.writeText(legalPageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected) {
    return (
      <div className="p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center gap-3">
        <div className="bg-emerald-500/20 p-2 rounded-full">
          <CheckCircle2 size={20} className="text-emerald-400"/>
        </div>
        <div>
          <p className="text-emerald-400 font-bold text-sm">Stripe連携済み</p>
          <p className="text-[10px] text-slate-400">有料チケットの販売が可能です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* メインボタン */}
      <button
        onClick={handleConnect}
        className="w-full bg-[#635BFF] hover:bg-[#5851df] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-[#635BFF]/20 flex items-center justify-center gap-2 active:scale-95"
      >
        <CreditCard size={18}/>
        Stripeアカウントを連携する
        <ExternalLink size={14} className="opacity-60"/>
      </button>

      <p className="text-[10px] text-slate-500 text-center">
        Stripeの画面に移動します（約5〜10分で完了）
      </p>

      {/* 準備ガイド */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full flex items-center justify-between text-xs text-indigo-400 hover:text-indigo-300 font-bold py-2 px-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 transition-all"
      >
        <span>連携前に準備するもの</span>
        {showGuide ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
      </button>

      {showGuide && (
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] text-slate-400 mb-2">Stripeの登録画面で以下の情報を入力します。事前にご準備ください。</p>

          <div className="space-y-2.5">
            {[
              { icon: <FileText size={14}/>, title: "本人確認書類", desc: "運転免許証・マイナンバーカード等（写真をアップロード）" },
              { icon: <Building2 size={14}/>, title: "事業情報", desc: "事業者名・住所・電話番号（特商法ページに登録した内容でOK）" },
              { icon: <Landmark size={14}/>, title: "銀行口座情報", desc: "売上の振込先となる口座（普通預金）" },
              { icon: <Shield size={14}/>, title: "ウェブサイトURL", desc: "下の特商法ページURLをコピーして貼り付けてください" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <div className="p-1.5 bg-slate-800 rounded-lg text-indigo-400 flex-shrink-0 mt-0.5">{item.icon}</div>
                <div>
                  <p className="text-xs font-bold text-slate-300">{item.title}</p>
                  <p className="text-[10px] text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 特商法ページURL */}
          {legalPageUrl && (
            <div className="mt-3 pt-3 border-t border-slate-800">
              <p className="text-[10px] text-slate-400 mb-2 font-bold">Stripe審査で使うURL（コピーしてください）</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={legalPageUrl}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-[10px] text-slate-300 font-mono"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`p-2 rounded-lg transition-all text-xs font-bold flex items-center gap-1 ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-400'}`}
                >
                  {copied ? <><Check size={14}/> OK</> : <><Copy size={14}/> コピー</>}
                </button>
              </div>
            </div>
          )}

          <div className="bg-indigo-500/10 rounded-lg p-3 mt-2">
            <p className="text-[10px] text-indigo-300 leading-relaxed">
              <strong>Stripeアカウントは無料</strong>で作成できます。審査には通常1〜2営業日かかりますが、情報が正確であれば即日承認されることもあります。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
