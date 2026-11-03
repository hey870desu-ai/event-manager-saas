// 📂 components/guide/GuideShots.tsx
// 📝 役割：使い方のページの写真（public/guide/*.webp）を、パソコンの画面・切り抜き・スマホの枠で出す部品
//   公開の使い方（/guide）と、管理画面の「参加費の受け取り方」（/admin/guide/payments）で同じものを使う
//   写真は手元で、架空の主催者「ひだまりケア勉強会（見本）」と架空の参加者のデータで撮った
//   カード払いの参加者の画面（card-form-*・card-checkout・card-thanks）は、本番の「申込ページの見本」のイベントで撮った（参加者は架空・メールアドレスと QR は隠した）
//   marks＝写真の上の赤い枠と番号（写真のピクセルで書く）。説明は Steps に同じ番号で並べる
import type { ReactNode } from "react";

// 写真の大きさ（幅・高さ）。public/guide にある WebP と同じ
const IMG: Record<string, [number, number]> = {
  "admin-top": [1600, 1075], "event-card": [1600, 375],
  "theme-medical": [600, 1298], "theme-pop": [600, 1298], "theme-editorial": [600, 1298], "theme-nature": [600, 1298],
  "editor-theme": [1600, 1337], "editor-questions": [1600, 1321], "apply-form": [600, 1808],
  "editor-tickets": [1600, 1457], "editor-cancel": [1200, 421], "flyer": [1200, 1693],
  "apply-complete": [600, 1542], "editor-mail": [1600, 1166], "participants": [1600, 1125],
  "editor-presurvey": [1600, 773], "presurvey": [600, 1298], "mail-send": [1600, 1125],
  "checkin": [600, 1298], "survey-qr": [816, 1228], "survey": [600, 1789], "survey-results": [1600, 1125],
  "report-top": [1400, 1518], "report-survey": [1400, 1096], "kizuna-list": [1600, 1188],
  "newsletter": [1600, 1375], "card-scan": [600, 1298], "analytics": [1600, 1125], "staff": [900, 1554],
  "mail-delivery": [1520, 1084],
  "card-setup": [956, 851], "card-ready": [956, 855], "editor-paycard": [1160, 400],
  "card-form-top": [600, 1173], "card-form-bottom": [600, 1076], "card-checkout": [1000, 806], "card-thanks": [600, 1074],
};
// "editor-tickets" は 2026-11-03 に撮り直した（払い方が3つになった）

export type Mark = [n: number, x: number, y: number, w: number, h: number];

const RED = "#E5322D";

// 写真の上の赤い枠と番号。親は写真と同じ大きさの relative な箱
function Marks({ name, marks }: { name: string; marks?: Mark[] }) {
  if (!marks?.length) return null;
  const [W, H] = IMG[name];
  const pct = (v: number, t: number) => `${(v / t) * 100}%`;
  return (
    <>
      {marks.map(([n, x, y, w, h]) => (
        <span key={n} aria-hidden className="absolute rounded-md pointer-events-none" style={{ left: pct(x, W), top: pct(y, H), width: pct(w, W), height: pct(h, H), border: `3px solid ${RED}`, boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9)" }}>
          <span className="absolute -left-3 -top-3 w-6 h-6 rounded-full text-white text-[13px] font-bold flex items-center justify-center" style={{ background: RED, boxShadow: "0 0 0 2px #fff" }}>{n}</span>
        </span>
      ))}
    </>
  );
}

// 写真の赤い番号と同じ番号の説明
export function Steps({ items }: { items: [number, ReactNode][] }) {
  return (
    <ol className="space-y-3">
      {items.map(([n, t]) => (
        <li key={n} className="flex items-start gap-3">
          <span className="mt-[3px] w-6 h-6 rounded-full text-white text-[13px] font-bold flex items-center justify-center shrink-0" style={{ background: RED }} aria-hidden>{n}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

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

// 画面の一部を切り抜いた写真（marks＝赤い枠と番号。番号が角からはみ出しても切れないよう、枠は写真の外の箱に置く）
export function Part({ name, alt, marks }: { name: string; alt: string; marks?: Mark[] }) {
  if (!marks?.length) {
    return (
      <figure className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
        <Img name={name} alt={alt} />
      </figure>
    );
  }
  return (
    <figure className="relative">
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.10)]"><Img name={name} alt={alt} /></div>
      <Marks name={name} marks={marks} />
    </figure>
  );
}

// スマホの画面（fluid は並べた枠の幅いっぱい・marks＝赤い枠と番号）
export function Phone({ name, alt, fluid = false, marks }: { name: string; alt: string; fluid?: boolean; marks?: Mark[] }) {
  return (
    <figure className={`${fluid ? "w-full" : "w-[230px] sm:w-[250px]"} shrink-0 rounded-[22px] sm:rounded-[30px] bg-slate-900 p-[5px] sm:p-[7px] shadow-[0_16px_36px_rgba(15,23,42,0.22)]`}>
      <div className="relative">
        <div className="rounded-[18px] sm:rounded-[24px] overflow-hidden bg-slate-900"><Img name={name} alt={alt} /></div>
        <Marks name={name} marks={marks} />
      </div>
    </figure>
  );
}

export function Phones({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-5 md:gap-6">{children}</div>;
}
