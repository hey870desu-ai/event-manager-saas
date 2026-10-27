// 📂 components/blog/NotionBlocks.tsx
// 📝 役割：Notion の記事の本文（ブロック）を、ブログの見た目で描く。space-care.jp の NotionBlocks を、絆太郎の色（オレンジ）に直して写した
// - 大見出し：番号（01, 02…）＋下線（灰の線の左だけオレンジ）
// - 小見出し：オレンジの四角
// - 太字：薄いオレンジのマーカー（下半分の塗り）
// - 「まとめ」：見出しから次の大見出し（無ければ最後）までを、薄いオレンジの囲みに入れる
// - 見出しは文節で折り返す（word-break: auto-phrase。<html lang="ja"> が要る・Chrome/Edge だけ効く）
// 文字の色は本文 slate-800・見出し slate-900（薄字にしない）。リンクと番号は orange-700（白地で 5:1 以上）
import type { ReactNode } from "react";
import { CircleCheck, Quote } from "lucide-react";
import type { NotionBlock, RichText } from "@/lib/blog";

const LINK = "text-[#c2410c] underline decoration-[#c2410c]/40 underline-offset-2 hover:decoration-[#c2410c]";

function renderRichText(richText: RichText[] | undefined, keyPrefix: string, opts: { marker?: boolean } = {}) {
  if (!richText || richText.length === 0) return null;
  const marker = opts.marker !== false;
  return richText.map((rt, i) => {
    const text = rt.plain_text ?? "";
    if (text === "") return null;
    const a = rt.annotations ?? {};
    let node: ReactNode = text;
    if (a.code) node = <code className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[0.85em] text-[#c2410c]">{node}</code>;
    if (a.bold) node = <strong className={marker ? "bg-[linear-gradient(transparent_60%,#fcdcc8_60%)] font-bold text-slate-900" : "font-bold"}>{node}</strong>;
    if (a.italic) node = <em>{node}</em>;
    if (a.strikethrough) node = <s>{node}</s>;
    if (a.underline) node = <u>{node}</u>;
    const href = rt.href ?? rt.text?.link?.url ?? null;
    if (href) {
      const internal = href.startsWith("/") || href.startsWith("https://www.event-manager.app");
      node = internal
        ? <a href={href} className={LINK}>{node}</a>
        : <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>{node}</a>;
    }
    return <span key={`${keyPrefix}-${i}`}>{node}</span>;
  });
}

const richTextOf = (block: NotionBlock, type: string) => (block[type] as { rich_text?: RichText[] } | undefined)?.rich_text;
const plainTextOf = (block: NotionBlock) => (richTextOf(block, block.type) ?? []).map((t) => t.plain_text ?? "").join("").trim();
const plainTextOfRich = (rt: RichText[] | undefined) => (rt ?? []).map((t) => t.plain_text ?? "").join("");
const isMajorHeading = (b: NotionBlock) => b.type === "heading_1" || b.type === "heading_2";
const isSummaryHeading = (b: NotionBlock) => isMajorHeading(b) && /^まとめ/.test(plainTextOf(b));

// 続いた箇条書きは1つの <ul>/<ol> にまとめる。counter は大見出しの番号（まとめの前後で分けて描いても続き番号にする）
function renderBlocks(blocks: NotionBlock[], counter: { n: number }): ReactNode[] {
  const out: ReactNode[] = [];
  let list: { ordered: boolean; items: NotionBlock[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const { ordered, items } = list;
    const type = ordered ? "numbered_list_item" : "bulleted_list_item";
    const lis = items.map((item) => (
      <li key={item.id} className="mb-1.5 text-pretty pl-1 leading-relaxed">{renderRichText(richTextOf(item, type), item.id)}</li>
    ));
    out.push(ordered
      ? <ol key={`list-${items[0].id}`} className="mb-6 list-decimal space-y-1 pl-6 marker:font-bold marker:text-[#c2410c]">{lis}</ol>
      : <ul key={`list-${items[0].id}`} className="mb-6 list-disc space-y-1 pl-6 marker:text-[#D97757]">{lis}</ul>);
    list = null;
  };

  for (const block of blocks) {
    const { type, id } = block;
    if (type === "bulleted_list_item" || type === "numbered_list_item") {
      const ordered = type === "numbered_list_item";
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(block);
      continue;
    }
    flushList();

    switch (type) {
      case "paragraph": {
        const rt = richTextOf(block, "paragraph");
        out.push(!rt || rt.length === 0
          ? <div key={id} className="h-3" />
          : <p key={id} className="mb-6 text-pretty leading-[1.95]">{renderRichText(rt, id)}</p>);
        break;
      }
      case "heading_1":
      case "heading_2":
        counter.n += 1;
        out.push(
          <h2 key={id} id={`sec-${counter.n}`} className="relative mb-6 mt-14 flex items-baseline gap-3 border-b-2 border-slate-200 pb-3 text-[1.35rem] font-bold leading-snug text-slate-900 after:absolute after:-bottom-[2px] after:left-0 after:h-[2px] after:w-16 after:bg-[#D97757] after:content-['']">
            <span className="shrink-0 text-base font-bold text-[#c2410c]" aria-hidden="true">{String(counter.n).padStart(2, "0")}</span>
            <span className="text-balance [word-break:auto-phrase]">{renderRichText(richTextOf(block, type), id, { marker: false })}</span>
          </h2>
        );
        break;
      case "heading_3":
        out.push(
          <h3 key={id} className="mb-3 mt-9 flex items-start gap-2.5 text-[1.1rem] font-bold leading-snug text-slate-900 before:mt-[0.42em] before:h-2.5 before:w-2.5 before:shrink-0 before:rounded-[3px] before:bg-[#D97757] before:content-['']">
            <span className="text-balance [word-break:auto-phrase]">{renderRichText(richTextOf(block, "heading_3"), id, { marker: false })}</span>
          </h3>
        );
        break;
      case "quote":
        out.push(
          <blockquote key={id} className="relative mb-6 rounded-lg border border-slate-200 bg-white py-4 pl-12 pr-5 leading-[1.9]">
            <Quote className="absolute left-4 top-[1.15rem] h-5 w-5 text-[#D97757]" aria-hidden="true" />
            {renderRichText(richTextOf(block, "quote"), id)}
          </blockquote>
        );
        break;
      case "callout": {
        const p = block.callout as { rich_text?: RichText[]; icon?: { emoji?: string } } | undefined;
        out.push(
          <div key={id} className="mb-6 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            {p?.icon?.emoji && <span className="text-xl leading-none">{p.icon.emoji}</span>}
            <div className="leading-relaxed">{renderRichText(p?.rich_text, id)}</div>
          </div>
        );
        break;
      }
      case "code": {
        const p = block.code as { rich_text?: RichText[] } | undefined;
        out.push(
          <pre key={id} className="mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
            <code>{(p?.rich_text ?? []).map((t) => t.plain_text ?? "").join("")}</code>
          </pre>
        );
        break;
      }
      case "to_do": {
        const p = block.to_do as { rich_text?: RichText[]; checked?: boolean } | undefined;
        out.push(
          <div key={id} className="mb-2 flex items-start gap-2">
            <span className={`mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-xs ${p?.checked ? "border-[#c2410c] bg-[#c2410c] text-white" : "border-slate-400"}`} aria-hidden="true">{p?.checked ? "✓" : ""}</span>
            <span>{renderRichText(p?.rich_text, id)}</span>
          </div>
        );
        break;
      }
      case "divider":
        out.push(<hr key={id} className="my-10 border-slate-200" />);
        break;
      case "image": {
        const p = block.image as { file?: { url?: string }; external?: { url?: string }; caption?: RichText[] } | undefined;
        const url = p?.file?.url ?? p?.external?.url ?? "";
        if (!url) break;
        const caption = plainTextOfRich(p?.caption);
        out.push(
          <figure key={id} className="mb-6">
            <img src={url} alt={caption || "記事の画像"} loading="lazy" className="h-auto w-full rounded-lg border border-slate-200" />
            {caption && <figcaption className="mt-2 text-center text-sm text-slate-500">{caption}</figcaption>}
          </figure>
        );
        break;
      }
      default:
        break; // 表・トグル・埋め込みなどは出さない（ルーチンは使わない決まり）
    }
  }
  flushList();
  return out;
}

export function NotionBlocks({ blocks }: { blocks: NotionBlock[] }) {
  const counter = { n: 0 };
  const s = blocks.findIndex(isSummaryHeading);
  if (s < 0) return <>{renderBlocks(blocks, counter)}</>;

  let e = blocks.findIndex((b, k) => k > s && isMajorHeading(b));
  if (e < 0) e = blocks.length;
  const head = blocks[s];
  return (
    <>
      {renderBlocks(blocks.slice(0, s), counter)}
      <section aria-labelledby="sec-summary" className="mb-6 mt-14 rounded-xl border border-orange-200 bg-orange-50/70 px-5 py-6 sm:px-7 [&>*:last-child]:mb-0">
        <h2 id="sec-summary" className="mb-4 flex items-center gap-2 text-[1.3rem] font-bold leading-snug text-slate-900">
          <CircleCheck className="h-6 w-6 shrink-0 text-[#c2410c]" aria-hidden="true" />
          <span className="text-balance [word-break:auto-phrase]">{renderRichText(richTextOf(head, head.type), head.id, { marker: false })}</span>
        </h2>
        {renderBlocks(blocks.slice(s + 1, e), counter)}
      </section>
      {renderBlocks(blocks.slice(e), counter)}
    </>
  );
}
