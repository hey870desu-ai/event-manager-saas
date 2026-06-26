import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const SUPER_ADMIN_EMAIL = 'hey870desu@gmail.com';

export async function POST(request: Request) {
  try {
    // 🔐 認証必須：匿名での無制限テナント作成（Authテナント乱造）を防ぐ
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

    const { tenantId, name, plan, ownerEmail: bodyOwnerEmail } = await request.json();
    if (!tenantId || !name) {
      return NextResponse.json({ error: 'IDと名前が足りねぇぞい' }, { status: 400 });
    }

    // オーナーは運営者だけが任意指定可。一般のセルフ登録は必ず呼び出し元本人に固定
    const ownerEmail = (isSuper && bodyOwnerEmail) ? bodyOwnerEmail : callerEmail;

    // 既存テナントの上書きを防止（取り違え・乗っ取り対策）
    const existing = await adminDb.collection('tenants').doc(tenantId).get();
    if (existing.exists) {
      return NextResponse.json({ error: 'このIDは既に使用されています' }, { status: 409 });
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
    // Googleが発行した「背番号付きの本当のID (tenant.tenantId)」と、
    // 以前クライアントから直書きしていた plan/branches/ownerEmail もここで一括保存。
    await adminDb.collection('tenants').doc(tenantId).set({
      name: name,
      slug: tenantId,
      authTenantId: tenant.tenantId, // 👈 これが "-lz9yq" とか付いた本物のIDだばい
      plan: plan || 'free',
      branches: ['本部'],
      ownerEmail: ownerEmail,
      createdAt: new Date(),
      status: 'active'
    });

    // 3. 【オーナーを管理者登録】以前クライアントで setDoc していた admin_users 作成をサーバへ移管。
    //    （新ルール下では未登録ユーザーのクライアント直書きは permission-denied になるため必須）
    await adminDb.collection('admin_users').doc(ownerEmail).set({
      email: ownerEmail,
      tenantId: tenantId,
      role: 'owner',
      branchId: '本部',
      createdAt: new Date(),
      addedBy: (isSuper && bodyOwnerEmail) ? 'SuperAdmin' : 'SelfRegistration',
    }, { merge: true });

    console.log(`✅ テナント作成完了だっぺ！ ID: ${tenant.tenantId} / owner: ${ownerEmail}`);

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