// 📂 app/api/admin/add/route.ts
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const SUPER_ADMIN_EMAIL = 'hey870desu@gmail.com';

export async function POST(request: Request) {
  try {
    // 🔐 呼び出し元を必ず検証（このAPIはadminSDKでルールをバイパスするため、ここで認可しないと
    //    誰でも branchId='本部' を投げて super 相当を任意テナントに付与できてしまう）
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'トークンが無効です' }, { status: 401 });
    }

    const callerEmail: string | undefined = decoded.email;
    if (!callerEmail) {
      return NextResponse.json({ error: 'トークンにメールがありません' }, { status: 401 });
    }
    const isSuper = callerEmail.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

    // super 以外は自分の admin_users から所属テナントを確定（body は信用しない）
    let callerTenantId = '';
    if (!isSuper) {
      const callerDoc = await adminDb.collection('admin_users').doc(callerEmail).get();
      if (!callerDoc.exists) {
        return NextResponse.json({ error: '管理者権限がありません' }, { status: 403 });
      }
      callerTenantId = callerDoc.data()?.tenantId || '';
      if (!callerTenantId) {
        return NextResponse.json({ error: 'テナントが特定できません' }, { status: 403 });
      }
    }

    const { email, branchId, tenantId } = await request.json();
    if (!email || !branchId || !tenantId) {
      return NextResponse.json({ error: 'Email, Branch, and Tenant ID are required' }, { status: 400 });
    }

    // 🔒 テナント越えの追加を禁止：super 以外は自テナントにのみ追加できる
    if (!isSuper && tenantId !== callerTenantId) {
      return NextResponse.json({ error: '自分の組織にのみ管理者を追加できます' }, { status: 403 });
    }
    const targetTenantId = isSuper ? tenantId : callerTenantId;

    // 🔒 super_admin ロールは運営者だけが付与できる（"本部" 文字列での自動昇格を廃止）
    const role = (isSuper && (branchId.includes('本部') || branchId === 'Headquarters'))
      ? 'super_admin'
      : 'branch_admin';

    await adminDb.collection('admin_users').doc(email).set({
      email: email,
      role: role,
      tenantId: targetTenantId,
      branchId: branchId,
      addedAt: new Date(),
      invitedBy: callerEmail,
    }, { merge: true });

    return NextResponse.json({ success: true, message: `招待完了: ${branchId} (${targetTenantId})` });
  } catch (error: any) {
    console.error('Add Admin Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}
