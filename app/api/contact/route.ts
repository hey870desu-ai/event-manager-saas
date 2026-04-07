// 📂 app/api/contact/route.ts
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// スパム判定用の設定
const SPAM_KEYWORDS = [
  'viagra', 'casino', 'lottery', 'crypto', 'bitcoin investment',
  'loan offer', 'click here to', 'congratulations you won',
  '無料で稼ぐ', '副業 月収', 'mlm', 'нужна', 'кредит',
];
const MAX_URLS_IN_MESSAGE = 3;
const MIN_FORM_TIME_MS = 3000; // 3秒未満で送信されたらボット扱い

// 簡易レート制限（メモリベース、本番ではRedisが望ましい）
const recentSubmissions = new Map<string, number>();
const RATE_LIMIT_MS = 60 * 1000; // 同一メールから1分以内の連続送信を拒否

function countUrls(text: string): number {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return (text.match(urlRegex) || []).length;
}

function containsSpamKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SPAM_KEYWORDS.some(kw => lower.includes(kw));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, message, _hp, _ts } = body;

    // 1. 必須項目チェック
    if (!name || !email || !message) {
      return NextResponse.json({ error: '必須項目を入力してください' }, { status: 400 });
    }

    // 2. Honeypot: 隠しフィールドに値が入っていたらボット確定
    if (_hp) {
      console.log('🤖 Honeypot triggered:', email);
      // 成功レスポンスを返す（ボットに気づかせない）
      return NextResponse.json({ success: true });
    }

    // 3. 送信時間チェック: 3秒未満で送信されたらボット
    const elapsed = Date.now() - Number(_ts || 0);
    if (elapsed < MIN_FORM_TIME_MS) {
      console.log('🤖 Too fast submission:', email, `${elapsed}ms`);
      return NextResponse.json({ success: true });
    }

    // 4. メールアドレス形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 });
    }

    // 5. URLの数チェック（スパムは大量のURLを含む）
    if (countUrls(message) > MAX_URLS_IN_MESSAGE) {
      console.log('🤖 Too many URLs:', email);
      return NextResponse.json({ success: true });
    }

    // 6. スパムキーワードチェック
    if (containsSpamKeywords(message) || containsSpamKeywords(name)) {
      console.log('🤖 Spam keywords:', email);
      return NextResponse.json({ success: true });
    }

    // 7. レート制限: 同一メールから1分以内の連続送信を拒否
    const lastSubmission = recentSubmissions.get(email);
    if (lastSubmission && Date.now() - lastSubmission < RATE_LIMIT_MS) {
      return NextResponse.json({ error: '少し時間をおいてから再度お試しください' }, { status: 429 });
    }
    recentSubmissions.set(email, Date.now());

    // 8. メッセージの長さチェック
    if (message.length > 5000) {
      return NextResponse.json({ error: 'メッセージが長すぎます' }, { status: 400 });
    }

    // 9. Firestoreに保存
    await adminDb.collection('contacts').add({
      name: String(name).slice(0, 100),
      email: String(email).slice(0, 200),
      company: String(company || '').slice(0, 200),
      message: String(message).slice(0, 5000),
      createdAt: new Date(),
      status: 'unread',
    });

    // 10. オーナーに通知メール
    try {
      await resend.emails.send({
        from: `"絆太郎 通知" <info@event-manager.app>`,
        to: ['hey870desu@gmail.com'],
        subject: `【絆太郎】新しいお問い合わせ: ${name}様`,
        html: `
          <div style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #334155; padding: 20px; background-color: #f8fafc;">
            <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden;">
              <div style="background: #0f172a; padding: 24px; text-align: center;">
                <span style="color: #fff; font-size: 18px; font-weight: bold;">お問い合わせ通知</span>
              </div>
              <div style="padding: 28px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr><td style="padding: 8px 0; color: #94a3b8; width: 100px;">お名前</td><td style="padding: 8px 0; font-weight: bold; color: #0f172a;">${name}</td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">会社・団体名</td><td style="padding: 8px 0; color: #0f172a; border-top: 1px solid #f1f5f9;">${company || '（未入力）'}</td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">メール</td><td style="padding: 8px 0; color: #4f46e5; border-top: 1px solid #f1f5f9;"><a href="mailto:${email}" style="color: #4f46e5;">${email}</a></td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8; border-top: 1px solid #f1f5f9; vertical-align: top;">内容</td><td style="padding: 8px 0; color: #0f172a; border-top: 1px solid #f1f5f9; white-space: pre-wrap; line-height: 1.7;">${message.replace(/</g, '&lt;')}</td></tr>
                  <tr><td style="padding: 8px 0; color: #94a3b8; border-top: 1px solid #f1f5f9;">日時</td><td style="padding: 8px 0; color: #64748b; border-top: 1px solid #f1f5f9;">${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}</td></tr>
                </table>
              </div>
            </div>
          </div>
        `
      });
    } catch (e) {
      console.warn('通知メール送信失敗:', e);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Contact API Error:', error);
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 });
  }
}
