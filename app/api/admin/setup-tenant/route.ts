import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  try {
    const { tenantId, name } = await request.json(); // tenantIdは "happychoice" など

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'IDと名前が足りねぇぞい' }, { status: 400 });
    }

    // 1. 【Auth自動設定】Googleの門番に新しい「部屋」を作らせる
    // ここで「メールリンク」も同時に有効にするのがプロの技だっぺ！
    const tenant = await adminAuth.tenantManager().createTenant({
      displayName: name,
      allowPasswordSignIn: true,
      enableEmailLinkSignIn: true, // 👈 これでさっきのチェックボックスが自動でONになるぞい！
    });

    // 2. 【Firestore自動保存】
    // Googleが発行した「背番号付きの本当のID (tenant.tenantId)」をそのまま保存するっぺ！
    await adminDb.collection('tenants').doc(tenantId).set({
      name: name,
      slug: tenantId,
      authTenantId: tenant.tenantId, // 👈 これが "-lz9yq" とか付いた本物のIDだばい
      createdAt: new Date(),
      status: 'active'
    });

    console.log(`✅ テナント作成完了だっぺ！ ID: ${tenant.tenantId}`);

    return NextResponse.json({ 
      success: true, 
      authTenantId: tenant.tenantId 
    });

  } catch (error: any) {
    console.error('セットアップでこけたっぺ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}