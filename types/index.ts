// types/index.ts

// ▼▼▼ SaaS化のための新しい定義 ▼▼▼

// 支部（ブランチ）のグループ定義
export type BranchGroup = {
  group: string;       // 例: "東北ブロック"
  branches: string[];  // 例: ["青森県支部", "岩手県支部"]
};

// メール設定の定義
export type MailConfig = {
  senderName: string;  // 例: "イベント事務局"
  signature: string;   // メールの署名テンプレート
};

// ★テナント（契約企業）の本体
export type Tenant = {
  id: string;          // ID (例: "kaiziren", "demo-corp")
  name: string;        // 組織名 (例: "全国介護事業者連盟")
  logoUrl?: string;    // ロゴ画像URL (任意)
  branches: BranchGroup[]; // 支部リスト（これをDBで持つ！）
  mailConfig?: MailConfig; // メール設定
  
  plan: 'free' | 'standard' | 'enterprise'; // 契約プラン
  status: 'active' | 'suspended'; // ステータス
  
  createdAt: any;
  updatedAt: any;
};

// ユーザー情報（テナントIDを追加）
export type AdminUser = {
  email: string;
  tenantId: string;    // ★どこのマンションの住人か
  branchId?: string;   // どの支部に所属しているか
  role?: 'super_admin' | 'tenant_admin' | 'staff'; // 権限
  addedAt: any;
  addedBy: string;
};