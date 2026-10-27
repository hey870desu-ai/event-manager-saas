// 📂 lib/event-seo.ts
// 📝 役割：お客様（テナント）のイベントのページを検索に出すための決まり（2026-10-28 塙さん「検索に出す設定でいいよ」）
//   - 検索に出すのは「公開中」で、編集画面の「検索に出さない」に印が無いイベントだけ
//   - Google のイベント用のデータ（schema.org の Event）を作る。Zoom の URL など参加者だけに知らせるものは入れない
import { SITE_URL } from "@/lib/site";

export const eventPageUrl = (tenantId: string, eventId: string) => `${SITE_URL}/t/${tenantId}/e/${eventId}`;

export const isEventIndexable = (event: any) => !!event && event.status === "published" && event.searchHidden !== true;

// "2026-11-15" と "14:00" → "2026-11-15T14:00:00+09:00"（形が違えば undefined）
export function jstDateTime(date?: string, time?: string) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  if (!time) return date;
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return date;
  return `${date}T${m[1].padStart(2, "0")}:${m[2]}:00+09:00`;
}

// 本文の Markdown・HTML の記号を落として、説明文に使える長さにする
export function plainText(s: string, max = 300) {
  const t = String(s || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^[#>*\-\s]+/gm, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const chars = Array.from(t);
  return chars.length > max ? chars.slice(0, max).join("") + "…" : t;
}

const isHttpUrl = (u?: string) => !!u && /^https?:\/\//.test(u);

// Google のイベント用のデータ。開始の日時が読めないときは作らない（Google の必須項目のため）
export function eventJsonLd(event: any, tenant: any, tenantId: string, eventId: string) {
  const startDate = jstDateTime(event.date, event.startTime);
  if (!event?.title || !startDate) return null;
  const url = eventPageUrl(tenantId, eventId);
  const organizerName = tenant?.orgName || tenant?.name || "";

  const hasOffline = event.hasOffline ?? true;
  const hasOnline = event.hasOnline === true;
  const mode = hasOffline && hasOnline ? "MixedEventAttendanceMode" : hasOnline ? "OnlineEventAttendanceMode" : "OfflineEventAttendanceMode";

  const location: any[] = [];
  if (hasOffline && (event.venueName || event.venueAddress)) {
    location.push({
      "@type": "Place",
      name: event.venueName || event.venueAddress,
      address: { "@type": "PostalAddress", streetAddress: event.venueAddress || event.venueName, addressCountry: "JP" },
    });
  }
  if (hasOnline) location.push({ "@type": "VirtualLocation", url });

  const lecturers: any[] = Array.isArray(event.lecturers) && event.lecturers.length
    ? event.lecturers
    : event.lecturer ? [{ name: event.lecturer }] : [];
  const performer = lecturers.filter((l) => l?.name).map((l) => ({ "@type": "Person", name: String(l.name) }));

  const tickets: any[] = Array.isArray(event.tickets) && event.tickets.length ? event.tickets : [];
  const offers = tickets
    .filter((t) => Number.isFinite(Number(t?.price)))
    .map((t) => ({
      "@type": "Offer",
      name: t.name || "参加費",
      price: String(Number(t.price)),
      priceCurrency: "JPY",
      availability: "https://schema.org/InStock",
      url,
    }));

  const description = plainText(event.subtitle ? `${event.subtitle} ${event.content || ""}` : event.content || "") ||
    `${event.title}${organizerName ? `（${organizerName}）` : ""}`;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description,
    startDate,
    ...(jstDateTime(event.date, event.endTime) && event.endTime ? { endDate: jstDateTime(event.date, event.endTime) } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: `https://schema.org/${mode}`,
    ...(location.length ? { location: location.length === 1 ? location[0] : location } : {}),
    ...(isHttpUrl(event.ogpImage) ? { image: [event.ogpImage] } : {}),
    ...(organizerName ? { organizer: { "@type": "Organization", name: organizerName } } : {}),
    ...(performer.length ? { performer } : {}),
    ...(offers.length ? { offers } : {}),
    url,
  };
}
