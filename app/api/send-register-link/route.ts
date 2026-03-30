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
          <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
            <div style="background: #fff; padding: 40px 30px 30px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <span style="color: #0f172a; font-size: 28px; font-weight: 900; letter-spacing: 1px;">絆太郎</span>
              <span style="color: #94a3b8; font-size: 14px; font-weight: 500; margin-left: 8px;">Event Manager</span>
            </div>
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <span style="display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 20px; letter-spacing: 0.5px;">アカウント登録</span>
              </div>
              <p style="line-height: 1.8; font-size: 15px; color: #475569; text-align: center;">
                絆太郎 Event Manager へようこそ！<br>
                下のボタンをクリックして、登録を完了してください。
              </p>
              <div style="text-align: center; margin: 35px 0;">
                <a href="${signInLink}" style="display: inline-block; background: #0f172a; color: #fff; padding: 18px 44px; border-radius: 14px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.15);">
                  アカウント登録を完了する
                </a>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 10px; margin-top: 24px; border: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.7;">
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
