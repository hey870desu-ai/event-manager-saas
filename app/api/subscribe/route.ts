import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { email, name, tenantId } = await request.json();

    if (!email || !tenantId) {
      return NextResponse.json({ error: "メールアドレスとテナントIDは必須です" }, { status: 400 });
    }

    // テナントが存在するか確認
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
      return NextResponse.json({ error: "無効な登録先です" }, { status: 400 });
    }

    // 配信停止リストにいないか確認
    const optoutDoc = await adminDb.collection('marketing_optouts').doc(email).get();
    if (optoutDoc.exists) {
      // 配信停止を解除
      await adminDb.collection('marketing_optouts').doc(email).delete();
    }

    // manual_contactsに登録（既存データはマージ）
    await adminDb.collection('tenants').doc(tenantId).collection('manual_contacts').doc(email).set({
      email,
      name: name || "",
      source: "subscribe_form",
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscribe Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
