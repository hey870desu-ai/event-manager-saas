// 📂 components/admin/StripeConnectButton.tsx
'use client';

import React from 'react';

type Props = {
  tenantId: string;
  isConnected?: boolean; // すでに連携済みかどうかのフラグ
};

export default function StripeConnectButton({ tenantId, isConnected }: Props) {
  
  const handleConnect = () => {
    // さっき作ったAPIへGo！
    window.location.href = `/api/stripe/connect?tenantId=${tenantId}`;
  };

  if (isConnected) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
        <div className="bg-green-100 p-2 rounded-full">
          ✅
        </div>
        <div>
          <p className="text-green-800 font-bold">Stripe連携済み</p>
          <p className="text-xs text-green-600">有料チケットの販売が可能です</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-bold text-gray-800 mb-2">決済機能の有効化</h3>
      <p className="text-sm text-gray-600 mb-4">
        有料イベントを開催するには、Stripeアカウントとの連携が必要です。
      </p>
      
      <button
        onClick={handleConnect}
        className="bg-[#635BFF] hover:bg-[#5851df] text-white font-bold py-2 px-6 rounded-full transition shadow-md flex items-center gap-2"
      >
        <span>Stripeと連携する</span>
        {/* Stripeロゴっぽいアイコン（省略可） */}
        <svg viewBox="0 0 32 32" className="w-4 h-4 fill-current opacity-80">
          <path d="M10 32c-5.523 0-10-4.477-10-10s4.477-10 10-10c5.523 0 10 4.477 10 10s-4.477 10-10 10z" />
        </svg>
      </button>
    </div>
  );
}