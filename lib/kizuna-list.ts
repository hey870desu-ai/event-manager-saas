// 絆リスト（メルマガの宛先）をサーバーで組み立てる。絆リストの画面（app/admin/marketing）と同じ決まり：
//   ・名刺・CSV・手入力（manual_contacts）と、テナントのイベントの申込者を、メールアドレス（小文字）で1人にまとめる
//   ・配信停止（marketing_optouts）の人は入れない。メールの無い名刺（電話だけ）も入れない
//   ・手で直した宛名（source: manual_edit）は申込の名前で上書きしない。それ以外は新しい申込の名前を使う
//   ・「仮登録中」などの名前は空にする
import { adminDb } from '@/lib/firebase-admin';
import { INVALID_NAMES } from '@/lib/dx-newsletter';

export type AudienceEntry = {
  email: string;
  name: string;
  company: string;
  fromList: boolean;     // 名刺・CSV・手入力にいる
  eventIds: string[];    // 申し込んだイベント（新しい順）
};

export async function buildAudience(tenantId: string) {
  const [optOutSnap, manualSnap, eventsSnap] = await Promise.all([
    adminDb.collection('marketing_optouts').get(),
    adminDb.collection('tenants').doc(tenantId).collection('manual_contacts').get(),
    adminDb.collection('events').where('tenantId', '==', tenantId).get(),
  ]);
  const blocked = new Set(optOutSnap.docs.map((d: any) => String(d.id).trim().toLowerCase()));
  const map = new Map<string, AudienceEntry & { _pinned: boolean; _at: number; _evAt: Map<string, number> }>();
  let excluded = 0;

  manualSnap.docs.forEach((doc: any) => {
    const d = doc.data() || {};
    const email = String(d.email || '').trim().toLowerCase();
    if (!email) return;
    if (blocked.has(email)) { excluded++; return; }
    map.set(email, { email, name: d.name || '', company: d.company || '', fromList: true, eventIds: [], _pinned: d.source === 'manual_edit', _at: 0, _evAt: new Map() });
  });

  const events = eventsSnap.docs.map((d: any) => ({ id: d.id, title: d.data()?.title || '', date: d.data()?.date || '', status: d.data()?.status || '' }));
  const lists = await Promise.all(eventsSnap.docs.map((ev: any) => ev.ref.collection('reservations').get()));
  lists.forEach((res: any, i: number) => {
    const eventId = events[i].id;
    res.docs.forEach((rdoc: any) => {
      const data = rdoc.data() || {};
      const email = String(data.email || '').trim().toLowerCase();
      if (!email || !data.name) return;
      if (blocked.has(email)) { excluded++; return; }
      const at = data.createdAt?.toDate?.()?.getTime?.() || 0;
      let e = map.get(email);
      if (!e) {
        e = { email, name: data.name, company: data.company || data.department || '', fromList: false, eventIds: [], _pinned: false, _at: at, _evAt: new Map() };
        map.set(email, e);
      } else if (!e._pinned && at >= e._at) {
        e.name = data.name;
        e.company = data.company || data.department || e.company;
        e._at = at;
      }
      e._evAt.set(eventId, Math.max(e._evAt.get(eventId) || 0, at));
    });
  });

  const recipients: AudienceEntry[] = Array.from(map.values()).map(e => ({
    email: e.email,
    name: INVALID_NAMES.has(String(e.name || '').trim()) ? '' : String(e.name || ''),
    company: e.company || '',
    fromList: e.fromList,
    eventIds: Array.from(e._evAt.entries()).sort((a, b) => b[1] - a[1]).map(([id]) => id),
  }));
  events.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  return { recipients, events, excluded };
}
