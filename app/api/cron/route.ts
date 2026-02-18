import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin'; // さっきのファイルからインポート
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const dynamic = 'force-dynamic'; // これがないとキャッシュされて動かないことがあります

// このAPIが呼ばれると、ロボットが仕事を始めます
export async function GET() {
  try {
    const now = new Date();
    console.log("🤖 CRON: メール配送チェック開始...", now.toISOString());

    // 1. 「待機中(pending)」かつ「送信時間が来ている(<= now)」メールを探す
    // Firestoreのクエリ
    const snapshot = await adminDb.collection('mail_queue')
      .where('status', '==', 'pending')
      .where('scheduledAt', '<=', now)
      .get();

    if (snapshot.empty) {
      console.log("✅ 送信対象のメールはありませんでした。");
      return NextResponse.json({ success: true, count: 0 });
    }

    console.log(`🚀 ${snapshot.size} 件の予約メールを送信します...`);

    const results = [];

    // 2. 1件ずつ取り出して送信処理
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const { recipients, subject, body: baseBody, senderName, tenantName, eventTitle, eventDate, venueName } = data;
      
      const displaySender = senderName || tenantName || "イベント事務局";
      const fromAddress = "noreply@hana-hiro.com";

      let successCount = 0;
      let failCount = 0;

      // 個別送信ループ
      for (const recipient of recipients) {
        try {
          let personalBody = baseBody;

          // ★追加: {email} を受信者のメアドに書き換える！
          if (personalBody) {
             personalBody = personalBody.replace(/{email}/g, recipient.email);
          }

          if (personalBody && personalBody.includes("参加者各位")) {
            personalBody = personalBody.replace(/参加者各位/g, `${recipient.name} 様`);
          } else {
            personalBody = `${recipient.name} 様\n\n${personalBody || ""}`;
          }

          // HTMLメール組み立て
          const htmlContent = `
            <div style="font-family: sans-serif; padding: 20px; color: #333;">
              <p style="white-space: pre-wrap;">${personalBody}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">
                <strong>${eventTitle}</strong><br>
                ${eventDate || ""} | ${venueName || ""}
              </p>
              <p style="font-size: 10px; color: #999; text-align: center; margin-top: 20px;">
                送信者: ${displaySender}
              </p>
            </div>
          `;

          await resend.emails.send({
            from: `${displaySender} <${fromAddress}>`,
            to: recipient.email,
            subject: subject,
            html: htmlContent,
          });
          successCount++;
        } catch (e) {
          console.error(`❌ ${recipient.email} への送信失敗:`, e);
          failCount++;
        }
      }

      // 3. データベースの状態を「完了(sent)」に更新
      await doc.ref.update({
        status: 'sent',
        sentAt: new Date(),
        result: { success: successCount, failed: failCount }
      });

      results.push({ id: doc.id, success: successCount });
    }

    return NextResponse.json({ success: true, processed: results });

  } catch (error: any) {
    console.error("🔥 CRON Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}