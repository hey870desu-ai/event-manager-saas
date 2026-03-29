// 📂 app/api/invite/route.ts
import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, tenantId, tenantName } = body;

    // 1. Firestore から、ハッピーチョイスの「本物の背番号 (-lz9yq)」を呼んでくるっぺ
    const tenantDoc = await adminDb.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();
    
    // authTenantId があればそれを使う。なければ元の tenantId を使う
    const realAuthId = tenantData?.authTenantId || tenantId;

    console.log(`🚀 招待パトロール中: ${email} をテナント ${realAuthId} に招待するぞい！`);

    // 2. ログイン用のアクションリンクを生成するっぺ
    const actionCodeSettings = {
      // 🏆 検証用URLに realAuthId をしっかり乗せるのが勝利の鍵だばい！
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/login/verify?tenantId=${realAuthId}`,
      handleCodeInApp: true,
    };

    const tenantAuth = adminAuth.tenantManager().authForTenant(realAuthId); 
    const loginLink = await tenantAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // 3. メール送信（From の表示名を "" で囲むのが、不着を防ぐコツだっぺ！）
    const { error } = await resend.emails.send({
      // 🏆 日本語の表示名は "" で囲ってやらないと、メールサーバーに蹴られることがあるんだばい！
      from: `"${tenantName} 招待事務局" <info@event-manager.app>`,
      to: [email],
      subject: `【絆太郎】${tenantName} 管理画面への招待があったっぺ！`,
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
    console.error("Invite API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}