// 📂 components/blog/AuthorBox.tsx
// 📝 役割：記事の下の「この記事の監修」。検索やAIは「誰が書いているか」を信頼の手がかりに読むので、表示と構造化データの両方で出す
//   経歴は space-care.jp・福ひろばラーニングと同じ文（変えるときは3か所そろえる）。最後の一文だけ絆太郎のこと
//   記事の下書きはAI（ルーチン）が書き、塙さんが読んでから公開する
import { COMPANY, SITE_URL } from "@/lib/site";

export const SUPERVISOR = {
  name: "塙 啓之",
  reading: "はなわ ひろゆき",
  title: "株式会社はなひろ 代表取締役",
  photo: "/blog/supervisor.jpg",
  bio: "介護業界で25年以上、現場・介護施設の管理者・ケアマネジャー（介護支援専門員）を経験。2013年に株式会社はなひろを設立し、福島県で通所介護4事業所（郡山市に3、矢祭町に1）を運営。一般社団法人 全国介護事業者連盟 福島県支部 副支部長。セミナーや研修会の申込から当日の受付、アンケートまでを1つで行うイベントシステム「絆太郎」を開発し、このブログの記事を監修しています。",
};

export function supervisorJsonLd() {
  return {
    "@type": "Person",
    name: SUPERVISOR.name,
    alternateName: SUPERVISOR.reading,
    jobTitle: SUPERVISOR.title,
    image: `${SITE_URL}${SUPERVISOR.photo}`,
    description: SUPERVISOR.bio,
    worksFor: { "@type": "Organization", name: COMPANY.name, url: COMPANY.url },
    knowsAbout: ["介護", "介護事業経営", "研修会の運営", "セミナー運営", "イベント管理"],
    url: COMPANY.profileUrl,
  };
}

export default function AuthorBox() {
  return (
    <section className="mt-14 rounded-xl border border-slate-200 bg-white p-6 sm:p-7">
      <div className="mb-4 text-xs font-bold tracking-wider text-[#c2410c]">この記事の監修</div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <img src={SUPERVISOR.photo} alt={`監修者 ${SUPERVISOR.name}`} width={80} height={80} loading="lazy" className="h-20 w-20 shrink-0 rounded-full border border-slate-200 object-cover" />
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-900">
            {SUPERVISOR.name}
            <span className="ml-2 text-xs font-normal text-slate-500">{SUPERVISOR.reading}</span>
          </div>
          <div className="mt-0.5 text-sm text-slate-500">{SUPERVISOR.title}</div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{SUPERVISOR.bio}</p>
          <a href={COMPANY.profileUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-bold text-[#c2410c] hover:underline">
            会社概要を見る →
          </a>
        </div>
      </div>
    </section>
  );
}
