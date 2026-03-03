// 📂 app/api/invite/route.ts
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, tenantId, tenantName } = body;

    if (!email) throw new Error("メアドが入ってねぇぞい！");

    // 1. 魔法のリンクの設定（認証後の戻り先）
    const actionCodeSettings = {
      // 🚨 必ず環境変数のURLを使うのが「Vercel消し」のコツだっぺ
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/login/verify?tenantId=${tenantId}`,
      handleCodeInApp: true,
    };

    // 2. Firebaseでログイン用のリンクを生成
    const loginLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // 3. 【ここが重要！】メール送信APIに「招待状だぞ！」と伝える
    const emailRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email,            // 宛先
        type: "invitation",      // 🚨 これで招待メールの型紙がスイッチオン！
        inviteUrl: loginLink,    // 🚨 生成した魔法のリンクを渡す
        tenantName: tenantName,  // 団体名（署名用）
        subject: `【絆太郎】${tenantName} 管理画面への招待だっぺ` // 件名も指定
      }),
    });

    if (!emailRes.ok) {
      const errorMsg = await emailRes.text();
      console.error("Mail API Error:", errorMsg);
      throw new Error("メール配送屋さんが失敗したっぺ");
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Invite Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}