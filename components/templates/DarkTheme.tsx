"use client";

import { useState } from "react";
import { Calendar, MapPin, Clock, User, ArrowRight, Share2, CheckCircle, AlertTriangle } from "lucide-react";
// 必要なコンポーネントがあればインポートしてください (ReservationFormなど)
import ReservationForm from "@/components/ReservationForm"; 

type Props = {
  event: any;
  tenant: any;
};

export default function DarkTheme({ event, tenant }: Props) {
  // ★ここに、元の page.tsx に書いてあった「デザイン部分（returnの中身）」を移植します
  // 基本的には今の公開ページと同じコードですが、受け皿として用意しました。

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* ここに、現在の app/t/[tenant]/e/[event]/page.tsx の
         return ( ... ) の中身を丸ごとコピーして貼り付けてください！
         
         ※ただし、 reservationForm の部分は、以下のように props を渡す必要があります
      */}
      
      {/* 修正例: ヘッダー画像など */}
      <div className="relative w-full h-[40vh] min-h-[300px] lg:h-[50vh] overflow-hidden">
         {/* ... (既存の画像コード) ... */}
         {event.ogpImage ? (
           <img src={event.ogpImage} className="w-full h-full object-cover opacity-60" alt="Cover" />
         ) : (
           <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />
      </div>

      <main className="max-w-4xl mx-auto px-4 -mt-32 relative z-10 pb-20">
         {/* ... (タイトルや日時などの既存コード) ... */}
         <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-10 shadow-2xl mb-8">
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">{event.title}</h1>
            {/* ... */}
         </div>

         {/* ... (本文など) ... */}

         {/* 申し込みフォーム */}
         <div id="reservation-form" className="scroll-mt-24">
            <ReservationForm event={event} tenant={tenant as any} />
         </div>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-12 text-center">
        <p className="text-slate-500 text-sm">© {tenant.name} All rights reserved.</p>
      </footer>
    </div>
  );
}