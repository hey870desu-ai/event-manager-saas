import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendBatchEmail, sendEmail } from '@/lib/mailer';
import { fetchReadyDxPages, fetchPagePlainText, fetchPageHtml, fetchPagesByStatus, updatePageStatus, StatusValues } from '@/lib/notion-bridge';
import { upsertScheduledDxNewsletter, getDxIntegration } from '@/lib/dx-newsletter';
import { decrypt } from '@/lib/encryption';
import { createWpPost, findCategoryIdBySlug } from '@/lib/wordpress-bridge';
import { createWpPostXmlRpc } from '@/lib/wordpress-xmlrpc';

const BATCH_SIZE = 100;

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: 最大60秒

// 手動実行用（管理画面から呼ぶ）
export async function POST(request: Request) {
  const { secret } = await request.json().catch(() => ({}));
  if (secret !== process.env.CRON_SECRET && secret !== 'manual-trigger') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return processCron();
}

// Vercel Cron自動実行用
export async function GET() {
  return processCron();
}

async function processCron() {
  try {
    const now = new Date();
    console.log("🤖 CRON: 配信チェック開始...", now.toISOString());

    let totalProcessed = 0;

    // ============================================================
    // 1. 旧形式: mail_queue コレクション（既存の予約メール）
    // ============================================================
    const mailQueueSnap = await adminDb.collection('mail_queue')
      .where('status', '==', 'pending')
      .where('scheduledAt', '<=', now)
      .get();

    for (const queueDoc of mailQueueSnap.docs) {
      const data = queueDoc.data();
      const result = await sendEventMail(data);
      await queueDoc.ref.update({
        status: 'sent',
        sentAt: new Date(),
        result,
      });
      totalProcessed++;
    }

    // ============================================================
    // 2. 新形式: tenants/{tenantId}/scheduled_emails（絆リスト予約配信）
    // ============================================================
    const tenantsSnap = await adminDb.collection('tenants').get();

    for (const tenantDoc of tenantsSnap.docs) {
      const scheduledSnap = await adminDb
        .collection('tenants')
        .doc(tenantDoc.id)
        .collection('scheduled_emails')
        .where('status', '==', 'scheduled')
        .get();

      for (const schedDoc of scheduledSnap.docs) {
        const data = schedDoc.data();
        const scheduledAt = data.scheduledAt;

        // 文字列/Date/Timestamp どれでも比較できるように
        let schedDate: Date;
        if (typeof scheduledAt === 'string') {
          schedDate = new Date(scheduledAt);
        } else if (scheduledAt?.toDate) {
          schedDate = scheduledAt.toDate();
        } else {
          schedDate = new Date(scheduledAt);
        }

        // まだ時間が来ていなければスキップ
        if (schedDate > now) continue;

        console.log(`📧 予約配信を実行: ${data.subject} (${tenantDoc.id})`);

        const result = await sendBatch(data);

        await schedDoc.ref.update({
          status: 'sent',
          sentAt: new Date(),
          result,
        });
        totalProcessed++;

        // Notion 元ページがあれば 配信済み に更新（DXメルマガ用）
        if (data.notionPageId) {
          try {
            let notionToken: string | undefined;
            const integration = await getDxIntegration(tenantDoc.id);
            if (integration?.enabled) {
              notionToken = decrypt(integration.notionApiKey);
            } else if (
              process.env.DX_NEWSLETTER_TENANT_ID === tenantDoc.id &&
              process.env.NOTION_API_KEY
            ) {
              notionToken = process.env.NOTION_API_KEY;
            }
            if (notionToken) {
              const sentAtJst = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
              const note = `✅ 配信完了（${data.recipientCount ?? '?'}名宛・${sentAtJst}）`;
              await updatePageStatus(notionToken, data.notionPageId, StatusValues.SENT, note);
            }
          } catch (notionErr: any) {
            console.error(`⚠ Notion配信済み更新失敗 (${tenantDoc.id}):`, notionErr?.message || notionErr);
          }
        }
      }
    }

    // ============================================================
    // 3. Notion DXレターDB → 配信予約への自動投入（マルチテナント対応）
    // ============================================================
    // 各テナントの tenants/{tid}/integrations/dx_newsletter を見て、
    // enabled なテナントのみ処理する。
    // 旧式 env-based fallback (DX_NEWSLETTER_TENANT_ID + NOTION_API_KEY) も
    // 互換維持のため、integration document が無いテナントに対して機能する。
    const legacyTenantId = process.env.DX_NEWSLETTER_TENANT_ID;
    const legacyToken = process.env.NOTION_API_KEY;

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      let token: string | undefined;
      let databaseId: string | undefined;
      let scheduledTime: string | undefined;

      try {
        // 新方式：integration document
        const integration = await getDxIntegration(tenantId);
        if (integration?.enabled) {
          token = decrypt(integration.notionApiKey);
          databaseId = integration.notionDatabaseId;
          scheduledTime = integration.scheduledTime || '08:00';
        } else if (
          // 旧方式：env-based fallback（caredesignworks など移行前のテナント）
          legacyTenantId === tenantId &&
          legacyToken &&
          !integration  // integration documentが無い場合のみ
        ) {
          token = legacyToken;
          databaseId = '5b51d786-c1bb-42f0-b8c9-a917008eae2d'; // legacy hardcoded
          scheduledTime = '08:00';
        }
      } catch (e: any) {
        console.error(`Tenant ${tenantId} integration load error:`, e?.message || e);
        continue;
      }

      if (!token || !databaseId) continue;

      try {
        const readyPages = await fetchReadyDxPages(token, databaseId);
        for (const page of readyPages) {
          try {
            const { title, body } = await fetchPagePlainText(token, page);
            if (!title || !body) {
              await updatePageStatus(token, page.id, StatusValues.FAILED,
                `⚠ 配信予約失敗：タイトル or 本文が空です`);
              continue;
            }
            const result = await upsertScheduledDxNewsletter({
              tenantId,
              subject: title,
              body,
              scheduledTimeJST: scheduledTime,
              source: 'dx-newsletter-notion-bridge',
              notionPageId: page.id,
            });

            const note = result.alreadySent
              ? `✓ 既に本日分は送信済み（修正不可）`
              : result.updated
                ? `✏ 配信予約を更新（修正版・${result.recipientCount}名宛・予約: ${result.scheduledAt}）`
                : `✉ 絆太郎配信予約済み（${result.recipientCount}名宛・予約: ${result.scheduledAt}・ID: ${result.scheduledId}）`;

            await updatePageStatus(token, page.id, StatusValues.SCHEDULED, note);
            totalProcessed++;
          } catch (perPageErr: any) {
            console.error(`Notion bridge per-page error (tenant=${tenantId}, page=${page.id}):`, perPageErr);
            try {
              await updatePageStatus(token, page.id, StatusValues.FAILED,
                `⚠ 配信予約失敗：${perPageErr?.message || 'unknown error'}`);
            } catch { /* ignore */ }
          }
        }
      } catch (notionErr: any) {
        console.error(`Notion bridge fetch error (tenant=${tenantId}):`, notionErr);
      }
    }

    // ============================================================
    // 4. はなひろHPブログ：Notion → WordPress 自動投稿
    // ============================================================
    // env で設定された場合のみ動作。
    // HANAHIRO_BLOG_AUTO_PUBLISH=true のときは即公開、未設定 or false で下書き保存
    const blogDbId = process.env.HANAHIRO_BLOG_DATABASE_ID;
    const wpSite = process.env.WP_SITE_URL;
    const wpUser = process.env.WP_USERNAME;
    const wpPass = process.env.WP_APP_PASSWORD;
    const blogNotionToken = process.env.NOTION_API_KEY;
    const autoPublish = process.env.HANAHIRO_BLOG_AUTO_PUBLISH === 'true';
    if (blogDbId && wpSite && wpUser && wpPass && blogNotionToken) {
      // WordPress 投稿時に割り当てるカテゴリ（slugで指定 / 1回だけ解決してキャッシュ）
      const categorySlug = process.env.HANAHIRO_BLOG_CATEGORY_SLUG;
      let categoryIds: number[] | undefined = undefined;
      if (categorySlug) {
        try {
          const id = await findCategoryIdBySlug(
            { siteUrl: wpSite, username: wpUser, appPassword: wpPass },
            categorySlug
          );
          if (id) categoryIds = [id];
          else console.warn(`HANAHIRO_BLOG_CATEGORY_SLUG=${categorySlug} に該当するカテゴリが見つかりません`);
        } catch (e: any) {
          console.error('カテゴリ取得失敗:', e?.message || e);
        }
      }

      try {
        const readyBlogPages = await fetchPagesByStatus(blogNotionToken, blogDbId, '🟠 公開準備完了');
        for (const page of readyBlogPages) {
          try {
            const { title, html } = await fetchPageHtml(blogNotionToken, page);
            if (!title || !html) {
              await updatePageStatus(blogNotionToken, page.id, '🔴 公開失敗',
                `⚠ 公開失敗：タイトル or 本文が空です`);
              continue;
            }
            const wpResult = await createWpPost(
              { siteUrl: wpSite, username: wpUser, appPassword: wpPass },
              { title, content: html, status: autoPublish ? 'publish' : 'draft', categories: categoryIds }
            );
            const newStatus = autoPublish ? '🟢 公開済み' : '🔵 投稿予約済み';
            const note = autoPublish
              ? `🌐 WordPress公開済み（ID: ${wpResult.id}）\n公開URL: ${wpResult.link}`
              : `📝 WordPress下書きに投稿済み（ID: ${wpResult.id}）。確認後にWP管理画面で公開してください。\n編集URL: ${wpSite}/wp-admin/post.php?post=${wpResult.id}&action=edit`;
            await updatePageStatus(blogNotionToken, page.id, newStatus, note);
            // 公開URLプロパティ更新
            try {
              await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${blogNotionToken}`,
                  'Notion-Version': '2022-06-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  properties: {
                    '公開URL': { url: wpResult.link },
                  },
                }),
              });
            } catch { /* ignore */ }
            totalProcessed++;
          } catch (perPageErr: any) {
            console.error(`はなひろブログ投稿失敗 (page=${page.id}):`, perPageErr);
            try {
              await updatePageStatus(blogNotionToken, page.id, '🔴 公開失敗',
                `⚠ 投稿失敗：${perPageErr?.message || 'unknown error'}`);
            } catch { /* ignore */ }
          }
        }
      } catch (blogErr: any) {
        console.error('はなひろブログfetch error:', blogErr);
      }
    }

    // ============================================================
    // 5. 福ひろばブログ：Notion → fukuhiroba.com WordPress 自動投稿
    // ============================================================
    // 仕組みはセクション4（はなひろHPブログ）と同じパターン。
    // i-pocket 佐々木さんの対応で Application Passwords 有効化済み（2026-05-12）。
    const fukuBlogDbId = process.env.FUKUHIROBA_BLOG_DATABASE_ID;
    const fukuWpSite = process.env.WP_FUKUHIROBA_SITE_URL;
    const fukuWpUser = process.env.WP_FUKUHIROBA_USERNAME;
    const fukuWpPass = process.env.WP_FUKUHIROBA_APP_PASSWORD;
    const fukuNotionToken = process.env.NOTION_API_KEY;
    const fukuAutoPublish = process.env.FUKUHIROBA_BLOG_AUTO_PUBLISH === 'true';
    // REST APIが書き込み拒否される環境向け：XML-RPCにフォールバック
    const fukuUseXmlRpc = process.env.WP_FUKUHIROBA_USE_XMLRPC === 'true';
    if (fukuBlogDbId && fukuWpSite && fukuWpUser && fukuWpPass && fukuNotionToken) {
      const fukuCategorySlug = process.env.FUKUHIROBA_BLOG_CATEGORY_SLUG;
      let fukuCategoryIds: number[] | undefined = undefined;
      if (fukuCategorySlug && !fukuUseXmlRpc) {
        try {
          const id = await findCategoryIdBySlug(
            { siteUrl: fukuWpSite, username: fukuWpUser, appPassword: fukuWpPass },
            fukuCategorySlug
          );
          if (id) fukuCategoryIds = [id];
          else console.warn(`FUKUHIROBA_BLOG_CATEGORY_SLUG=${fukuCategorySlug} に該当するカテゴリが見つかりません`);
        } catch (e: any) {
          console.error('福ひろばカテゴリ取得失敗:', e?.message || e);
        }
      }

      try {
        const readyFukuPages = await fetchPagesByStatus(fukuNotionToken, fukuBlogDbId, '🟠 公開準備完了');
        for (const page of readyFukuPages) {
          try {
            const { title, html } = await fetchPageHtml(fukuNotionToken, page);
            if (!title || !html) {
              await updatePageStatus(fukuNotionToken, page.id, '🔴 公開失敗',
                `⚠ 公開失敗：タイトル or 本文が空です`);
              continue;
            }
            let wpResult: { id: number; link: string };
            if (fukuUseXmlRpc) {
              const r = await createWpPostXmlRpc(
                { siteUrl: fukuWpSite, username: fukuWpUser, appPassword: fukuWpPass },
                {
                  title,
                  content: html,
                  status: fukuAutoPublish ? 'publish' : 'draft',
                  categoryNames: fukuCategorySlug ? [fukuCategorySlug] : undefined,
                }
              );
              wpResult = r;
            } else {
              const r = await createWpPost(
                { siteUrl: fukuWpSite, username: fukuWpUser, appPassword: fukuWpPass },
                { title, content: html, status: fukuAutoPublish ? 'publish' : 'draft', categories: fukuCategoryIds }
              );
              wpResult = { id: r.id, link: r.link };
            }
            const newStatus = fukuAutoPublish ? '🟢 公開済み' : '🔵 投稿予約済み';
            const note = fukuAutoPublish
              ? `🌐 fukuhiroba.com 公開済み（ID: ${wpResult.id}）\n公開URL: ${wpResult.link}`
              : `📝 fukuhiroba.com 下書きに投稿済み（ID: ${wpResult.id}）。確認後にWP管理画面で公開してください。\n編集URL: ${fukuWpSite}/wp/wp-admin/post.php?post=${wpResult.id}&action=edit`;
            await updatePageStatus(fukuNotionToken, page.id, newStatus, note);
            try {
              await fetch(`https://api.notion.com/v1/pages/${page.id}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${fukuNotionToken}`,
                  'Notion-Version': '2022-06-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  properties: {
                    '公開URL': { url: wpResult.link },
                  },
                }),
              });
            } catch { /* ignore */ }
            totalProcessed++;
          } catch (perPageErr: any) {
            console.error(`福ひろばブログ投稿失敗 (page=${page.id}):`, perPageErr);
            try {
              await updatePageStatus(fukuNotionToken, page.id, '🔴 公開失敗',
                `⚠ 投稿失敗：${perPageErr?.message || 'unknown error'}`);
            } catch { /* ignore */ }
          }
        }
      } catch (fukuErr: any) {
        console.error('福ひろばブログfetch error:', fukuErr);
      }
    }

    console.log(`✅ CRON完了: ${totalProcessed}件処理`);
    return NextResponse.json({ success: true, processed: totalProcessed });

  } catch (error: any) {
    console.error("🔥 CRON Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Resend Batch API で一括送信
async function sendBatch(data: any) {
  const {
    recipients,
    subject,
    body: emailBody,
    senderName,
    replyTo,
    themeColor,
  } = data;

  const displaySender = senderName || "イベント事務局";
  const brandColor = themeColor || "#3b82f6";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.event-manager.app';

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    const emails = batch.map((recipient: any) => {
      let personalBody = emailBody || '';
      personalBody = personalBody.replace(
        /(参加者各位|ご利用者様各位|お客様各位|お取引先様各位)/g,
        `${recipient.name || 'お客様'} 様`
      );
      personalBody = personalBody.replace(/{email}/g, recipient.email);
      // 改行を<br>に変換（メールクライアントのwhite-space非対応対策）
      personalBody = personalBody.replace(/\n/g, '<br>');

      return {
        from: `"${displaySender}" <info@event-manager.app>`,
        to: recipient.email,
        replyTo: replyTo || "info@event-manager.app",
        subject: subject,
        html: `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting"><style>body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}</style></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
        <tr>
          <td style="background:#1e293b;padding:15px 5px;text-align:center;border-bottom:4px solid ${brandColor};">
            <span style="color:#ffffff;font-size:16px;font-weight:bold;">${displaySender}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:15px 5px;">
            <div style="font-size:15px;line-height:1.8;color:#334155;word-break:break-word;overflow-wrap:break-word;">${personalBody}</div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;color:#94a3b8;padding:15px 5px;text-align:center;font-size:10px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-weight:bold;color:#94a3b8;">${displaySender}</p>
            <p style="margin-top:15px;">
              <a href="${appUrl}/unsubscribe?email=${encodeURIComponent(recipient.email)}" style="color:#94a3b8;text-decoration:underline;font-size:11px;">配信停止はこちら</a>
            </p>
            <p style="margin-top:10px;color:#94a3b8;">&copy; ${new Date().getFullYear()} ${displaySender}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`,
      };
    });

    try {
      const result = await sendBatchEmail(emails);
      successCount += result.successCount;
      errorCount += result.errorCount;
    } catch (err: any) {
      console.error(`Batch送信エラー:`, err.message);
      errorCount += batch.length;
    }

    if (i + BATCH_SIZE < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log(`📊 送信結果: 成功=${successCount}, 失敗=${errorCount}`);
  return { success: successCount, failed: errorCount };
}

// セミナー参加者向けメール（mail_queue用）- send-thankyouと同等のHTML
async function sendEventMail(data: any) {
  const { recipients, subject, body: baseBody, senderName, tenantName, eventTitle, eventDate, venueName, replyTo } = data;
  const displaySender = tenantName || senderName || "イベント事務局";
  const headerName = senderName || `${displaySender} 事務局`;

  let successCount = 0;
  let errorCount = 0;

  for (const recipient of recipients) {
    let personalBody = baseBody || '';
    personalBody = personalBody.replace(/{email}/g, recipient.email);
    if (personalBody.includes("参加者各位")) {
      personalBody = personalBody.replace(/参加者各位/g, `${recipient.name} 様`);
    } else {
      personalBody = `${recipient.name} 様\n\n${personalBody}`;
    }

    // QRコード
    if (recipient.id && personalBody.includes("{qr}")) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${recipient.id}&bgcolor=ffffff`;
      const qrHtml = `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 35px 0;">
          <tr><td align="center">
            <table role="presentation" width="280" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.08);">
              <tr><td align="center" style="padding: 30px;">
                <div style="font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px;">Check-in Pass</div>
                <img src="${qrUrl}" width="160" height="160" style="display: block; border: 1px solid #f1f5f9; border-radius: 12px;" />
                <p style="margin: 15px 0 0; font-size: 10px; color: #94a3b8; font-family: monospace;">ID: ${recipient.id}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>`;
      personalBody = personalBody.replace(/{qr}/g, qrHtml);
    } else {
      personalBody = personalBody.replace(/{qr}/g, "");
    }
    // 改行を<br>に変換（メールクライアントのwhite-space非対応対策）
    personalBody = personalBody.replace(/\n/g, '<br>');

    const showEventCard = venueName && venueName !== "―" && venueName !== "オンライン";

    const html = `<!DOCTYPE html>
<html lang="ja" xmlns="http://www.w3.org/1999/xhtml">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="X-UA-Compatible" content="IE=edge"><meta name="x-apple-disable-message-reformatting"><style>body,table,td{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}</style></head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8fafc;">
  <tr>
    <td align="center" style="padding:0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr>
          <td style="background-color:#1e293b;padding:15px 5px;text-align:center;border-bottom:4px solid #3b82f6;">
            <span style="color:#ffffff;font-size:16px;font-weight:bold;">${headerName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:15px 5px;">
            <div style="font-size:15px;line-height:1.8;color:#334155;word-break:break-word;overflow-wrap:break-word;">${personalBody}</div>
            ${showEventCard ? `
              <div style="background-color:#f1f5f9;border-radius:8px;padding:20px;margin-top:30px;">
                <div style="border-left:4px solid #3b82f6;padding-left:15px;">
                  <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">イベント名</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:12px;">${eventTitle}</div>
                  <div style="font-size:11px;color:#64748b;font-weight:700;margin-bottom:4px;">開催日</div>
                  <div style="font-size:15px;font-weight:700;color:#0f172a;">${eventDate}</div>
                </div>
              </div>` : ''}
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;color:#94a3b8;padding:15px 5px;text-align:center;font-size:10px;border-top:1px solid #e2e8f0;">
            © ${new Date().getFullYear()} ${headerName} All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body></html>`;

    try {
      await sendEmail({
        from: `"${displaySender}" <info@event-manager.app>`,
        to: recipient.email,
        subject,
        replyTo: replyTo || "info@event-manager.app",
        html,
      });
      successCount++;
      await new Promise(resolve => setTimeout(resolve, 700));
    } catch {
      errorCount++;
    }
  }

  console.log(`📊 イベントメール送信結果: 成功=${successCount}, 失敗=${errorCount}`);
  return { success: successCount, failed: errorCount };
}
