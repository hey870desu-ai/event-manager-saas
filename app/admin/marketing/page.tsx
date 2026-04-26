"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, setDoc, orderBy, addDoc, deleteDoc } from "firebase/firestore";
import { ArrowLeft, Mail, Users, Send, Filter, CheckCircle, RefreshCw, AlertTriangle, PlayCircle, FileText, Eye, X, Clock,Heart,FileDown,Trash2, Link2, Copy } from "lucide-react";
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
https://www.event-manager.app/unsubscribe?email={email}
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
https://www.event-manager.app/unsubscribe?email={email}
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
https://www.event-manager.app/unsubscribe?email={email}
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
https://www.event-manager.app/unsubscribe?email={email}
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
https://www.event-manager.app/unsubscribe?email={email}
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
  const [scheduledTime, setScheduledTime] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // 予約配信一覧
  const [scheduledList, setScheduledList] = useState<any[]>([]);
  const [previewScheduled, setPreviewScheduled] = useState<any | null>(null);
  

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

          // 予約配信一覧を取得
          const schedSnap = await getDocs(
            query(collection(db, "tenants", currentId, "scheduled_emails"), orderBy("scheduledAt", "desc"))
          );
          setScheduledList(schedSnap.docs.map(d => ({ id: d.id, ...d.data() })));

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
  const displayedRecipients = recipients.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.company?.toLowerCase().includes(q) ||
      r.memo?.toLowerCase().includes(q);
  });

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
      const optOutSnap = await getDocs(collection(db, "marketing_optouts"));
      const blockedEmails = new Set(optOutSnap.docs.map(d => d.id));

      let targetEvents = filteredEvents;
      if (targetEventId !== "all") {
        targetEvents = targetEvents.filter(e => e.id === targetEventId);
      }

      // ★ここが進化ポイント！名前だけでなく、会社名・電話番号も覚える箱にするぞい
      const customerMap = new Map<string, any>(); 
      let blockedCount = 0;

      // 🏆 修正ポイント：まずは「インポートされた名簿」を読み込む！
      const manualSnap = await getDocs(collection(db, "tenants", tenantData.id, "manual_contacts"));
      manualSnap.forEach(doc => {
        const d = doc.data();
        customerMap.set(d.email, {
          name: d.name,
          company: d.company || "",
          phone: d.phone || "",
          role: d.role || "",
        });
      });

      await Promise.all(targetEvents.map(async (event) => {
        const resSnap = await getDocs(collection(db, "events", event.id, "reservations"));
        resSnap.forEach(doc => {
          const data = doc.data();
          if (data.email && data.name) {
            if (blockedEmails.has(data.email)) {
              blockedCount++;
            } else {
              const createdAt = data.createdAt?.toDate?.()?.getTime?.() || 0;
              const existing = customerMap.get(data.email);
              // 新しい予約データを優先（登録日が新しい or まだ登録なし）
              if (!existing || createdAt > (existing._createdAt || 0)) {
                customerMap.set(data.email, {
                  name: data.name,
                  company: data.company || data.department || "",
                  phone: data.phone || "",
                  _createdAt: createdAt,
                });
              }
            }
          }
        });
      }));

      // メモを合体させて、最終的なリストを作るぞい
      const uniqueList = await Promise.all(
        Array.from(customerMap.entries()).map(async ([email, info]) => {
          const memoRef = doc(db, "tenants", tenantData.id, "kizuna_memos", email);
          const memoSnap = await getDoc(memoRef);
          
          return { 
            email, 
            name: info.name, 
            company: info.company, // ✅ 会社名が入る！
            phone: info.phone,     // ✅ 電話番号が入る！
            memo: memoSnap.exists() ? memoSnap.data().text : "" 
          };
        })
      );

      // 「仮登録中」等の不正な名前を空にクリーニング
      const invalidNames = ['仮登録中', '仮登録', '仮', '名前なし', 'ユーザー', 'ゲスト', 'test', 'テスト'];
      const cleanedList = uniqueList.map(r => ({
        ...r,
        name: invalidNames.includes(r.name.trim()) ? '' : r.name,
      }));

      setRecipients(cleanedList);
      setExtracted(true);
      if (blockedCount > 0) console.log(`🚫 ${blockedCount} 名を除外しました。`);

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
  // 名前・会社名・電話番号のインライン編集保存
  const handleSaveField = async (email: string, field: string, value: string) => {
    if (!tenantData) return;
    try {
      // manual_contacts に保存（イベント予約のデータも上書きされるようにするため）
      const contactRef = doc(db, "tenants", tenantData.id, "manual_contacts", email);
      await setDoc(contactRef, {
        email,
        [field]: value,
        source: 'manual_edit',
        updatedAt: new Date(),
      }, { merge: true });

      // ローカルstateも更新
      setRecipients(prev => prev.map(r =>
        r.email === email ? { ...r, [field]: value } : r
      ));
    } catch (e) {
      console.error("Field Save Error:", e);
    }
  };

// ✅ 絆リスト専用：CSVダウンロード関数（電話番号の0守護神版！）
  const handleDownloadCSV = () => {
    if (recipients.length === 0) return alert("まずはリストを抽出してくんちぇ！");
    
    // ヘッダー（ここは今のまま維持！）
    const headers = ["名前", "メールアドレス", "会社名・組織", "電話番号", "絆メモ"];
    
    // 中身の作成
    const csvRows = recipients.map(r => {
      // 電話番号の0落ち補完
      let p = (r.phone || "").toString().trim();
      if (p && !p.startsWith('0') && /^\d{9,10}$/.test(p)) {
        p = '0' + p;
      }
      // ハイフンが入っていない純数字の場合もフォーマット
      if (p && /^\d{10,11}$/.test(p)) {
        if (p.length === 11) p = p.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
        else if (p.length === 10) p = p.replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
      }
      // ="090-1234-5678" 形式でExcelの数値変換を完全に防止
      const safePhone = p ? `="'${p}"` : `""`;

      return [
        `"${(r.name || "").replace(/"/g, '""')}"`,
        `"${(r.email || "").replace(/"/g, '""')}"`,
        `"${(r.company || "").replace(/"/g, '""')}"`,
        safePhone,
        `"${(r.memo || "").replace(/"/g, '""')}"`
      ].join(",");
    });
    
    // BOM（文字化け防止）を付けてダウンロード（ここも維持！）
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `絆リスト_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

// CSV/Excelインポート（列名自動検出強化・バッチ書き込み・プレビュー付き）
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // 列名マッチ用辞書（大文字小文字無視で比較）
  const matchKey = (keys: string[], columnName: string) => {
    const col = columnName.trim().toLowerCase();
    return keys.some(k => col === k || col.includes(k));
  };
  const emailPatterns = ['メールアドレス', 'email', 'メアド', 'e-mail', 'メール', '宛先', 'address', 'mail'];
  const namePatterns = ['氏名', '名前', 'name', '姓名', 'ユーザー', 'ユーザー名', '顧客名', '担当者', 'お名前', 'フルネーム'];
  const companyPatterns = ['会社名', '会社', '組織', 'チーム', '社名', '企業名', '法人名', '勤務先', '所属', 'company', '団体名'];
  const phonePatterns = ['電話番号', '電話', 'tel', 'phone', '連絡先', '携帯', '携帯電話', 'mobile'];
  const rolePatterns = ['役職', '肩書き', '肩書', '部署', 'title', 'role', 'position', '職位', '部門'];

  const findKey = (row: any, patterns: string[]) => {
    return Object.keys(row).find(key => matchKey(patterns, key));
  };

  // Step 1: ファイル読み込み → プレビュー表示
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantData) return;
    setImportFile(file);

    const XLSX = await import("xlsx");
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        let workbook;

        if (file.name.toLowerCase().endsWith('.csv')) {
          const sjisDecoder = new TextDecoder('shift-jis');
          const sjisText = sjisDecoder.decode(uint8Array);
          if (sjisText.includes('\ufffd')) {
            const utf8Decoder = new TextDecoder('utf-8');
            workbook = XLSX.read(utf8Decoder.decode(uint8Array), { type: 'string' });
          } else {
            workbook = XLSX.read(sjisText, { type: 'string' });
          }
        } else {
          workbook = XLSX.read(uint8Array, { type: 'array' });
        }

        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[] = XLSX.utils.sheet_to_json(ws);

        if (jsonData.length === 0) { alert("中身が空です"); return; }

        // プレビュー用に整形
        const parsed = jsonData.map(row => {
          const emailKey = findKey(row, emailPatterns) || Object.keys(row).find(key => String(row[key]).includes('@'));
          const nameKey = findKey(row, namePatterns) || Object.keys(row).find(key => key !== emailKey && String(row[key]).length > 0);
          const companyKey = findKey(row, companyPatterns);
          const phoneKey = findKey(row, phonePatterns);
          const roleKey = findKey(row, rolePatterns);

          const email = emailKey ? String(row[emailKey]).trim() : '';
          return {
            email,
            name: nameKey ? String(row[nameKey]).trim() : '名前なし',
            company: companyKey ? String(row[companyKey]).trim() : '',
            phone: phoneKey ? String(row[phoneKey]).trim() : '',
            role: roleKey ? String(row[roleKey]).trim() : '',
            valid: email.includes('@'),
          };
        }).filter(r => r.valid);

        setImportPreview(parsed);
      } catch (err) {
        console.error("Import Parse Error:", err);
        alert("ファイルの読み込みに失敗しました");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // Step 2: プレビュー確認後に保存
  const handleConfirmImport = async () => {
    if (!importPreview || !tenantData) return;
    setLoadingTargets(true);

    try {
      const { writeBatch } = await import("firebase/firestore");
      let importCount = 0;
      let updateCount = 0;

      // 既存データをチェック
      const existingSnap = await getDocs(collection(db, "tenants", tenantData.id, "manual_contacts"));
      const existingEmails = new Set(existingSnap.docs.map(d => d.id));

      // Firestoreバッチ書き込み（500件ずつ）
      const BATCH_LIMIT = 500;
      for (let i = 0; i < importPreview.length; i += BATCH_LIMIT) {
        const chunk = importPreview.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);

        for (const row of chunk) {
          const contactRef = doc(db, "tenants", tenantData.id, "manual_contacts", row.email);
          batch.set(contactRef, {
            email: row.email,
            name: row.name,
            company: row.company,
            phone: row.phone,
            role: row.role,
            source: 'csv_import',
            importedAt: new Date()
          }, { merge: true });

          if (existingEmails.has(row.email)) {
            updateCount++;
          } else {
            importCount++;
          }
        }

        await batch.commit();
      }

      alert(`インポート完了！\n新規: ${importCount}件\n更新: ${updateCount}件`);
      setImportPreview(null);
      setImportFile(null);
      fetchTargets();

    } catch (err) {
      console.error("Import Save Error:", err);
      alert("保存中にエラーが発生しました");
    } finally {
      setLoadingTargets(false);
    }
  };

  // 🧹 文字化けしたインポートデータを一気に消し去る魔法だばい！
  const handleClearImports = async () => {
    if (!tenantData) return;
    if (!confirm("インポートした名簿をすべて削除して、やり直すべか？（イベント予約者は消えねぇから安心だばい！）")) return;

    setLoadingTargets(true);
    try {
      const { collection, query, where, getDocs, writeBatch } = await import("firebase/firestore");
      
      // 1. インポートしたデータ（sourceがcsv_importのもの）だけを探す
      const q = query(
        collection(db, "tenants", tenantData.id, "manual_contacts"),
        where("source", "==", "csv_import")
      );
      
      const snap = await getDocs(q);
      const batch = writeBatch(db); // 🎯 まとめて消すためのバッチ処理だばい！

      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 2. 実行！！
      await batch.commit();
      
      alert(`きれいに掃除したぞい！(${snap.docs.length}件削除)`);
      fetchTargets(); // 🔄 画面を更新！

    } catch (e) {
      console.error(e);
      alert("お掃除に失敗しちまったっぺ…");
    } finally {
      setLoadingTargets(false);
    }
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
    
    // 予約配信の場合
    if (!isTest && scheduledTime) {
      if (!confirm(`【予約配信の確認】\n\n宛先数: ${finalRecipients.length} 名\n件名: ${subject}\n配信日時: ${new Date(scheduledTime).toLocaleString('ja-JP')}\n\n予約しますか？`)) return;
      setSending(true);
      try {
        await addDoc(collection(db, "tenants", tenantData!.id, "scheduled_emails"), {
          subject,
          body: body,
          recipients: finalRecipients,
          recipientCount: finalRecipients.length,
          senderName: tenantData?.name || "絆太郎",
          replyTo: user?.email,
          themeColor: tenantData?.themeColor || "#3b82f6",
          scheduledAt: new Date(scheduledTime).toISOString(),
          status: 'scheduled',
          createdAt: new Date().toISOString(),
        });
        alert(`${new Date(scheduledTime).toLocaleString('ja-JP')} に ${finalRecipients.length}名への配信を予約しました。`);
        setSubject(""); setBody(""); setScheduledTime(""); setExtracted(false); setRecipients([]);
        // 一覧を再取得
        const schedSnap = await getDocs(query(collection(db, "tenants", tenantData!.id, "scheduled_emails"), orderBy("scheduledAt", "desc")));
        setScheduledList(schedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); alert("予約に失敗しました"); }
      finally { setSending(false); }
      return;
    }

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
          // 🏆 ここで名前をクリーニングするっぺ！
      recipients: finalRecipients.map(r => {
        // 🚨 変な名前リスト（これに当てはまったら「お客様」にする）
        const genericNames = ['仮登録中', 'ユーザー', '名前なし', '仮登録', '仮'];
        
        return {
          ...r,
          name: (!r.name || genericNames.includes(r.name.trim())) 
                ? 'お客様' 
                : r.name
        };
      }),
      subject: isTest ? `[TEST] ${subject}` : subject,
      body: body,
        
        senderName: tenantData?.name || "絆太郎",
        replyTo: user?.email,
        themeColor: tenantData?.themeColor,
        }),
      });

      if (res.ok) {
        // 即時送信のログを保存（テスト送信以外）
        if (!isTest && tenantData) {
          await addDoc(collection(db, "tenants", tenantData.id, "scheduled_emails"), {
            subject,
            body,
            recipients: finalRecipients,
            recipientCount: finalRecipients.length,
            senderName: tenantData?.name || "絆太郎",
            replyTo: user?.email,
            themeColor: tenantData?.themeColor || "#3b82f6",
            scheduledAt: new Date().toISOString(),
            status: 'sent',
            sentAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
          // 一覧を再取得
          const schedSnap = await getDocs(query(collection(db, "tenants", tenantData.id, "scheduled_emails"), orderBy("scheduledAt", "desc")));
          setScheduledList(schedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
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
      <Users className="text-indigo-400" size={28}/> 絆リスト
    </h1>
    <p className="text-slate-400 text-sm font-medium">これまでに出会った大切な方々へ、感謝とご縁を届ける</p>
  </div>
</div>

<main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📂 左カラム: リスト抽出・絆名簿エリア */}
        <div className="lg:col-span-1 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
              
              <div className="flex justify-between items-center mb-6 gap-2">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Filter size={18} className="text-indigo-400"/> 配信ターゲット抽出
                </h2>
                <div className="flex gap-2">
    {/* 🧹 お掃除ボタン */}
    <button 
      onClick={handleClearImports}
      className="flex items-center gap-1 text-[10px] font-black text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/20 transition-all whitespace-nowrap"
    >
      <Trash2 size={12} /> 名簿リセット
    </button>
                <label className="flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20 transition-all whitespace-nowrap">
                  <FileText size={12} /> Excelインポート
                  <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileSelect} />
                </label>
              </div>
              </div>

              <div className="space-y-4">
                 {hasBranches && (
                   <div>
                      <label className="block text-xs text-slate-500 font-bold mb-2">対象範囲 (部署・支部)</label>
                      <select value={targetBranch} onChange={(e) => { setTargetBranch(e.target.value); setTargetEventId("all"); }} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500/50 shadow-inner">
                         <option value="all">👑 全部署・全イベント</option>
                         {safeBranches.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                   </div>
                 )}
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">特定のイベント (任意)</label>
                    <select value={targetEventId} onChange={(e) => setTargetEventId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500/50 shadow-inner">
                       <option value="all">{hasBranches && targetBranch === "all" ? "全イベント対象" : "この範囲の全イベント"}</option>
                       {filteredEvents.map(e => <option key={e.id} value={e.id}>{e.date} : {e.title}</option>)}
                    </select>
                 </div>
                 <button onClick={fetchTargets} disabled={loadingTargets} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg transition-all flex justify-center items-center gap-2 shadow-lg disabled:opacity-50">
                   {loadingTargets ? <RefreshCw className="animate-spin" size={20}/> : <Users size={20}/>} リストを抽出・名寄せ
                 </button>
              </div>
           </div>

           <div className={`bg-slate-900/50 border border-slate-800 p-6 rounded-xl text-center transition-all duration-500 ${extracted ? "opacity-100 translate-y-0" : "opacity-50 translate-y-2"}`}>
              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-2">Total Recipients</div>
              <div className="text-4xl font-mono font-bold text-white mb-6">{recipients.length.toLocaleString()}</div>
              {extracted && (
                <button onClick={handleDownloadCSV} className="mb-3 w-full py-3 bg-slate-800 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                  <FileDown size={14}/> 絆リストをCSV出力
                </button>
              )}
              {tenantData && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/subscribe?t=${tenantData.id}`;
                    navigator.clipboard.writeText(url);
                    alert("メルマガ登録URLをコピーしました！\n\n" + url);
                  }}
                  className="mb-6 w-full py-3 bg-slate-800 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Link2 size={14}/> メルマガ登録URLをコピー
                </button>
              )}
              <div className="text-[10px] text-emerald-400 flex justify-center items-center gap-1 font-bold pb-2"><CheckCircle size={12}/> 重複アドレス除去済み</div>
              {recipients.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800 text-left">
                  <div className="relative mb-3">
                    <input type="text" placeholder="名前やアドレスで検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-indigo-500 transition-all"/>
                    <Filter size={14} className="absolute left-3 top-3 text-slate-500" />
                  </div>
                  {/* 📂 名簿リストを表示するスクロールエリア */}
                  <div className="max-h-[50vh] overflow-y-auto custom-scrollbar bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 shadow-inner">
                    {displayedRecipients.map((r, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border-b border-slate-800/30 last:border-0 hover:bg-slate-900/80 ${selectedEmails.has(r.email) ? 'bg-indigo-500/10' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(r.email)}
                            onChange={() => {
                              const newSet = new Set(selectedEmails);
                              if (newSet.has(r.email)) newSet.delete(r.email);
                              else newSet.add(r.email);
                              setSelectedEmails(newSet);
                            }}
                            className="w-4 h-4 rounded border-slate-700 text-indigo-600 bg-slate-800 cursor-pointer mt-1.5"
                          />

                          <div className="flex-1 min-w-0 space-y-1">
                            {/* 名前（インライン編集） */}
                            <input
                              type="text"
                              defaultValue={r.name}
                              placeholder="名前を入力..."
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v !== r.name) handleSaveField(r.email, 'name', v);
                              }}
                              className={`w-full bg-transparent text-sm font-bold outline-none border-b border-transparent focus:border-indigo-500/50 transition-all py-0.5 ${r.name ? 'text-white' : 'text-slate-500 italic'}`}
                            />

                            {/* メールアドレス */}
                            <div className="text-xs text-slate-400 truncate">{r.email}</div>

                            {/* 会社名・電話番号（インライン編集） */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                defaultValue={r.company || ''}
                                placeholder="会社名"
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (r.company || '')) handleSaveField(r.email, 'company', v);
                                }}
                                className="flex-1 bg-transparent text-[10px] text-slate-400 outline-none border-b border-transparent focus:border-indigo-500/30 transition-all placeholder:text-slate-700 py-0.5"
                              />
                              <input
                                type="text"
                                defaultValue={r.phone || ''}
                                placeholder="電話番号"
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v !== (r.phone || '')) handleSaveField(r.email, 'phone', v);
                                }}
                                className="w-28 bg-transparent text-[10px] text-slate-400 outline-none border-b border-transparent focus:border-indigo-500/30 transition-all placeholder:text-slate-700 font-mono py-0.5"
                              />
                            </div>

                            {/* 絆メモ */}
                            <input
                              type="text"
                              placeholder="絆メモを入力..."
                              defaultValue={r.memo || ""}
                              onBlur={(e) => handleSaveMemo(r.email, e.target.value)}
                              className="w-full bg-slate-950/50 border border-slate-800/30 rounded px-2 py-1 text-[10px] text-slate-500 focus:border-indigo-500/50 focus:text-slate-300 outline-none transition-all italic"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
           </div>
        </div>

        {/* 📂 右カラム: メール作成エリア */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl relative shadow-2xl">
              {!extracted && (
                 <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center rounded-xl border border-slate-800/50">
                    <Filter className="text-slate-600 mb-2" size={48}/><p className="text-slate-400 font-bold">左側のメニューからリストを抽出してください</p>
                 </div>
              )}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-white font-bold flex items-center gap-2"><Mail size={18} className="text-indigo-400"/> メール作成</h2>
                <div className="flex items-center gap-2">
                   <FileText size={14} className="text-slate-500"/>
                   <select className="bg-slate-950 border border-slate-700 text-xs text-white rounded px-2 py-1 outline-none cursor-pointer" onChange={(e) => applyTemplate(e.target.value)} defaultValue="">
                     <option value="" disabled>テンプレート読込</option>
                     {EMAIL_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                   </select>
                </div>
              </div>
              <div className="space-y-6">
                 {/* 🏆 配信設定：ここもしっかり復活させたぞい！ */}
                 <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                    <label className="block text-xs text-slate-500 font-bold mb-3">配信タイミング</label>
                    <div className="flex flex-col md:flex-row gap-6">
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="deliveryType" checked={!scheduledTime} onChange={() => setScheduledTime("")} className="w-4 h-4 text-indigo-500 bg-transparent border-slate-700"/>
                          <div className="group-hover:text-white transition-colors"><span className="block text-sm font-bold text-slate-200">今すぐ配信</span><span className="block text-xs text-slate-500">即時配信されます</span></div>
                       </label>
                       <label className="flex items-center gap-3 cursor-pointer group">
                          <input type="radio" name="deliveryType" checked={!!scheduledTime} onChange={() => { const d = new Date(); d.setDate(d.getDate() + 1); setScheduledTime(`${d.toISOString().split('T')[0]}T09:00`); }} className="w-4 h-4 text-indigo-500 bg-transparent border-slate-700"/>
                          <div className="group-hover:text-white transition-colors"><span className="block text-sm font-bold text-slate-200">予約配信</span><span className="block text-xs text-slate-500">指定した日時に配信します</span></div>
                       </label>
                    </div>
                    {scheduledTime && (
                       <div className="mt-4 pl-7 animate-in fade-in slide-in-from-top-2">
                          <div className="flex gap-2 items-center">
                            <input type="date" value={scheduledTime.split('T')[0] || ''} onChange={(e) => { const time = scheduledTime.split('T')[1] || '09:00'; setScheduledTime(`${e.target.value}T${time}`); }} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 [color-scheme:dark]" />
                            <select value={scheduledTime.split('T')[1] || '09:00'} onChange={(e) => { const date = scheduledTime.split('T')[0] || new Date().toISOString().split('T')[0]; setScheduledTime(`${date}T${e.target.value}`); }} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-indigo-500 [color-scheme:dark]">
                              {Array.from({length: 24}, (_, h) => [0,10,20,30,40,50].map(m => { const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; return <option key={val} value={val}>{h}:{String(m).padStart(2,'0')}</option>; })).flat()}
                            </select>
                          </div>
                          <p className="mt-2 text-xs text-amber-500 flex items-center gap-1"><Clock size={12}/> 設定した日時に自動送信します</p>
                       </div>
                    )}
                 </div>
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">件名 (Subject)</label>
                    <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例: 【重要】セミナーのご案内" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none transition-colors" />
                 </div>
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-2">本文 (Body)</label>
                    <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="いつも大変お世話になっております。..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none font-sans leading-relaxed min-h-[450px]" />
                 </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div className="text-xs text-slate-500 flex items-center gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                    <AlertTriangle size={14} className="text-amber-500"/>{scheduledTime ? "予約後の変更・キャンセルは管理画面から可能です" : "一度送信すると取り消しはできません"}
                 </div>
                 <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setShowPreview(true)} disabled={!subject && !body} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg border border-slate-700 w-full md:w-auto justify-center flex items-center gap-2"><Eye size={18}/> プレビュー</button>
                    <button onClick={() => handleSend(true)} disabled={sending} className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg border border-slate-700 w-full md:w-auto justify-center flex items-center gap-2"><PlayCircle size={18}/> テスト送信</button>
                    <button onClick={() => handleSend(false)} disabled={sending || recipients.length === 0} className={`px-6 py-3 font-black rounded-lg transition-all flex items-center gap-2 shadow-lg w-full md:w-auto justify-center ${scheduledTime ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-indigo-600 hover:bg-indigo-500 text-white"}`}>
                      {sending ? <RefreshCw className="animate-spin" size={18}/> : scheduledTime ? <Clock size={18}/> : <Send size={18}/>}
                      {scheduledTime ? "配信予約を確定" : `${selectedEmails.size > 0 ? selectedEmails.size : recipients.length}名に想いを届ける`}
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* 配信履歴 */}
        {scheduledList.length > 0 && (
          <div className="lg:col-span-3 mt-2">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-white font-bold flex items-center gap-2">
                  <Clock size={18} className="text-emerald-400"/> 配信履歴
                </h2>
                {scheduledList.some(i => i.status === 'scheduled') && (
                  <button
                    onClick={async () => {
                      if (!confirm('予約中のメールを今すぐ配信チェックしますか？')) return;
                      try {
                        const res = await fetch('/api/cron', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: 'manual-trigger' }) });
                        const data = await res.json();
                        if (res.ok) {
                          alert(`配信チェック完了！ ${data.processed || 0}件処理しました。`);
                          const schedSnap = await getDocs(query(collection(db, "tenants", tenantData!.id, "scheduled_emails"), orderBy("scheduledAt", "desc")));
                          setScheduledList(schedSnap.docs.map(d => ({ id: d.id, ...d.data() })));
                        } else { alert('エラー: ' + (data.error || '不明')); }
                      } catch { alert('通信エラー'); }
                    }}
                    className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1 border border-amber-500/30"
                  >
                    <RefreshCw size={12}/> 今すぐ配信チェック
                  </button>
                )}
              </div>

              {/* 予約中 */}
              {scheduledList.filter(i => i.status === 'scheduled').length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider mb-2">予約中</p>
                  <div className="space-y-2">
                    {scheduledList.filter(i => i.status === 'scheduled').map((item) => (
                      <div key={item.id} className="bg-slate-950/50 border border-emerald-500/20 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">予約中</span>
                            <span className="text-xs text-slate-400">{new Date(item.scheduledAt).toLocaleString('ja-JP')}</span>
                          </div>
                          <p className="text-sm font-bold text-white truncate">{item.subject}</p>
                          <p className="text-[10px] text-slate-500">{item.recipientCount || item.recipients?.length || 0}名宛</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPreviewScheduled(item)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1">
                            <Eye size={12}/> 内容確認
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm('この予約を取り消しますか？')) return;
                              await deleteDoc(doc(db, "tenants", tenantData!.id, "scheduled_emails", item.id));
                              setScheduledList(prev => prev.filter(s => s.id !== item.id));
                            }}
                            className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1"
                          >
                            <X size={12}/> 取消
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 送信済み */}
              {scheduledList.filter(i => i.status === 'sent').length > 0 && (
                <div>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-2">送信済み</p>
                  <div className="space-y-2">
                    {scheduledList.filter(i => i.status === 'sent').slice(0, 20).map((item) => (
                      <div key={item.id} className="bg-slate-950/50 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">送信済み</span>
                            <span className="text-xs text-slate-400">
                              {item.sentAt ? new Date(item.sentAt).toLocaleString('ja-JP') : new Date(item.scheduledAt).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-white truncate">{item.subject}</p>
                          <p className="text-[10px] text-slate-500">{item.recipientCount || item.recipients?.length || 0}名宛</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPreviewScheduled(item)} className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-colors flex items-center gap-1">
                            <Eye size={12}/> 宛先確認
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* 予約配信プレビューモーダル */}
      {previewScheduled && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">{previewScheduled.status === 'sent' ? '送信済みメールの詳細' : '予約配信の内容'}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {previewScheduled.status === 'sent' ? '送信日時' : '配信予定'}: {new Date(previewScheduled.sentAt || previewScheduled.scheduledAt).toLocaleString('ja-JP')} / {previewScheduled.recipientCount || previewScheduled.recipients?.length || 0}名宛
                </p>
              </div>
              <button onClick={() => setPreviewScheduled(null)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X size={20}/>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">件名</p>
                <p className="text-white font-bold">{previewScheduled.subject}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">本文</p>
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {previewScheduled.body}
                </div>
              </div>
              {previewScheduled.recipients && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">宛先（{previewScheduled.recipients.length}名）</p>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    {previewScheduled.recipients.slice(0, 30).map((r: any, idx: number) => (
                      <div key={idx} className="text-xs text-slate-400 flex gap-2">
                        <span className="text-slate-300 font-medium">{r.name}</span>
                        <span className="text-slate-600">{r.email}</span>
                      </div>
                    ))}
                    {previewScheduled.recipients.length > 30 && (
                      <p className="text-[10px] text-slate-600 mt-1">他 {previewScheduled.recipients.length - 30}名</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* インポートプレビューモーダル */}
      {importPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f111a] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">インポートプレビュー</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {importPreview.length}件のデータが見つかりました。内容を確認してください。
                </p>
              </div>
              <button onClick={() => { setImportPreview(null); setImportFile(null); }} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                <X size={20}/>
              </button>
            </div>
            <div className="overflow-auto flex-1 p-4">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase sticky top-0">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">名前</th>
                    <th className="px-3 py-2">メール</th>
                    <th className="px-3 py-2">会社名</th>
                    <th className="px-3 py-2">役職</th>
                    <th className="px-3 py-2">電話番号</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {importPreview.slice(0, 50).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-white font-medium">{row.name}</td>
                      <td className="px-3 py-2 text-slate-300 font-mono">{row.email}</td>
                      <td className="px-3 py-2 text-slate-400">{row.company || '-'}</td>
                      <td className="px-3 py-2 text-slate-400">{row.role || '-'}</td>
                      <td className="px-3 py-2 text-slate-400">{row.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 50 && (
                <p className="text-xs text-slate-500 text-center mt-3">他 {importPreview.length - 50}件（全{importPreview.length}件）</p>
              )}
            </div>
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">文字化けがないか確認してください</p>
              <div className="flex gap-3">
                <button onClick={() => { setImportPreview(null); setImportFile(null); }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-bold transition-colors">
                  キャンセル
                </button>
                <button onClick={handleConfirmImport} disabled={loadingTargets}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2">
                  {loadingTargets ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                  {importPreview.length}件をインポート
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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