// 📂 場所：app/t/[tenant]/e/[event]/page.tsx
// 📝 役割：LINE/SNS用の名刺（OGP）を動的に生成する (SaaS完全対応版)

import { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EventClient from "./EventClient";

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
    title: "イベント詳細 | Event Manager",
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

// 実際の画面表示（ここは EventClient に丸投げでOK）
export default function EventPage() {
  return <EventClient />;
}