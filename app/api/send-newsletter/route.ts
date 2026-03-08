import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { subject, mainTitle, mainMessage, mainImageUrl, snaps, tenantData, recipients } = await req.json();

    // 🏆 送信元の名前
    const senderName = tenantData.orgName || "BANTARO Partner";

// 🏆 スナップ写真をレイアウト（1枚/3枚/6枚/文章）に合わせて組み立てるぞい！
    const snapsHtml = snaps.map((snap: any) => {
      // 🎯 基本設定
      let width = "98%";
      let display = "block";
      let margin = "0 1% 20px 1%";

      // 🎯 レイアウトに応じて幅を細かく調整（メールソフト用のおもてなし）
      if (snap.layout === 'triple') {
        width = "31%"; // 3枚横並び
        display = "inline-block";
      } else if (snap.layout === 'grid') {
        width = "47%"; // 2枚ずつ（6枚セット）
        display = "inline-block";
      }

      // 🎯 【重要】「文章だけ」ブロックの特別デザインだばい！
      if (snap.layout === 'text') {
        return `
          <div style="width: 98%; margin: 0 1% 20px 1%; background-color: #f0f7ff; border-left: 6px solid #3b82f6; border-radius: 16px; padding: 25px; box-sizing: border-box;">
            <p style="color: #111827; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">${snap.title || ''}</p>
            <p style="color: #4b5563; margin: 0; font-size: 14px; line-height: 1.6;">${snap.comment || ''}</p>
          </div>
        `;
      }

      // 🎯 写真があるブロック（1枚/3枚/6枚）の共通デザイン
      return `
        <div style="width: ${width}; display: ${display}; vertical-align: top; margin: ${margin}; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-sizing: border-box;">
          <img src="${snap.imageUrl}" style="width: 100%; display: block;" />
          <div style="padding: 12px; text-align: left;">
            <p style="color: #111827; margin: 0; font-size: 13px; font-weight: bold;">${snap.title || ''}</p>
            ${snap.comment ? `<p style="color: #6b7280; margin: 5px 0 0 0; font-size: 11px; line-height: 1.4;">${snap.comment}</p>` : ''}
          </div>
        </div>
      `;
    }).join("");

    // 🏆 SNSボタンの共通HTML
    const snsIcons: string[] = [];
    if (tenantData.instagramUrl) snsIcons.push(`<a href="${tenantData.instagramUrl}" style="text-decoration:none; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/174/174855.png" width="32" height="32" style="border-radius:8px;"></a>`);
    if (tenantData.lineUrl) snsIcons.push(`<a href="${tenantData.lineUrl}" style="text-decoration:none; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/5968/5968771.png" width="32" height="32" style="border-radius:8px;"></a>`);
    if (tenantData.facebookUrl) snsIcons.push(`<a href="${tenantData.facebookUrl}" style="text-decoration:none; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/512/124/124010.png" width="32" height="32" style="border-radius:8px;"></a>`);

    // 🏆 一人ひとりに個別のメールを作成（Batch処理だばい！）
    const batchRequests = recipients.map((email: string) => {
      // 🎯 塙さんが見せてくれた「配信停止リンク」をメアドごとに生成するぞい！
      const unsubscribeUrl = `https://event-manager.app/unsubscribe?email=${email}`;

      return {
        from: `"${senderName} ｜ 絆太郎リッチメールシステム" <info@event-manager.app>`,
        to: [email], // 👈 ここを1人だけにすることでプライバシーを守るっぺ！
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: sans-serif;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb;">
                
                <div style="background-color: #1e293b; padding: 40px 20px; text-align: center; border-bottom: 8px solid #3b82f6;">
                  <h1 style="color: #ffffff; letter-spacing: 5px; text-transform: uppercase; margin: 0; font-size: 22px; font-weight: 900;">
                    ${senderName.toUpperCase()}
                  </h1>
                  <p style="color: #60a5fa; font-size: 10px; margin-top: 10px; letter-spacing: 3px; font-weight: bold;">OFFICIAL DIGITAL NEWSLETTER</p>
                </div>

                <img src="${mainImageUrl}" style="width: 100%; display: block;" />

                <div style="padding: 40px 30px;">
                  <h2 style="font-size: 28px; color: #111827; margin: 0 0 25px 0; line-height: 1.2; font-weight: 900;">${mainTitle}</h2>
                  <div style="border-left: 8px solid #3b82f6; padding-left: 20px; font-size: 16px; line-height: 1.8; color: #4b5563;">
                    ${mainMessage.replace(/\n/g, "<br>")}
                  </div>
                </div>

                <div style="padding: 0 30px 40px 30px;">
                  ${snapsHtml}
                </div>

                ${snsIcons.length > 0 ? `
                <div style="background-color: #f9fafb; padding: 40px 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="font-size: 12px; color: #9ca3af; margin-bottom: 20px; font-weight: bold;">Follow our journey</p>
                  <div style="display: inline-block;">${snsIcons.join("")}</div>
                </div>
                ` : ''}

                <div style="background-color: #111827; padding: 50px 30px; text-align: center; color: #9ca3af;">
                  <p style="font-size: 10px; line-height: 1.8; margin-bottom: 30px; opacity: 0.6;">
                    ※本メールは送信専用のため、ご返信いただいてもお答えできません。
                  </p>
                  <div style="height: 1px; background-color: #374151; width: 40px; margin: 0 auto 30px auto;"></div>
                  <p style="color: #ffffff; font-weight: bold; font-size: 14px; margin-bottom: 8px;">${senderName.toUpperCase()}</p>
                  <p style="font-size: 11px; margin-bottom: 25px;">〒 ${tenantData.address || "住所設定なし"}</p>
                  
                  <div style="margin-bottom: 30px;">
                    ${tenantData.homepage ? `<a href="${tenantData.homepage}" style="color: #3b82f6; text-decoration: none; font-size: 11px; font-weight: bold; margin: 0 10px;">公式サイト</a>` : ''}
                    <span style="color: #374151;">|</span>
                    <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline; font-size: 11px; margin: 0 10px;">配信停止</a>
                  </div>

                  <p style="font-size: 9px; opacity: 0.3;">POWERED BY BANTARO STUDIO<br />© ${new Date().getFullYear()} ${senderName.toUpperCase()}</p>
                </div>
              </div>
            </body>
          </html>
        `
      };
    });

    // 🚀 Resendの「Batch送信」で一括個別配信だっぺ！
    const data = await resend.batch.send(batchRequests);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Resend Batch API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}