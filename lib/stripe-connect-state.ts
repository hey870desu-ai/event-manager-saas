// Stripe の連携（OAuth）で行って戻ってくるまでの state（サーバーだけ）
//   中身＝テナントIDと期限（30分）。CRON_SECRET で署名し、戻りで確かめる
import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 30 * 60 * 1000;

const sign = (payload: string) => {
  const key = process.env.CRON_SECRET;
  if (!key) throw new Error('CRON_SECRET is missing');
  return createHmac('sha256', key).update(`stripe-connect|${payload}`).digest('base64url');
};

export function signConnectState(tenantId: string, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ t: tenantId, e: now + TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

// 署名が合い、期限内なら テナントID、そうでなければ null
export function verifyConnectState(state: string | null, now = Date.now()): string | null {
  if (!state) return null;
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return null;
  let expected: string;
  try { expected = sign(payload); } catch { return null; }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { t, e } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (typeof t !== 'string' || !t || t.includes('/') || typeof e !== 'number' || e < now) return null;
    return t;
  } catch {
    return null;
  }
}
