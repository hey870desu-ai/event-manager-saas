"use client";

import React, { useEffect, useRef } from "react";
import { doc, updateDoc, increment } from "firebase/firestore"; 
import { db } from "@/lib/firebase"; 

// 3つのデザインをすべて読み込みます
import TechLayout from "@/components/templates/TechLayout";
import CorporateLayout from "@/components/templates/CorporateLayout"; 
import PopLayout from "@/components/templates/PopLayout"; // 👈 これを追加！
import MimosaLayout from "@/components/templates/MimosaLayout";

// 親からデータをもらうための型定義
type Props = {
  event: any;
  tenant: any;
  eventId: string;
  tenantId: string;
};

export default function EventClient({ event, tenant, eventId, tenantId }: Props) {
  const processed = useRef(false);

  // 1. PVカウント (データを受け取った時点で実行)
  useEffect(() => {
    const countView = async () => {
      // 2重カウント防止 & データがある時だけ実行
      if (!event || processed.current) return;
      processed.current = true;
      
      try {
        const eventRef = doc(db, "events", eventId);
        await updateDoc(eventRef, { pageViews: increment(1) });
      } catch (e) {
        console.error("PV count error:", e);
      }
    };
    countView();
  }, [eventId, event]);

  // データがない場合のガード
  if (!event) return <div className="min-h-screen bg-[#0B0D17] text-slate-500 flex items-center justify-center">イベントが見つかりません</div>;

  // 2. テーマによる振り分け
  const theme = event.theme || "dark"; 

  // ★ポップ（Pop）テーマ
  if (theme === "pop") {
    return <PopLayout event={event} tenant={tenant} eventId={eventId} tenantId={tenantId} />;
  }

  // ★追加：ミモザテーマ
  if (theme === "mimosa") {
    return <MimosaLayout event={event} tenant={tenant} eventId={eventId} tenantId={tenantId} />;
  }

  // ★ビジネス（Corporate）テーマ
  if (theme === "corporate") {
    return <CorporateLayout event={event} tenant={tenant} eventId={eventId} tenantId={tenantId} />;
  }
  
  // ★デフォルト（Tech / Dark）
  // タイプミス(evnt)も修正しました！
  return <TechLayout event={event} tenant={tenant} eventId={eventId} tenantId={tenantId} />;
}