// =====================================================================
// 勤怠SaaS（kintai-saas-v1）の Firestore に scheduled_messages を書き込み、
// 既存の processScheduledMessages（5分毎 cron）にLINE配信を任せるブリッジ。
//
// 別Firebaseプロジェクト（kintai-saas-v1）へ接続するため、専用のAdmin App
// を初期化する。絆太郎本体（event-manager-saas）の adminDb とは別。
// =====================================================================
import * as admin from "firebase-admin";

const KINTAI_APP_NAME = "kintai-saas-v1";

function getKintaiAdminApp(): admin.app.App {
  const existing = admin.apps.find((a) => a?.name === KINTAI_APP_NAME);
  if (existing) return existing as admin.app.App;

  const raw = process.env.KINTAI_FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("KINTAI_FIREBASE_SERVICE_ACCOUNT が未設定です");
  }
  const serviceAccount = JSON.parse(raw);
  return admin.initializeApp(
    {
      credential: admin.credential.cert(serviceAccount),
    },
    KINTAI_APP_NAME,
  );
}

export function getKintaiDb(): admin.firestore.Firestore {
  return getKintaiAdminApp().firestore();
}

export type KintaiScheduleInput = {
  companyId: string;
  messages: string[]; // 最大3つ。空文字は除外して送信される
  targetLineUserIds?: string[]; // 空 or undefined なら全員
  scheduledAt: Date;
  sourceNote?: string; // どこから予約したか（例: "ichigu-daily"）
};

export type KintaiScheduleResult = {
  scheduleId: string;
  scheduledAt: string;
};

export async function scheduleKintaiLineBroadcast(
  input: KintaiScheduleInput,
): Promise<KintaiScheduleResult> {
  const db = getKintaiDb();
  const ref = db
    .collection("companies")
    .doc(input.companyId)
    .collection("scheduled_messages")
    .doc();
  const payload: any = {
    messages: input.messages.filter(Boolean).slice(0, 3),
    targetLineUserIds: input.targetLineUserIds || [],
    scheduledAt: admin.firestore.Timestamp.fromDate(input.scheduledAt),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: "external:event-manager-saas",
  };
  if (input.sourceNote) payload.source = input.sourceNote;
  await ref.set(payload);
  return { scheduleId: ref.id, scheduledAt: input.scheduledAt.toISOString() };
}

/**
 * 既に同じ source + dateKey で予約済みのドキュメントがあるか確認（重複防止）。
 * 同日中に何度 cron が走っても、二重予約しないために使う。
 */
export async function findExistingKintaiBroadcast(opts: {
  companyId: string;
  source: string;
  scheduledDateKey: string; // YYYY-MM-DD（JST）
}): Promise<{ id: string } | null> {
  const db = getKintaiDb();
  const snap = await db
    .collection("companies")
    .doc(opts.companyId)
    .collection("scheduled_messages")
    .where("source", "==", opts.source)
    .where("dateKey", "==", opts.scheduledDateKey)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id };
}

export async function scheduleKintaiBroadcastIdempotent(
  input: KintaiScheduleInput & { dateKey: string; source: string },
): Promise<KintaiScheduleResult & { alreadyExists?: boolean }> {
  const existing = await findExistingKintaiBroadcast({
    companyId: input.companyId,
    source: input.source,
    scheduledDateKey: input.dateKey,
  });
  if (existing) {
    return {
      scheduleId: existing.id,
      scheduledAt: input.scheduledAt.toISOString(),
      alreadyExists: true,
    };
  }
  const db = getKintaiDb();
  const ref = db
    .collection("companies")
    .doc(input.companyId)
    .collection("scheduled_messages")
    .doc();
  await ref.set({
    messages: input.messages.filter(Boolean).slice(0, 3),
    targetLineUserIds: input.targetLineUserIds || [],
    scheduledAt: admin.firestore.Timestamp.fromDate(input.scheduledAt),
    status: "pending",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: "external:event-manager-saas",
    source: input.source,
    dateKey: input.dateKey,
  });
  return {
    scheduleId: ref.id,
    scheduledAt: input.scheduledAt.toISOString(),
  };
}
