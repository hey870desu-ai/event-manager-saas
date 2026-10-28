// 📂 app/admin/guide/payments/page.tsx
// 📝 役割：管理画面の「参加費の受け取り方」。参加者から参加費を受け取る方法・設定・確かめ方・キャンセルと返金を、画面の写真つきで案内する
//   （2026-10-28 塙さん「テナントさんの参加者の決済をもう少し詳しく使い方を各テナントの管理ページにおいてほしい」）
//   上に、ログインした会社の「特商法の表記」と「カードの決済（Stripe）」のいまの状態を出す
//   カードで払っていただく形（Stripe との連携）は見直し中（自分の Stripe をつないだ会社では決済が通らない作りのため）。使えるのは当日払いと事前払い（リンク・振込）
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { ArrowLeft, CheckCircle2, AlertTriangle, ExternalLink, MousePointerClick } from "lucide-react";
import { Part, Phone, Phones, Screen } from "@/components/guide/GuideShots";

const ORANGE = "#D97757";

// 特商法の表記のページに出る欄（設定の「法人・特商法情報」）
const LEGAL_FIELDS = [
  { key: "legalCompanyName", label: "事業者名" },
  { key: "representative", label: "代表者名" },
  { key: "address", label: "所在地" },
  { key: "phone", label: "電話番号" },
  { key: "legalEmail", label: "メールアドレス" },
];

const TOC = [
  { id: "ways", title: "受け取り方は2つ" },
  { id: "setup", title: "設定のしかた" },
  { id: "participant", title: "参加者から見た流れ" },
  { id: "check", title: "払われたかの確かめ方" },
  { id: "cancel", title: "キャンセルと返金" },
  { id: "legal", title: "特定商取引法の表記" },
  { id: "faq", title: "よくある質問" },
];

type TenantStatus = { tenantId: string; missing: string[]; stripeConnected: boolean };

function Block({ id, n, title, path, children, media }: { id: string; n: number; title: string; path?: string; children: ReactNode; media?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 py-10 md:py-12 border-t border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold shrink-0" style={{ background: ORANGE }}>{n}</span>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">{title}</h2>
      </div>
      <div className="text-[15px] md:text-base text-slate-700 leading-[1.9] space-y-4">{children}</div>
      {path && (
        <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
          <MousePointerClick size={16} className="mt-[3px] shrink-0" style={{ color: ORANGE }} aria-hidden />
          <span>開き方：{path}</span>
        </p>
      )}
      {media && <div className="mt-8">{media}</div>}
    </section>
  );
}

const th = "p-3 border-b border-slate-200 text-left font-bold text-slate-700 align-top";
const td = "p-3 border-b border-slate-200 align-top";

// 表。パソコンでは表、スマホでは行ごとの箱にする（3列の表は、スマホでは横にはみ出すため）
//   label＝1列目が項目の名前（薄い字）。widths＝パソコンの列の幅
function Grid({ head, rows, widths = [], label = false }: { head: string[]; rows: ReactNode[][]; widths?: string[]; label?: boolean }) {
  return (
    <>
      <table className="hidden sm:table w-full text-sm border border-slate-200 bg-white">
        <thead className="bg-slate-50"><tr>{head.map((h, i) => <th key={i} className={`${th} ${widths[i] || ""}`}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j} className={`${i === rows.length - 1 ? "p-3 align-top" : td} ${label && j === 0 ? "text-slate-500" : ""}`}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
      <div className="sm:hidden space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed">
            <p className="font-bold text-slate-900">{r[0]}</p>
            {r.slice(1).map((c, j) => (
              <div key={j} className="mt-2">
                {head[j + 1] && <p className="text-xs text-slate-500">{head[j + 1]}</p>}
                <p>{c}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export default function PaymentsGuidePage() {
  const router = useRouter();
  const [status, setStatus] = useState<TenantStatus | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.email) { router.push("/admin/login"); return; }
      try {
        // ログインした人の会社。運営の管理者（会社に属さない）は、会社ごとの状態を出さない
        const me = await getDoc(doc(db, "admin_users", user.email));
        const tenantId = me.exists() ? String(me.data().tenantId || "") : "";
        if (tenantId && me.data()?.branchId !== "sys_master_v9Xk2_secret") {
          const t = await getDoc(doc(db, "tenants", tenantId));
          const d: any = t.exists() ? t.data() : {};
          setStatus({
            tenantId,
            missing: LEGAL_FIELDS.filter(f => !String(d[f.key] || "").trim()).map(f => f.label),
            stripeConnected: !!d.stripeConnectId,
          });
        }
      } catch (e) {
        console.error("会社の設定の読み込みに失敗:", e);
      }
      setReady(true);
    });
    return () => unsub();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800" style={{ fontFamily: '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", sans-serif' }}>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={18} /> 管理画面に戻る
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pb-16">
        {/* はじめに */}
        <div className="pt-10 md:pt-14 pb-8">
          <p className="text-sm font-bold mb-3" style={{ color: ORANGE }}>使い方のご案内</p>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight">参加費の受け取り方</h1>
          <p className="mt-5 text-base md:text-lg text-slate-700 leading-[1.9]">
            有料のイベントで、参加者から参加費を受け取る方法をまとめました。払い方はイベントごとに選べます。設定のしかた、払われたかの確かめ方、キャンセルのときの扱いまで、画面の写真でご案内します。
          </p>
          <p className="mt-3 text-sm text-slate-500">写真の主催者・参加者は、すべて架空の見本です。</p>

          {/* この会社のいまの設定 */}
          {ready && status && (
            <div className="mt-8 rounded-xl bg-white border border-slate-200 p-5">
              <p className="font-bold text-slate-900 mb-3">この会社のいまの設定</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 pr-4 align-top whitespace-nowrap text-slate-500">特商法の表記</td>
                    <td className="py-2 align-top">
                      {status.missing.length === 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={16} /> 5つの欄がすべて入っています</span>
                      ) : (
                        <span className="inline-flex items-start gap-1.5 text-amber-700"><AlertTriangle size={16} className="mt-[3px] shrink-0" /><span>入っていない欄があります（{status.missing.join("・")}）。<a href="#legal" className="underline underline-offset-2">入れ方</a></span></span>
                      )}
                      <a href={`/${status.tenantId}/legal`} target="_blank" rel="noopener noreferrer" className="mt-1 flex w-fit items-center gap-1 text-indigo-600 font-bold hover:underline">
                        表記のページを見る <ExternalLink size={13} />
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 align-top whitespace-nowrap text-slate-500 border-t border-slate-100">カードの決済</td>
                    <td className="py-2 align-top border-t border-slate-100">
                      {status.stripeConnected
                        ? "Stripe とつないでいます。カードで払われた申込は、参加者リストに「決済済み」と出ます。"
                        : "つないでいません（当日払いと、申込のあとの事前払いで受け取れます）。"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <nav aria-label="もくじ" className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TOC.map((t, i) => (
              <a key={t.id} href={`#${t.id}`} className="flex items-center gap-3 rounded-lg bg-white border border-slate-200 px-4 py-3 hover:border-orange-300 transition-colors">
                <span className="text-sm font-bold" style={{ color: ORANGE }}>{i + 1}</span>
                <span className="text-slate-800">{t.title}</span>
              </a>
            ))}
          </nav>
        </div>

        <Block id="ways" n={1} title="受け取り方は2つ">
          <p>参加費は、当日に会場で受け取るか、申込のあとに事前に払っていただくかを、イベントごとに選べます。</p>
          <Grid label head={["", "当日、会場で", "申込のあと、事前に"]} widths={["w-[22%]", "w-[39%]", ""]} rows={[
            ["払うとき", "開催の当日、受付で", "申込のあと、主催者が決めた期限まで"],
            ["払い方", "現金など、会場で受け取れる方法", "お使いの決済サービス（Square・PayPay・STORES など）の支払いのリンクや、振込"],
            ["お金の行き先", "主催者が会場で受け取ります", "お使いの決済サービスや口座に入ります。絆太郎は通りません"],
            ["払われたかの確かめ", "受付をすると、受付済の金額に入ります", "入金を確かめて、参加者リストで「支払い済み」に印を付けます"],
            ["絆太郎の手数料", "かかりません", "かかりません（決済サービスの手数料は、各サービスの決まりのとおりです）"],
            ["向いている会", "会場で開く会、現金で受けたい会", "参加を前もって確定させたい会、当日の受付を短くしたい会"],
          ]} />
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="font-bold text-slate-900 mb-1">カードで払っていただく形<span className="inline-block">（Stripe との連携）</span>について</p>
            <p>申込のときにカードで払っていただく形は、いま見直しています。カードで受け取りたいときは、「申込のあと、事前に」を選び、カードで払える支払いのリンク（Square の支払いリンクなど）を入れてください。</p>
          </div>
        </Block>

        <Block id="setup" n={2} title="設定のしかた"
          path="管理画面のイベントのカードを押す（新しく作るときは「＋新規イベント」）→「チケット・参加費設定」「参加費の払い方」「キャンセル・返金ポリシー」"
          media={<div className="space-y-6"><Part name="editor-tickets" alt="チケットを一般・学生に分け、参加費の払い方で事前のお支払いを選び、お支払いのリンクと振込先の案内を入れた画面" /><div className="max-w-xl"><Part name="editor-cancel" alt="キャンセル・返金ポリシー。開催日の7日前まで100%、2日前まで50%を返金" /></div></div>}>
          <ol className="list-decimal pl-6 space-y-3">
            <li>「チケット・参加費設定」で、チケットの名前と金額を入れます。一般・学生など、いくつでも分けられます。0円のチケットは「無料」と表示されます。</li>
            <li>有料のチケットがあると「参加費の払い方」が出ます。「当日、会場で払っていただく」か「申込のあと、事前に払っていただく」を選びます。</li>
            <li>事前に払っていただくときは、チケットごとに支払いのリンクを入れます。入れられるのは https:// から始まるリンクです。振込だけで受けるときは、空のままにします。</li>
            <li>「お支払いの案内」に、期限・振込先・入金を確かめたあとの連絡のしかたなどを書きます。申込の完了画面と受付のメールに、そのまま出ます。リンクの無いチケットがあるときは、この案内を入れないと保存できません。</li>
            <li>「キャンセル・返金ポリシー」で、開催日の何日前まで何％を返金するかを決めます。申込フォームに、日付つきで表示されます。</li>
          </ol>
          <p>支払いのリンクは、お使いの決済サービスの管理画面で、チケットの金額ごとに作ります。</p>
        </Block>

        <Block id="participant" n={3} title="参加者から見た流れ"
          media={<Phones><Phone name="apply-form" alt="申込フォーム。職種・懇親会の出欠の質問と、お支払い・キャンセルの案内" /><Phone name="apply-complete" alt="申込の完了画面。参加証のQRコード、参加費のお支払いのお願い、事前アンケートのボタン" /></Phones>}>
          <Grid head={["場面", "参加者に見えるもの"]} widths={["w-[24%]", ""]} rows={[
            ["申込フォーム", "申し込む前に、金額・お支払いの方法と時期・キャンセルの決まりが表示されます。"],
            ["申込の完了画面", "当日の受付で使うQRコードが出ます。事前に払っていただくイベントでは、「参加費のお支払いのお願い」（案内の文・チケットと金額・「お支払いのページを開く」）も出ます。"],
            ["受付のメール", "件名は払い方で変わります。当日払いは【当日払い受付】、事前払いは【受付完了・お支払いのお願い】、無料は【受付完了】です。メールにも、同じお支払いのお願い・QRコード・キャンセルのリンクが入ります。"],
          ]} />
        </Block>

        <Block id="check" n={4} title="払われたかの確かめ方"
          path="イベントのカードの「参加者リスト」"
          media={<Screen name="participants" alt="参加者リスト。お支払いの欄に金額と「支払い済み」、下に売上予定・支払い済み・支払い未確認の合計" />}>
          <p>参加者リストの「お支払い」の欄に、金額と状態が出ます。</p>
          <Grid head={["表示", "意味", "すること"]} widths={["w-[30%]", "w-[30%]", ""]} rows={[
            ["当日現金", "当日、会場で払っていただく申込", "受付で参加費を受け取ったら、「受付する」を押します。当日受付のQRで受け付けても同じです。"],
            ["未確認（押して支払い済みに）", "事前に払っていただく申込で、まだ確かめていないもの", "決済サービスの売上の画面や通帳で入金を確かめてから押すと、「支払い済み」になります。"],
            ["支払い済み", "入金を確かめて印を付けたもの", "間違えて押したときは、もう一度押すと「未確認」に戻ります。"],
          ]} />
          <p>リストの下には合計が出ます。当日払いのイベントは「売上予定（合計）」「受付済（徴収額）」「当日現金（未回収分）」、事前に払っていただくイベントは「売上予定（合計）」「支払い済み」「支払い未確認」です。</p>
          <p>まだ払っていない方には、リストで選んで「メール送信」から、お支払いのお願いを送れます。</p>
          <p>イベントごと・月ごとの合計や、会場費・講師への謝礼などの経費を入れた差し引きは、<Link href="/admin/finance" className="text-indigo-600 font-bold underline underline-offset-2">収支</Link>の画面で見られます。</p>
        </Block>

        <Block id="cancel" n={5} title="キャンセルと返金">
          <p>参加者は、受付のメールの「お申し込みをキャンセルする」から、ご自分で取り消せます。主催者は、参加者リストの行の右にある取り消しのボタン（人の形に×）から取り消せます。</p>
          <p>どちらの場合も、参加者に取り消しのメールが届き、主催者にも知らせのメールが届きます。取り消した席は空き、ほかの方が申し込めるようになります。</p>
          <Grid head={["払い方", "返金"]} widths={["w-[30%]", ""]} rows={[
            ["当日、会場で", "参加費を受け取る前なので、返金はありません。"],
            ["申込のあと、事前に", "絆太郎はお金を動かしません。キャンセル・返金ポリシーに沿って、お使いの決済サービスの返金の機能や、振込で返してください。取り消しのメールには返金のことは書かれないので、返金のご連絡は主催者からお願いします。"],
          ]} />
          <p>取り消した方は、参加者リストの下の「キャンセル者」に出ます。</p>
        </Block>

        <Block id="legal" n={6} title="特定商取引法の表記"
          path="管理画面の右上の歯車（設定）→「法人・特商法情報」">
          <p>告知のページのいちばん下に「特定商取引法に基づく表記」のリンクがあり、設定の「法人・特商法情報」に入れた内容が表示されます。</p>
          <p>有料のイベントを開くときは、事業者名・代表者名・所在地・電話番号・メールアドレスを入れておいてください。入れたら「設定をすべて保存する」を押します。</p>
        </Block>

        <Block id="faq" n={7} title="よくある質問">
          <dl className="space-y-6">
            <div>
              <dt className="font-bold text-slate-900">振込だけで受けたいときは？</dt>
              <dd className="mt-1">「申込のあと、事前に」を選び、リンクは空のままにして、「お支払いの案内」に振込先と期限を書いてください。</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-900">期限までに払わない方がいたら？</dt>
              <dd className="mt-1">自動では取り消されません。参加者リストで「未確認」の方を選んで「メール送信」からお願いを送るか、取り消しのボタンで取り消してください。</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-900">申込が入ってから、払い方を変えたら？</dt>
              <dd className="mt-1">それまでに申し込んだ方には、申し込んだときの案内が届いています。払い方を変えたときは、その方々に「メール送信」で新しい案内をお送りください。</dd>
            </div>
            <div>
              <dt className="font-bold text-slate-900">領収書は出せますか？</dt>
              <dd className="mt-1">絆太郎からは出していません。お使いの決済サービスの領収書の機能か、主催者の領収書をお使いください。</dd>
            </div>
          </dl>
        </Block>
      </main>
    </div>
  );
}
