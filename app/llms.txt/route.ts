// 📂 app/llms.txt/route.ts → /llms.txt
// 📝 役割：AI（ChatGPT・Claude・Perplexity など）向けの、サイトの要約と主なページの一覧（llms.txt の書き方）。
//   機能は使い方のページ（app/guide）、料金は lib/plans.ts と同じ。⚠ 機能を変えたらここも直す
import { getPublishedPosts } from "@/lib/blog";
import { PRICE_LINES, SITE_DESCRIPTION, SITE_NAME, SITE_URL, priceText } from "@/lib/site";

export const revalidate = 600;

export async function GET() {
  const posts = (await getPublishedPosts()).slice(0, 20);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}開発・運営は株式会社はなひろ（福島県）。`,
    "",
    "## 主なページ",
    `- [トップ（機能と料金）](${SITE_URL}/): できることの一覧と料金`,
    `- [できること・使い方](${SITE_URL}/guide): 準備・申込・当日・終わったあと・次のご案内・管理者と料金の順に、画面の写真で説明`,
    `- [ブログ](${SITE_URL}/blog): セミナー・研修会・勉強会の主催の実務`,
    `- [特定商取引法に基づく表記](${SITE_URL}/legal)`,
    `- [利用規約](${SITE_URL}/terms)`,
    `- [プライバシーポリシー](${SITE_URL}/privacy)`,
    `- [お問い合わせ](${SITE_URL}/contact)`,
    "",
    "## できること",
    "- 告知のページ：11種類のデザインから選ぶ。講師の紹介・タイムスケジュール・会場の地図も入る",
    "- 申込フォーム：お名前・メールアドレス・電話番号のほかに、聞きたいことを足せる（1行・複数行・プルダウン・チェックボックス）",
    "- 参加費：金額の違うチケットを作れる。払い方は「当日、会場で」「申込のあと、事前に（お使いの決済のリンクや振込）」「申込のときにカードで（Stripe）」から選ぶ",
    "- キャンセル・返金の決まりを申込フォームに表示できる",
    "- A4のチラシを作れる（申込ページのQRコードつき）",
    "- 受付のメールが自動で届く：当日の受付で使うQRコード（参加証）、カレンダーへの追加、キャンセルのリンク",
    "- 参加者リスト：チケット・お支払い・受付の状況が分かる。CSVでExcelに出せる",
    "- 事前アンケートと事後アンケート：事後アンケートは会場のスクリーンにQRコードを映して、その場でスマホから答えてもらえる（満足度の星5つと自由な質問）",
    "- メールの一斉送信と予約：お礼・リマインド・チケット（QR）・事後アンケートのひな形",
    "- 当日の受付：参加者のQRコードを主催者のスマホで読み取る。名前で探して受付することもできる",
    "- アンケートの結果と、イベントのまとめ（申込・出席・お支払い・メール・アンケートを1枚に。印刷・PDF・CSV）",
    "- 絆リスト（これまでの参加者の名簿）、写真入りのお知らせメール、名刺スキャン、分析（ページを見た数・申込の割合・出席率など）",
    "",
    "## 料金（税込）",
    ...PRICE_LINES.map((p) => `- ${p.name}：${priceText(p)}（${p.note}）`),
    "- フリーでは、CSVの出力やアンケートの集計の内訳などは使えない",
    ...(posts.length
      ? ["", "## ブログの新しい記事", ...posts.map((p) => `- [${p.title}](${SITE_URL}/blog/${p.slug})${p.excerpt ? `: ${p.excerpt}` : ""}`)]
      : []),
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=600" },
  });
}
