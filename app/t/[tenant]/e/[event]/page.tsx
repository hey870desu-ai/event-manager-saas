// 📂 場所：app/t/[tenant]/e/[event]/page.tsx
// 📝 役割：LINE/SNS用の名刺（OGP）を動的に生成する (SaaS完全対応版)
export const dynamic = "force-dynamic"; // 👈 これを1行目に追加
import { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EventClient from "./EventClient";
import { Lock } from "lucide-react";

type Props = {
  params: { tenant: string; event: string };
};

// ★ここがサーバー側で動く「名刺生成」プログラム
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Next.jsの仕様変更に対応（paramsを待機）
  const resolvedParams = await Promise.resolve(params);
  const tenantId = resolvedParams?.tenant || "default";
  const eventId = resolvedParams?.event;

  // デフォルト（読み込み失敗時用）
  const defaultMetadata = {
    title: "イベント詳細 | イベントシステム絆太郎",
    description: "イベントの詳細・お申し込みはこちらからご確認ください。",
  };

  if (!eventId) return defaultMetadata;

  try {
    // 1. イベント情報を取得
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    
    // 2. テナント（会社）情報を取得
    const tenantRef = doc(db, "tenants", tenantId);
    const tenantSnap = await getDoc(tenantRef);
    
    // データがない場合はデフォルトを返す
    if (!eventSnap.exists()) return defaultMetadata;

    const event = eventSnap.data();
    // 🔒 下書き状態なら、SNS用の情報を「準備中」にすげ替えるっぺ！
   if (event.status !== 'published') {
   return {
    title: "準備中 | 絆太郎",
    description: "このイベントは現在、公開準備中だっぺ！",
    openGraph: { title: "Coming Soon", images: [] },
  };
}
    const tenant = tenantSnap.exists() ? tenantSnap.data() : { name: "Event Manager" };
    const tenantName = tenant.name || "Event Manager";

    // ★画像の優先順位
    // 1. イベントごとのOGP画像 (ogpImage)
    // 2. 講師の写真 (lecturerImage)
    // 3. テナントのロゴ (tenant.logoUrl) ※ロゴだと小さいかもですが、他社の画像が出るよりマシ
    // 4. 何もなければ空（SNS側が勝手にサイト内の画像を拾うか、画像なしになる）
    const displayImage = event.ogpImage || event.lecturerImage || tenant.logoUrl || "";

    // ★ここが修正点：タイトルに「会社名」を入れる
    const pageTitle = `${event.title} | ${tenantName}`;
    const description = `【参加受付中】開催日: ${event.date} / 会場: ${event.venueName || "オンライン"}。詳細・お申し込みはこちら。`;

    return {
      title: pageTitle,
      description: description,
      openGraph: {
        title: pageTitle,
        description: description,
        // 画像がある場合のみセット
        images: displayImage ? [{ url: displayImage, width: 1200, height: 630 }] : [],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: pageTitle,
        description: description,
        images: displayImage ? [displayImage] : [],
      },
    };
  } catch (error) {
    console.error("OGP生成エラー（ページ表示には影響しません）:", error);
    return defaultMetadata;
  }
}

// 実際の画面表示（サーバーでデータを取って渡す）
export default async function EventPage({ params }: Props) {
  // 1. URLからIDを取り出す (Next.js 15対応)
  const resolvedParams = await Promise.resolve(params);
  const { tenant: tenantId, event: eventId } = resolvedParams;

  // 2. サーバー側でデータを取る
  let eventData: any = null;
  let tenantData: any = null;

  try {
    // イベント情報の取得
    const eventRef = doc(db, "events", eventId);
    const eventSnap = await getDoc(eventRef);
    if (eventSnap.exists()) {
      eventData = { id: eventSnap.id, ...eventSnap.data() };
    }

    // テナント情報の取得
    const tenantRef = doc(db, "tenants", tenantId);
    const tenantSnap = await getDoc(tenantRef);
    if (tenantSnap.exists()) {
      tenantData = { id: tenantSnap.id, ...tenantSnap.data() };
    }
  } catch (error) {
    console.error("データ取得エラー:", error);
  }

  // 🔒 下書き状態なら、お客さんには「準備中」の標準的な画面を表示するぞい！
if (eventData.status !== 'published') {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <div className="max-w-sm">
        {/* アイコン */}
        <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={40} />
        </div>
        
        {/* メッセージ */}
        <h2 className="text-2xl font-bold text-slate-800 mb-4">ただいま準備中です</h2>
        <div className="text-slate-500 font-medium leading-relaxed space-y-2">
          <p>このイベントページは現在、主催者様が公開に向けて準備を進めております。</p>
          <p>公開まで、今しばらくお待ちください。</p>
        </div>

        {/* フッター */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">BanTaro Event Manager</p>
        </div>
      </div>
    </div>
  );
}

  // 4. データを EventClient に渡す
  return (
    <EventClient
      event={eventData}
      tenant={tenantData || { name: "Event Manager" }}
      eventId={eventId}
      tenantId={tenantId}
    />
  );
}