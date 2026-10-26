// 「申込のあと、事前に払っていただく」（主催者が使っている決済のリンク・振込の案内）の決まり
//   イベントの設定：payMode === "link"・payNote（案内の文）・tickets[].payUrl（チケットごとのリンク）
//   お金は絆太郎を通らない。払ったかどうかは主催者が参加者リストで印を付ける（paymentStatus: 'paid'・paymentMethod: 'link'）
//   申込の記録は今までの当日払いと同じ status: 'on_site'（決済の連携で払っていない、の意味）

export const isPayLinkEvent = (ev: any) => ev?.payMode === "link";

// リンクは https だけ（メールや画面の href にそのまま入れるので、空白や引用符も通さない）
export const safePayUrl = (u: any): string => {
  const s = String(u ?? "").trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
};

// 申込のチケットの支払いの案内。チケットが分からないときは、有料のチケットが1つならそれ
export function payLinkFor(ev: any, ticketName?: string) {
  const tickets = (Array.isArray(ev?.tickets) ? ev.tickets : []).filter((t: any) => Number(t?.price) > 0);
  const ticket = tickets.find((t: any) => t?.name === ticketName) || (tickets.length === 1 ? tickets[0] : null);
  return {
    ticket,
    tickets,
    url: ticket ? safePayUrl(ticket.payUrl) : "",
    note: String(ev?.payNote ?? "").trim(),
  };
}

// 申込フォームから完了画面へ、申し込んだチケットを渡す（同じ画面の中だけ。申込の記録はログインなしでは読めないため）
export const appliedTickets = new Map<string, string>();
