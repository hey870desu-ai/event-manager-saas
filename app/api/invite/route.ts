// 📂 app/api/invite/route.ts
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, tenantId, tenantName } = body; // ✨ name を受け取る

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/login/verify?tenantId=${tenantId}`,
      handleCodeInApp: true,
    };

    const loginLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // ✨ 塙さんが見つけた「スッキリしたデザイン」で直接送るぞい！
    await resend.emails.send({
      from: `${tenantName} <info@event-manager.app>`,
      to: [email],
      subject: `【絆太郎】${tenantName} 管理画面への招待です`,
      html: `
        <div style="font-family: sans-serif; color: #334155; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="background: #1e293b; padding: 25px; text-align: center;">
              <span style="color: #fff; font-size: 20px; font-weight: bold;">絆太郎スタッフ招待</span>
            </div>
            <div style="padding: 40px 30px;">
              <p style="font-size: 16px; font-weight: bold;">${name || "担当者"} 様</p>
              <p style="line-height: 1.8;">いつもお疲れ様です。<br><strong>${tenantName}</strong> の管理スタッフとして招待されました。</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginLink}" style="background: #3b82f6; color: #fff; padding: 15px 25px; border-radius: 8px; text-decoration: none; font-weight: bold;">管理画面に入室する</a>
              </div>
              <p style="font-size: 12px; color: #64748b;">※リンクの有効期限は30分です。</p>
            </div>
          </div>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}