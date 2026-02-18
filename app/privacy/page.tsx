import React from "react";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20 font-sans text-slate-800">
      <h1 className="text-3xl font-black mb-8 border-b pb-4">プライバシーポリシー</h1>
      <div className="prose prose-slate max-w-none">
        <p className="mb-4">株式会社はなひろ（以下，「当社」といいます。）は，本ウェブサイト上で提供するサービスにおける，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。</p>
        
        <h2 className="text-xl font-bold mt-8 mb-4">1. 個人情報の収集方法</h2>
        <p>当社は，ユーザーが利用登録をする際に氏名，メールアドレスなどの個人情報をお尋ねすることがあります。</p>

        {/* 必要に応じて条文を追加してください */}
        <p className="mt-8 text-slate-400 text-sm">※ここに正式なポリシーを入れてください。</p>
      </div>
    </div>
  );
}