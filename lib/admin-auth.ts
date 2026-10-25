// 管理画面API用の認証ヘルパー
// クライアントから Firebase ID Token を Bearer で受け取り、
// admin_users コレクションから tenantId を取得して返す。

import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const SUPER_ADMIN_EMAIL = 'hey870desu@gmail.com';

export class ApiAuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type Caller = {
  uid: string;
  email: string;           // 小文字にそろえたもの
  tenantId: string | null; // admin_users の所属（運営者は無いこともある）
  isSuper: boolean;
};

// 管理画面から呼ぶ API の入口：ログイン（ID トークン）を確かめ、運営者か、どのテナントの管理者かを返す。
// 運営者は admin_users が無くても通す（Firestore のルールの isSuper と同じ決まり）
export async function verifyCaller(request: Request): Promise<Caller> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new ApiAuthError(401, 'ログインが必要です');
  let decoded: any;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    throw new ApiAuthError(401, 'ログインが切れています。もう一度ログインしてください');
  }
  const email = String(decoded.email || '').trim().toLowerCase();
  if (!email || decoded.email_verified !== true) throw new ApiAuthError(403, 'メールアドレスが確かめられていません');
  const userDoc = await adminDb.collection('admin_users').doc(email).get();
  const tenantId: string | null = (userDoc.exists && userDoc.data()?.tenantId) || null;
  const isSuper = email === SUPER_ADMIN_EMAIL;
  if (!isSuper && !tenantId) throw new ApiAuthError(403, '管理者として登録されていません');
  return { uid: decoded.uid, email, tenantId, isSuper };
}

// そのテナントを操作してよいか（運営者はどのテナントも）。よければテナントIDを返す
export function assertTenant(caller: Caller, tenantId: unknown): string {
  const tid = typeof tenantId === 'string' ? tenantId.trim() : '';
  if (!tid || tid.includes('/')) throw new ApiAuthError(400, 'テナントが指定されていません');
  if (!caller.isSuper && caller.tenantId !== tid) throw new ApiAuthError(403, 'このテナントの操作はできません');
  return tid;
}

// verifyCaller・assertTenant の断りを、そのまま返事にする（ほかのエラーは null）
export function authErrorResponse(e: unknown) {
  if (e instanceof ApiAuthError) return NextResponse.json({ success: false, error: e.message }, { status: e.status });
  return null;
}

// そのテナントがメールを送ってよい相手（絆リストの名刺・CSV と、テナントのイベントの申込者）。小文字のメールアドレス
export async function tenantAudienceEmails(tenantId: string): Promise<Set<string>> {
  const set = new Set<string>();
  const add = (v: unknown) => { const e = String(v || '').trim().toLowerCase(); if (e) set.add(e); };
  const contacts = await adminDb.collection('tenants').doc(tenantId).collection('manual_contacts').get();
  contacts.docs.forEach((d: any) => add(d.data()?.email));
  const events = await adminDb.collection('events').where('tenantId', '==', tenantId).get();
  const lists = await Promise.all(events.docs.map((ev: any) => ev.ref.collection('reservations').get()));
  lists.forEach((res: any) => res.docs.forEach((d: any) => add(d.data()?.email)));
  return set;
}

export type AdminContext = {
  uid: string;
  email: string;
  tenantId: string;
};

export async function verifyAdminRequest(request: Request): Promise<AdminContext> {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Missing Authorization header');

  const decoded: any = await adminAuth.verifyIdToken(token);
  const email: string | undefined = decoded.email;
  if (!email) throw new Error('Token missing email');

  const userDoc = await adminDb.collection('admin_users').doc(email).get();
  if (!userDoc.exists) throw new Error(`admin_users not found: ${email}`);

  const tenantId: string | undefined = userDoc.data()?.tenantId;
  if (!tenantId) throw new Error('No tenantId for this user');

  return { uid: decoded.uid, email, tenantId };
}
