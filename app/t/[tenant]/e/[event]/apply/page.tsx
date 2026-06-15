// 📂 app/t/[tenant]/e/[event]/apply/page.tsx
// 📝 役割：申し込みフォームだけの単体ページ（Lステップ等への組み込み・直リンク用）
//          案内文・バナー・講師紹介などは出さず、参加申し込みフォームだけを表示する。
export const dynamic = "force-dynamic";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Lock, CheckCircle } from "lucide-react";
import ReservationForm from "@/components/ReservationForm";

type Props = {
  params: { tenant: string; event: string };
};

export default async function ApplyFormPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const { tenant: tenantId, event: eventId } = resolvedParams;

  // サーバー側でイベント・テナント情報を取得（通常のイベントページと同じ）
  let eventData: any = null;
  let tenantData: any = null;
  try {
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (eventSnap.exists()) eventData = { id: eventSnap.id, ...eventSnap.data() };
    const tenantSnap = await getDoc(doc(db, "tenants", tenantId));
    if (tenantSnap.exists()) tenantData = { id: tenantSnap.id, ...tenantSnap.data() };
  } catch (error) {
    console.error("申し込みフォーム データ取得エラー:", error);
  }

  // イベントが存在しない
  if (!eventData) {
    return (
      <div className="min-h-screen bg-[#0B0D17] text-slate-400 flex items-center justify-center p-6 text-center">
        イベントが見つかりません
      </div>
    );
  }

  // 受付終了
  if (eventData.status === "closed") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="w-20 h-20 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">受付は終了しました</h2>
          <div className="text-slate-500 font-medium leading-relaxed space-y-2">
            <p className="text-lg font-bold text-slate-700">{eventData.title}</p>
            <p>このイベントの受付は終了いたしました。</p>
            <p>たくさんのお申し込み、ありがとうございました。</p>
          </div>
        </div>
      </div>
    );
  }

  // 下書き（未公開）
  if (eventData.status !== "published") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-sm">
          <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">ただいま準備中です</h2>
          <div className="text-slate-500 font-medium leading-relaxed space-y-2">
            <p>このフォームは現在、主催者様が公開に向けて準備を進めております。</p>
            <p>公開まで、今しばらくお待ちください。</p>
          </div>
        </div>
      </div>
    );
  }

  // 申し込みフォームだけを表示（embed モード = ボタン無しで直接フォーム）
  return (
    <div className="min-h-screen bg-[#0B0D17]">
      <ReservationForm
        embed
        event={eventData}
        tenantData={tenantData || { name: "Event Manager" }}
        eventId={eventId}
        tenantId={tenantId}
      />
    </div>
  );
}
