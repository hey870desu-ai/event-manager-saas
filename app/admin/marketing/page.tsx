"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { ArrowLeft, Mail, Users, Send, Filter, CheckCircle, RefreshCw, AlertTriangle, PlayCircle, FileText, Eye, X, Clock,Heart,FileDown } from "lucide-react";
import Link from "next/link";
import { fetchTenantData, type Tenant } from "@/lib/tenants";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

type Recipient = { 
  email: string; 
  name: string; 
  company?: string; 
  phone?: string; 
  memo?: string 
};

// ★追加: メールテンプレートの定義（配信停止リンク付き）
const EMAIL_TEMPLATES = [
  {
    id: "invite",
    label: "📅 次回イベントのご案内",
    subject: "【ご案内】次回セミナーの開催が決定しました",
    body: `参加者各位

いつも大変お世話になっております。
〇〇事務局でございます。

この度、次回のセミナー開催が決定いたしましたのでご案内申し上げます。

今回は「（テーマを入力）」を題材に、より実践的な内容をお届けする予定です。
皆様のご参加を心よりお待ちしております。

--------------------------------------------------
▼詳細・お申し込みはこちら
（ここにURLを入力）
--------------------------------------------------

--------------------------------------------------
▼配信停止をご希望の方はこちら
https://event-manager.app/unsubscribe?email={email}
--------------------------------------------------`
  },
  {
    id: "news",
    label: "📢 重要なお知らせ",
    subject: "【重要】サービスに関するお知らせ",
    body: `ご利用者様各位

平素より当サービスをご利用いただき、誠にありがとうございます。

（ここにニュース内容を入力）

今後とも変わらぬご愛顧を賜りますようお願い申し上げます。

--------------------------------------------------
▼配信停止をご希望の方はこちら
https://event-manager.app/unsubscribe?email={email}
--------------------------------------------------`
  },
  {
    id: "apology",
    label: "🙏 訂正・お詫び",
    subject: "【お詫び】配信内容の訂正について",
    body: `お客様各位

いつも大変お世話になっております。

先ほど配信いたしましたメールの内容に一部誤りがございました。
深くお詫び申し上げますとともに、以下の通り訂正させていただきます。

【誤】
（間違いの内容）

【正】
（正しい内容）

混乱を招いてしまい大変申し訳ございませんでした。
以後、このようなことがないよう管理体制を強化してまいります。

--------------------------------------------------
▼配信停止をご希望の方はこちら
https://event-manager.app/unsubscribe?email={email}
--------------------------------------------------`
  },
  {
    id: "season",
    label: "☀️ 季節のご挨拶",
    subject: "【ご挨拶】年末年始の営業について",
    body: `お取引先様各位

拝啓

（時候の挨拶）の候、貴社におかれましては益々ご清栄のこととお慶び申し上げます。
平素は格別のご高配を賜り、厚く御礼申し上げます。

さて、誠に勝手ながら、弊社の年末年始の営業は、下記のとおりとさせていただきます。

休業期間：202X年12月XX日（水）～202X年1月XX日（月）

皆様にはご迷惑をお掛けしますが、何卒ご容赦願います。
今年一年ご愛顧を賜りまして大変感謝申し上げますと伴に、皆様のご多幸をお祈りいたします。

敬具

--------------------------------------------------
▼配信停止をご希望の方はこちら
https://event-manager.app/unsubscribe?email={email}
--------------------------------------------------`
  },
  {
    id: "survey",
    label: "📝 アンケートのお願い",
    subject: "【お願い】サービス向上のためのアンケート",
    body: `参加者各位

先日はイベントにご参加いただき、誠にありがとうございました。

今後のサービス向上のため、簡単なアンケートにご協力いただけますでしょうか。
所要時間は1分程度です。

▼アンケート回答フォーム
（URLを入力）

貴重なご意見をお待ちしております。

--------------------------------------------------
▼配信停止をご希望の方はこちら
hhttps://event-manager.app/unsubscribe?email={email}
--------------------------------------------------`
  }
];

export default function MarketingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // 抽出条件
  const [targetBranch, setTargetBranch] = useState("all"); 
  const [targetEventId, setTargetEventId] = useState("all");
  const [events, setEvents] = useState<any[]>([]);

  // 抽出結果
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [extracted, setExtracted] = useState(false);
  
  // メール作成
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  // ★追加: 予約日時を入れる箱
  const [scheduledTime, setScheduledTime] = useState("");

  const [searchQuery, setSearchQuery] = useState(""); // 検索ワード用
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set()); // チェックしたメアドを覚える箱
  

useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // ★1. まずは空にする。最初から "demo" を入れてはいけないっぺ！
          let currentId = "";

          // ★2. 特権管理者（塙さん）であっても、まずは admin_users に所属を探しに行く
          const userDoc = await getDoc(doc(db, "admin_users", currentUser.email!));
          
          if (userDoc.exists()) {
            // admin_users に登録があれば、その ID（caredesignworksなど）を正しく取得
            currentId = userDoc.data().tenantId;
          } else if (currentUser.email === SUPER_ADMIN_EMAIL) {
            // 登録がない特権管理者の場合のみ、予備で demo を使う
            currentId = "demo";
          }

          // IDが見つからない場合は処理を止める（demoに勝手に飛ばさない）
          if (!currentId) {
             console.error("所属テナントが見つからないっぺ！admin_usersの設定を確認してくんちぇ。");
             setLoading(false);
             return;
          }

          // ★3. 判明したID（caredesignworks）で、そのテナント専用のデータを取得
          const tData = await fetchTenantData(currentId);
          setTenantData(tData);

          // イベント取得のクエリも、この正しいIDで実行だっぺ！
          const q = query(collection(db, "events"), where("tenantId", "==", currentId));
          const snap = await getDocs(q);
          const list = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as any))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
          setEvents(list);

        } catch (e) {
          console.error("Load Error:", e);
        } finally {
          setLoading(false);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // ★ 抽出されたリストを検索ワードで絞り込むロジックだっぺ！
  const displayedRecipients = recipients.filter(r => 
    r.name.includes(searchQuery) || r.email.includes(searchQuery)
  );

  const safeBranches = Array.isArray(tenantData?.branches) 
    ? tenantData.branches.flatMap((b: any) => {
        if (typeof b === 'string') return b; 
        if (b && typeof b === 'object' && Array.isArray(b.branches)) return b.branches; 
        return [];
      })
    : [];

  const hasBranches = safeBranches.length > 0;

  const filteredEvents = events.filter(e => {
  // 1. 「全部署・全イベント」なら、文句なしで表示
  if (targetBranch === "all") return true;

  // 2. プルダウンで何かが選ばれている場合
  // e.branchTag（タグ）が一致するか、
  // もしくは e.tenantId が一致していれば「そのテナントのイベント」として認めるっぺ！
  return (
    e.branchTag === targetBranch || 
    e.tenantId === tenantData?.id || // 👈 tenantId が合ってればOKにするっぺ！
    (e.organizer && e.organizer.includes(targetBranch))
  );
});

const fetchTargets = async () => {
    if (!tenantData) return;
    setLoadingTargets(true);
    setRecipients([]);
    setExtracted(false);

    try {
      // ★追加: まずブラックリスト（配信停止者）を取得する
      const optOutSnap = await getDocs(collection(db, "marketing_optouts"));
      const blockedEmails = new Set(optOutSnap.docs.map(d => d.id)); // ID(メアド)をSetに入れて検索しやすくする

      let targetEvents = filteredEvents;
      if (targetEventId !== "all") {
        targetEvents = targetEvents.filter(e => e.id === targetEventId);
      }

      if (targetEvents.length === 0) {
        alert("条件に一致するイベントがありません。");
        setLoadingTargets(false);
        return;
      }

      const emailMap = new Map<string, string>(); 
      let blockedCount = 0; // 何人除外したか数える用

      await Promise.all(targetEvents.map(async (event) => {
        const resSnap = await getDocs(collection(db, "events", event.id, "reservations"));
        resSnap.forEach(doc => {
          const data = doc.data();
          if (data.email && data.name) {
            // ★追加: ブラックリストに入っているかチェック！
            if (blockedEmails.has(data.email)) {
              blockedCount++; // 入っていたら除外してカウントアップ
            } else {
              emailMap.set(data.email, data.name); // 問題なければリストに追加
            }
          }
        });
      }));

      const uniqueList = await Promise.all(
  Array.from(emailMap.entries()).map(async ([email, name]) => {
    // 💡 保存済みのメモを取得しに行くぞい
    const memoRef = doc(db, "tenants", tenantData.id, "kizuna_memos", email);
    const memoSnap = await getDoc(memoRef);
    
    return { 
      email, 
      name, 
      memo: memoSnap.exists() ? memoSnap.data().text : "" 
    };
  })
);
      setRecipients(uniqueList);
      setExtracted(true);

      // 除外された人がいればログに出す（確認用）
      if (blockedCount > 0) {
        console.log(`🚫 配信停止リストに基づき、${blockedCount} 名を除外しました。`);
      }

    } catch (e) {
      console.error(e);
      alert("リストの抽出に失敗しました。");
    } finally {
      setLoadingTargets(false);
    }
  }

  // ★テンプレート適用関数
  const applyTemplate = (templateId: string) => {
    const tmpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      if (subject || body) {
        if (!confirm("入力中の内容が上書きされますがよろしいですか？")) return;
      }
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  // ✅ 新しく追加する関数
const handleSaveMemo = async (email: string, memo: string) => {
  if (!tenantData || !user) return;
  
  try {
    // ユーザー（テナント）ごとの専用のメモ保存場所を作るっぺ
    // docIDを "メアド" にすることで、一人一人のメモを管理するぞい
    const memoRef = doc(db, "tenants", tenantData.id, "kizuna_memos", email);
    await setDoc(memoRef, {
      text: memo,
      updatedAt: new Date()
    }, { merge: true });

    // ローカルの state も更新して、再読み込みなしで反映させるっぺ
    setRecipients(prev => prev.map(r => 
      r.email === email ? { ...r, memo } : r
    ));
    console.log("絆メモを刻んだっぺ！:", memo);
  } catch (e) {
    console.error("Memo Save Error:", e);
  }
};
  // ✅ これが絆リスト専用のCSV出力関数だっぺ！
  const handleDownloadCSV = () => {
    if (recipients.length === 0) return alert("まずはリストを抽出してくんちぇ！");
    
    // ヘッダー作成
    const headers = ["名前", "メールアドレス", "会社名・組織", "電話番号", "絆メモ"];
    
    // 中身の作成
    const csvRows = recipients.map(r => [
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${(r.email || "").replace(/"/g, '""')}"`,
      `"${(r.company || "").replace(/"/g, '""')}"`,
      `"${(r.phone || "").replace(/"/g, '""')}"`,
      `"${(r.memo || "").replace(/"/g, '""')}"`
    ].join(","));
    
    // BOM（文字化け防止）を付けてダウンロード
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `絆リスト_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSend = async (isTest: boolean = false) => {
    if (!subject || !body) return alert("件名と本文を入力してください。");
    // ★ ここで「チェックされた人」がいるか判定するだっぺ！
  let finalRecipients = recipients;
  if (!isTest && selectedEmails.size > 0) {
    // チェックが入っている場合は、その人たちだけに絞り込む
    finalRecipients = recipients.filter(r => selectedEmails.has(r.email));
  } else if (isTest) {
    finalRecipients = [{ email: user?.email || "", name: "管理者(テスト)" }];
  }

  if (finalRecipients.length === 0) return alert("宛先がありません。");
    
    if (!isTest) {
      if (!confirm(`【最終確認】\n\n宛先数: ${finalRecipients.length} 名\n件名: ${subject}\n\n本当に一斉送信しますか？`)) return;
    }

    setSending(true);

    // ★重要: メール内のタイトルを決めるロジック
    // 特定のイベントが選ばれていない(all)なら、イベント名の代わりに「件名」や「差出人名」を表示する
    let displayTitle = `${tenantData?.name}よりお知らせ`;
    let displayDate = new Date().toLocaleDateString();
    let displayVenue = "―";

    if (targetEventId !== "all") {
      // イベントが特定されている場合は、そのイベント情報をセット
      const ev = events.find(e => e.id === targetEventId);
      if (ev) {
        displayTitle = ev.title;
        displayDate = ev.date;
        displayVenue = ev.venueName || "オンライン";
      }
    } else {
        // イベント指定なし（全体配信）の場合
        displayTitle = subject; // 件名をタイトルにする
    }

    try {
      const res = await fetch('/api/send-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        recipients: finalRecipients, 
        subject: isTest ? `[TEST] ${subject}` : subject,
        body: body,
        senderName: tenantData?.name || "絆太郎",
        replyTo: user?.email,
        themeColor: tenantData?.themeColor,
        }),
      });

      if (res.ok) {
        alert(isTest ? "テスト送信完了！メールを確認してください。" : "一斉送信リクエスト完了！順次配信されます。");
        if (!isTest) {
          setSubject("");
          setBody("");
          setExtracted(false); 
          setRecipients([]);
        }
      } else {
        alert("送信エラーが発生しました。");
      }
    } catch (e) {
      alert("通信エラー");
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-slate-400">Loading marketing tools...</div>;

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 md:p-10 space-y-8 animate-in fade-in">
      
      {/* 📂 app/admin/marketing/page.tsx 内の見出し部分 */}

<div className="flex items-center gap-4 border-b border-slate-800 pb-6">
  <Link href="/admin" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
    <ArrowLeft size={20} />
  </Link>
  <div>
    <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
      {/* Mail から Heart に変更だっぺ！ */}
      <Heart className="text-rose-500" fill="currentColor" size={28}/> 絆リスト
    </h1>
    <p className="text-slate-400 text-sm font-medium">これまでに出会った大切な方々へ、感謝とご縁を届ける</p>
  </div>
</div>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左カラム: リスト抽出 */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              <h2 className="text-white font-bold mb-4 flex items-center gap-2"><Filter size={18} className="text-indigo-400"/> 配信ターゲット抽出</h2>
              
              <div className="space-y-4">
                 
                 {hasBranches && (
                   <div>
                      <label className="block text-xs text-slate-500 font-bold mb-2">対象範囲 (部署・支部)</label>
                      <select 
                        value={targetBranch}
                        onChange={(e) => {
                          setTargetBranch(e.target.value);
                          setTargetEventId("all");
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none cursor-pointer hover:border-indigo-500/50 transition-colors"
                      >
                         <option value="all">👑 全部署・全イベント</option>
                         {safeBranches.map(b => (
                           <option key={b} value={b}>{b}</option>
                         ))}
                      </select>
                   </div>
                 )}

                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">特定のイベント (任意)</label>
                    <select 
                      value={targetEventId}
                      onChange={(e) => setTargetEventId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none cursor-pointer hover:border-indigo-500/50 transition-colors"
                    >
                       <option value="all">
                         {hasBranches && targetBranch === "all" ? "全イベント対象" : "この範囲の全イベント"}
                       </option>
                       
                       {filteredEvents.map(e => (
                           <option key={e.id} value={e.id}>
                             {e.date} : {e.title}
                           </option>
                         ))}
                       
                       {filteredEvents.length === 0 && (
                         <option disabled>該当するイベントがありません</option>
                       )}
                    </select>
                 </div>

                 <button 
                   onClick={fetchTargets}
                   disabled={loadingTargets}
                   className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {loadingTargets ? <RefreshCw className="animate-spin" size={18}/> : <Users size={18}/>}
                   リストを抽出・名寄せ
                 </button>
              </div>
           </div>

           <div className={`bg-slate-900/50 border border-slate-800 p-6 rounded-xl text-center transition-all duration-500 ${extracted ? "opacity-100 translate-y-0" : "opacity-50 translate-y-2"}`}>
  <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Total Recipients</div>
  
  {/* 1. 数字の下に少し余裕を持たせるっぺ */}
  <div className="text-4xl font-mono font-bold text-white mb-6">
     {recipients.length.toLocaleString()}
  </div>
  
  {/* 2. ボタンを配置。mb-6 を足して下のチェックマークとの距離を離すぞい！ */}
  {extracted && (
    <button 
      onClick={handleDownloadCSV}
      className="mb-6 w-full py-3 bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
    >
      <FileDown size={14}/> 絆リストをCSV出力
    </button>
  )}

  {/* 3. チェックマーク（重複除去済み）の周りもスッキリさせるっぺ */}
  <div className="text-[10px] text-emerald-400 flex justify-center items-center gap-1 font-bold pb-2">
     <CheckCircle size={12}/> 重複アドレス除去済み
  </div>
              
              {/* 📂 抽出プレビューのエリア（recipients.length > 0 の中）を以下に差し替え */}
{recipients.length > 0 && (
  <div className="mt-4 pt-4 border-t border-slate-800 text-left">
    
    {/* 🔍 検索バー */}
    <div className="relative mb-3">
      <input 
        type="text"
        placeholder="名前やアドレスで検索..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-indigo-500 transition-all"
      />
      <Filter size={14} className="absolute left-3 top-3 text-slate-500" />
    </div>

    {/* 人数カウントの補助情報 */}
    <div className="flex justify-between items-center px-1 mb-2">
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
        {selectedEmails.size > 0 ? `✅ ${selectedEmails.size}名を選択中` : "リスト一覧"}
      </p>
      {selectedEmails.size > 0 && (
        <button 
          onClick={() => setSelectedEmails(new Set())}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold"
        >
          選択を解除
        </button>
      )}
    </div>

    {/* 連絡帳風のリスト */}
    <div className="max-h-[65vh] overflow-y-auto custom-scrollbar bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 shadow-inner">
      {/* 📂 リスト表示のループ内 */}
{displayedRecipients.map((r, i) => (
  <div 
    key={i} 
    className={`p-3 rounded-lg transition-colors border-b border-slate-800/30 last:border-0 hover:bg-slate-900/80 ${selectedEmails.has(r.email) ? 'bg-indigo-500/10' : ''}`}
  >
    <div className="flex items-center gap-3">
      <input 
        type="checkbox"
        checked={selectedEmails.has(r.email)}
        onChange={() => {
          const newSet = new Set(selectedEmails);
          if (newSet.has(r.email)) newSet.delete(r.email);
          else newSet.add(r.email);
          setSelectedEmails(newSet);
        }}
        className="w-4 h-4 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-800 cursor-pointer"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-white truncate">{r.name}</div>
        <div className="text-[10px] text-slate-600 truncate">{r.email}</div>
      </div>
    </div>

    {/* ★ 絆メモの入力欄をここに追加だっぺ！ */}
    <div className="mt-2 ml-7">
      <input 
        type="text"
        placeholder="絆メモ（例：交流会で名刺交換）"
        defaultValue={r.memo || ""}
        onBlur={(e) => handleSaveMemo(r.email, e.target.value)}
        className="w-full bg-slate-950 border border-slate-800/50 rounded px-2 py-1 text-[10px] text-slate-400 focus:border-indigo-500/50 outline-none transition-all italic placeholder:text-slate-700"
      />
    </div>
  </div>
))}
      {displayedRecipients.length === 0 && (
        <div className="p-10 text-center text-slate-600 text-xs">
          一致する人は見つからなかったっぺ...
        </div>
      )}
    </div>
  </div>
)}
           </div>
        </div>

{/* ▼▼▼ 右カラム: メール作成（予約配信対応版） ▼▼▼ */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative">
              
              {!extracted && (
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl border border-slate-800/50">
                    <Filter className="text-slate-600 mb-2" size={48}/>
                    <p className="text-slate-400 font-bold">左側のメニューからリストを抽出してください</p>
                 </div>
              )}

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-bold flex items-center gap-2"><Mail size={18} className="text-indigo-400"/> メール作成</h2>
                
                <div className="flex items-center gap-2">
                   <FileText size={14} className="text-slate-500"/>
                   <select 
                     className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-1 outline-none cursor-pointer hover:border-indigo-500"
                     onChange={(e) => applyTemplate(e.target.value)}
                     defaultValue=""
                   >
                     <option value="" disabled>テンプレートから読み込む</option>
                     {EMAIL_TEMPLATES.map(t => (
                       <option key={t.id} value={t.id}>{t.label}</option>
                     ))}
                   </select>
                </div>
              </div>
              
              <div className="space-y-6">
                 {/* 配信設定エリア（新機能！） */}
                 <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <label className="block text-xs text-slate-500 font-bold mb-3">配信タイミング</label>
                    <div className="flex flex-col md:flex-row gap-6">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="deliveryType" 
                            checked={!scheduledTime} 
                            onChange={() => setScheduledTime("")}
                            className="w-4 h-4 text-indigo-500 border-slate-700 focus:ring-indigo-500 bg-transparent"
                          />
                          <div className="group-hover:text-white transition-colors">
                             <span className="block text-sm font-bold text-slate-200">今すぐ配信</span>
                             <span className="block text-xs text-slate-500">送信ボタンを押すと即時配信されます</span>
                          </div>
                       </label>
                       
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="radio" 
                            name="deliveryType" 
                            checked={!!scheduledTime} 
                            onChange={() => {
                               // デフォルトで明日の朝9時をセット
                               const tmrw = new Date();
                               tmrw.setDate(tmrw.getDate() + 1);
                               tmrw.setHours(9, 0, 0, 0);
                               // datetime-local用のフォーマット (YYYY-MM-DDThh:mm)
                               const iso = tmrw.toISOString().slice(0, 16); // 秒をカット
                               // 日本時間へ補正が必要なら別途処理しますが、簡易的にローカル時間をセット
                               // ※本当はライブラリを使うと楽ですが、ここでは手動入力させます
                               setScheduledTime(iso); 
                            }}
                            className="w-4 h-4 text-indigo-500 border-slate-700 focus:ring-indigo-500 bg-transparent"
                          />
                          <div className="group-hover:text-white transition-colors">
                             <span className="block text-sm font-bold text-slate-200">予約配信</span>
                             <span className="block text-xs text-slate-500">指定した日時に自動で配信します</span>
                          </div>
                       </label>
                    </div>

                    {/* 予約日時入力エリア（予約選択時のみ表示） */}
                    {scheduledTime && (
                       <div className="mt-4 pl-7 animate-in fade-in slide-in-from-top-2">
                          <input 
                            type="datetime-local"
                            value={scheduledTime}
                            onChange={(e) => setScheduledTime(e.target.value)}
                            min={new Date().toISOString().slice(0, 16)}
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 cursor-pointer"
                          />
                          <p className="mt-2 text-xs text-amber-500 flex items-center gap-1">
                             <Clock size={12}/> 設定した日時にシステムが自動送信します
                          </p>
                       </div>
                    )}
                 </div>

                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">件名 (Subject)</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="例: 【重要】セミナーのご案内"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">本文 (Body)</label>
                    <div className="text-[10px] text-slate-500 mb-2 bg-slate-950 p-3 rounded border border-slate-800 flex items-start gap-2">
                       <span className="text-yellow-500">💡</span> 
                       <div>
                         本文中の「参加者各位」は、送信時に自動で「〇〇 様」に置き換わります。<br/>
                         送信者名: <span className="text-indigo-400 font-bold">{tenantData?.name || "..."}</span>
                       </div>
                    </div>
                    <textarea 
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="いつも大変お世話になっております。..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:border-indigo-500 outline-none transition-colors font-sans leading-relaxed min-h-[600px]" 
                    />
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                    <AlertTriangle size={14} className="text-amber-500"/>
                    {scheduledTime ? "予約後の変更・キャンセルは管理画面から可能です" : "一度送信すると取り消しはできません"}
                 </div>
                 
                 <div className="flex gap-3 w-full md:w-auto">
                    <button 
                      onClick={() => setShowPreview(true)}
                      disabled={!subject && !body}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg transition-all flex items-center gap-2 border border-slate-700 w-full md:w-auto justify-center"
                    >
                      <Eye size={18}/> プレビュー
                    </button>

                    <button 
                      onClick={() => handleSend(true)}
                      disabled={sending}
                      className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-all flex items-center gap-2 border border-slate-700 w-full md:w-auto justify-center"
                    >
                      <PlayCircle size={18}/> テスト送信 (自分のみ)
                    </button>

                    {/* 送信ボタン（テキスト可変） */}
                    <button 
                      onClick={() => handleSend(false)}
                      disabled={sending || recipients.length === 0}
                      className={`px-6 py-3 font-bold rounded-lg transition-all flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto justify-center ${
                          scheduledTime 
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20" 
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20"
                      }`}
                    >
                      {sending ? <RefreshCw className="animate-spin" size={18}/> : scheduledTime ? <Clock size={18}/> : <Send size={18}/>}
                      {scheduledTime 
    ? "配信予約を確定" 
    : `${selectedEmails.size > 0 ? selectedEmails.size : recipients.length}名に想いを届ける`
  }
                    </button>
                 </div>
              </div>
           </div>
        
        </div>
        {/* ▲▲▲ 右カラムここまで ▲▲▲ */}

      </main>
{/* ▼▼▼ 追加: メールプレビューモーダル ▼▼▼ */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-slate-800 font-bold flex items-center gap-2">
                <Mail size={16}/> 受信メールイメージ
              </h3>
              <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-800 bg-slate-200 p-1 rounded-full">
                <X size={20}/>
              </button>
            </div>
            
            {/* メールの中身（擬似表示） */}
            <div className="p-0 bg-white text-slate-800 max-h-[70vh] overflow-y-auto">
              {/* メタ情報 */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-2 text-sm">
                <div className="flex gap-4">
                  <span className="text-slate-500 w-16 text-right">差出人:</span>
                  <span className="font-bold">{tenantData?.name || "絆太郎"}</span>
                </div>
                <div className="flex gap-4">
                  <span className="text-slate-500 w-16 text-right">件名:</span>
                  <span className="font-bold">{subject || "(件名なし)"}</span>
                </div>
              </div>

              {/* 本文エリア */}
              <div className="p-8 leading-relaxed whitespace-pre-wrap font-sans text-base">
                {/* 擬似的なヘッダー画像エリア */}
                <div className="mb-6 p-4 bg-slate-100 border-l-4 border-indigo-500 rounded text-slate-600 text-sm">
                   <p className="font-bold text-lg mb-1 text-indigo-700">
                     {targetEventId !== "all" 
                        ? events.find(e => e.id === targetEventId)?.title 
                        : subject || `${tenantData?.name}よりお知らせ`}
                   </p>
                   <p className="text-xs">
                     {targetEventId !== "all" 
                        ? `${events.find(e => e.id === targetEventId)?.date} | ${events.find(e => e.id === targetEventId)?.venueName || "オンライン"}`
                        : new Date().toLocaleDateString()}
                   </p>
                </div>

                {/* 本文の置換プレビュー */}
                {body ? body.replace(/参加者各位/g, "佐藤 太郎 様") : "(本文が入力されていません)"}
                
                <div className="mt-8 pt-8 border-t border-slate-100 text-xs text-slate-400 text-center">
                  © {new Date().getFullYear()} {tenantData?.name} All rights reserved.
                </div>
              </div>
            </div>

            {/* フッターアクション */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold">
                修正する
              </button>
              <button 
                onClick={() => { setShowPreview(false); handleSend(true); }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700"
              >
                自分にテスト送信
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ▲▲▲ 追加ここまで ▲▲▲ */}
    </div>
    
  );
}