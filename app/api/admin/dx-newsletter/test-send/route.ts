import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin-auth';
import { sendEmail } from '@/lib/mailer';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// 接続確認用：管理者本人のメアドにシンプルなテストメールを送る
export async function POST(request: Request) {
  let ctx;
  try {
    ctx = await verifyAdminRequest(request);
  } catch (e: any) {
    return NextResponse.json({ error: 'Unauthorized', detail: e?.message }, { status: 401 });
  }

  try {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;">
<tr><td align="center" style="padding:20px 0;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
<tr><td style="background:#1e293b;padding:24px;text-align:center;border-bottom:6px solid #3b82f6;">
<span style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:2px;">BANTARO DX NEWSLETTER</span>
</td></tr>
<tr><td style="padding:32px 24px;color:#334155;line-height:1.8;font-size:14px;">
<p style="margin:0 0 16px 0;font-size:16px;font-weight:bold;color:#0f172a;">テスト送信に成功しました ✅</p>
<p style="margin:0 0 12px 0;">これは <strong>絆太郎「DXメルマガ自動配信」</strong> のテストメールです。</p>
<p style="margin:0 0 12px 0;">送信先: ${ctx.email}<br/>テナントID: ${ctx.tenantId}</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
<p style="margin:0;font-size:12px;color:#64748b;">この設定で本番配信が動くようになります。</p>
</td></tr>
<tr><td style="background:#f8fafc;padding:16px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e5e7eb;">
&copy; ${new Date().getFullYear()} ${ctx.tenantId}
</td></tr>
</table>
</td></tr></table></body></html>`;

    await sendEmail({
      from: `"絆太郎 DXメルマガテスト" <info@event-manager.app>`,
      to: ctx.email,
      subject: '【テスト送信】絆太郎 DXメルマガ自動配信',
      replyTo: 'info@event-manager.app',
      html,
    });

    return NextResponse.json({ ok: true, sentTo: ctx.email });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'send error' }, { status: 500 });
  }
}
