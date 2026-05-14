import Link from "next/link";
import Image from "next/image";
import {
  Activity, ArrowRight, CheckCircle2,
  LayoutTemplate, ShieldCheck, BarChart3, Check,
  FileSpreadsheet, QrCode, Mail, Smartphone, Users,
  Link as LinkIcon, Share2, Copy, Terminal, ChevronRight,
} from "lucide-react";
import { JetBrains_Mono } from "next/font/google";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Claude Code テーマトークン（インライン使用）
const ORANGE = "#D97757";
const ORANGE_BRIGHT = "#F08856";
const ORANGE_GLOW = "#FF8E61";

export default function Home() {
  return (
    <div
      className={`${mono.className} min-h-screen bg-[#0F0F0F] text-[#E8E8E8] relative overflow-x-hidden selection:bg-[#D97757]/30 selection:text-white`}
      style={{ lineHeight: 1.6 }}
    >
      {/* グリッド背景 */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(rgba(217,119,87,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(217,119,87,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* 上部オレンジグロー */}
      <div
        className="fixed left-1/2 -translate-x-1/2 -top-[200px] w-[900px] h-[400px] pointer-events-none z-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(217,119,87,0.2), transparent 70%)",
        }}
      />

      {/* ▼ Header（ターミナル風） */}
      <header className="sticky top-0 z-50 w-full border-b border-[#2A2A2A] bg-[#0F0F0F]/85 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer group">
            <img
              src="/icon.webp"
              alt="絆太郎"
              className="h-7 w-7 object-contain group-hover:rotate-6 transition-transform duration-300"
            />
            <span className="flex items-center gap-2 text-sm">
              <span className="text-[#888]">$</span>
              <span className="text-[#4ADE80]">launch</span>
              <ChevronRight size={14} className="text-[#D97757]" />
              <span className="text-[#F08856] font-semibold tracking-wide">
                kizuna-taro
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1 md:gap-3 text-xs md:text-sm">
            <Link
              href="#features"
              className="hidden sm:inline text-[#888] hover:text-[#F08856] transition-colors px-2"
            >
              features
            </Link>
            <Link
              href="#pricing"
              className="hidden sm:inline text-[#888] hover:text-[#F08856] transition-colors px-2"
            >
              pricing
            </Link>
            <Link
              href="/contact"
              className="hidden sm:inline text-[#888] hover:text-[#F08856] transition-colors px-2"
            >
              contact
            </Link>
            <span className="hidden sm:inline h-4 w-px bg-[#2A2A2A]" />
            <Link
              href="/login"
              className="text-[#888] hover:text-[#F08856] transition-colors px-2"
            >
              login
            </Link>
            <Link
              href="/register"
              className="ml-1 inline-flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-md text-white text-xs md:text-sm font-bold tracking-wide transition-all"
              style={{
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
                boxShadow:
                  "0 4px 18px rgba(217,119,87,0.45), inset 0 1px 0 rgba(255,255,255,0.18)",
              }}
            >
              ▶ start
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* ▼ Hero（ターミナルウィンドウ） */}
        <section className="pt-10 md:pt-16 pb-20 px-4">
          <div className="container mx-auto max-w-4xl">
            {/* ターミナル枠 */}
            <div
              className="rounded-xl overflow-hidden border border-[#2A2A2A]"
              style={{
                background: "#1A1A1A",
                boxShadow:
                  "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(217,119,87,0.1)",
              }}
            >
              {/* ターミナルバー */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#2A2A2A] bg-[#1E1E1E]">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <span className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <span className="w-3 h-3 rounded-full bg-[#28C840]" />
                <span className="flex-1 text-center text-[11px] text-[#888] tracking-wider">
                  kizuna-taro ~ event-manager.app
                </span>
                <span className="text-[11px] text-[#555]">v1.0</span>
              </div>

              <div className="px-6 md:px-12 py-10 md:py-14">
                {/* ブランド */}
                <div className="text-center mb-6">
                  <span
                    className="inline-block px-3 py-1 text-[11px] font-semibold tracking-[0.3em] rounded-full border"
                    style={{ color: ORANGE, borderColor: ORANGE }}
                  >
                    HANAHIRO CARE DESIGN WORKS
                  </span>
                </div>

                {/* プロンプト */}
                <div className="text-center text-xs text-[#4ADE80] mb-4">
                  <span className="text-[#D97757]">$</span> seminar
                  <span className="mx-1.5 text-[#D97757]">▶</span>
                  <span className="text-[#E8E8E8]">create / manage / connect</span>
                </div>

                {/* タイトル */}
                <h1 className="text-center font-bold tracking-tight leading-[1.15] mb-6">
                  <div className="text-[28px] md:text-[44px] text-[#E8E8E8] mb-2">
                    イベントシステム
                  </div>
                  <div
                    className="text-[40px] md:text-[64px]"
                    style={{
                      background: `linear-gradient(135deg, ${ORANGE_BRIGHT}, ${ORANGE_GLOW})`,
                      WebkitBackgroundClip: "text",
                      backgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    絆 太 郎
                  </div>
                </h1>

                <p className="text-center text-[13px] md:text-[15px] text-[#888] mb-2 leading-relaxed">
                  募集から当日、終了後の心のこもったフォローまで
                </p>
                <p className="text-center text-[13px] md:text-[15px] text-[#888] mb-10 leading-relaxed">
                  LP作成・フォーム・名簿・メール配信を
                  <span className="text-[#E8E8E8] font-semibold mx-1">
                    一本で完結
                  </span>
                </p>

                {/* CTA */}
                <div className="flex justify-center mb-10">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-lg text-white font-bold tracking-wide transition-all hover:-translate-y-0.5"
                    style={{
                      background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
                      boxShadow:
                        "0 4px 20px rgba(217,119,87,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                    }}
                  >
                    ▶ まずは無料で試す
                  </Link>
                </div>

                {/* スタックチップ */}
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "想いが伝わる案内",
                    "笑顔で迎える受付",
                    "次に繋がる名簿",
                  ].map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 text-[11px] tracking-wider text-[#888] px-3 py-1 rounded-full border border-[#333]"
                    >
                      <Check size={11} className="text-[#4ADE80]" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* バージョン情報 */}
            <p className="text-center text-[11px] text-[#555] tracking-widest mt-4">
              v1.0 · powered by Hanahiro Inc. · 2026
            </p>
          </div>
        </section>

        {/* ▼ Before / After */}
        <Section
          title="EXPERIENCE / 日常のワンシーン"
          heading={
            <>
              「イベント準備」の時間を、<br className="sm:hidden" />
              <span style={{ color: ORANGE_BRIGHT }}>「企画」</span>の時間へ
            </>
          }
          subtitle="名簿の印刷、エクセルへの転記、メール送信…そんな『作業』からあなたを解放します"
        >
          <div className="grid md:grid-cols-2 gap-8">
            <DarkImageCard
              src="/image_12.png"
              alt="カフェでスマホでイベント管理"
              label={
                <>
                  <Smartphone size={14} /> 外出先でもスマホで完結
                </>
              }
              title="移動中も、リアルタイムで確認"
              body="申し込み状況は、カフェでも電車でも、スマホからリアルタイムでチェック。急な問い合わせにも、その場ですぐに対応できます。"
            />
            <DarkImageCard
              src="/image_13.png"
              alt="PCでイベント準備"
              label={
                <>
                  <Mail size={14} /> 面倒な作業を効率化
                </>
              }
              title="メール配信も、手軽にお任せ"
              body="申し込み完了メール、前日のリマインド、当日のサンクスメール。すべて一元化されるので、送信漏れの心配はもうありません。"
            />
          </div>
        </Section>

        {/* ▼ Demo / Dashboard */}
        <Section
          title="DEMO / ダッシュボード"
          heading={
            <>
              イベント管理の<br className="md:hidden" />
              <span style={{ color: ORANGE_BRIGHT }}>「面倒」をゼロにする</span>
            </>
          }
          subtitle="告知ページの作成から、当日のQR受付まで。専門知識なしで、誰でも美しいイベントページが作れます。"
        >
          <div
            className="relative mx-auto max-w-4xl rounded-xl border border-[#2A2A2A] p-2 md:p-3"
            style={{
              background: "#1A1A1A",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="aspect-[16/9] rounded-lg overflow-hidden relative bg-[#0F0F0F] border border-[#2A2A2A]">
              <Image src="/dashboard.png" alt="Dashboard" fill className="object-cover" />
            </div>
          </div>
        </Section>

        {/* ▼ Mobile First */}
        <Section
          title="MOBILE / 親指ひとつで完了"
          heading={
            <>
              ポケットから出して<br />
              <span style={{ color: ORANGE_BRIGHT }}>親指ひとつ</span>で完了
            </>
          }
          subtitle="申し込み状況の確認も、当日のQR受付も、PCを開く必要はありません。"
        >
          <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center max-w-6xl mx-auto">
            <div className="space-y-4">
              <FeatureRow
                icon={<Activity size={18} />}
                title="リアルタイム状況確認"
                desc="申し込み通知もスマホに届きます"
              />
              <FeatureRow
                icon={<QrCode size={18} />}
                title="QRコード受付"
                desc="専用アプリ不要。リーダーで読み取るだけ"
              />
              <FeatureRow
                icon={<Mail size={18} />}
                title="メール配信もスマホで"
                desc="移動中でも告知・リマインドが送れる"
              />
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <div
                  className="relative mx-auto border-[#1A1A1A] bg-[#0F0F0F] border-[14px] rounded-[2.5rem] h-[560px] w-[280px]"
                  style={{
                    boxShadow:
                      "0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(217,119,87,0.2)",
                  }}
                >
                  <div className="h-[32px] w-[3px] bg-[#1A1A1A] absolute -start-[17px] top-[72px] rounded-s-lg" />
                  <div className="h-[46px] w-[3px] bg-[#1A1A1A] absolute -start-[17px] top-[124px] rounded-s-lg" />
                  <div className="h-[46px] w-[3px] bg-[#1A1A1A] absolute -start-[17px] top-[178px] rounded-s-lg" />
                  <div className="h-[64px] w-[3px] bg-[#1A1A1A] absolute -end-[17px] top-[142px] rounded-e-lg" />
                  <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white relative">
                    <video
                      src="/mobile-demo.mp4"
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay
                      loop
                      muted
                      playsInline
                    />
                  </div>
                </div>
                <div
                  className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-3xl"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(217,119,87,0.35), transparent 70%)",
                  }}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ▼ Features (zigzag) */}
        <section id="features" className="py-20 md:py-28 px-4">
          <div className="container mx-auto max-w-6xl space-y-20 md:space-y-28">
            <ZigzagFeature
              icon={<BarChart3 size={22} />}
              label="01 / DASHBOARD"
              title={
                <>
                  イベントの状況を<br />
                  <span style={{ color: ORANGE_BRIGHT }}>一目で把握</span>
                </>
              }
              body="申し込み数、PV数、残席数をリアルタイムで可視化。直感的なダッシュボードで、イベントの今の状況が手に取るようにわかります。"
              bullets={["リアルタイム更新", "レスポンシブ対応"]}
              image="/analytics.png"
              imageAlt="リアルタイム集計画面"
            />
            <ZigzagFeature
              reverse
              icon={<LayoutTemplate size={22} />}
              label="02 / TEMPLATES"
              title={
                <>
                  デザイン作成は不要<br />
                  <span style={{ color: ORANGE_BRIGHT }}>テーマを選ぶだけ</span>
                </>
              }
              body="Tech系、ビジネス系、ポップ系、医療・福祉系。イベントの雰囲気に合わせて、管理画面からワンクリックでデザインを着せ替えられます。"
              bullets={["全8種テンプレート", "1クリック切替"]}
              video="/scroll-demo.mp4"
            />
            <ZigzagFeature
              icon={<FileSpreadsheet size={22} />}
              label="03 / FORMS"
              title={
                <>
                  フォームも、アンケートも<br />
                  <span style={{ color: ORANGE_BRIGHT }}>自在にカスタマイズ</span>
                </>
              }
              body="申し込み時の入力項目はもちろん、セミナー後の「満足度アンケート」も事前に管理画面で作成可能。当日はQRコードを読み込むだけで回答できるので、回収率も抜群です。"
              bullets={["事前/事後アンケート対応", "CSV出力"]}
              image="/form-survey.png"
              imageAlt="フォーム設定とアンケート機能"
            />
            <ZigzagFeature
              reverse
              icon={<Users size={22} />}
              label="04 / CRM"
              title={
                <>
                  そのデータ、<br />
                  <span style={{ color: ORANGE_BRIGHT }}>使い捨てていませんか？</span>
                </>
              }
              body="Googleフォームでイベントごとにバラバラに管理するのは、もう終わり。全てのイベントの参加者データが自動で一箇所に蓄積され、「あのイベントに来た人」をすぐに検索できます。"
              bullets={["全イベント横断検索", "絆リストとして蓄積"]}
              image="/crm-list.png"
              imageAlt="顧客一元管理画面"
            />
          </div>
        </section>

        {/* ▼ Comparison（ターミナル風テーブル） */}
        <Section
          title="COST / 比較"
          heading={
            <>
              「制作会社」への外注を、<br className="sm:hidden" />
              <span style={{ color: ORANGE_BRIGHT }}>過去の習慣に</span>
            </>
          }
          subtitle="1回きりのイベントに、数十万円をかける必要はありません。プロの品質を、あなたの手で、わずか10分で。"
        >
          <div
            className="rounded-xl border border-[#2A2A2A] overflow-hidden"
            style={{ background: "#1A1A1A" }}
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[640px] text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A] bg-[#1E1E1E]">
                    <th className="p-5 text-[11px] font-bold text-[#F08856] uppercase tracking-widest">
                      method
                    </th>
                    <th className="p-5 text-[11px] font-bold text-[#F08856] uppercase tracking-widest">
                      cost
                    </th>
                    <th className="p-5 text-[11px] font-bold text-[#F08856] uppercase tracking-widest text-center">
                      time
                    </th>
                    <th className="p-5 text-[11px] font-bold text-[#F08856] uppercase tracking-widest text-center">
                      quality
                    </th>
                  </tr>
                </thead>
                <tbody className="text-[#888]">
                  <tr className="border-b border-[#2A2A2A]">
                    <td className="p-5 text-[#E8E8E8] font-semibold whitespace-nowrap">
                      制作会社
                    </td>
                    <td className="p-5 whitespace-nowrap">¥300,000〜1,000,000+</td>
                    <td className="p-5 text-center text-xs whitespace-nowrap">1〜2ヶ月</td>
                    <td className="p-5 text-center whitespace-nowrap">
                      <span className="px-3 py-1 bg-[#1E1E1E] border border-[#333] rounded-full text-[10px] font-bold">
                        最高品質
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#2A2A2A]">
                    <td className="p-5 text-[#E8E8E8] font-semibold whitespace-nowrap">
                      フリーランス
                    </td>
                    <td className="p-5 whitespace-nowrap">¥100,000〜300,000</td>
                    <td className="p-5 text-center text-xs whitespace-nowrap">
                      2週間〜1ヶ月
                    </td>
                    <td className="p-5 text-center whitespace-nowrap">
                      <span className="px-3 py-1 bg-[#1E1E1E] border border-[#333] rounded-full text-[10px] font-bold">
                        バラつき
                      </span>
                    </td>
                  </tr>
                  <tr
                    style={{
                      background: "rgba(217,119,87,0.06)",
                      borderLeft: `3px solid ${ORANGE}`,
                    }}
                  >
                    <td className="p-5 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img src="/icon.webp" alt="絆太郎" className="h-7 w-7 object-contain" />
                        <span
                          className="text-xl font-bold tracking-tight"
                          style={{
                            background: `linear-gradient(135deg, ${ORANGE_BRIGHT}, ${ORANGE_GLOW})`,
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          絆太郎
                        </span>
                      </div>
                    </td>
                    <td className="p-5 whitespace-nowrap">
                      <span
                        className="text-2xl font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${ORANGE_BRIGHT}, ${ORANGE_GLOW})`,
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        ¥3,300
                      </span>
                      <span className="text-xs text-[#888] ml-1">/月</span>
                    </td>
                    <td className="p-5 text-center whitespace-nowrap">
                      <span className="text-base font-bold text-[#F08856]">
                        わずか 10分
                      </span>
                    </td>
                    <td className="p-5 text-center whitespace-nowrap">
                      <span
                        className="inline-block px-3 py-1 rounded-full text-[10px] font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
                        }}
                      >
                        プロ品質 (再利用可)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="md:hidden text-center mt-4 text-[10px] text-[#555] tracking-widest">
            ← swipe to compare →
          </div>
        </Section>

        {/* ▼ 3 Points */}
        <Section
          title="STRENGTH / 絆太郎の強み"
          heading={
            <>
              「絆太郎」の<br className="sm:hidden" />
              導入メリットと強み
            </>
          }
          subtitle=""
        >
          <div className="grid md:grid-cols-3 gap-6">
            <PointCard
              num="01"
              title="プロの「型」を自社資産に"
              body="100万円クラスの制作会社が設計する「成果の出る構成」をシステム化。一度導入すれば、高品質なテンプレートがあなたの強力な「自社資産」に変わります。"
            />
            <PointCard
              num="02"
              title="10分のデータ入力で完成"
              body="2回目以降は、新しいイベント情報を流し込むだけ。これまで数週間かかっていた外注とのやり取りが、わずか10分ほどの「データ入力」に置き換わります。"
            />
            <PointCard
              num="03"
              title="浮いた予算を次なる企画へ"
              body="開催のたびに消費されていた数十万円の外注費はもう不要。その予算を広告やコンテンツの質向上に回し、イベントの成功率をさらに高めましょう。"
            />
          </div>
        </Section>

        {/* ▼ Bento Grid */}
        <Section
          title="FEATURES / 細かい機能"
          heading={
            <>
              細かい機能も、<br className="sm:hidden" />
              <span style={{ color: ORANGE_BRIGHT }}>妥協しません</span>
            </>
          }
          subtitle="イベント成功に必要な機能を搭載しています"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <BentoCard icon={<QrCode size={22} />} title="QRチェックイン" body="受付アプリ不要。参加証のQRコードをリーダーで読み取るだけで受付完了" />
            <BentoCard icon={<FileSpreadsheet size={22} />} title="CSV一括出力" body="参加者データをExcelやスプレッドシートで扱える形式で出力" />
            <BentoCard icon={<ShieldCheck size={22} />} title="堅牢なセキュリティ" body="Google認証基盤（Firebase）を採用し、最高レベルのセキュリティを確保" />
            <BentoCard icon={<Smartphone size={22} />} title="完全レスポンシブ" body="PC、タブレット、スマホ。どんなデバイスからでも美しく表示" />
            <BentoCard icon={<Mail size={22} />} title="リッチな自動返信" body="申し込み完了時に、参加証QRコード付きのメールを自動送信" />
            <BentoCard icon={<Mail size={22} />} title="スマートなメール配信" body="蓄積された顧客リストから、ターゲットを絞って一斉送信" />
            <BentoCard icon={<LinkIcon size={22} />} title="URL即時発行" body="イベントを作成した瞬間に公開URLを発行。ワンクリックでコピー" />
            <BentoCard icon={<Share2 size={22} />} title="SNSシェア対応" body="LINEやXにURLを貼るだけで、美しいOGPカードが自動表示" />
            <BentoCard icon={<Copy size={22} />} title="イベント複製" body="定例会や定期セミナーは「コピーして作成」すれば5秒で準備完了" />
          </div>
        </Section>

        {/* ▼ Pricing */}
        <section id="pricing" className="py-20 md:py-28 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-14">
              <div
                className="inline-block px-3 py-1 mb-4 text-[11px] font-semibold tracking-[0.3em] rounded-full border"
                style={{ color: ORANGE, borderColor: ORANGE }}
              >
                PRICING
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#E8E8E8] mb-4 tracking-tight">
                選べる3つの「絆」プラン
              </h2>
              <p className="text-[#888] text-sm md:text-base leading-relaxed">
                単発の事務作業から、顧客を資産に変えるマーケティングまで。<br />
                あなたの成長に合わせて、最適なプランを選べます。
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* スポット */}
              <PricingCard
                badge="SPOT"
                name="スポット利用"
                price="¥5,500"
                priceUnit="/ 1イベント (税込)"
                desc="まずは一度試したい方に。事務作業を自動化し、当日の運営をスマートにします。"
                features={[
                  { text: "当該イベントの参加者管理" },
                  { text: "当日QR受付・名簿作成" },
                  { text: "リマインド・御礼メール送信" },
                  { text: "アンケート集計・分析" },
                  { text: "過去データの蓄積・活用", disabled: true },
                ]}
                ctaText="まずは1回使ってみる"
              />
              {/* スタンダード（推奨） */}
              <PricingCard
                badge="RECOMMENDED"
                name="スタンダード"
                price="¥3,300"
                priceUnit="/ 月額 (税込)"
                desc="出会いを「資産」に変える。過去すべての参加者データを一元管理し、継続的な関係を築けます。"
                features={[
                  { text: "全イベントの名簿を絆リスト化" },
                  { text: "過去の参加者へ一斉メール" },
                  { text: "開催数・登録数 無制限" },
                  { text: "CRM機能フル開放" },
                  { text: "リピート率の自動集計" },
                ]}
                ctaText="絆を資産に変える"
                highlight
              />
              {/* プロ */}
              <PricingCard
                badge="PROFESSIONAL"
                name="プロプラン"
                price="¥11,000"
                priceUnit="/ 月額 (税込)"
                desc="組織や法人での運営に。複数スタッフ、複数拠点のデータを一つのプラットフォームで。"
                features={[
                  { text: "スタッフ招待（共同管理）" },
                  { text: "複数拠点の管理" },
                  { text: "優先カスタマーサポート" },
                  { text: "横断レポート出力" },
                  { text: "スタンダードの全機能" },
                ]}
                ctaText="チームで利用する"
              />
            </div>
          </div>
        </section>
      </main>

      {/* ▼ Footer */}
      <footer className="border-t border-[#2A2A2A] py-12 px-4 relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <FooterCol
              title="Product"
              items={[
                { label: "機能一覧", href: "#features" },
                { label: "料金プラン", href: "#pricing" },
                { label: "導入事例 (Coming Soon)", href: "#", disabled: true },
              ]}
            />
            <FooterCol
              title="Support"
              items={[
                { label: "ヘルプセンター", href: "#", disabled: true },
                { label: "お問い合わせ", href: "/contact" },
                { label: "APIドキュメント", href: "#", disabled: true },
              ]}
            />
            <FooterCol
              title="Legal"
              items={[
                { label: "利用規約", href: "/terms" },
                { label: "プライバシーポリシー", href: "/privacy" },
                { label: "特定商取引法", href: "/legal" },
              ]}
            />
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src="/icon.webp" alt="絆太郎" className="h-6 w-6 object-contain" />
                <span className="text-[#F08856] font-bold text-base">絆太郎</span>
              </div>
              <p className="text-[11px] text-[#555] leading-relaxed tracking-wide">
                Produced by<br />
                <span className="text-[#888] font-semibold">Hanahiro Inc.</span>
                <br />
                CARE DESIGN WORKS
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-[#1E1E1E] flex flex-col md:flex-row justify-between items-center gap-3">
            <p className="text-[11px] text-[#555] tracking-wider">
              © {new Date().getFullYear()} Hanahiro Inc. CARE DESIGN WORKS. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-2">
              {["POWERED BY", "Next.js", "Firebase", "Stripe", "Resend"].map((s, i) => (
                <span
                  key={s}
                  className={`text-[10px] tracking-widest px-2.5 py-1 rounded-full border ${
                    i === 0
                      ? "text-[#F08856] border-[#F08856]"
                      : "text-[#888] border-[#333]"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===== サブコンポーネント ===== */

function Section({
  title,
  heading,
  subtitle,
  children,
}: {
  title: string;
  heading: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-20 md:py-28 px-4 border-t border-[#1A1A1A]">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] mb-4" style={{ color: ORANGE }}>
            <span style={{ color: ORANGE_BRIGHT }}>▸</span> {title}
          </div>
          <h2 className="text-2xl md:text-4xl font-bold text-[#E8E8E8] mb-4 tracking-tight leading-tight">
            {heading}
          </h2>
          {subtitle && (
            <p className="text-[#888] text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

function DarkImageCard({
  src,
  alt,
  label,
  title,
  body,
}: {
  src: string;
  alt: string;
  label: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-[#2A2A2A] group">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover object-[50%_30%] group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F]/90 via-[#0F0F0F]/30 to-transparent" />
        <div className="absolute bottom-4 left-4 text-[#F08856] font-semibold text-xs flex items-center gap-2 tracking-wider">
          {label}
        </div>
      </div>
      <div className="px-1">
        <h3 className="font-bold text-lg text-[#E8E8E8] mb-2">{title}</h3>
        <p className="text-[#888] text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-lg border border-[#2A2A2A]"
      style={{
        background: "rgba(217,119,87,0.04)",
        borderLeft: `3px solid ${ORANGE}`,
      }}
    >
      <div
        className="flex-shrink-0 p-3 rounded-full text-white"
        style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})` }}
      >
        {icon}
      </div>
      <div>
        <h4 className="font-bold text-[#E8E8E8] text-sm">{title}</h4>
        <p className="text-xs text-[#888] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function ZigzagFeature({
  icon,
  label,
  title,
  body,
  bullets,
  image,
  imageAlt,
  video,
  reverse,
}: {
  icon: React.ReactNode;
  label: string;
  title: React.ReactNode;
  body: string;
  bullets?: string[];
  image?: string;
  imageAlt?: string;
  video?: string;
  reverse?: boolean;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-12 items-center">
      <div className={`space-y-5 ${reverse ? "md:order-2" : ""}`}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-widest"
          style={{
            color: ORANGE_BRIGHT,
            background: "rgba(217,119,87,0.08)",
            border: "1px solid rgba(217,119,87,0.25)",
          }}
        >
          <span style={{ color: ORANGE }}>{icon}</span>
          {label}
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-[#E8E8E8] leading-tight tracking-tight">
          {title}
        </h2>
        <p className="text-[#888] text-sm md:text-base leading-relaxed">{body}</p>
        {bullets && (
          <ul className="space-y-2 pt-2">
            {bullets.map((b) => (
              <li
                key={b}
                className="flex items-center gap-2 text-[#E8E8E8] text-sm font-medium"
              >
                <CheckCircle2 size={16} style={{ color: ORANGE_BRIGHT }} />
                {b}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className={`relative aspect-[4/3] rounded-xl overflow-hidden border border-[#2A2A2A] ${
          reverse ? "md:order-1" : ""
        }`}
        style={{
          background: "#1A1A1A",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        {image && imageAlt && (
          <Image src={image} alt={imageAlt} fill className="object-cover" />
        )}
        {video && (
          <video
            src={video}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        )}
      </div>
    </div>
  );
}

function PointCard({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div
      className="relative p-8 rounded-xl border border-[#2A2A2A] overflow-hidden"
      style={{
        background: "#1A1A1A",
      }}
    >
      <div
        className="absolute top-3 right-6 text-6xl font-bold pointer-events-none"
        style={{ color: "rgba(217,119,87,0.08)" }}
      >
        {num}
      </div>
      <div className="relative z-10">
        <div
          className="inline-block px-3 py-1 mb-5 text-[10px] font-bold tracking-[0.2em] rounded-full"
          style={{
            color: ORANGE_BRIGHT,
            background: "rgba(217,119,87,0.1)",
            border: "1px solid rgba(217,119,87,0.3)",
          }}
        >
          POINT {num}
        </div>
        <h4 className="text-lg font-bold mb-3 text-[#E8E8E8] leading-snug">
          {title}
        </h4>
        <p className="text-sm text-[#888] leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function BentoCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      className="p-5 rounded-xl border border-[#2A2A2A] transition-all hover:border-[#444]"
      style={{ background: "#1A1A1A" }}
    >
      <div className="mb-3" style={{ color: ORANGE_BRIGHT }}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-[#E8E8E8] mb-1.5">{title}</h3>
      <p className="text-xs text-[#888] leading-relaxed">{body}</p>
    </div>
  );
}

function PricingCard({
  badge,
  name,
  price,
  priceUnit,
  desc,
  features,
  ctaText,
  highlight,
}: {
  badge: string;
  name: string;
  price: string;
  priceUnit: string;
  desc: string;
  features: { text: string; disabled?: boolean }[];
  ctaText: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="relative p-7 rounded-xl flex flex-col"
      style={{
        background: "#1A1A1A",
        border: highlight ? `1.5px solid ${ORANGE}` : "1px solid #2A2A2A",
        boxShadow: highlight
          ? "0 0 0 4px rgba(217,119,87,0.1), 0 10px 40px rgba(217,119,87,0.18)"
          : "0 10px 30px rgba(0,0,0,0.3)",
        transform: highlight ? "translateY(-8px)" : undefined,
      }}
    >
      {highlight && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] text-white"
          style={{
            background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
            boxShadow: "0 4px 14px rgba(217,119,87,0.5)",
          }}
        >
          {badge}
        </div>
      )}
      {!highlight && (
        <span
          className="inline-block self-start px-3 py-1 mb-5 text-[10px] font-bold tracking-[0.2em] rounded-full"
          style={{
            color: ORANGE_BRIGHT,
            background: "rgba(217,119,87,0.08)",
            border: "1px solid rgba(217,119,87,0.25)",
          }}
        >
          {badge}
        </span>
      )}
      {highlight && <div className="h-5" />}

      <h3 className="text-lg font-bold text-[#E8E8E8] mb-3">{name}</h3>
      <div className="flex items-baseline gap-1 mb-4">
        <span
          className="text-3xl font-bold"
          style={{
            background: `linear-gradient(135deg, ${ORANGE_BRIGHT}, ${ORANGE_GLOW})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {price}
        </span>
        <span className="text-[11px] text-[#888]">{priceUnit}</span>
      </div>
      <p className="text-[13px] text-[#888] leading-relaxed mb-6 min-h-[3em]">{desc}</p>

      <div className="space-y-3 mb-7 flex-1 border-t border-[#2A2A2A] pt-6">
        {features.map((f, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 text-sm font-medium ${
              f.disabled ? "text-[#555] line-through" : "text-[#E8E8E8]"
            }`}
          >
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
              style={{
                background: f.disabled ? "#1E1E1E" : "rgba(217,119,87,0.15)",
                border: f.disabled ? "1px solid #2A2A2A" : `1px solid ${ORANGE}`,
              }}
            >
              <Check
                size={11}
                strokeWidth={3}
                style={{ color: f.disabled ? "#555" : ORANGE_BRIGHT }}
              />
            </span>
            {f.text}
          </div>
        ))}
      </div>

      <Link
        href="/register"
        className="block text-center py-3.5 rounded-lg font-bold text-sm tracking-wide transition-all hover:-translate-y-0.5"
        style={
          highlight
            ? {
                background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_BRIGHT})`,
                color: "#fff",
                boxShadow:
                  "0 4px 20px rgba(217,119,87,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
              }
            : {
                background: "transparent",
                color: "#E8E8E8",
                border: "1px solid #444",
              }
        }
      >
        {ctaText} <ArrowRight size={14} className="inline ml-1" />
      </Link>
    </div>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; href: string; disabled?: boolean }[];
}) {
  return (
    <div>
      <h4 className="text-[11px] font-bold tracking-[0.2em] mb-4" style={{ color: ORANGE_BRIGHT }}>
        {title.toUpperCase()}
      </h4>
      <ul className="space-y-2.5 text-xs text-[#888]">
        {items.map((i) => (
          <li key={i.label}>
            <Link
              href={i.href}
              className={`hover:text-[#F08856] transition-colors ${
                i.disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
              title={i.disabled ? "準備中" : undefined}
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
