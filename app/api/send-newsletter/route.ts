import { NextResponse } from "next/server";
import { sendBatchEmail } from '@/lib/mailer';

const FONT_MAP: Record<string, string> = {
  sans: "'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif",
  serif: "'Hiragino Mincho ProN', 'Noto Serif JP', Georgia, serif",
  rounded: "'Hiragino Maru Gothic ProN', 'M PLUS Rounded 1c', sans-serif",
  mono: "'Courier New', 'SF Mono', monospace",
  impact: "'Impact', 'Arial Black', sans-serif",
  cursive: "'Zen Kurenaido', 'Segoe Script', cursive",
};

export async function POST(req: Request) {
  try {
    const { subject, mainTitle, mainMessage, mainImageUrl, snaps, tenantData, recipients } = await req.json();

    // 🏆 送信元の名前
    const senderName = tenantData.orgName || "BANTARO Partner";

// 🏆 【超・改良版】文章と写真を完璧にサンドイッチするロジックだばい！
    const rows: any[] = [];
    let currentRow: any[] = [];

    snaps.forEach((snap: any) => {
      const layout = snap.layout || 'full';

      // 🎯 独立ブロック（文章・1枚もの・区切り・ボタン・強調）は「割り込み」として扱う
      if (layout === 'text' || layout === 'full' || layout === 'divider' || layout === 'button' || layout === 'highlight') {
        // 1. もし待機中の写真があれば、先にそれを1行として確定させるっぺ！
        if (currentRow.length > 0) {
          rows.push({ items: [...currentRow], layout: currentRow[0].layout });
          currentRow = [];
        }
        // 2. 文章やフルサイズを、独立した「1行」として追加するぞい！
        rows.push({ items: [snap], layout: layout });
      } else {
        // 🎯 3連(triple)や2連(grid)の時
        // もし違うレイアウトが混ざりそうなら、一旦区切る
        if (currentRow.length > 0 && currentRow[0].layout !== layout) {
          rows.push({ items: [...currentRow], layout: currentRow[0].layout });
          currentRow = [];
        }
        
        currentRow.push(snap);

        // 🎯 3枚または2枚たまったら1行確定！
        const limit = layout === 'triple' ? 3 : 2;
        if (currentRow.length === limit) {
          rows.push({ items: [...currentRow], layout: layout });
          currentRow = [];
        }
      }
    });
    // 最後に残った写真たちも忘れずに回収！
    if (currentRow.length > 0) {
      rows.push({ items: [...currentRow], layout: currentRow[0].layout });
    }

    // 🏆 HTML組み立て：直角・高さ固定・読み込み対策版だばい！
    const snapsHtml = rows.map((row: any) => {
      const layout = row.layout;

      // 区切り線ブロック
      if (layout === 'divider') {
        return `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
            <tr><td style="padding: 0 30px;"><hr style="border: none; border-top: 1px solid #e2e8f0; margin: 0;" /></td></tr>
          </table>
        `;
      }

      // ボタンブロック
      if (layout === 'button') {
        const s = row.items[0];
        const btnColor = s.buttonColor || '#3b82f6';
        const btnUrl = s.buttonUrl || '#';
        const btnText = s.title || 'クリック';
        return `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
            <tr>
              <td align="center" style="padding: 10px 0;">
                <a href="${btnUrl}" target="_blank" style="display: inline-block; background-color: ${btnColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 900; letter-spacing: 1px;">${btnText}</a>
              </td>
            </tr>
          </table>
        `;
      }

      // 強調テキストブロック
      if (layout === 'highlight') {
        const s = row.items[0];
        const bgColor = s.blockBgColor || '#eff6ff';
        const textColor = s.blockTextColor || '#1e40af';
        return `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
            <tr>
              <td style="background-color: ${bgColor}; padding: 25px; border-radius: 8px;">
                <p style="color: ${textColor}; margin: 0; font-size: 18px; font-weight: 900;">${s.title || ''}</p>
                ${s.comment ? `<p style="color: ${textColor}; margin: 10px 0 0 0; font-size: 14px; line-height: 1.8; white-space: pre-wrap; opacity: 0.85;">${s.comment}</p>` : ''}
              </td>
            </tr>
          </table>
        `;
      }

      // 文章ブロック
      if (layout === 'text') {
        const s = row.items[0];
        const ff = FONT_MAP[s.fontFamily || 'sans'] || FONT_MAP.sans;
        const tfs = `${s.titleFontSize || 18}px`;
        const bfs = `${s.bodyFontSize || 14}px`;
        return `
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
            <tr>
              <td style="background-color: #f8fafc; border-left: 6px solid #3b82f6; padding: 25px;">
                <p style="color: #1e293b; margin: 0; font-size: ${tfs}; font-weight: 900; font-family: ${ff};">${s.title || '編集後記'}</p>
                <p style="color: #4b5563; margin: 10px 0 0 0; font-size: ${bfs}; line-height: 1.8; white-space: pre-wrap; font-family: ${ff};">${s.comment || ''}</p>
              </td>
            </tr>
          </table>
        `;
      }

      // 🎯 写真ブロック：サイズ固定で読み込み中のガタつきを防ぐ！
      const cellWidth = layout === 'triple' ? "33.3%" : layout === 'grid' ? "50%" : "100%";
      const imgHeight = layout === 'triple' ? "120" : layout === 'grid' ? "180" : "auto";
      
      return `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; table-layout: fixed;">
          <tr>
            ${row.items.map((s: any) => {
              const ff = FONT_MAP[s.fontFamily || 'sans'] || FONT_MAP.sans;
              const tfs = `${s.titleFontSize || 11}px`;
              const bfs = `${s.bodyFontSize || 11}px`;
              return `
              <td width="${cellWidth}" valign="top" style="padding: 5px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td bgcolor="#f1f5f9" style="height: ${imgHeight}px; overflow: hidden; border-radius: 0;">
                      <img src="${s.imageUrl}" width="100%" height="${imgHeight}" style="width: 100%; height: ${imgHeight}px; object-fit: cover; display: block; border-radius: 0;" border="0" />
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 2px;">
                      <p style="color: #111827; margin: 0; font-size: ${tfs}; font-weight: 900; line-height: 1.2; font-family: ${ff};">${s.title || ''}</p>
                      ${s.comment ? `<p style="color: #6b7280; margin: 4px 0 0 0; font-size: ${bfs}; line-height: 1.6; white-space: pre-wrap; font-family: ${ff};">${s.comment}</p>` : ''}
                    </td>
                  </tr>
                </table>
              </td>
            `}).join("")}
            ${layout === 'triple' && row.items.length < 3 ? `<td width="33.3%">&nbsp;</td>`.repeat(3 - row.items.length) : ""}
            ${layout === 'grid' && row.items.length < 2 ? `<td width="50%">&nbsp;</td>` : ""}
          </tr>
        </table>
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

    const emails = batchRequests.map((r: any) => ({
      from: r.from,
      to: r.to[0],
      subject: r.subject,
      html: r.html,
    }));

    const result = await sendBatchEmail(emails);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Resend Batch API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}