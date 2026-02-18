import React from "react";

export default function LegalPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 font-sans text-slate-800">
      <h1 className="text-3xl font-black mb-8 border-b pb-4">特定商取引法に基づく表記</h1>
      
      <div className="space-y-6">
        <div className="grid md:grid-cols-4 gap-4 border-b border-slate-100 pb-6">
          <div className="font-bold text-slate-500">販売業者</div>
          <div className="md:col-span-3">株式会社はなひろ CARE DESIGN WORKS事業部</div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 border-b border-slate-100 pb-6">
          <div className="font-bold text-slate-500">運営統括責任者</div>
          <div className="md:col-span-3">（代表者名または責任者名）</div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 border-b border-slate-100 pb-6">
          <div className="font-bold text-slate-500">所在地</div>
          <div className="md:col-span-3">（会社の住所を入れてください）</div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 border-b border-slate-100 pb-6">
          <div className="font-bold text-slate-500">お問い合わせ</div>
          <div className="md:col-span-3">info@example.com / 03-xxxx-xxxx</div>
        </div>

        <div className="grid md:grid-cols-4 gap-4 border-b border-slate-100 pb-6">
          <div className="font-bold text-slate-500">販売価格</div>
          <div className="md:col-span-3">サービスサイト上の料金プランページに記載</div>
        </div>
      </div>
    </div>
  );
}