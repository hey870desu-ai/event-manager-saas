// 📂 app/api/invite/route.ts
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, tenantId, tenantName } = body;

    // 🚨 ログを出して、ちゃんとメアドが届いてるか確認するぞい！
    console.log("招待を開始するっぺ:", { email, tenantId, tenantName });

    if (!email || typeof email !== "string") {
      throw new Error("メールアドレスが正しく届いてねぇぞい！");
    }

    const actionCodeSettings = {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/admin/login/verify?tenantId=${tenantId}`,
      handleCodeInApp: true,
    };

    const loginLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // 🚨 ここが重要！塙さんの「api/send-email」が何を求めてるか合わせるっぺ
    const emailRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email, // ← こいつが確実に文字列（string）になってる必要があるぞい
        subject: `【絆太郎】${tenantName} 管理画面への招待`,
        category: "invitation",
        inviteUrl: loginLink,
        tenantName: tenantName,
      }),
    });

    if (!emailRes.ok) {
      const errorDetail = await emailRes.text();
      console.error("メールAPIのエラーだばい:", errorDetail);
      throw new Error("メール送信に失敗したっぺ");
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Invite Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}