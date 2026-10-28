// 📂 components/guide/GuideShots.tsx
// 📝 役割：使い方のページの写真（public/guide/*.webp）を、パソコンの画面・切り抜き・スマホの枠で出す部品
//   公開の使い方（/guide）と、管理画面の「参加費の受け取り方」（/admin/guide/payments）で同じものを使う
//   写真は手元で、架空の主催者「ひだまりケア勉強会（見本）」と架空の参加者のデータで撮った
import type { ReactNode } from "react";

// 写真の大きさ（幅・高さ）。public/guide にある WebP と同じ
const IMG: Record<string, [number, number]> = {
  "admin-top": [1600, 1075], "event-card": [1600, 375],
  "theme-medical": [600, 1298], "theme-pop": [600, 1298], "theme-editorial": [600, 1298], "theme-nature": [600, 1298],
  "editor-theme": [1600, 1337], "editor-questions": [1600, 1321], "apply-form": [600, 1808],
  "editor-tickets": [1600, 1411], "editor-cancel": [1200, 421], "flyer": [1200, 1693],
  "apply-complete": [600, 1542], "editor-mail": [1600, 1166], "participants": [1600, 1125],
  "editor-presurvey": [1600, 773], "presurvey": [600, 1298], "mail-send": [1600, 1125],
  "checkin": [600, 1298], "survey-qr": [816, 1228], "survey": [600, 1789], "survey-results": [1600, 1125],
  "report-top": [1400, 1518], "report-survey": [1400, 1096], "kizuna-list": [1600, 1188],
  "newsletter": [1600, 1375], "card-scan": [600, 1298], "analytics": [1600, 1125], "staff": [900, 1554],
};

export function Img({ name, alt, className = "" }: { name: string; alt: string; className?: string }) {
  const [w, h] = IMG[name];
  return <img src={`/guide/${name}.webp`} alt={alt} width={w} height={h} loading="lazy" decoding="async" className={`block w-full h-auto ${className}`} />;
}

// パソコンの画面（上に窓の枠）
export function Screen({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
      <div className="h-6 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-3" aria-hidden>
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
      </div>
      <Img name={name} alt={alt} />
    </figure>
  );
}

// 画面の一部を切り抜いた写真
export function Part({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
      <Img name={name} alt={alt} />
    </figure>
  );
}

// スマホの画面（fluid は並べた枠の幅いっぱい）
export function Phone({ name, alt, fluid = false }: { name: string; alt: string; fluid?: boolean }) {
  return (
    <figure className={`${fluid ? "w-full" : "w-[230px] sm:w-[250px]"} shrink-0 rounded-[22px] sm:rounded-[30px] bg-slate-900 p-[5px] sm:p-[7px] shadow-[0_16px_36px_rgba(15,23,42,0.22)]`}>
      <div className="rounded-[18px] sm:rounded-[24px] overflow-hidden bg-slate-900"><Img name={name} alt={alt} /></div>
    </figure>
  );
}

export function Phones({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-5 md:gap-6">{children}</div>;
}
