// 📂 app/api/receipts/route.ts
// 📝 役割：参加者への領収証を作る（PDF を返す）・メールで送る。会社の管理者だけ（verifyCaller・assertTenant）・2026-10-28
//   はじめて出すとき：番号を会社ごと・年ごとに通しで振り（tenants/{tenantId}/meta/receipts）、tenants/{tenantId}/receipts に記録し、申込に番号を書く
//   出し直すとき（申込に番号がある）：記録の中身のまま、同じ番号で PDF を作る・送る
//   作り直すとき（remake）：前の記録を無効にして、新しい番号で出す（PDF に「No.○○ は無効」と書く）
//   送り先は申込のメールアドレスだけ（画面から来たアドレスには送らない）。主催者の名前・住所は出したときの設定を記録に残す
import { NextResponse } from "next/server";
import path from "node:path";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminDb } from "@/lib/firebase-admin";
import { verifyCaller, assertTenant, authErrorResponse } from "@/lib/admin-auth";
import { sendEmail } from "@/lib/mailer";
import { ReceiptDocument, registerReceiptFont } from "@/components/ReceiptPDF";
import { isRegNo, jpDate, receiptFileName, receiptInputError, type ReceiptData } from "@/lib/receipt";

export const runtime = "nodejs";

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const bad = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

class Conflict extends Error {}

export async function POST(request: Request) {
  try {
    const caller = await verifyCaller(request);
    const body = await request.json().catch(() => ({}));
    const action = body.action === "email" ? "email" : "pdf";
    const remake = body.remake === true;
    const eventId = String(body.eventId || "");
    const reservationId = String(body.reservationId || "");
    if (!eventId || !reservationId || eventId.includes("/") || reservationId.includes("/")) return bad(400, "申込が指定されていません");

    const evSnap = await adminDb.collection("events").doc(eventId).get();
    if (!evSnap.exists) return bad(404, "イベントが見つかりません");
    const ev: any = evSnap.data();
    const tenantId = assertTenant(caller, ev.tenantId);
    const resRef = evSnap.ref.collection("reservations").doc(reservationId);
    const rSnap = await resRef.get();
    if (!rSnap.exists) return bad(404, "申込が見つかりません");
    const r: any = rSnap.data();
    const tenantRef = adminDb.collection("tenants").doc(tenantId);
    const receipts = tenantRef.collection("receipts");
    const tenant: any = (await tenantRef.get()).data() || {};

    let data: ReceiptData;
    let receiptId = String(r.receiptId || "");
    if (receiptId && !remake) {
      // 出し直し：記録のまま、同じ番号で
      const snap = await receipts.doc(receiptId).get();
      if (!snap.exists) return bad(404, "領収証の記録が見つかりません");
      data = snap.data().data as ReceiptData;
    } else {
      const input = {
        name: String(body.name || "").trim(),
        amount: Math.round(Number(body.amount)),
        note: String(body.note || "").trim(),
        method: String(body.method || ""),
        issueDate: String(body.issueDate || ""),
      };
      const err = receiptInputError(input);
      if (err) return bad(400, err);
      const issuer = {
        name: String(tenant.legalCompanyName || tenant.orgName || tenant.name || ""),
        address: String(tenant.address || ""),
        phone: String(tenant.phone || ""),
        regNo: isRegNo(tenant.invoiceRegistrationNumber) ? String(tenant.invoiceRegistrationNumber) : "",
      };
      const year = input.issueDate.slice(0, 4);
      const counterRef = tenantRef.collection("meta").doc("receipts");
      const now = new Date();
      // 番号を振る・記録を作る・前の記録を無効にする・申込に書く、をひとまとまりで（同時に押されても番号が重ならない）
      const made = await adminDb.runTransaction(async (tx: any) => {
        const c = await tx.get(counterRef);
        const cur: any = (await tx.get(resRef)).data() || {};
        const prevId = String(cur.receiptId || "");
        if (prevId && !remake) throw new Conflict("この申込の領収証は、もう出ています。画面を開き直してください。");
        const prev = prevId ? await tx.get(receipts.doc(prevId)) : null;
        const prevNo = prev?.exists ? String(prev.data().data?.no || "") : "";
        const next = Number(c.exists ? c.data()?.[year] || 0 : 0) + 1;
        // イベントの名前・開催日・チケットも残す（領収証の下の表に出す）
        const about = {
          ...(ev.title ? { eventTitle: String(ev.title).slice(0, 120) } : {}),
          ...(/^\d{4}-\d{2}-\d{2}$/.test(String(ev.date || "")) ? { eventDate: String(ev.date) } : {}),
          ...(cur.selectedTicket ? { ticket: String(cur.selectedTicket).slice(0, 60) } : {}),
        };
        const d: ReceiptData = { no: `${year}-${String(next).padStart(4, "0")}`, ...input, issuer, ...about, ...(prevNo ? { previousNo: prevNo } : {}) };
        const ref = receipts.doc();
        tx.set(counterRef, { [year]: next }, { merge: true });
        tx.set(ref, { data: d, eventId, reservationId, eventTitle: String(ev.title || ""), email: String(r.email || ""), voided: false, createdAt: now, createdBy: caller.email });
        if (prevId) tx.update(receipts.doc(prevId), { voided: true, voidedAt: now, voidedBy: caller.email, replacedBy: ref.id });
        tx.update(resRef, { receiptId: ref.id, receiptNo: d.no, receiptIssuedAt: now, receiptSentAt: null }); // 作り直したら「送った」は新しい番号で付け直す
        return { id: ref.id, d };
      });
      receiptId = made.id;
      data = made.d;
    }

    registerReceiptFont(path.join(process.cwd(), "public", "fonts", "ipaexg.ttf"));
    const pdf: Buffer = await renderToBuffer(React.createElement(ReceiptDocument, { r: data }) as any);

    if (action === "pdf") {
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(receiptFileName(data.no))}`,
          "X-Receipt-No": data.no,
          "Cache-Control": "no-store",
        },
      });
    }

    // メールで送る（申込のメールアドレスへ）
    const to = String(r.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return bad(400, "この申込にはメールアドレスがありません。PDF を保存してお渡しください。");
    const sender = String(tenant.orgName || tenant.name || "イベント事務局").replace(/["<>\r\n]/g, "");
    const replyTo = String(ev.contactEmail || tenant.ownerEmail || "").trim();
    const html = `<div style="font-family: sans-serif; color: #111827; max-width: 600px; line-height: 1.8;">
<p>${esc(data.name)} 様</p>
<p>「${esc(ev.title)}」の参加費の領収証をお送りします。添付の PDF をご覧ください。</p>
<table style="border-collapse: collapse; font-size: 14px;">
<tr><td style="padding: 4px 16px 4px 0;">領収証の番号</td><td>${esc(data.no)}</td></tr>
<tr><td style="padding: 4px 16px 4px 0;">金額</td><td>${data.amount.toLocaleString("ja-JP")}円（税込）</td></tr>
<tr><td style="padding: 4px 16px 4px 0;">発行日</td><td>${esc(jpDate(data.issueDate))}</td></tr>
</table>
${data.previousNo ? `<p>先にお送りした領収証（No. ${esc(data.previousNo)}）は無効になります。</p>` : ""}
<p>${esc(data.issuer.name)}</p>
</div>`;
    await sendEmail({
      from: `"${sender}" <info@event-manager.app>`,
      to,
      ...(replyTo ? { replyTo } : {}),
      subject: `【領収証】${String(ev.title || "")}`,
      html,
      attachments: [{ filename: receiptFileName(data.no), content: pdf }],
    });
    const sentAt = new Date();
    await receipts.doc(receiptId).update({ sentAt, sentTo: to });
    await resRef.update({ receiptSentAt: sentAt });
    return NextResponse.json({ success: true, no: data.no, sentTo: to });
  } catch (e: any) {
    const denied = authErrorResponse(e);
    if (denied) return denied;
    if (e instanceof Conflict) return bad(409, e.message);
    console.error("❌ 領収証の作成・送信に失敗:", e);
    return bad(500, "領収証を作れませんでした。もう一度押してください。");
  }
}
