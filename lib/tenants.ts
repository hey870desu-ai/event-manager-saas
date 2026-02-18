// 📂 lib/tenants.ts
// 📝 役割: DBからテナント情報を取得する (SaaS設定対応版)

import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type Tenant = {
  id: string;
  name: string;
  plan?: string;
  branches: string[]; // 支部リスト
  
  // ★追加: SaaSデザイン設定 (なくてもOKなように '?' をつける)
  logoUrl?: string;     // ロゴ画像のURL
  themeColor?: string;  // ブランドカラー (例: #ec4899)
  websiteUrl?: string;  // 会社のHP
};

// 単一のテナント情報を取得
export const fetchTenantData = async (tenantId: string): Promise<Tenant | null> => {
  if (!tenantId) return null;
  try {
    const ref = doc(db, "tenants", tenantId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      // 取得したデータに id を混ぜて返す
      return { id: snap.id, ...snap.data() } as Tenant;
    } else {
      console.error("Tenant not found:", tenantId);
      return null;
    }
  } catch (e) {
    console.error("Error fetching tenant:", e);
    return null;
  }
};

// 全テナントのリストを取得 (スーパー管理者やデバッグ用)
export const fetchAllTenants = async (): Promise<Tenant[]> => {
  try {
    const snap = await getDocs(collection(db, "tenants"));
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));
  } catch (e) {
    console.error("Error fetching all tenants:", e);
    return [];
  }
};