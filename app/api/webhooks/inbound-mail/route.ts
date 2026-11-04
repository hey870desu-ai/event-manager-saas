// 📂 app/api/webhooks/inbound-mail/route.ts
// 絆太郎のアドレスに届いたメールの知らせ（Resend の webhook・email.received）を受けて、送り主の主催者へ回す（2026-11-04）
//   知らせの中身は信じない：email_id で Resend の受け取りの記録を取り直し、宛先が event-manager.app で3日以内のものだけ扱う
//   （同じ Resend に福ひろばの受け取りもある＝ほかのドメインあての知らせも来るので、受け流す）
//   同じ知らせの2回目は inbound_mails/{email_id}（ルールに無い＝画面からは読めない）で止める。
//   Resend の記録が取れないなど回す前に失敗したら、受けた印を消して 5xx＝Resend が時間をおいて送り直す
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/mailer';
import { SUPER_ADMIN_EMAIL } from '@/lib/admin-auth';
import {
  INBOUND_COL, OPERATOR_DAILY_LIMIT, MAX_ATTACH_BYTES,
  addressOf, nameOf, isOurAddress, skipReason, findSentMail, organizerAddress, operatorCountToday, buildForward,
} from '@/lib/inbound-mail';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const RESEND_API = 'https://api.resend.com';
const MAX_AGE_MS = 3 * 24 * 3600 * 1000;
const FROM = '絆太郎 <info@event-manager.app>';

async function resendGet(path: string) {
  const r = await fetch(`${RESEND_API}${path}`, { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` } });
  if (!r.ok) throw new Error(`Resend ${path.split('/').slice(0, 3).join('/')} ${r.status}`);
  return r.json();
}

const addrs = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).map((x) => addressOf(x)).filter(Boolean);

export async function GET() {
  return NextResponse.json({ error: 'POST だけ' }, { status: 405 });
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }); }
  if (body?.type !== 'email.received') return NextResponse.json({ ok: true, ignored: 'ほかの知らせ' });
  const id = String(body?.data?.email_id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'email_id' }, { status: 400 });

  let email: any;
  try {
    email = await resendGet(`/emails/receiving/${encodeURIComponent(id)}`);
  } catch (e: any) {
    console.error('❌ inbound-mail: Resend の受け取りの記録を取れません', e?.message);
    return NextResponse.json({ error: 'resend' }, { status: 502 });
  }

  const rcpts = [...addrs(email?.to), ...addrs(email?.received_for), ...addrs(email?.cc)];
  if (!rcpts.some(isOurAddress)) return NextResponse.json({ ok: true, ignored: 'ほかのドメイン' });
  const created = Date.parse(String(email?.created_at || '').replace(' ', 'T'));
  if (Number.isFinite(created) && Date.now() - created > MAX_AGE_MS) return NextResponse.json({ ok: true, ignored: '古い' });

  const fromAddr = addressOf(email?.from);
  const fromName = nameOf(email?.from);
  const subject = String(email?.subject || '');
  const ref = adminDb.collection(INBOUND_COL).doc(id);
  try {
    await ref.create({ at: new Date(), from: fromAddr, subject: subject.slice(0, 300), to: rcpts.filter(isOurAddress).slice(0, 5), status: 'received' });
  } catch (e: any) {
    if (e?.code === 6 || /already exists/i.test(String(e?.message))) return NextResponse.json({ ok: true, ignored: 'もう受けた' });
    console.error('❌ inbound-mail: 記録を作れません', e?.message);
    return NextResponse.json({ error: 'db' }, { status: 500 });
  }

  let sent = false;
  try {
    const skip = skipReason(fromAddr, email?.headers);
    if (skip) {
      await ref.update({ status: 'ignored', why: skip });
      return NextResponse.json({ ok: true, ignored: skip });
    }

    const found = await findSentMail(fromAddr, subject);
    let to: string | undefined = found.kind === 'match' ? await organizerAddress(found.mail) : undefined;
    let toOperator: { why: string; candidates?: any[] } | null = null;
    if (!to) {
      toOperator = found.kind === 'unknown'
        ? { why: '返信した方に送った主催者が複数あり、件名でも決まりませんでした', candidates: found.candidates }
        : found.kind === 'match'
          ? { why: '主催者の連絡先が分かりませんでした', candidates: [found.mail] }
          : { why: '返信した方に送った記録が見つかりませんでした' };
      if (await operatorCountToday() >= OPERATOR_DAILY_LIMIT) {
        await ref.update({ status: 'held', why: toOperator.why });
        return NextResponse.json({ ok: true, held: true });
      }
      to = SUPER_ADMIN_EMAIL;
    }

    // 添付。本文の中の画像は本文に入っている（data URI）ので回さない
    const atts: { filename: string; content: Buffer }[] = [];
    const notSent: string[] = [];
    let total = 0;
    for (const a of Array.isArray(email?.attachments) ? email.attachments : []) {
      if (a?.content_disposition === 'inline' && a?.content_id) continue;
      const name = String(a?.filename || '添付');
      if (total + (Number(a?.size) || 0) > MAX_ATTACH_BYTES) { notSent.push(name); continue; }
      try {
        const meta = await resendGet(`/emails/receiving/${encodeURIComponent(id)}/attachments/${encodeURIComponent(String(a?.id))}`);
        const r = await fetch(String(meta?.download_url));
        if (!r.ok) throw new Error(String(r.status));
        const buf = Buffer.from(await r.arrayBuffer());
        total += buf.length;
        atts.push({ filename: name, content: buf });
      } catch {
        notSent.push(name);
      }
    }
    const attachNote = notSent.length ? `添付のうち「${notSent.join('」「')}」は回せませんでした。返信した方に送り直しをお願いしてください。` : null;

    const fw = buildForward({
      fromAddr, fromName, subject, html: email?.html, text: email?.text,
      mail: found.kind === 'match' ? found.mail : null, toOperator, attachNote,
    });
    const result = await sendEmail({ from: FROM, to, subject: fw.subject, html: fw.html, replyTo: fromAddr, attachments: atts.length ? atts : undefined });
    sent = true;
    await ref.update({
      status: toOperator ? 'operator' : 'forwarded',
      why: toOperator?.why ?? null,
      tenantId: found.kind === 'match' ? found.mail.tenantId : null,
      how: found.kind === 'match' ? found.how : found.kind,
      sentRef: found.kind === 'match' ? `${found.mail.source}/${found.mail.sourceId}` : null,
      forwardedTo: to,
      forwardId: result?.id ?? null,
      attachments: atts.length,
      attachmentsNotSent: notSent.length,
    });
    return NextResponse.json({ ok: true, forwarded: true, operator: !!toOperator });
  } catch (e: any) {
    console.error('❌ inbound-mail:', e?.message || e);
    if (sent) return NextResponse.json({ ok: true, forwarded: true, note: '記録の書き直しに失敗' });
    // 回す前に失敗した＝受けた印を消して、Resend の送り直しでやり直す
    await ref.delete().catch(() => {});
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
