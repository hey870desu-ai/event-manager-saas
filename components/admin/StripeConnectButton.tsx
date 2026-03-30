// 📂 components/admin/StripeConnectButton.tsx
'use client';

import React, { useState } from 'react';
import { CheckCircle2, ExternalLink, CreditCard, FileText, Building2, Landmark, Shield, Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

type LegalInfo = {
  companyName?: string;
  representative?: string;
  address?: string;
  phone?: string;
  email?: string;
};

type Props = {
  tenantId: string;
  isConnected?: boolean;
  legalPageUrl?: string;
  legalInfo?: LegalInfo;
};

const REQUIRED_FIELDS = [
  { key: 'companyName' as const, label: '事業者名' },
  { key: 'representative' as const, label: '代表者名' },
  { key: 'address' as const, label: '所在地' },
  { key: 'phone' as const, label: '電話番号' },
  { key: 'email' as const, label: 'メールアドレス' },
];

export default function StripeConnectButton({ tenantId, isConnected, legalPageUrl, legalInfo }: Props) {
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

  // 必須項目の入力チェック
  const missingFields = REQUIRED_FIELDS.filter(f => !legalInfo?.[f.key]?.trim());
  const isReady = missingFields.length === 0;

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
      {/* 未入力項目がある場合の警告 */}
      {!isReady && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-2.5 mb-2">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5"/>
            <p className="text-xs font-bold text-amber-300">Stripe連携の前に、特商法情報を入力してください</p>
          </div>
          <div className="ml-6 space-y-1">
            {missingFields.map((f, idx) => (
              <p key={idx} className="text-[10px] text-amber-400/80 flex items-center gap-1.5">
                <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
                {f.label}が未入力です
              </p>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2 ml-6">
            上の「法人・特商法情報」セクションで入力し、保存してください。
          </p>
        </div>
      )}

      {/* メインボタン */}
      <button
        onClick={handleConnect}
        disabled={!isReady}
        className={`w-full font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
          isReady
            ? 'bg-[#635BFF] hover:bg-[#5851df] text-white shadow-[#635BFF]/20 active:scale-95'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
        }`}
      >
        <CreditCard size={18}/>
        Stripeアカウントを連携する
        {isReady && <ExternalLink size={14} className="opacity-60"/>}
      </button>

      {isReady && (
        <p className="text-[10px] text-slate-500 text-center">
          Stripeの画面に移動します（約5〜10分で完了）
        </p>
      )}

      {/* 入力済みチェックリスト */}
      <div className="flex flex-wrap gap-2 justify-center">
        {REQUIRED_FIELDS.map((f, idx) => {
          const filled = !!legalInfo?.[f.key]?.trim();
          return (
            <span key={idx} className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${
              filled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
            }`}>
              {filled ? <Check size={10}/> : <span className="w-2.5 h-2.5 rounded-full border border-slate-600"></span>}
              {f.label}
            </span>
          );
        })}
      </div>

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
