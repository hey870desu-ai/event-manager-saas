// 📂 lib/firebase-admin.ts
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
// 1. 環境変数から鍵を取得
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

let adminDb: any;

let adminAuth: any;
// 2. 本物の鍵があるかチェック
let isRealKeyAvailable = false;
let serviceAccount;

if (serviceAccountKey) {
  try {
    // クリーニングとパース
    const cleanKey = serviceAccountKey.trim().replace(/^'|'$/g, "");
    serviceAccount = JSON.parse(cleanKey);
    
    // 改行コードの修正
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '');
    }
    
    // 必須項目チェック
    if (serviceAccount.project_id && serviceAccount.client_email && serviceAccount.private_key) {
      isRealKeyAvailable = true;
    }
  } catch (e) {
    console.warn("⚠️ Key parsing failed:", e);
  }
}

// 3. 初期化プロセス
if (isRealKeyAvailable) {
  // ✅ パターンA: 本番モード（鍵あり）
  if (getApps().length === 0) {
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e) {
      console.error("❌ Firebase Init Error:", e);
    }
  }
  adminDb = getFirestore();

  adminAuth = getAuth();
  
} else {
  // 🛡 パターンB: ビルド救済モード（鍵なし・モック）
  console.warn("⚠️ No valid keys found. Using STATIC MOCK DB for build.");

  // 複雑なProxyを使わず、単純なオブジェクトで代用する
  // (チェーンメソッドに対応: collection -> doc -> get 等)
  const mockFunc = () => mockObj; // 自分自身を返し続ける関数
  const mockObj = {
    collection: mockFunc,
    doc: mockFunc,
    where: mockFunc,
    orderBy: mockFunc,
    limit: mockFunc,
    get: async () => ({ exists: false, data: () => ({}), docs: [] }), // 空データを返す
    add: async () => ({ id: "mock_id" }),
    set: async () => {},
    update: async () => {},
    delete: async () => {},
    generateSignInWithEmailLink: async () => "https://mock-link.com",
  };

  adminDb = mockObj;
  adminAuth = mockObj;
}

// 4. エクスポート
export { adminDb, adminAuth };