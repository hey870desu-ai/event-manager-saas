// 配信の1通ずつの「届いたか」の決まり（画面とサーバーの両方で使う。firebase などは読まない）
//   sent              … Resend が受け付けた。相手のサーバーが受け取ったかを確かめているところ
//   delivered         … 相手のメールサーバーが受け取った（迷惑メールのフォルダに入ることはある）
//   delivery_delayed  … 相手のサーバーがすぐに受け取らず、送り直している
//   bounced           … アドレスが無い・受け取りを断られたなどで届かなかった
//   complained        … 受け取った人が迷惑メールとして報告した
//   failed            … 送ることができなかった（Resend が受け付けなかった・送る途中のエラー）
//   suppressed        … 前に届かなかった・報告されたアドレスなので、Resend が送らなかった
//   skipped           … 配信停止の人なので送らなかった
//   untracked         … Resend 以外（SES・Gmail）で送った＝確かめられない
//   unknown           … 3日たっても確かめられなかった
export type DeliveryStatus =
  | 'sent' | 'delivered' | 'delivery_delayed' | 'bounced' | 'complained'
  | 'failed' | 'suppressed' | 'skipped' | 'untracked' | 'unknown';

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'delivered', 'sent', 'delivery_delayed', 'bounced', 'complained', 'failed', 'suppressed', 'skipped', 'untracked', 'unknown',
];

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  delivered: '届いた',
  sent: '確かめ中',
  delivery_delayed: '遅れている',
  bounced: '届かなかった',
  complained: '迷惑メールと報告',
  failed: '送れなかった',
  suppressed: '送らなかった',
  skipped: '配信停止の方',
  untracked: '分からない',
  unknown: '分からない',
};

export const DELIVERY_HINT: Record<DeliveryStatus, string> = {
  delivered: '相手のメールサーバーが受け取りました',
  sent: '相手のサーバーが受け取ったかを確かめています',
  delivery_delayed: '相手のサーバーがすぐに受け取らず、送り直しています',
  bounced: 'アドレスが無い・受け取りを断られたなどで、届きませんでした',
  complained: '受け取った方が、迷惑メールとして報告しました',
  failed: '送ることができませんでした',
  suppressed: '前に届かなかったアドレスなので、送りませんでした',
  skipped: '配信停止の方なので、送りませんでした',
  untracked: '届いたかを確かめられない送り方でした',
  unknown: '3日たっても、届いたかが分かりませんでした',
};

// まだ変わるもの（確かめ続ける）
export const isFinalStatus = (s: DeliveryStatus) => s !== 'sent' && s !== 'delivery_delayed';

// Resend の last_event を、こちらの言い方にする
export const fromResendEvent = (ev: string | null | undefined): DeliveryStatus => {
  switch (ev) {
    case 'delivered': case 'opened': case 'clicked': return 'delivered';
    case 'bounced': return 'bounced';
    case 'complained': return 'complained';
    case 'delivery_delayed': return 'delivery_delayed';
    case 'failed': case 'canceled': return 'failed';
    case 'suppressed': return 'suppressed';
    default: return 'sent'; // queued・scheduled・sent
  }
};

export type DeliveryCounts = Record<DeliveryStatus, number>;
export type DeliveryItemView = { email: string; name: string; status: DeliveryStatus };

// 履歴の記録（mail_queue・scheduled_emails・newsletter_archives）に書く「届いたか」のまとめ
export type DeliverySummary = {
  total: number;
  counts: DeliveryCounts;
  items: DeliveryItemView[];      // 宛先の順
  replyTo: string | null;         // 返信が届くアドレス
  done: boolean;                  // すべて決まった（もう確かめない）
  checkedAt: Date | null;         // 最後に Resend へ問い合わせた時刻
};

export const emptyCounts = (): DeliveryCounts =>
  Object.fromEntries(DELIVERY_STATUSES.map(s => [s, 0])) as DeliveryCounts;

export const summarizeDeliveries = (
  rows: { email: string; name?: string; status: DeliveryStatus; seq?: number }[],
  extra: { replyTo?: string | null; checkedAt?: Date | null } = {},
): DeliverySummary => {
  const sorted = [...rows].sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  const counts = emptyCounts();
  for (const r of sorted) counts[r.status] = (counts[r.status] || 0) + 1;
  return {
    total: sorted.length,
    counts,
    items: sorted.map(r => ({ email: r.email, name: r.name || '', status: r.status })),
    replyTo: extra.replyTo ?? null,
    done: sorted.every(r => isFinalStatus(r.status)),
    checkedAt: extra.checkedAt ?? null,
  };
};

// 一覧の1行に出す短いまとめ（例：届いた 22・届かなかった 1・確かめ中 1）。分からない（2種類）は1つにまとめる
export const deliveryParts = (counts: Partial<DeliveryCounts> | null | undefined) => {
  if (!counts) return [] as { status: DeliveryStatus; label: string; n: number }[];
  const c = { ...emptyCounts(), ...counts };
  const merged: [DeliveryStatus, number][] = DELIVERY_STATUSES
    .filter(s => s !== 'unknown')
    .map(s => [s, s === 'untracked' ? c.untracked + c.unknown : c[s]]);
  return merged.filter(([, n]) => n > 0).map(([status, n]) => ({ status, label: DELIVERY_LABEL[status], n }));
};
