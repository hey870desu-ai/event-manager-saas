"use client";

import { Calendar, MapPin, Clock, User, ArrowRight, Share2 } from "lucide-react";
import ReservationForm from "@/components/ReservationForm"; 

type Props = {
  event: any;
  tenant: any;
};

export default function LightTheme({ event, tenant }: Props) {
  // アクセントカラー（イベントに合わせて変えられるように、あるいは固定で）
  const accentColor = "text-indigo-600";
  const buttonColor = "bg-indigo-600 hover:bg-indigo-700";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* ヘッダーエリア（白背景でスッキリ） */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-lg tracking-tight text-slate-900">{tenant.name}</div>
          <a href="#reservation-form" className={`px-4 py-2 rounded-full text-white text-sm font-bold shadow-md transition-all ${buttonColor}`}>
            申し込む
          </a>
        </div>
      </header>

      {/* メインビジュアルエリア */}
      <div className="bg-white pb-12 pt-8 md:pt-16">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="order-2 md:order-1">
             <div className="flex gap-2 mb-4">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">Event</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200">{event.branchTag || "本部"}</span>
             </div>
             <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight mb-6">
               {event.title}
             </h1>
             <div className="space-y-3 text-slate-600">
               <div className="flex items-center gap-3">
                 <Calendar className="text-indigo-500" size={20}/>
                 <span className="font-bold text-lg">{event.date}</span>
               </div>
               <div className="flex items-center gap-3">
                 <Clock className="text-indigo-500" size={20}/>
                 <span>{event.startTime} - {event.endTime}</span>
               </div>
               <div className="flex items-center gap-3">
                 <MapPin className="text-indigo-500" size={20}/>
                 <span>{event.venueName || "オンライン開催"}</span>
               </div>
             </div>
          </div>
          
          <div className="order-1 md:order-2">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-100 aspect-video relative bg-slate-100">
               {event.ogpImage ? (
                 <img src={event.ogpImage} alt="Event" className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                   <span className="font-bold text-2xl">No Image</span>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* 左カラム：イベント詳細 */}
        <div className="lg:col-span-2 space-y-12">
           {/* 概要 */}
           <section>
             <h2 className="text-2xl font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">イベント概要</h2>
             <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
               {event.content}
             </div>
           </section>

           {/* 講師情報 */}
           {event.lecturer && (
             <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
               <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <User className="text-indigo-500"/> 講師紹介
               </h2>
               <div className="flex flex-col md:flex-row gap-6">
                 {event.lecturerImage && (
                   <img src={event.lecturerImage} className="w-24 h-24 rounded-full object-cover border-2 border-slate-100 shadow-sm" alt={event.lecturer}/>
                 )}
                 <div>
                   <p className="text-sm text-indigo-600 font-bold mb-1">{event.lecturerTitle}</p>
                   <p className="text-lg font-bold text-slate-900 mb-2">{event.lecturer}</p>
                   <p className="text-sm text-slate-600">{event.lecturerProfile}</p>
                 </div>
               </div>
             </section>
           )}

           {/* アクセス */}
           <section>
             <h2 className="text-xl font-bold text-slate-900 mb-4">アクセス</h2>
             <div className="bg-slate-100 p-4 rounded-xl text-slate-600 text-sm">
               <p className="font-bold mb-1">{event.venueName}</p>
               <p>{event.venueAddress}</p>
               <p className="mt-2 text-xs text-slate-500">{event.venueAccess}</p>
             </div>
           </section>
        </div>

        {/* 右カラム：申し込みフォーム (追従型) */}
        <div className="lg:col-span-1">
           <div className="sticky top-24">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" id="reservation-form">
                 <div className="bg-indigo-600 p-4 text-center">
                    <h3 className="text-white font-bold text-lg">参加申し込み</h3>
                    <p className="text-indigo-100 text-xs">以下のフォームよりご登録ください</p>
                 </div>
                 <div className="p-1">
                    {/* 既存のフォームコンポーネントを流用。
                        ※注意: ReservationForm側が「黒背景前提」の色指定をしている場合、
                        文字が見にくくなる可能性があります。その場合はフォーム側の調整も必要ですが、
                        まずはこの状態でつないでみましょう。
                    */}
                    <ReservationForm event={event} tenant={tenant as any} />
                 </div>
              </div>
              
              <div className="mt-6 text-center">
                 <p className="text-slate-400 text-xs">
                   主催: {tenant.name} {event.branchTag}<br/>
                   お問い合わせ: info@example.com
                 </p>
              </div>
           </div>
        </div>

      </main>
      
      <footer className="bg-slate-50 border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
         © {new Date().getFullYear()} {tenant.name}. All rights reserved.
      </footer>
    </div>
  );
}