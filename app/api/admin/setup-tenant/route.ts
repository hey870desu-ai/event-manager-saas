import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { tenantId, name } = await request.json(); // tenantIdは "happychoice" など

    if (!tenantId || !name) {
      return NextResponse.json({ error: 'IDと名前が足りねぇぞい' }, { status: 400 });
    }

    // 1. 【Auth自動設定】Googleの門番に新しい「部屋」を作らせる
    // ここで「メールリンク」も同時に有効にするのがプロの技だっぺ！
    const tenant = await adminAuth.tenantManager().createTenant({
      displayName: tenantId,
      emailSignInConfig: {
        enabled: true,
        passwordRequired: false, // false = メールリンク認証を有効化
      },
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

    // 3. オーナーに新規テナント登録を通知
    try {
      await resend.emails.send({
        from: `"絆太郎 通知" <info@event-manager.app>`,
        to: ['hey870desu@gmail.com'],
        subject: `【絆太郎】新規テナント登録: ${name}`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155; padding: 20px; background-color: #f8fafc;">
            <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
              <div style="background: #0f172a; padding: 24px; text-align: center;">
                <span style="color: #fff; font-size: 18px; font-weight: bold;">新規テナント登録通知</span>
              </div>
              <div style="padding: 28px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 10px 0; color: #94a3b8; width: 100px;">組織名</td>
                    <td style="padding: 10px 0; font-weight: bold; color: #0f172a;">${name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">テナントID</td>
                    <td style="padding: 10px 0; font-weight: bold; color: #0f172a; border-top: 1px solid #f1f5f9; font-family: monospace;">${tenantId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">Auth ID</td>
                    <td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9; font-family: monospace; font-size: 12px;">${tenant.tenantId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">登録日時</td>
                    <td style="padding: 10px 0; color: #64748b; border-top: 1px solid #f1f5f9;">${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        `
      });
    } catch (e) {
      console.warn("通知メール送信失敗（テナント作成自体は成功）:", e);
    }

    return NextResponse.json({
      success: true,
      authTenantId: tenant.tenantId
    });

  } catch (error: any) {
    console.error('セットアップでこけたっぺ:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}