// 📂 app/api/invite/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Resend } from 'resend';
import { verifyCaller, assertTenant, authErrorResponse } from "@/lib/admin-auth";

const resend = new Resend(process.env.RESEND_API_KEY);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function POST(req: Request) {
  try {
    // ログインした管理者が、自分のテナントに登録した人（admin_users）にだけ送る。テナント名は記録から
    const caller = await verifyCaller(req);
    const body = await req.json();
    const tenantId = assertTenant(caller, body.tenantId);
    const email = String(body.email || '').trim();
    if (!email || email.includes('/')) return NextResponse.json({ error: 'メールアドレスがありません' }, { status: 400 });
    let member = await adminDb.collection('admin_users').doc(email).get();
    if (!member.exists && email.toLowerCase() !== email) member = await adminDb.collection('admin_users').doc(email.toLowerCase()).get();
    if (!member.exists || member.data()?.tenantId !== tenantId) {
      return NextResponse.json({ error: 'このテナントの管理者として登録されていない宛先です' }, { status: 403 });
    }

    // 1. Firestore から、テナントの「本物の背番号」を呼んでくるっぺ
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) return NextResponse.json({ error: 'テナントが見つかりません' }, { status: 404 });
    const tenantData = tenantDoc.data();
    const tenantNameRaw = String(tenantData?.orgName || tenantData?.name || tenantId).replace(/["\r\n]/g, ''); // 差出人・件名用
    const tenantName = esc(tenantNameRaw); // 本文（HTML）用
    const name = esc(member.data()?.name || body.name || '');

    // authTenantId の取得 or 自動作成（既存テナントの補完対応）
    let realAuthId = tenantData?.authTenantId;

    // authTenantId がある場合でも、Firebase Auth 側に実在するか検証する
    if (realAuthId) {
      try {
        await adminAuth.tenantManager().getTenant(realAuthId);
      } catch (e: any) {
        realAuthId = null;
      }
    }

    // authTenantId が無い or 無効なら Firebase Auth テナントを新規作成
    if (!realAuthId) {
      const newTenant = await adminAuth.tenantManager().createTenant({
        displayName: tenantId,
        emailSignInConfig: {
          enabled: true,
          passwordRequired: false,
        },
      });
      realAuthId = newTenant.tenantId;
      await adminDb.collection('tenants').doc(tenantId).update({ authTenantId: realAuthId });
    }


    // 2. ログイン用のアクションリンクを生成するっぺ
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/login/verify?tenantId=${realAuthId}`,
      handleCodeInApp: true,
    };

    const tenantAuth = adminAuth.tenantManager().authForTenant(realAuthId);
    const loginLink = await tenantAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // 3. メール送信（From の表示名を "" で囲むのが、不着を防ぐコツだっぺ！）
    const { error } = await resend.emails.send({
      // 🏆 日本語の表示名は "" で囲ってやらないと、メールサーバーに蹴られることがあるんだばい！
      from: `"${tenantNameRaw} 招待事務局" <info@event-manager.app>`,
      to: [email],
      subject: `【絆太郎】${tenantNameRaw} 管理画面への招待があったっぺ！`,
      html: `
        <div style="font-family: sans-serif; color: #334155; padding: 20px; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: #1e293b; padding: 30px; text-align: center;">
              <span style="color: #fff; font-size: 22px; font-weight: bold; letter-spacing: 2px;">絆太郎 スタッフ招待</span>
            </div>
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; font-weight: bold; color: #1e293b;">${name || "担当者"} 様</p>
              <p style="line-height: 1.8; font-size: 15px;">
                いつもお疲れ様だばい！！<br>
                <strong>${tenantName}</strong> のオーナーさんから、管理スタッフとして招待が届いたぞい！
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a href="${loginLink}" style="background: #4f46e5; color: #fff; padding: 18px 35px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
                  管理画面に入室する
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b; background: #f1f5f9; padding: 15px; border-radius: 8px;">
                ※このリンクは、ご本人様のみ有効です。<br>
                ※有効期限は30分だっぺ。お早めに手続きしてくんちぇ！
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    const denied = authErrorResponse(error);
    if (denied) return denied;
    console.error("Invite API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}