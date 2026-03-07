import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { subject, mainTitle, mainMessage, mainImageUrl, snaps, tenantData, recipients } = await req.json();

    // 🏆 スナップ写真をループしてHTMLを組み立てるぞい
    const snapsHtml = snaps.map((snap: any) => `
      <div style="margin-bottom: 40px; padding: 20px; background-color: #f9fafb; border-radius: 20px;">
        <img src="${snap.imageUrl}" style="width: 100%; border-radius: 15px; margin-bottom: 15px;" />
        <h3 style="color: #1f2937; margin: 0 0 10px 0;">● ${snap.title}</h3>
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; font-style: italic;">${snap.comment}</p>
      </div>
    `).join("");

    // 🏆 SNSボタンの組み立て
    const snsIcons = [];
    if (tenantData.instagramUrl) snsIcons.push(`<a href="${tenantData.instagramUrl}" style="margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" width="30" height="30"></a>`);
    if (tenantData.lineUrl) snsIcons.push(`<a href="${tenantData.lineUrl}" style="margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968771.png" width="30" height="30"></a>`);
    
    // 🏆 メールの本体（HTML）
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #374151;">
        <div style="background-color: #1e293b; padding: 40px; text-align: center; border-bottom: 8px solid #3b82f6;">
          <h1 style="color: white; letter-spacing: 5px; text-transform: uppercase; margin: 0;">${tenantData.orgName}</h1>
        </div>
        <img src="${mainImageUrl}" style="width: 100%; display: block;" />
        <div style="padding: 40px;">
          <h2 style="font-size: 28px; color: #111827; margin-bottom: 20px;">${mainTitle}</h2>
          <div style="border-left: 6px solid #3b82f6; padding-left: 20px; font-size: 16px; line-height: 1.8;">
            ${mainMessage.replace(/\n/g, "<br>")}
          </div>
        </div>
        <div style="padding: 0 40px 40px 40px;">
          ${snapsHtml}
        </div>
        <div style="background-color: #f3f4f6; padding: 40px; text-align: center;">
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 20px;">Follow our journey</p>
          ${snsIcons.join("")}
        </div>
        <div style="background-color: #111827; padding: 40px; text-align: center; color: #6b7280; font-size: 10px;">
          <p>※本メールは送信専用です。</p>
          <p style="color: white; font-weight: bold;">${tenantData.orgName}</p>
          <p>〒 ${tenantData.address || ""}</p>
          <p>© ${new Date().getFullYear()} ${tenantData.orgName}</p>
        </div>
      </div>
    `;

    // 🚀 全員に一斉送信！（Resendの魔法だっぺ）
    const data = await resend.emails.send({
      from: "BANTARO <onboarding@resend.dev>", // 本番はドメイン設定するっぺ
      to: recipients,
      subject: subject,
      html: htmlContent,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 });
  }
}