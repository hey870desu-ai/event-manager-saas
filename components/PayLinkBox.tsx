// 申込のあとの画面に出す「参加費のお支払いのお願い」（イベントの設定が「申込のあと、事前に払っていただく」のとき）
//   テンプレートの色に左右されないよう、白地の箱にする
import { appliedTickets, isPayLinkEvent, payLinkFor, safePayUrl } from "@/lib/pay-link";

export default function PayLinkBox({ event, reservationId, ticketName }: { event: any; reservationId?: string; ticketName?: string }) {
  if (!isPayLinkEvent(event)) return null;
  const name = ticketName || (reservationId ? appliedTickets.get(reservationId) : undefined);
  const { ticket, tickets, note } = payLinkFor(event, name);
  if (tickets.length === 0) return null;
  // チケットが分からないときは、有料のチケットをすべて並べる
  const rows: any[] = ticket ? [ticket] : tickets;
  return (
    <div className="bg-white text-slate-800 border-2 border-orange-300 rounded-xl p-4 mb-4 text-left">
      <p className="text-sm font-bold mb-2">💳 参加費のお支払いのお願い</p>
      {note && <p className="text-xs leading-relaxed whitespace-pre-wrap mb-3">{note}</p>}
      {rows.map((t: any) => {
        const url = safePayUrl(t.payUrl);
        return (
          <div key={String(t.name)} className="mb-2 last:mb-0">
            <p className="text-xs text-slate-600 mb-1">{String(t.name || "参加費")}：{(Number(t.price) || 0).toLocaleString()}円</p>
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="block text-center px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm">
                お支払いのページを開く
              </a>
            )}
          </div>
        );
      })}
      <p className="text-[11px] text-slate-500 mt-2">同じご案内を、受付のメールにもお送りしています。</p>
    </div>
  );
}
