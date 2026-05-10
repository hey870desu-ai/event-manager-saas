// 管理画面API用の認証ヘルパー
// クライアントから Firebase ID Token を Bearer で受け取り、
// admin_users コレクションから tenantId を取得して返す。

import { adminAuth, adminDb } from '@/lib/firebase-admin';

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
