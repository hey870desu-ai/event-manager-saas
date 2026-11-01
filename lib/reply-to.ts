// 配信メールの返信先（サーバーだけ）
//   info@event-manager.app はメールを受け取る設定（MX）が無い＝そこへの返信はだれにも届かない（2026-11-02 に確かめた）。
//   返信先が決まっていないときは、イベントの問い合わせ先 → 会社の連絡先 → 会社の代表の管理者のメール の順に決める
import { adminDb } from '@/lib/firebase-admin';

export const NO_REPLY_ADDRESS = 'info@event-manager.app';

const usable = (v: unknown): string | undefined => {
  const s = String(v ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.toLowerCase() !== NO_REPLY_ADDRESS ? s : undefined;
};

// 決まっている返信先があればそれ（info@ は「無い」と同じに扱う）
export const givenReplyTo = (...candidates: unknown[]) => {
  for (const c of candidates) { const u = usable(c); if (u) return u; }
  return undefined;
};

export async function fallbackReplyTo(tenantId?: string | null, eventId?: string | null): Promise<string | undefined> {
  try {
    if (eventId) {
      const ev = await adminDb.collection('events').doc(String(eventId)).get();
      const c = usable(ev.data()?.contactEmail);
      if (c) return c;
    }
    if (tenantId) {
      const t: any = (await adminDb.collection('tenants').doc(String(tenantId)).get()).data() || {};
      const c = usable(t.contactEmail) || usable(t.ownerEmail);
      if (c) return c;
      const owners = await adminDb.collection('admin_users').where('tenantId', '==', String(tenantId)).where('role', '==', 'owner').limit(1).get();
      if (!owners.empty) return usable(owners.docs[0].id);
    }
  } catch (e) {
    console.warn('返信先を決められませんでした:', e);
  }
  return undefined;
}
