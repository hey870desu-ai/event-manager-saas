// 📂 app/api/send-register-link/route.ts
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "メールアドレスが必要です" }, { status: 400 });
    }

    // 1. Firebase Admin SDK でサインインリンクを生成
    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/onboarding`,
      handleCodeInApp: true,
    };

    const signInLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // 2. Resend で綺麗なHTMLメールを送信
    const { error } = await resend.emails.send({
      from: `"絆太郎 Event Manager" <info@event-manager.app>`,
      to: [email],
      subject: "【絆太郎】アカウント登録を完了してください",
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155; padding: 20px; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c4b5fd 100%); padding: 40px 30px; text-align: center;">
              <span style="color: #fff; font-size: 28px; font-weight: bold; letter-spacing: 2px;">絆太郎</span>
              <p style="color: rgba(255,255,255,0.9); font-size: 13px; margin-top: 8px; letter-spacing: 1px;">EVENT MANAGER</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">アカウント登録のご案内</p>
              <p style="line-height: 1.8; font-size: 15px; color: #475569;">
                絆太郎 Event Manager へようこそ！<br>
                下のボタンをクリックして、アカウント登録を完了してください。
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${signInLink}" style="display: inline-block; background: linear-gradient(135deg, #818cf8 0%, #a78bfa 100%); color: #fff; padding: 18px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.35);">
                  アカウント登録を完了する
                </a>
              </div>
              <div style="background: #f5f3ff; padding: 16px; border-radius: 10px; margin-top: 20px;">
                <p style="font-size: 12px; color: #7c3aed; margin: 0; line-height: 1.7;">
                  ※ このリンクの有効期限は30分です。<br>
                  ※ お心当たりのない場合は、このメールを無視してください。
                </p>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 11px; color: #94a3b8; margin: 0;">
                &copy; 2026 絆太郎 Event Manager — HANAHIRO CARE DESIGN WORKS
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Register Link API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
