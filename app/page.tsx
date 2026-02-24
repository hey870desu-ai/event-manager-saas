import Link from "next/link";
import { 
  Settings, Activity, Users, ArrowRight, CheckCircle2, 
  LayoutTemplate, Sparkles, ShieldCheck, BarChart3,Check, 
  FileSpreadsheet, QrCode, Mail, Smartphone, Zap,Link as LinkIcon, Share2, Copy 
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* ▼ Header */}
<header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
  <div className="container mx-auto max-w-7xl px-4 h-16 flex items-center justify-between">
    
    {/* ロゴと名前の部分だっぺ！ */}
    <Link href="/" className="flex items-center gap-2.5 font-black text-2xl tracking-tighter cursor-pointer group">
      {/* 1. Sparkles を img に変更！ */}
      <img 
        src="/icon.webp" 
        alt="絆太郎" 
        className="h-9 w-9 object-contain group-hover:rotate-6 transition-transform duration-300" 
      />
      {/* 2. 名前を表示 */}
      <span className="text-slate-900">絆太郎</span>
    </Link>

    <nav className="flex items-center gap-4">
      {/* ...ナビゲーション部分はそのまま... */}
      <Link href="#features" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
        機能
      </Link>
      <Link href="#pricing" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors hidden sm:block">
        料金
      </Link>
      <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
      <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
        ログイン
      </Link>
      <Link href="/register" className="text-sm font-bold bg-indigo-600 text-white px-5 py-2.5 rounded-full hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40">
        無料で始める
      </Link>
    </nav>
  </div>
</header>

      <main>
        
        {/* ▼ 絆を大切にする主催者のための Hero Section */}
<section className="relative pt-32 pb-24 overflow-hidden bg-white">
  {/* 装飾用のドット背景 */}
  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20"></div>

  <div className="container mx-auto px-4 relative z-10">
    <div className="max-w-5xl mx-auto text-center">
      
      {/* ターゲットメッセージ */}
      <div className="inline-block px-5 py-2 mb-10 text-xs font-black tracking-[0.2em] text-indigo-600 uppercase bg-indigo-50 rounded-full border border-indigo-100">
        絆を深めるセミナー運営
      </div>

           {/* 見出し部分の修正案 */}
<h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] mb-8">
  {/* 1行目：PCでは横並び / スマホでは縦並び */}
  <div className="flex flex-col md:flex-row md:justify-center md:items-center md:gap-x-4 mb-2 md:mb-4">
    <span className="text-slate-400">セミナーの 案内</span>
    <span className="text-slate-900">スマートな 受付</span>
  </div>

  {/* 2行目：絆を深めるファン作り */}
  <div className="text-indigo-600 block">
    絆を深める ファン作り
  </div>
</h1>

      {/* サブ：一本の線で繋がる安心感 */}
      <p className="text-lg md:text-2xl text-slate-500 mb-14 max-w-4xl mx-auto leading-relaxed font-medium px-4">
        募集から当日、そして終了後の心のこもったフォローまで<br className="hidden md:inline" />
        これまでバラバラの道具で苦労していた<br className="hidden md:inline" />
        <span className="text-slate-900 font-bold border-b-4 border-indigo-500/30">LP作成からフォーム作成・名簿管理を「絆太郎」で完結</span>
      </p>

      {/* アクションボタン */}
      <div className="flex flex-col items-center gap-8">
        <Link href="/register" className="px-12 py-6 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 hover:scale-105 transition-all text-xl shadow-xl shadow-slate-200">
          まずは無料で試してみる
        </Link>
        
        {/* メリットの要約 */}
        <div className="flex flex-wrap justify-center items-center gap-6 text-slate-600 text-sm font-bold">
          <span className="flex items-center gap-2"><Check size={20} className="text-emerald-500"/> 想いが伝わる案内作り</span>
          <span className="flex items-center gap-2"><Check size={20} className="text-emerald-500"/> 笑顔で迎える当日受付</span>
          <span className="flex items-center gap-2"><Check size={20} className="text-emerald-500"/> 次に繋がる参加者名簿</span>
        </div>
      </div>
    </div>
  </div>
</section>

        {/* ▼▼▼ ここに挿入！日常のワンシーン (Before/After) ▼▼▼ */}
        <section className="py-24 bg-white border-b border-slate-100">
           <div className="container mx-auto max-w-6xl px-4">
              <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-black mb-4 text-slate-900">
                    「イベント準備」の時間を、<br className="sm:hidden"/>「企画」の時間へ。
                 </h2>
                 <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                    名簿の印刷、エクセルへの転記、メールの送信…。<br className="hidden sm:inline"/>
                    そんな「作業」からあなたを解放し、本来やるべき「企画」に集中できる環境を作ります。
                 </p>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                 
                 {/* 左側：スマホで確認 (スマートな日常) */}
                 <div className="space-y-6 md:order-2 animate-fade-in-up animation-delay-200">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl group">
                       {/* ▼ カフェでスマホの写真 (image_12.png) */}
                       <Image 
                         src="/image_12.png" 
                         alt="カフェでスマホでイベント管理" 
                         fill 
                         className="object-cover object-[50%_30%] group-hover:scale-105 transition-transform duration-700"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                       <div className="absolute bottom-4 left-4 text-white font-bold text-sm flex items-center gap-2">
                          <Smartphone size={16} /> 外出先でもスマホで完結
                       </div>
                    </div>
                    <div className="p-2">
                       <h3 className="font-bold text-xl text-slate-900 mb-2">移動中も、リアルタイムで確認</h3>
                       <p className="text-slate-600 leading-relaxed">
                          申し込み状況は、カフェでも電車でも、スマホからリアルタイムでチェック。急な問い合わせにも、その場ですぐに対応できます。
                       </p>
                    </div>
                 </div>

                 {/* 右側：PCで作業 (効率的な準備) */}
                 <div className="space-y-6 animate-fade-in-up animation-delay-400">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl group">
                       {/* ▼ PC作業の写真 (image_13.png) */}
                       <Image 
                         src="/image_13.png" 
                         alt="PCでイベント準備" 
                         fill 
                         className="object-cover object-[50%_30%] group-hover:scale-105 transition-transform duration-700"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                       <div className="absolute bottom-4 left-4 text-white font-bold text-sm flex items-center gap-2">
                          <Mail size={16} /> 面倒な作業を効率化
                       </div>
                    </div>
                    <div className="p-2">
                       <h3 className="font-bold text-xl text-slate-900 mb-2">メール配信も、手軽にお任せ</h3>
                       <p className="text-slate-600 leading-relaxed">
                          申し込み完了メール、前日のリマインド、当日のサンクスメール。すべて一元化されるので、送信漏れの心配はもうありません。
                       </p>
                    </div>
                 </div>

              </div>
           </div>
        </section>

        {/* ▼ Problem Solution Section (課題解決・ダッシュボード) */}
        {/* 元のヒーローセクションをここに移動 */}
        <section id="demo" className="relative py-20 md:py-32 bg-white">
          <div className="container mx-auto max-w-5xl px-4 text-center relative z-10">
            
            {/* ★文字サイズ調整: スマホで変に改行されないよう text-3xl に少し小さくしました */}
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-8 leading-tight md:leading-[1.1]">
              イベント管理の<br className="md:hidden"/>
              <span className="text-indigo-600 inline-block">「面倒」をゼロにする</span>
            </h2>

            <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
              告知ページの作成から、当日のQR受付まで<br className="hidden sm:inline"/>
              専門知識なしで、誰でも美しいイベントページが作れます
            </p>
            
            {/* ダッシュボード画像 */}
            <div className="relative mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white/50 shadow-2xl backdrop-blur-sm p-2 md:p-4">
               <div className="aspect-[16/9] rounded-lg bg-slate-100 border border-slate-100 overflow-hidden relative group">
                  <Image 
                    src="/dashboard.png" 
                    alt="Dashboard" 
                    fill 
                    className="object-cover" 
                  />
               </div>
            </div>
          </div>
        </section>

        {/* ▼ Mobile First Section (スマホ完結アピール) */}
        {/* 前回追加したこのセクションはここに維持 */}
        <section className="py-24 bg-slate-50 border-y border-slate-200 overflow-hidden">
           <div className="container mx-auto max-w-6xl px-4">
              <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
                 {/* 左側：テキスト */}
                 <div className="flex-1 space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-bold border border-pink-200">
                       <Smartphone size={14} /> Mobile First
                    </div>
                    {/* ★ここもスマホでの文字折れ対策 */}
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
                       ポケットから出して<br/>
                       <span className="text-pink-600">親指ひとつ</span>で完了
                    </h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                       申し込み状況の確認も、当日のQR受付も<br/>
                       PCを開く必要はありません。満員電車の中でも、会場の片隅でも
                       すべての操作が、あなたの左手だけで完結します
                    </p>
                    {/* アイコンリスト */}
                    <div className="flex flex-col gap-4">
                       <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <div className="bg-slate-900 text-white p-3 rounded-full">
                             <Activity size={20} />
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900">リアルタイム状況確認</h4>
                             <p className="text-xs text-slate-500">申し込み通知もスマホに届きます</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                          <div className="bg-slate-900 text-white p-3 rounded-full">
                             <QrCode size={20} />
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900">QRコード受付</h4>
                             <p className="text-xs text-slate-500">専用アプリ不要。リーダーで読み取るだけ</p>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* 右側：スマホ動画 */}
                 <div className="flex-1 relative flex justify-center">
                    <div className="relative mx-auto border-slate-900 bg-slate-900 border-[14px] rounded-[2.5rem] h-[600px] w-[300px] shadow-2xl">
                       <div className="h-[32px] w-[3px] bg-slate-800 absolute -start-[17px] top-[72px] rounded-s-lg"></div>
                       <div className="h-[46px] w-[3px] bg-slate-800 absolute -start-[17px] top-[124px] rounded-s-lg"></div>
                       <div className="h-[46px] w-[3px] bg-slate-800 absolute -start-[17px] top-[178px] rounded-s-lg"></div>
                       <div className="h-[64px] w-[3px] bg-slate-800 absolute -end-[17px] top-[142px] rounded-e-lg"></div>
                       <div className="rounded-[2rem] overflow-hidden w-full h-full bg-white relative">
                          <video 
                             src="/mobile-demo.mp4" 
                             className="absolute inset-0 w-full h-full object-cover"
                             autoPlay loop muted playsInline
                          />
                       </div>
                    </div>
                    <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-pink-200 to-indigo-200 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                 </div>
              </div>
           </div>
        </section>

        {/* ▼ 機能の深掘り (ジグザグ配置) */}
        <section id="features" className="py-24 bg-white border-t border-slate-100">
           {/* ... ここから下は以前と同じコードでOKです ... */}
           <div className="container mx-auto max-w-6xl px-4 space-y-24">
              
              {/* Feature 1: ダッシュボード */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                 <div className="space-y-6">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                       <BarChart3 size={24}/>
                    </div>
                    {/* ★文字サイズ微調整 */}
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                       イベントの状況を<br/>一目で把握
                    </h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                       申し込み数、PV数、残席数をリアルタイムで可視化<br/>
                       直感的なダッシュボードで、イベントの今の状況が手に取るようにわかります
                    </p>
                    <ul className="space-y-3">
                       <li className="flex items-center gap-2 text-slate-700 font-bold"><CheckCircle2 size={18} className="text-blue-500"/> リアルタイム更新</li>
                       <li className="flex items-center gap-2 text-slate-700 font-bold"><CheckCircle2 size={18} className="text-blue-500"/> デバイスを選ばないレスポンシブ対応</li>
                    </ul>
                 </div>
                 {/* 画像 */}
                 <div className="bg-slate-100 rounded-2xl aspect-[4/3] border border-slate-200 shadow-lg relative overflow-hidden group">
                    <Image src="/analytics.png" alt="リアルタイム集計画面" fill className="object-cover" />
                 </div>
              </div>

              {/* Feature 2: デザイン切り替え */}
              <div className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
                 <div className="space-y-6 md:order-2">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                       <LayoutTemplate size={24}/>
                    </div>
                    {/* ★文字サイズ微調整 */}
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                       デザイン作成は不要<br/>テーマを選ぶだけ
                    </h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                       Tech系、ビジネス系、ポップ系<br/>
                       イベントの雰囲気に合わせて、管理画面からワンクリックでデザインを着せ替えられます
                    </p>
                 </div>
                 {/* 動画 */}
                 <div className="md:order-1 bg-slate-100 rounded-2xl aspect-[4/3] border border-slate-200 shadow-lg relative overflow-hidden">
                    <video src="/scroll-demo.mp4" className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
                 </div>
              </div>

              {/* Feature 3: フォーム・アンケート機能 */}
              <div className="grid md:grid-cols-2 gap-12 items-center">
                 <div className="space-y-6">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                       {/* アンケート用紙っぽいアイコンに変更 */}
                       <FileSpreadsheet size={24}/>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                       フォームも、アンケートも<br/>自在にカスタマイズ
                    </h2>
                    <p className="text-slate-600 text-lg leading-relaxed">
                       申し込み時の入力項目はもちろん、セミナー後の「満足度アンケート」も事前に管理画面で作成可能<br/>
                       当日はQRコードを読み込むだけで回答できるので、回収率も抜群。参加者の「生の声」を分析し、次の開催をより良いものにします
                    </p>
                 </div>
                 {/* 画像: フォーム設定画面やアンケート結果画面など */}
                 <div className="bg-slate-100 rounded-2xl aspect-[4/3] border border-slate-200 shadow-lg relative overflow-hidden group">
                     {/* ▼ 画像ファイル名を変更して保存してください */}
                     <Image 
                       src="/form-survey.png" 
                       alt="フォーム設定とアンケート機能" 
                       fill 
                       className="object-cover" 
                     />
                 </div>
              </div>

              {/* Feature 4: CRM (顧客資産化) ★ここに追加！ */}
              <div className="grid md:grid-cols-2 gap-12 items-center md:flex-row-reverse">
                 <div className="space-y-6 md:order-2">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
                       {/* データベース/資産をイメージするアイコン */}
                       <Users size={24}/>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                       そのデータ<br/>
                       使い捨てていませんか？
                    </h2>
                    <div className="space-y-4 text-slate-600 text-lg leading-relaxed">
                       <p>
                          Googleフォームでイベントごとにバラバラに管理するのは、もう終わりです<br/>
                          <span className="font-bold text-slate-800 bg-orange-100 px-1">過去の参加者の情報は、あなたの「財産」です</span>
                       </p>
                       <p>
                          このシステムなら、全てのイベントの参加者データが自動で一箇所に蓄積されます<br/>
                          「あのイベントに来た人」をすぐに検索でき、次のアプローチにつなげることができます
                       </p>
                    </div>
                 </div>
                 {/* 画像: 顧客リストがずらっと並んでいる画面など */}
                 <div className="md:order-1 bg-slate-100 rounded-2xl aspect-[4/3] border border-slate-200 shadow-lg relative overflow-hidden group">
                     {/* ▼ 顧客一覧画面のスクショを撮って入れてください (crm-list.png) */}
                     <Image 
                       src="/crm-list.png" 
                       alt="顧客一元管理画面" 
                       fill 
                       className="object-cover" 
                     />
                 </div>
              </div>

           </div>
        </section>

        {/* ▼ Comparison Section (統一感重視のライトデザイン版) */}
        <section className="py-24 bg-slate-50 border-y border-slate-200">
           <div className="container mx-auto max-w-5xl px-4">
              <div className="text-center mb-16">
                 <div className="inline-block px-4 py-1.5 mb-6 text-xs font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 rounded-full">
                    Cost Performance
                 </div>
                 <h2 className="text-3xl md:text-5xl font-black mb-6 text-slate-900 leading-tight">
                    「制作会社」への外注を、<br className="sm:hidden"/>過去の習慣に。
                 </h2>
                 <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                    1回きりのイベントに、数十万円をかける必要はありません。<br className="hidden sm:inline"/>
                    プロの品質を、あなたの手で、わずか10分で。
                 </p>
              </div>

{/* 📊 比較テーブル：3行復活 ＆ 横スクロール完全版 */}
<div className="relative group">
   {/* 1. 外側の div を横滑り可能に設定 */}
   <div className="relative overflow-x-auto pb-4 bg-white border border-slate-200 shadow-2xl rounded-[2rem] custom-scrollbar">
      
      {/* 2. テーブルに最小幅を持たせて文字を潰さない */}
      <table className="w-full min-w-[700px] text-left border-collapse">
         <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
               <th className="p-6 md:p-8 text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">制作手法</th>
               <th className="p-6 md:p-8 text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">概算費用</th>
               <th className="p-6 md:p-8 text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">制作期間</th>
               <th className="p-6 md:p-8 text-sm md:text-base font-bold text-slate-500 uppercase tracking-widest text-center whitespace-nowrap">クオリティ</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-slate-100 text-slate-600">
            {/* 行1: 制作会社 */}
            <tr>
               <td className="p-6 md:p-8 font-bold text-slate-900 whitespace-nowrap">制作会社（プロ品質）</td>
               <td className="p-6 md:p-8 whitespace-nowrap">30万 〜 100万円以上</td>
               <td className="p-6 md:p-8 text-center text-sm whitespace-nowrap">1 〜 2ヶ月</td>
               <td className="p-6 md:p-8 text-center whitespace-nowrap">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">最高品質</span>
               </td>
            </tr>
            {/* 🌟 行2: フリーランス（ここが消えていたので復活だっぺ！） */}
            <tr>
               <td className="p-6 md:p-8 font-bold text-slate-900 whitespace-nowrap">フリーランス（標準）</td>
               <td className="p-6 md:p-8 whitespace-nowrap">10万 〜 30万円</td>
               <td className="p-6 md:p-8 text-center text-sm whitespace-nowrap">2週間 〜 1ヶ月</td>
               <td className="p-6 md:p-8 text-center whitespace-nowrap">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">バラツキあり</span>
               </td>
            </tr>
            {/* 行3: Event Manager */}
            <tr className="relative group bg-indigo-50/30">
  <td className="p-6 md:p-8 whitespace-nowrap">
    <div className="flex items-center gap-3">
      {/* 1. 星マークを icon.webp に差し替え！ */}
      <img 
        src="/icon.webp" 
        alt="絆太郎ロゴ" 
        className="h-8 w-8 object-contain" 
      />
      {/* 2. 名前を「絆太郎」に変更！グラデーションは維持だっぺ */}
      <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500 tracking-tight">
        絆太郎
      </span>
    </div>
  </td>
  
  {/* ...以下、価格や時間のセルはそのまま... */}
  <td className="p-6 md:p-8 whitespace-nowrap">
    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
      ¥3,300<span className="text-xs font-medium text-indigo-400">/月</span>
    </div>
  </td>
  <td className="p-6 md:p-8 text-center whitespace-nowrap">
    <span className="text-lg font-black text-indigo-700">わずか 10分</span>
  </td>
  <td className="p-6 md:p-8 text-center whitespace-nowrap">
    <span className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded-full text-xs font-black shadow-lg shadow-indigo-500/20">
      プロ品質（再利用可）
    </span>
  </td>
</tr>
         </tbody>
      </table>
   </div>
   
   {/* 3. スマホのみに表示されるスワイプのヒント（看板だっぺ） */}
   <div className="md:hidden text-center mt-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest animate-pulse">
      ← Swipe to compare →
   </div>
</div>

              {/* 💡 結論：なぜ「外注費0円」が可能なのか？（洗練版） */}
              <div className="mt-24">
                 <div className="text-center mb-16">
                    <h3 className="text-2xl md:text-4xl font-black text-slate-900 leading-tight">
                       「絆太郎」の<br className="sm:hidden"/>導入メリットと強み
                    </h3>
                 </div>

                 <div className="grid md:grid-cols-3 gap-8 items-stretch"> {/* items-stretch で高さを揃えるっぺ */}
   {/* Point 1 */}
   <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="text-6xl font-black text-slate-50 absolute top-4 right-8 group-hover:text-indigo-50/50 transition-colors pointer-events-none">01</div>
      <div className="relative z-10 flex flex-col h-full">
         <div className="inline-flex self-start px-4 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold mb-6 tracking-widest">
            POINT 01
         </div>
         <h4 className="text-xl font-black mb-4 text-slate-900 min-h-[1.5em] flex items-center">プロの「型」を自社資産に</h4>
         <p className="text-sm text-slate-500 leading-relaxed flex-1">
            100万円クラスの制作会社が設計する「成果の出る構成」をシステム化。一度導入すれば、高品質なデザインテンプレートがあなたの強力な「自社資産」に変わります。
         </p>
      </div>
   </div>

   {/* Point 2: ここも flex-col と min-h でビシッと揃えるぞい！ */}
   <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="text-6xl font-black text-slate-50 absolute top-4 right-8 group-hover:text-emerald-50/50 transition-colors pointer-events-none">02</div>
      <div className="relative z-10 flex flex-col h-full">
         <div className="inline-flex self-start px-4 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold mb-6 tracking-widest">
            POINT 02
         </div>
         <h4 className="text-xl font-black mb-4 text-slate-900 min-h-[1.5em] flex items-center">10分のデータ入力で完成</h4>
         <p className="text-sm text-slate-500 leading-relaxed flex-1">
            2回目以降は、新しいイベント情報を流し込むだけ。これまで数週間かかっていた外注とのやり取りが、わずか10分ほどの「データ入力」に置き換わります。
         </p>
      </div>
   </div>

   {/* Point 3 */}
   <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="text-6xl font-black text-slate-50 absolute top-4 right-8 group-hover:text-orange-50/50 transition-colors pointer-events-none">03</div>
      <div className="relative z-10 flex flex-col h-full">
         <div className="inline-flex self-start px-4 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-bold mb-6 tracking-widest">
            POINT 03
         </div>
         <h4 className="text-xl font-black mb-4 text-slate-900 min-h-[1.5em] flex items-center">浮いた予算を次なる企画へ</h4>
         <p className="text-sm text-slate-500 leading-relaxed flex-1">
            開催のたびに消費されていた数十万円の外注費はもう不要です。その予算を広告やコンテンツの質向上に回し、イベントの成功率をさらに高めましょう。
         </p>
      </div>
   </div>
</div>
              </div>
           </div>
        </section>


        {/* ▼ 詳細機能グリッド (Bento Grid) */}
        <section className="py-24 bg-slate-50 border-y border-slate-200">
           <div className="container mx-auto max-w-6xl px-4">
              <div className="text-center mb-16">
                 <h2 className="text-3xl md:text-4xl font-black mb-4">細かい機能も、妥協しません</h2>
                 <p className="text-slate-600">イベント成功に必要な機能を搭載しています</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Card 1 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <QrCode className="w-10 h-10 text-slate-700 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">QRチェックイン</h3>
                    <p className="text-slate-500 text-sm">受付アプリ不要。参加証のQRコードをリーダーで読み取るだけで受付完了</p>
                 </div>
                 {/* Card 2 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">CSV一括出力</h3>
                    <p className="text-slate-500 text-sm">参加者データをExcelやGoogleスプレッドシートで扱える形式で出力</p>
                 </div>
                 {/* Card 3 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <ShieldCheck className="w-10 h-10 text-blue-600 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">堅牢なセキュリティ</h3>
                    <p className="text-slate-500 text-sm">Google認証基盤（Firebase）を採用し、最高レベルのセキュリティを確保</p>
                 </div>
                 {/* Card 4 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <Smartphone className="w-10 h-10 text-purple-600 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">完全レスポンシブ</h3>
                    <p className="text-slate-500 text-sm">PC、タブレット、スマホ。どんなデバイスからでも美しく表示されます</p>
                 </div>
                 {/* Card 5 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <Mail className="w-10 h-10 text-pink-500 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">リッチな自動返信メール</h3>
                    <p className="text-slate-500 text-sm">申し込み完了時に、参加証QRコード付きのメールを自動で送信します</p>
                 </div>
                 {/* Card 6: 一斉メール配信 (And more... から変更) */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <Mail className="w-10 h-10 text-indigo-500 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">スマートなメール配信</h3>
                    <p className="text-slate-500 text-sm">蓄積された顧客リストから、ターゲットを絞って次回の案内を一斉送信。リピーターを逃しません</p>
                 </div>
                 {/* Card 7: URL即時発行 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <LinkIcon className="w-10 h-10 text-cyan-500 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">URL即時発行</h3>
                    <p className="text-slate-500 text-sm">イベントを作成した瞬間に公開URLを発行。ワンクリックでコピーして共有できます</p>
                 </div>
                 {/* Card 8: SNSシェア対応 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <Share2 className="w-10 h-10 text-indigo-500 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">SNSシェア対応</h3>
                    <p className="text-slate-500 text-sm">LINEやXにURLを貼るだけで、美しいカード（OGP画像）が自動で表示されます</p>
                 </div>
                 {/* Card 9: イベント複製 */}
                 <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                    <Copy className="w-10 h-10 text-orange-500 mb-4"/>
                    <h3 className="text-lg font-bold mb-2">イベント複製</h3>
                    <p className="text-slate-500 text-sm">定例会や定期セミナーは、過去のイベントを「コピーして作成」すれば5秒で準備完了</p>
                 </div>
              </div>
           </div>
        </section>
              
         {/* ▼ 絆太郎：新3段階料金プランセクション */}
<section id="pricing" className="py-24 bg-slate-50 relative overflow-hidden">
  <div className="container mx-auto px-4 relative z-10">
    <div className="max-w-3xl mx-auto text-center mb-20">
      <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
        選べる3つの「絆」プラン
      </h2>
      <p className="text-slate-600 text-lg font-bold leading-relaxed">
        単発の事務作業から、顧客を資産に変えるマーケティングまで。<br />
        あなたの成長に合わせて、最適なプランを選べます。
      </p>
    </div>

    <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
      
      {/* 1. スポットプラン */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all relative flex flex-col group">
        <div className="mb-8">
          <span className="px-4 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-widest mb-4 inline-block">
            Spot
          </span>
          <h3 className="text-xl font-black text-slate-900 mb-2">スポット利用</h3>
          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-4xl font-black text-slate-900">¥5,500</span>
            <span className="text-slate-500 text-xs font-bold">/ 1イベント (税込)</span>
          </div>
          <p className="mt-6 text-slate-500 text-sm font-medium leading-relaxed">
            まずは一度試したい方に。事務作業を自動化し、当日の運営をスマートにします。
          </p>
        </div>
        
        <div className="space-y-4 mb-10 flex-1 border-t border-slate-50 pt-8">
          {[
            "当該イベントの参加者管理",
            "当日QR受付・名簿作成",
            "リマインド・御礼メール送信",
            "アンケート集計・分析",
            { text: "過去データの蓄積・活用", cross: true }
          ].map((item, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm font-bold ${typeof item === 'object' ? 'text-slate-300' : 'text-slate-600'}`}>
              <div className={`p-1 rounded-full ${typeof item === 'object' ? 'bg-slate-50 text-slate-200' : 'bg-blue-50 text-blue-600'}`}>
                <Check size={14} strokeWidth={3} />
              </div>
              <span className={typeof item === 'object' ? 'line-through' : ''}>
                {typeof item === 'object' ? item.text : item}
              </span>
            </div>
          ))}
        </div>
        
        <Link href="/register" className="block text-center py-4 bg-slate-50 text-slate-900 font-black rounded-2xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
          まずは1回使ってみる
        </Link>
      </div>

      {/* 2. スタンダードプラン（おすすめ！） */}
      <div className="bg-white p-8 rounded-[3rem] shadow-2xl relative flex flex-col group scale-105 border-4 border-indigo-500 ring-8 ring-indigo-50">
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-xl">
          Recommended
        </div>
        
        <div className="mb-8 pt-4">
          <span className="px-4 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-full uppercase tracking-widest mb-4 inline-block">
            Best Asset
          </span>
          <h3 className="text-xl font-black text-slate-900 mb-2">スタンダードプラン</h3>
          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-4xl font-black text-slate-900">¥3,300</span>
            <span className="text-slate-500 text-xs font-bold">/ 月額 (税込)</span>
          </div>
          <p className="mt-6 text-slate-500 text-sm font-medium leading-relaxed">
            出会いを「資産」に変える。過去すべての参加者データを一元管理し、継続的な関係を築けます。
          </p>
        </div>
        
        <div className="space-y-4 mb-10 flex-1 border-t border-slate-50 pt-8">
          {[
            "全イベントの名簿を「絆リスト」化",
            "過去の参加者へ一斉メール送付",
            "イベント開催数・登録数 無制限",
            "クロス分析・CRM機能フル開放",
            "リピート率の自動集計"
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-700 font-bold text-sm">
              <div className="p-1 bg-indigo-100 text-indigo-600 rounded-full">
                <Check size={14} strokeWidth={3} />
              </div>
              {text}
            </div>
          ))}
        </div>
        
        <Link href="/register" className="block text-center py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-lg shadow-indigo-200 text-lg">
          絆を資産に変える
        </Link>
      </div>

      {/* 3. プロプラン */}
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl relative flex flex-col group translate-y-4">
        <div className="mb-8">
          <span className="px-4 py-1 bg-slate-800 text-slate-400 text-[10px] font-black rounded-full uppercase tracking-widest mb-4 inline-block border border-slate-700">
            Professional
          </span>
          <h3 className="text-xl font-black text-white mb-2">プロプラン</h3>
          <div className="flex items-baseline gap-1 mt-4 text-white">
            <span className="text-4xl font-black">¥11,000</span>
            <span className="text-slate-400 text-xs font-bold">/ 月額 (税込)</span>
          </div>
          <p className="mt-6 text-slate-400 text-sm font-medium leading-relaxed">
            組織や法人での運営に。複数スタッフ、複数拠点のデータを一つのプラットフォームで。
          </p>
        </div>
        
        <div className="space-y-4 mb-10 flex-1 border-t border-slate-800 pt-8">
          {[
            "スタッフ招待（共同管理）",
            "複数拠点（教室・支部）の管理",
            "優先カスタマーサポート",
            "全拠点の横断レポート出力",
            "スタンダードの全機能を含む"
          ].map((text, i) => (
            <div key={i} className="flex items-center gap-3 text-slate-300 font-bold text-sm">
              <div className="p-1 bg-slate-800 text-emerald-400 rounded-full border border-slate-700">
                <Check size={14} strokeWidth={3} />
              </div>
              {text}
            </div>
          ))}
        </div>
        
        <Link href="/register" className="block text-center py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-indigo-500 hover:text-white transition-all">
          チームで利用する
        </Link>
      </div>

    </div>
  </div>
</section>

      
      </main>

{/* ▼ Footer */}
      <footer className="bg-white py-12 border-t border-slate-200">
        <div className="container mx-auto max-w-6xl px-4">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              <div>
                 <h4 className="font-bold mb-4 text-slate-900">Product</h4>
                 <ul className="space-y-2 text-sm text-slate-600">
                    {/* ▼ href を #features に変更 */}
                    <li>
                      <Link href="#features" className="hover:text-indigo-600">
                        機能一覧
                      </Link>
                    </li>
                    
                    {/* ▼ href を #pricing に変更 */}
                    <li>
                      <Link href="#pricing" className="hover:text-indigo-600">
                        料金プラン
                      </Link>
                    </li>
                    
                    {/* ▼ 導入事例はまだないので、クリックしても動かないように # のまま */}
                    <li>
                      <Link href="#" className="hover:text-indigo-600 cursor-not-allowed opacity-70" title="準備中">
                        導入事例 (Coming Soon)
                      </Link>
                    </li>
                 </ul>
              </div>
              <div>
                 <h4 className="font-bold mb-4 text-slate-900">Support</h4>
                 <ul className="space-y-2 text-sm text-slate-600">
                    {/* まだないので準備中にする */}
                    <li>
                        <Link href="#" className="hover:text-indigo-600 cursor-not-allowed opacity-70" title="準備中">
                            ヘルプセンター
                        </Link>
                    </li>
                    
                    {/* ▼ href を "/contact" に変更 */}
                    <li>
                        <Link href="/contact" className="hover:text-indigo-600">
                            お問い合わせ
                        </Link>
                    </li>
                    
                    {/* まだないので準備中にする */}
                    <li>
                        <Link href="#" className="hover:text-indigo-600 cursor-not-allowed opacity-70" title="準備中">
                            APIドキュメント
                        </Link>
                    </li>
                 </ul>
              </div>
              <div>
                 <h4 className="font-bold mb-4 text-slate-900">Legal</h4>
                 <ul className="space-y-2 text-sm text-slate-600">
                    <li><Link href="/terms" className="hover:text-indigo-600">利用規約</Link></li>
                    <li><Link href="/privacy" className="hover:text-indigo-600">プライバシーポリシー</Link></li>
                    <li><Link href="/legal" className="hover:text-indigo-600">特定商取引法</Link></li>
                 </ul>
              </div>
              <div>
                 <div className="flex items-center gap-2 font-black text-slate-900 mb-4 text-xl">
  {/* Sparkles を img に差し替えだっぺ！ */}
  <img 
    src="/icon.webp" 
    alt="絆太郎" 
    className="h-7 w-7 object-contain" 
  />
  絆太郎
</div>
                 {/* ★ここを会社名に変更 */}
                 <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Produced by<br/>
                    <span className="text-slate-800 font-bold text-sm">Hanahiro Inc.</span><br/>
                    CARE DESIGN WORKS
                 </p>
              </div>
           </div>
           
           <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              {/* ★コピーライトも変更 */}
              <p className="text-slate-400 text-xs">
                 © {new Date().getFullYear()} Hanahiro Inc. CARE DESIGN WORKS. All rights reserved.
              </p>
              <div className="flex gap-4">
                 {/* SNSアイコンなどを置くスペース */}
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}