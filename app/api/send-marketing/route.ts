// 📂 app/api/send-marketing/route.ts
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      recipients,  // [{email: '...', name: '...'}, ...]
      subject, 
      body: emailBody, 
      senderName, 
      replyTo,
      themeColor 
    } = body;

    const brandColor = themeColor || "#3b82f6";

    const styles = {
      body: "font-family: sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 20px;",
      container: "max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);",
      header: `background: #1e293b; padding: 25px; text-align: center; border-bottom: 4px solid ${brandColor};`,
      logoText: "color: #ffffff; font-size: 20px; font-weight: bold; text-decoration: none;",
      content: "padding: 40px 30px;",
      greeting: "font-size: 16px; margin-bottom: 25px; line-height: 1.6; color: #1e293b; font-weight: bold;",
      messageBody: "font-size: 15px; line-height: 1.8; color: #334155; white-space: pre-wrap;",
      footer: "background-color: #f8fafc; color: #94a3b8; padding: 30px 20px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0;"
    };

    // 📩 送信処理（一人ずつ順番に、一呼吸おいて届けるぞい）
    // Promise.all(map...) をやめて、for...of ループに変更したっぺ！
    for (const recipient of recipients) {
      // 1. 本文中の「参加者各位」などを個別の「名前 様」に変換
      const personalizedBody = emailBody.replace(
        /(参加者各位|ご利用者様各位|お客様各位|お取引先様各位)/g, 
        `${recipient.name} 様`
      );
      
      try {
        // 2. メール送信実行
        await resend.emails.send({
          // 名前に日本語が入るから、ダブルクォーテーションで囲むのが安全だばい
          from: `"${senderName}" <info@event-manager.app>`,
          to: [recipient.email],
          replyTo: replyTo || "info@event-manager.app",
          subject: subject,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="${styles.body}">
                <div style="${styles.container}">
                  <div style="${styles.header}">
                    <span style="${styles.logoText}">${senderName}</span>
                  </div>
                  <div style="${styles.content}">
                    <div style="${styles.messageBody}">${personalizedBody}</div>
                  </div>
                  <div style="${styles.footer}">
                    <p style="margin: 0; font-weight: bold;">${senderName}</p>
                    <p style="margin-top: 10px; opacity: 0.6;">
                      ※このメールは ${senderName} より大切なお知らせとしてお届けしています。
                    </p>
                    <p style="margin-top: 20px;">
                      © ${new Date().getFullYear()} ${senderName} All rights reserved.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `
        });

        // 🚀 3. 【超重要】Resendの制限（1秒に2通）を守るために 700ms 待機！
        // これで 429 Too Many Requests エラーを完璧に回避するぞい！
        await new Promise(resolve => setTimeout(resolve, 700));

      } catch (err) {
        // 一人失敗しても止まらずに、ログを出して次に行くっぺ！
        console.error(`${recipient.email} への送信エラーだばい:`, err);
      }
    }

    // 全員のループが終わったら成功を返すっぺ
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Marketing Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}