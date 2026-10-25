import { NextResponse } from "next/server";
import { adminDb } from '@/lib/firebase-admin';
import { verifyCaller, assertTenant, authErrorResponse } from '@/lib/admin-auth';
import { buildAudience } from '@/lib/kizuna-list';
import { sanitizeContent, sendNewsletter, type NlRecipient } from '@/lib/newsletter-send';

export const maxDuration = 60;

// メルマガ（写真入りのメール）を送る。ログインした管理者が、自分のテナントの絆リストの人にだけ送れる
//   mode: 'test'     … ログインした本人にだけ「【テスト】」で送る（宛名は sampleName）
//         'now'      … 今すぐ送る。送った結果を履歴（newsletter_archives）に残す
//         'schedule' … 予約配信（tenants/{id}/scheduled_emails に kind: 'newsletter' で入れ、cron が送る）
//   content は写真を焼き込み済みの https の URL で受け取る（lib/newsletter-email.ts の NlContent）
export async function POST(req: Request) {
  try {
    const caller = await verifyCaller(req);
    const body = await req.json();
    const tenantId = assertTenant(caller, body.tenantId);
    const content = sanitizeContent(body.content);
    if (!content) return NextResponse.json({ error: '件名を入れてください' }, { status: 400 });
    const mode = body.mode;
    const editor = body.editor && JSON.stringify(body.editor).length <= 300_000 ? body.editor : null; // 作る画面に戻すための元の状態

    if (mode === 'test') {
      const r = await sendNewsletter({ tenantId, content, recipients: [{ email: caller.email, name: String(body.sampleName || '') }], subjectPrefix: '【テスト】' });
      if (!r.successCount) return NextResponse.json({ error: 'テストメールを送れませんでした' }, { status: 502 });
      return NextResponse.json({ success: true, to: caller.email });
    }
    if (mode !== 'now' && mode !== 'schedule') return NextResponse.json({ error: '送り方が分かりません' }, { status: 400 });

    // 宛先はそのテナントの絆リスト（名刺・CSV・申込者。配信停止の人はもう外れている）の人だけ
    const { recipients: audience } = await buildAudience(tenantId);
    const byEmail = new Map(audience.map(a => [a.email, a]));
    const recipients: NlRecipient[] = [];
    const seen = new Set<string>();
    for (const r of Array.isArray(body.recipients) ? body.recipients : []) {
      const email = String(r?.email ?? r ?? '').trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      const a = byEmail.get(email);
      if (!a) return NextResponse.json({ error: '絆リストにない宛先（配信停止の人を含む）が入っています。画面を読み込み直してください' }, { status: 400 });
      seen.add(email);
      recipients.push({ email, name: a.name });
    }
    if (recipients.length === 0) return NextResponse.json({ error: '送る相手を選んでください' }, { status: 400 });

    const archives = adminDb.collection('newsletter_archives');
    if (mode === 'schedule') {
      const at = new Date(String(body.scheduledAt || ''));
      if (isNaN(at.getTime()) || at.getTime() < Date.now() - 60_000) return NextResponse.json({ error: '予約の日時が正しくありません' }, { status: 400 });
      const archiveRef = archives.doc();
      const sched = await adminDb.collection('tenants').doc(tenantId).collection('scheduled_emails').add({
        kind: 'newsletter',
        subject: content.subject,
        body: '（写真入りのメルマガ。中身はメルマガの画面の履歴で見られます）',
        content,
        recipients,
        recipientCount: recipients.length,
        scheduledAt: at.toISOString(),
        status: 'scheduled',
        archiveId: archiveRef.id,
        createdBy: caller.email,
        createdAt: new Date().toISOString(),
      });
      await archiveRef.set({
        tenantId, status: 'scheduled', subject: content.subject, content, editor,
        recipientCount: recipients.length, scheduledAt: at, scheduledId: sched.id,
        createdBy: caller.email, createdAt: new Date(),
      });
      return NextResponse.json({ success: true, scheduledId: sched.id, archiveId: archiveRef.id, recipientCount: recipients.length });
    }

    const result = await sendNewsletter({ tenantId, content, recipients });
    const archiveRef = await archives.add({
      tenantId, status: result.successCount ? 'sent' : 'failed', subject: content.subject, content, editor,
      recipientCount: recipients.length, successCount: result.successCount, errorCount: result.errorCount,
      createdBy: caller.email, createdAt: new Date(), sentAt: new Date(),
    });
    if (!result.successCount) {
      return NextResponse.json({ success: false, ...result, error: 'メールを送れませんでした（だれにも届いていません）' }, { status: 502 });
    }
    return NextResponse.json({ success: true, ...result, archiveId: archiveRef.id });
  } catch (error: any) {
    const denied = authErrorResponse(error);
    if (denied) return denied;
    console.error("send-newsletter error:", error);
    return NextResponse.json({ error: error?.message || 'error' }, { status: 500 });
  }
}
