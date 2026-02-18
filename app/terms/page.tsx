import React from "react";

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 font-sans text-slate-800">
      <h1 className="text-3xl font-black mb-8 border-b pb-4">利用規約</h1>
      <div className="prose prose-slate max-w-none">
        <p className="text-sm text-slate-500 mb-8">最終更新日: 2026年2月1日</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4">第1条（適用）</h2>
        <p>この利用規約（以下，「本規約」といいます。）は，株式会社はなひろ（以下，「当社」といいます。）が提供するサービス（以下，「本サービス」といいます。）の利用条件を定めるものです。</p>

        {/* 必要に応じて条文を追加してください */}
        <p className="mt-8 text-slate-400 text-sm">※ここに正式な規約文章を入れてください。</p>
      </div>
    </div>
  );
}