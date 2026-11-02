// 📂 lib/stripe-express.ts
// 📝 役割：主催者の「参加費の受け取り口座」（Stripe Connect の Express）まわり（サーバーだけ・2026-11-03）
//   参加費は運営の Stripe（イベントシステム絆太郎）で受け取り、受け取り口座へ自動で送る（destination charge）
//   口座の ID は tenants/{id}/private/stripe_express に置く（ルールに無い＝画面からは読めない・書けない）
//   画面に見せる様子は tenants/{id}.cardPayment（ready・detailsSubmitted・payoutsEnabled・due・checkedAt）。会社の管理者も書けるので、
//   決済のときは必ず Stripe で、口座の metadata.tenantId がそのテナントか・送金を受けられるか（transfers が active）を確かめる
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase-admin';

const privRef = (tenantId: string) => adminDb.collection('tenants').doc(tenantId).collection('private').doc('stripe_express');

export async function expressAccountId(tenantId: string): Promise<string | null> {
  const d: any = (await privRef(tenantId).get()).data();
  return d?.accountId || null;
}

export type CardPaymentStatus = {
  ready: boolean;            // 申込のときにカードで払っていただける
  detailsSubmitted: boolean; // 登録の画面を最後まで済ませた
  payoutsEnabled: boolean;   // 口座へ入金できる
  due: number;               // Stripe がまだ求めている項目の数
  disabledReason: string | null;
  checkedAt: Date;
};

export function statusOf(acct: Stripe.Account): CardPaymentStatus {
  const r: any = acct.requirements || {};
  return {
    ready: acct.capabilities?.transfers === 'active' && !!acct.details_submitted,
    detailsSubmitted: !!acct.details_submitted,
    payoutsEnabled: !!acct.payouts_enabled,
    due: (r.currently_due || []).length + (r.past_due || []).length,
    disabledReason: r.disabled_reason || null,
    checkedAt: new Date(),
  };
}

// Stripe に聞いて、テナントの cardPayment を書き直す（口座が無ければ null）
export async function refreshCardPayment(stripe: Stripe, tenantId: string) {
  const id = await expressAccountId(tenantId);
  if (!id) return null;
  const st = statusOf(await stripe.accounts.retrieve(id));
  await adminDb.collection('tenants').doc(tenantId).update({ cardPayment: st });
  return st;
}

// 決済の前の確かめ：このテナントの受け取り口座で、送金を受けられるなら口座の ID
export async function verifiedDestination(stripe: Stripe, tenantId: string): Promise<string | null> {
  const id = await expressAccountId(tenantId);
  if (!id) return null;
  const acct = await stripe.accounts.retrieve(id);
  if (acct.metadata?.tenantId !== tenantId || acct.capabilities?.transfers !== 'active') return null;
  return id;
}

// 受け取り口座を作る（まだ無いときだけ）。入金は毎週金曜日
export async function ensureExpressAccount(stripe: Stripe, tenantId: string, opts: { email: string; name: string; createdBy: string }) {
  const existing = await expressAccountId(tenantId);
  if (existing) return existing;
  const acct = await stripe.accounts.create({
    type: 'express',
    country: 'JP',
    email: opts.email,
    capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    business_profile: {
      name: opts.name.slice(0, 100) || undefined,
      product_description: 'セミナー・研修会・勉強会の参加費（イベントシステム絆太郎で受け取り、この口座へ送金）',
    },
    settings: { payouts: { schedule: { interval: 'weekly', weekly_anchor: 'friday' } } },
    metadata: { tenantId, createdBy: opts.createdBy },
  });
  // 同時に2回押されたときは、先に書かれた方を使う（あとの口座は使わない）
  const id = await adminDb.runTransaction(async (tx: any) => {
    const cur: any = (await tx.get(privRef(tenantId))).data();
    if (cur?.accountId) return cur.accountId as string;
    tx.set(privRef(tenantId), { accountId: acct.id, createdAt: new Date(), createdBy: opts.createdBy });
    return acct.id;
  });
  return id;
}

// 運営の Stripe でコンビニ決済が使えるか（審査が通って有効になったら、自動で選べるようにする）。10分覚えておく
let konbiniCache: { at: number; active: boolean } | null = null;
export async function platformKonbiniActive(stripe: Stripe) {
  if (konbiniCache && Date.now() - konbiniCache.at < 10 * 60 * 1000) return konbiniCache.active;
  let active = false;
  try {
    const me = await stripe.accounts.retrieveCurrent();
    active = me.capabilities?.konbini_payments === 'active';
  } catch (e: any) {
    console.warn('コンビニ決済が使えるかを確かめられませんでした:', e?.message || e);
  }
  konbiniCache = { at: Date.now(), active };
  return active;
}
export const resetKonbiniCache = () => { konbiniCache = null; };
