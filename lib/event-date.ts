// 📂 lib/event-date.ts
// 📝 役割：イベントの日付（"2026-11-15"）を、見る人の時刻帯にかかわらず、その暦の日付として読む
//   new Date("2026-11-15") は世界時の0時になるため、米国の時刻（Google がページを読むときの時刻）では前の日・前の曜日になる。
//   サーバー（世界時）と画面で日付が食い違うと、React が画面を作り直し、Google 用のデータ（ld+json）が2つになる（2026-10-28 本番で確かめた）
//   ここで返す Date は「その日の、見る人の時刻での0時」なので、getFullYear・getMonth・getDate・getDay がそのままその暦の日付になる
export function eventDate(dateStr?: string): Date {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(dateStr as string);
}
