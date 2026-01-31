// 📂 app/api/admin/add/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    // ★修正: 画面から「tenantId」も受け取るように変更
    const { email, branchId, tenantId } = await request.json();

    if (!email || !branchId || !tenantId) {
      return NextResponse.json({ error: 'Email, Branch, and Tenant ID are required' }, { status: 400 });
    }

    // ★修正: ロジックを汎用化
    // "本部" という名前、または "tenantIdとbranchIdが同じ" なら管理者権限とするなど、柔軟に。
    // ここではシンプルに「本部」という言葉が含まれていれば強い権限、としています。
    const isHeadquarters = branchId.includes("本部") || branchId === "Headquarters";
    const role = isHeadquarters ? "super_admin" : "branch_admin";

    // Firestoreに保存
    await adminDb.collection('admin_users').doc(email).set({
      email: email,
      role: role,
      tenantId: tenantId, // ★最重要: どの会社のユーザーかを保存
      branchId: branchId, // どの部署/支部か
      addedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: `招待完了: ${branchId} (${tenantId})` });
  } catch (error: any) {
    console.error('Add Admin Error:', error);
    return NextResponse.json({ error: error.message || 'Server Error' }, { status: 500 });
  }
}