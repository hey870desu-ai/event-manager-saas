import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin"; // Admin SDKの設定ファイルだばい

export async function POST(req: Request) {
  try {
    const { email, tenantId, tenantName } = await req.json();

    if (!email || !tenantId) {
      return NextResponse.json({ error: "情報が足りねぇぞい" }, { status: 400 });
    }

    // 1. 魔法のリンクの設定
    const actionCodeSettings = {
      // メールのボタンを押した後に飛ばすURL（さっき作った verify ページだっぺ）
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/login/verify?tenantId=${tenantId}`,
      // 必ずウェブブラウザで開かせる設定だぞい
      handleCodeInApp: true,
    };

    // 2. Firebase Admin SDKで「秘密の合鍵（URL）」を生成
    // これがめちゃくちゃ長くて推測不可能な安全なリンクになるんだっぺ
    const loginLink = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // 3. 招待メールを送信（既存のメール送信ロジックや外部サービスを使うべ）
    // ここでは、塙さんが前に作った「/api/send-email」と同じ仕組みをイメージしてるぞい
    const emailRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `【絆太郎】${tenantName} の管理画面への招待だっぺ`,
        // メールの本文に loginLink をボタンとして載せるんだぞい！
        category: "invitation",
        inviteUrl: loginLink,
        tenantName: tenantName,
      }),
    });

    if (!emailRes.ok) throw new Error("メール送信に失敗したっぺ");

    return NextResponse.json({ success: true, message: "招待メールを送ったぞい！" });

  } catch (error: any) {
    console.error("Invite Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}