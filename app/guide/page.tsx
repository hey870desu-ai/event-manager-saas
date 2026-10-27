// 📂 app/guide/page.tsx
// 📝 役割：絆太郎でできること・使い方（画面の写真つき）。準備 → 申込 → 当日 → 終わったあと → 次のご案内 の順に並べる
//   写真は手元で、架空の主催者「ひだまりケア勉強会（見本）」と架空の参加者のデータで撮った（public/guide/*.webp）
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CalendarPlus, ClipboardList, Mail, MousePointerClick, QrCode, Send, UserPlus } from "lucide-react";

export const metadata: Metadata = {
  title: "できること・使い方",
  description: "絆太郎でできることを、画面の写真でご案内します。告知ページと申込フォームの作成、受付のメール、事前・事後アンケート、当日のQR受付、イベントのまとめ、参加者の名簿まで。",
};

const ORANGE = "#D97757";

// 写真の大きさ（幅・高さ）。public/guide にある WebP と同じ
const IMG: Record<string, [number, number]> = {
  "admin-top": [1600, 1075], "event-card": [1600, 375],
  "theme-medical": [600, 1298], "theme-pop": [600, 1298], "theme-editorial": [600, 1298], "theme-nature": [600, 1298],
  "editor-theme": [1600, 1337], "editor-questions": [1600, 1321], "apply-form": [600, 1808],
  "editor-tickets": [1600, 1411], "editor-cancel": [1200, 421], "flyer": [1200, 1693],
  "apply-complete": [600, 1542], "editor-mail": [1600, 1166], "participants": [1600, 1125],
  "editor-presurvey": [1600, 773], "presurvey": [600, 1298], "mail-send": [1600, 1125],
  "checkin": [600, 1298], "survey-qr": [816, 1228], "survey": [600, 1789], "survey-results": [1600, 1125],
  "report-top": [1400, 1518], "report-survey": [1400, 1096], "kizuna-list": [1600, 1188],
  "newsletter": [1600, 1375], "card-scan": [600, 1298], "analytics": [1600, 1125], "staff": [900, 1554],
};

function Img({ name, alt, className = "" }: { name: string; alt: string; className?: string }) {
  const [w, h] = IMG[name];
  return <img src={`/guide/${name}.webp`} alt={alt} width={w} height={h} loading="lazy" decoding="async" className={`block w-full h-auto ${className}`} />;
}

// パソコンの画面（上に窓の枠）
function Screen({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
      <div className="h-6 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-3" aria-hidden>
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="w-2.5 h-2.5 rounded-full bg-slate-300" /><span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
      </div>
      <Img name={name} alt={alt} />
    </figure>
  );
}

// 画面の一部を切り抜いた写真
function Part({ name, alt }: { name: string; alt: string }) {
  return (
    <figure className="rounded-xl overflow-hidden border border-slate-200 shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
      <Img name={name} alt={alt} />
    </figure>
  );
}

// スマホの画面（fluid は並べた枠の幅いっぱい）
function Phone({ name, alt, fluid = false }: { name: string; alt: string; fluid?: boolean }) {
  return (
    <figure className={`${fluid ? "w-full" : "w-[230px] sm:w-[250px]"} shrink-0 rounded-[22px] sm:rounded-[30px] bg-slate-900 p-[5px] sm:p-[7px] shadow-[0_16px_36px_rgba(15,23,42,0.22)]`}>
      <div className="rounded-[18px] sm:rounded-[24px] overflow-hidden bg-slate-900"><Img name={name} alt={alt} /></div>
    </figure>
  );
}

function Phones({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-center gap-5 md:gap-6">{children}</div>;
}

// 1つの機能：見出し・説明・開き方・写真
function Feature({ id, title, path, children, media, side = false }: { id?: string; title: string; path?: string; children: ReactNode; media: ReactNode; side?: boolean }) {
  return (
    <div id={id} className={`scroll-mt-24 py-10 md:py-14 border-t border-slate-200 first:border-t-0 ${side ? "md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-12 md:items-start" : ""}`}>
      <div className={side ? "" : "max-w-3xl"}>
        <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug mb-4">{title}</h3>
        <div className="text-[15px] md:text-base text-slate-700 leading-[1.9] space-y-3">{children}</div>
        {path && (
          <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
            <MousePointerClick size={16} className="mt-[3px] shrink-0" style={{ color: ORANGE }} aria-hidden />
            <span>開き方：{path}</span>
          </p>
        )}
      </div>
      <div className={side ? "mt-8 md:mt-0" : "mt-8"}>{media}</div>
    </div>
  );
}

function Section({ id, step, title, lead, children }: { id: string; step: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-12 md:py-16">
      <div className="mb-2 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-sm font-bold" style={{ background: ORANGE }}>{step}</span>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{title}</h2>
      </div>
      <p className="text-slate-600 leading-relaxed md:pl-12">{lead}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const FLOW = [
  { id: "prepare", step: "1", title: "準備", text: "告知のページと申込フォームを作る", icon: <CalendarPlus size={20} /> },
  { id: "apply", step: "2", title: "申込", text: "受付のメールと参加者リスト、事前アンケート", icon: <Mail size={20} /> },
  { id: "checkin", step: "3", title: "当日", text: "QRコードで受付する", icon: <QrCode size={20} /> },
  { id: "after", step: "4", title: "終わったあと", text: "事後アンケートと、イベントのまとめ", icon: <ClipboardList size={20} /> },
  { id: "next", step: "5", title: "次のご案内", text: "参加者の名簿から、お知らせを送る", icon: <Send size={20} /> },
  { id: "admins", step: "6", title: "管理者と料金", text: "管理画面に入る人を増やす・入れ替える", icon: <UserPlus size={20} /> },
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800" style={{ fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-slate-900">
            <img src="/icon.webp" alt="" className="h-7 w-7 object-contain" />
            <span>絆太郎</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-3 text-sm">
            <Link href="/#pricing" className="hidden sm:inline px-2 text-slate-600 hover:text-slate-900">料金</Link>
            <Link href="/login" className="px-2 text-slate-600 hover:text-slate-900">ログイン</Link>
            <Link href="/register" className="px-3 py-2 rounded-lg text-white font-bold" style={{ background: ORANGE }}>無料で始める</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        {/* はじめに */}
        <div className="pt-12 md:pt-16 pb-6">
          <p className="text-sm font-bold mb-3" style={{ color: ORANGE }}>使い方のご案内</p>
          <h1 className="text-3xl md:text-[2.6rem] font-bold text-slate-900 leading-tight">絆太郎でできること</h1>
          <p className="mt-5 text-base md:text-lg text-slate-700 leading-[1.9] max-w-3xl">
            申込の受付から、当日の受付、アンケート、次のご案内まで。イベントの前から後までを、実際の画面の写真でご案内します。
          </p>
          <p className="mt-3 text-sm text-slate-500">写真の主催者・講師・参加者は、すべて架空の見本です。</p>

          <nav aria-label="もくじ" className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FLOW.map(f => (
              <a key={f.id} href={`#${f.id}`} className="group flex items-start gap-3 rounded-xl bg-white border border-slate-200 p-4 hover:border-orange-300 hover:shadow-md transition-all">
                <span className="mt-0.5 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-orange-50 shrink-0" style={{ color: ORANGE }}>{f.icon}</span>
                <span>
                  <span className="block font-bold text-slate-900">{f.step}. {f.title}</span>
                  <span className="block text-sm text-slate-600 leading-relaxed mt-0.5">{f.text}</span>
                </span>
              </a>
            ))}
          </nav>
        </div>

        <div className="py-6">
          <Screen name="admin-top" alt="管理画面のトップ。イベントごとのカードに、参加者リスト・QR表示・結果・まとめ・CSV・チラシなどのボタンが並ぶ" />
          <p className="mt-3 text-sm text-slate-500">管理画面のトップ。イベントごとのカードから、ほとんどの操作ができます。</p>
        </div>

        <Section id="prepare" step="1" title="準備" lead="イベント名・日時・会場・内容を入れると、告知のページと申込フォームができます。">
          <Feature id="theme" title="デザインを選ぶだけで、告知のページができます" path="管理画面の「＋新規イベント」（作ったイベントは、カードを押すと直せます）"
            media={<div className="space-y-8"><div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"><Phone fluid name="theme-medical" alt="Medical のデザインの告知ページ" /><Phone fluid name="theme-pop" alt="Pop のデザインの告知ページ" /><Phone fluid name="theme-editorial" alt="Editorial のデザインの告知ページ" /><Phone fluid name="theme-nature" alt="Nature のデザインの告知ページ" /></div><Part name="editor-theme" alt="イベントの編集のデザインテーマ。11種類から選ぶ" /></div>}>
            <p>11種類のデザインから選べます。医療・福祉向け、やわらかいポップ、雑誌風など、イベントの雰囲気に合わせて切り替えられます。</p>
            <p>スマホでもパソコンでも読みやすい形で表示されます。講師の紹介やタイムスケジュール、会場の地図も入ります。</p>
          </Feature>

          <Feature id="form" title="申込フォームの質問を、自由に足せます" path="イベントの編集の「申し込みフォームの質問設定」" side
            media={<Phones><Phone name="apply-form" alt="申込フォーム。職種・懇親会の出欠の質問と、お支払い・キャンセルの案内" /></Phones>}>
            <p>お名前・メールアドレス・電話番号のほかに、職種や所属、懇親会の出欠など、聞きたいことを足せます。答え方は、1行・複数行・プルダウン・チェックボックスから選べます。</p>
            <p>申込フォームには、金額とお支払いの方法、キャンセルの決まりも表示されます。</p>
            <Part name="editor-questions" alt="申し込みフォームの質問設定。質問ごとに答え方と選択肢を決める" />
          </Feature>

          <Feature id="payment" title="参加費と、お支払いの方法" path="イベントの編集の「チケット・参加費設定」「参加費の払い方」「キャンセル・返金ポリシー」"
            media={<div className="space-y-6"><Part name="editor-tickets" alt="チケットを一般・学生に分け、参加費の払い方で事前のお支払いを選び、お支払いのリンクと振込先の案内を入れた画面" /><div className="max-w-xl"><Part name="editor-cancel" alt="キャンセル・返金ポリシー。開催日の7日前まで100%、2日前まで50%を返金" /></div></div>}>
            <p>「一般」「学生」のように、金額の違うチケットを作れます。払い方は、次の3つから選べます。</p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm border border-slate-200 bg-white">
                <thead className="bg-slate-50 text-left"><tr><th className="p-3 border-b border-slate-200 w-[34%]">払い方</th><th className="p-3 border-b border-slate-200">参加者の流れ</th></tr></thead>
                <tbody>
                  <tr><td className="p-3 border-b border-slate-200 align-top">当日、会場で</td><td className="p-3 border-b border-slate-200">申込のあと、当日に会場で払います。</td></tr>
                  <tr><td className="p-3 border-b border-slate-200 align-top">申込のあと、事前に</td><td className="p-3 border-b border-slate-200">申込の完了画面と受付のメールに、お支払いのリンク（Square・PayPay・STORES など、お使いの決済）や振込先が出ます。払われたかどうかは、参加者リストで「支払い済み」に印を付けます。</td></tr>
                  <tr><td className="p-3 align-top">カードで</td><td className="p-3">申込のときにカードで払います（Stripe へのご登録が要ります）。</td></tr>
                </tbody>
              </table>
            </div>
            <p>キャンセル・返金の決まり（例：7日前まで全額）を決めると、申込フォームに表示されます。</p>
          </Feature>

          <Feature id="flyer" title="チラシを作る" path="イベントのカードの「チラシ」" side
            media={<div className="w-full md:w-[380px]"><Part name="flyer" alt="イベントの内容から作ったA4のチラシ。下に申込ページのQRコード" /></div>}>
            <p>イベントの内容から、A4のチラシを作ります。申込ページのQRコードも入ります。</p>
            <p>そのまま印刷するか、PDFで保存してメールやSNSで配れます。</p>
          </Feature>

          <Feature id="copy" title="次回の準備は「コピー」で" path="イベントのカードの右上（申込フォーム・コピー）と、下の「URL」"
            media={<Part name="event-card" alt="イベントのカード。右上に申込フォームとコピーのボタン、下にURLや公開ページのボタン" />}>
            <p>定例会や連続講座は、イベントのカードのコピーのボタンで、同じ内容の次回分を作れます。日付と会場だけ直せば準備ができます。</p>
            <p>「URL」は告知のページのアドレスを、「申込フォーム」は申込フォームだけのページのアドレスをコピーします。申込フォームだけのページは、LINE（Lステップなど）のボタンにも貼れます。</p>
          </Feature>
        </Section>

        <Section id="apply" step="2" title="申込" lead="申込があると、参加者には受付のメールが自動で届き、主催者の参加者リストにすぐ入ります。">
          <Feature id="mail" title="受付のメールが、自動で届きます" path="イベントの編集の「自動返信メール設定」"
            media={<div className="md:grid md:grid-cols-[auto_minmax(0,1fr)] md:gap-8 md:items-start space-y-8 md:space-y-0"><Phones><Phone name="apply-complete" alt="申込の完了画面。参加証のQRコード、参加費のお支払いのお願い、事前アンケートのボタン" /></Phones><Part name="editor-mail" alt="自動返信メールの見え方。主催者からのお知らせ、事前アンケートのボタン、QRコードとカレンダーとキャンセルのリンク" /></div>}>
            <p>申込の完了画面と受付のメールに、当日の受付で使うQRコード（参加証）が出ます。持ち物や駐車場など、主催者からのお知らせを書き添えられます。</p>
            <p>メールには、カレンダーへの追加とキャンセルのリンクも入ります。事前に払っていただくイベントでは、お支払いのリンクと案内も出ます。</p>
          </Feature>

          <Feature id="list" title="参加者リスト" path="イベントのカードの「参加者リスト」"
            media={<Screen name="participants" alt="参加者リスト。受付・お名前・お支払い（支払い済み）・チケットの一覧と、売上予定・支払い済み・支払い未確認の合計" />}>
            <p>申込はすぐに一覧に入ります。チケット、お支払い、受付の状況が分かります。CSVでExcelに出すこともできます。</p>
            <p>事前に払っていただくイベントでは、「未確認」を押すと「支払い済み」になり、下に支払い済みと未確認の金額が出ます。</p>
          </Feature>

          <Feature id="presurvey" title="事前アンケート" path="イベントの編集の「事前アンケート」"
            media={<div className="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:gap-8 md:items-start space-y-8 md:space-y-0"><Part name="editor-presurvey" alt="事前アンケートの設定。困っている場面（チェックボックス）と講師への質問（自由入力）" /><Phones><Phone name="presurvey" alt="参加者が答える事前アンケートの画面" /></Phones></div>}>
            <p>申込のあとに、聞いておきたいこと（困っていること、講師への質問など）を集められます。申込の完了画面と受付のメールに、回答のボタンが出ます。</p>
            <p>集まった答えは、当日の進め方や資料づくりの参考になります。</p>
          </Feature>

          <Feature id="remind" title="リマインドやお礼のメールを送る・予約する" path="参加者リストの「メール送信」"
            media={<Screen name="mail-send" alt="メール送信。お礼・リマインド・チケット（QR）・事後アンケートのひな形と、全員か受付済みのみか、今すぐ送信か予約配信かを選ぶ" />}>
            <p>参加者に一斉にメールを送れます。「お礼」「リマインド」「チケット（QR）」「事後アンケート」のひな形があります。</p>
            <p>日時を決めて予約もできます。1週間前と前日のご案内を、先に予約しておくと安心です。送ったメールと予約したメールは、配信履歴に残ります。</p>
          </Feature>
        </Section>

        <Section id="checkin" step="3" title="当日" lead="受付は、参加者のQRコードを読み取るだけです。">
          <Feature title="QRコードで受付する" path="管理画面の「当日受付」で、イベントを選ぶ" side
            media={<Phones><Phone name="checkin" alt="当日受付の画面。QRコードの読み取り、受付の進み具合、名前で探して受付するボタン" /></Phones>}>
            <p>参加者がスマホで受付のメールのQRコード（参加証）を見せ、主催者のスマホで読み取ると受付済みになります。バーコードリーダーも使えます。</p>
            <p>名前で探して受付することもできます。受付の進み具合は、その場で分かります。</p>
          </Feature>
        </Section>

        <Section id="after" step="4" title="終わったあと" lead="アンケートの結果と、イベント全体のまとめが残ります。">
          <Feature id="survey" title="事後アンケートを、その場で答えてもらう" path="イベントのカードの「QR表示」（質問はイベントの編集の「イベント終了後アンケート」）"
            media={<div className="flex flex-wrap justify-center items-start gap-6 md:gap-10"><div className="w-[260px] md:w-[300px]"><Part name="survey-qr" alt="アンケートのお願いのQRコード（写真は見本）" /></div><Phone name="survey" alt="参加者が答える事後アンケートの画面。満足度の星と質問" /></div>}>
            <p>終わりに会場のスクリーンへQRコードを映すと、参加者がスマホでその場で答えられます。満足度（星5つ）と、自由に作った質問で聞けます。</p>
            <p>QRコードは画像で保存できます。QRだけの画像と、案内の文を添えたスライドの形の画像があり、スライドの最後や配布資料に入れておけます。</p>
            <p>お礼のメールに、アンケートのボタンを入れて送ることもできます。</p>
          </Feature>

          <Feature id="results" title="アンケートの結果" path="イベントのカードの「結果」"
            media={<Screen name="survey-results" alt="アンケート集計。回答数と回答率、平均満足度、満足度の内訳、質問ごとの答え" />}>
            <p>回答の数と割合、満足度の平均と内訳、質問ごとの答えが一覧になります。事前アンケートの答えも、同じ画面で見られます。CSVにも出せます。</p>
          </Feature>

          <Feature id="report" title="イベントのまとめ（報告書）" path="イベントのカードの「まとめ」"
            media={<div className="grid gap-6 md:grid-cols-2 items-start"><Part name="report-top" alt="イベントのまとめ。申込・出席・アンケートの数、チケットごとの内訳、職種の内訳" /><Part name="report-survey" alt="イベントのまとめの事後アンケート。満足度の内訳と、質問ごとの答え" /></div>}>
            <p>1回のイベントの申込・出席・お支払い・送ったメール・事前と事後のアンケートを、1枚にまとめます。</p>
            <p>印刷やPDFでの保存ができるので、振り返りや報告書にそのまま使えます。参加者と事前アンケートの答え、事後アンケートの答えは、CSVでも出せます。</p>
          </Feature>
        </Section>

        <Section id="next" step="5" title="次のご案内" lead="参加してくださった方の名簿が、イベントのたびに育っていきます。">
          <Feature id="kizuna" title="絆リスト（参加者の名簿）" path="管理画面の「絆リスト」"
            media={<Screen name="kizuna-list" alt="絆リスト。これまでの参加者の名簿と、メールを作って送る画面" />}>
            <p>これまでのイベントの参加者が、1つの名簿にまとまります。同じ方は1人にまとめます。イベントを選んで、次のご案内のメールを一斉に送れます。</p>
          </Feature>

          <Feature id="newsletter" title="写真入りのお知らせメール" path="管理画面の「営業ツール」"
            media={<Screen name="newsletter" alt="お知らせメールを作る画面。写真と見出しと本文を入れ、右に届く見え方が出る" />}>
            <p>写真と見出しを入れたお知らせのメール（ニュースレター）を作って送れます。届く見え方を確かめながら作れます。</p>
          </Feature>

          <Feature id="cardscan" title="名刺スキャン" path="管理画面の「名刺スキャン」" side
            media={<Phones><Phone name="card-scan" alt="名刺スキャンの画面。名刺を撮影する" /></Phones>}>
            <p>交流会でいただいた名刺を撮ると、文字を読み取って絆リストに入ります。</p>
          </Feature>

          <Feature id="analytics" title="分析" path="管理画面の「分析」"
            media={<Screen name="analytics" alt="分析の画面。ページを見た数、参加者数、申込率、売上、出席率、リピーター率と、イベント別・月別のグラフ" />}>
            <p>告知のページを見た数、申込の割合、出席率、リピーターの割合などを、イベントごと・月ごとに見られます。</p>
          </Feature>
        </Section>

        <Section id="admins" step="6" title="管理者と料金" lead="管理画面に入れる方を、あとから増やしたり入れ替えたりできます。">
          <Feature title="管理者を増やす・入れ替える" path="管理画面の右上の歯車（設定）の「スタッフ・管理者招待」" side
            media={<div className="w-full max-w-[340px] mx-auto"><Part name="staff" alt="設定のスタッフ・管理者招待と、登録済みスタッフ一覧、現在のプラン" /></div>}>
            <p>お名前とメールアドレスを入れて招待すると、その方も管理画面に入れます。外すときは、登録済みスタッフ一覧のごみ箱を押します。</p>
            <p>スタンダードプランは、月額3,300円（税込）で管理者3人まで、4人目から1人につき月額550円（税込）です。金額は毎月1日の人数で決まり、月の途中で人数が変わったときは、次の1日から金額が変わります。月末に外して月初に加える入れ替えもできます。</p>
            <p>フリープランでは、イベントは1件まで、CSVの出力やアンケートの集計の内訳などは使えません。くわしくは<Link href="/#pricing" className="underline underline-offset-4" style={{ color: ORANGE }}>料金</Link>をご覧ください。</p>
          </Feature>
        </Section>

        {/* おわりに */}
        <div className="my-12 md:my-16 rounded-2xl bg-white border border-slate-200 p-6 md:p-10 text-center">
          <p className="text-xl md:text-2xl font-bold text-slate-900">まずは1件のイベントから試せます</p>
          <p className="mt-3 text-slate-600 leading-relaxed">使い方で分からないことは、お気軽にお問い合わせください。</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-bold" style={{ background: ORANGE }}>無料で始める <ArrowRight size={18} /></Link>
            <Link href="/admin" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold bg-white">管理画面を開く</Link>
            <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold bg-white">お問い合わせ</Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col sm:flex-row gap-4 justify-between text-sm text-slate-500">
          <p>イベントシステム絆太郎（ばんたろう）</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/" className="hover:text-slate-800">トップ</Link>
            <Link href="/terms" className="hover:text-slate-800">利用規約</Link>
            <Link href="/privacy" className="hover:text-slate-800">プライバシーポリシー</Link>
            <Link href="/legal" className="hover:text-slate-800">特定商取引法</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
