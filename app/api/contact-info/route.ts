// 📂 app/api/contact-info/route.ts
// info.hana-hiro.com からのお問い合わせ受付エンドポイント
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const ALLOWED_ORIGINS = [
  'https://info.hana-hiro.com',
  'http://info.hana-hiro.com',
  'http://localhost:8000',
  'http://localhost:5500',
];

const SPAM_KEYWORDS = [
  'viagra', 'casino', 'lottery', 'crypto', 'bitcoin investment',
  'loan offer', 'click here to', 'congratulations you won',
  '無料で稼ぐ', '副業 月収', 'mlm',
];
const MAX_URLS_IN_MESSAGE = 3;
const MIN_FORM_TIME_MS = 3000;

const recentSubmissions = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 1000;

function corsHeaders(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function countUrls(text: string): number {
  return (text.match(/(https?:\/\/[^\s]+)/g) || []).length;
}

function containsSpamKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SPAM_KEYWORDS.some(kw => lower.includes(kw));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request.headers.get('origin')) });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  try {
    const body = await request.json();
    const { name, phone, email, relationship, inquiryType, message, source, _hp, _ts } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'お名前・メール・内容は必須です' }, { status: 400, headers });
    }

    if (_hp) {
      console.log('🤖 Honeypot triggered:', email);
      return NextResponse.json({ success: true }, { headers });
    }

    const elapsed = Date.now() - Number(_ts || 0);
    if (elapsed < MIN_FORM_TIME_MS) {
      console.log('🤖 Too fast:', email, `${elapsed}ms`);
      return NextResponse.json({ success: true }, { headers });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400, headers });
    }

    if (countUrls(message) > MAX_URLS_IN_MESSAGE) {
      return NextResponse.json({ success: true }, { headers });
    }

    if (containsSpamKeywords(message) || containsSpamKeywords(name)) {
      return NextResponse.json({ success: true }, { headers });
    }

    const lastSubmission = recentSubmissions.get(email);
    if (lastSubmission && Date.now() - lastSubmission < RATE_LIMIT_MS) {
      return NextResponse.json({ error: '少し時間をおいてから再度お試しください' }, { status: 429, headers });
    }
    recentSubmissions.set(email, Date.now());

    if (message.length > 5000) {
      return NextResponse.json({ error: 'メッセージが長すぎます' }, { status: 400, headers });
    }

    // Firestoreに保存
    await adminDb.collection('hanahiro_contacts').add({
      name: String(name).slice(0, 100),
      phone: String(phone || '').slice(0, 50),
      email: String(email).slice(0, 200),
      relationship: String(relationship || '').slice(0, 50),
      inquiryType: String(inquiryType || '').slice(0, 50),
      message: String(message).slice(0, 5000),
      source: String(source || 'info.hana-hiro.com').slice(0, 100),
      createdAt: new Date(),
      status: 'unread',
    });

    // 通知メール
    const safeName = escapeHtml(String(name));
    const safePhone = phone ? escapeHtml(String(phone)) : '（未入力）';
    const safeEmail = escapeHtml(String(email));
    const safeRel = relationship ? escapeHtml(String(relationship)) : '（未選択）';
    const safeType = inquiryType ? escapeHtml(String(inquiryType)) : '（未選択）';
    const safeMessage = escapeHtml(String(message));
    const safeSource = escapeHtml(String(source || 'info.hana-hiro.com'));

    try {
      await resend.emails.send({
        from: '"はなひろ お問い合わせ" <info@event-manager.app>',
        to: ['hanawa@hana-hiro.com', 'toyoshima@hana-hiro.com'],
        replyTo: String(email),
        subject: `【はなひろ】お問い合わせ: ${name}様（${inquiryType || '種別未選択'}）`,
        html: `
          <div style="font-family:'Helvetica Neue',Arial,sans-serif;color:#1f2933;padding:20px;background:#fbf9f4;">
            <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e3dccc;overflow:hidden;">
              <div style="background:#1f2933;padding:20px;text-align:center;">
                <span style="color:#fff;font-size:16px;font-weight:600;letter-spacing:0.1em;">お問い合わせ通知</span>
              </div>
              <div style="padding:24px 28px;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.7;">
                  <tr><td style="padding:8px 0;color:#5d6068;width:110px;">お名前</td><td style="padding:8px 0;font-weight:600;color:#1f2933;">${safeName}</td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;">ご関係</td><td style="padding:8px 0;color:#1f2933;border-top:1px solid #f0eadb;">${safeRel}</td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;">電話</td><td style="padding:8px 0;color:#1f2933;border-top:1px solid #f0eadb;"><a href="tel:${safePhone}" style="color:#a87827;text-decoration:none;">${safePhone}</a></td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;">メール</td><td style="padding:8px 0;color:#1f2933;border-top:1px solid #f0eadb;"><a href="mailto:${safeEmail}" style="color:#a87827;text-decoration:none;">${safeEmail}</a></td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;">お問い合わせ種別</td><td style="padding:8px 0;color:#1f2933;border-top:1px solid #f0eadb;">${safeType}</td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;vertical-align:top;">内容</td><td style="padding:8px 0;color:#1f2933;border-top:1px solid #f0eadb;white-space:pre-wrap;">${safeMessage}</td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;">送信元</td><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;font-size:12px;">${safeSource}</td></tr>
                  <tr><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;">受信日時</td><td style="padding:8px 0;color:#5d6068;border-top:1px solid #f0eadb;font-size:12px;">${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td></tr>
                </table>
                <div style="margin-top:18px;padding:12px;background:#f4ead6;border-radius:4px;font-size:12px;color:#5d6068;">
                  「返信」を押すとそのままお問い合わせ者にメール返信できます（Reply-To 設定済み）。
                </div>
              </div>
            </div>
          </div>
        `,
      });
    } catch (e) {
      console.warn('通知メール送信失敗:', e);
    }

    return NextResponse.json({ success: true }, { headers });
  } catch (error: any) {
    console.error('Contact-info API Error:', error);
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500, headers });
  }
}
