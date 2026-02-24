// 📂 app/admin/page.tsx (デザイン維持・エラー修正版)
"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase"; 
import { useRouter } from "next/navigation";
import { collection, query, onSnapshot, deleteDoc, doc, getDocs, setDoc, getDoc, orderBy, updateDoc,addDoc,serverTimestamp } from "firebase/firestore";
import EventForm from "@/components/EventForm";
import Link from "next/link"; // ★ Linkコンポーネントを追加
import StripeConnectButton from "@/components/admin/StripeConnectButton";
import { where } from "firebase/firestore";

// ★相対パスのまま維持
import { fetchAllTenants, type Tenant } from "../../lib/tenants";

// Icons
import { Plus, LogOut, Calendar, MapPin, ExternalLink, Trash2, BarChart3, Users, Check, Eye, Share2, FileDown, ShieldAlert, Settings, UserPlus, X, UserCheck, ListChecks, Copy, Mail, Send, Building2, Tag, Megaphone, BarChart2, ScanBarcode, QrCode, Star,Sparkles, MessageSquare, Clock, FileText, Shield, CreditCard, ArrowRight, Lock } from "lucide-react"; 

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

type EventData = { id: string; title: string; date: string; location: string; venueName?: string; tenantId?: string; branchTag?: string; slug?: string; content: string; status?: string; createdAt?: any;surveyFields?:any[];theme?: string;lecturers?:  any[];contactName?: string;contactEmail?: string;contactPhone?: string; };
type AdminUser = { email: string; tenantId: string; branchId?: string; role?: string; addedAt: any; addedBy: string; };
type ReservationData = { id: string; name: string; email: string; phone: string; company: string; department: string; type: string; jobTitles: string[] | string; source: string; referrer: string; membership: string; createdAt: any; checkedIn?: boolean; };

// テンプレート定義
const MAIL_TEMPLATES = {
  thankyou: {
    label: "御礼メール（標準）",
    subject: "【御礼】ご参加ありがとうございました",
    body: (eventTitle: string, orgName: string) => `
${eventTitle}
参加者各位

この度は、ご参加いただき誠にありがとうございました。
${orgName}です。

当日は多くの皆様にご来場いただき、無事終了することができました。
皆様にとって実りのある時間となっていれば幸いです。

今後とも、地域のつながりを大切にした活動を続けてまいります。
またのご参加を心よりお待ちしております。

--------------------------------------------------
${orgName}
--------------------------------------------------
`
  },
  remind: {
    label: "前日リマインド",
    subject: "【重要】明日のイベントについてのご案内",
    body: (eventTitle: string, orgName: string) => `
${eventTitle}
お申し込みの皆様

${orgName}です。
いよいよ明日が開催日となりました。

皆様にお会いできることを楽しみにしております。
お気をつけてお越しくださいませ。

【開催概要】
イベント名：${eventTitle}
※開始時間の5分前には受付をお済ませください。

--------------------------------------------------
${orgName}
--------------------------------------------------
`
  },
// ... remind: { ... } の後ろに追加
  ticket: {
    label: "🎟️ 当日チケット (QR)",
    subject: "【重要】当日の受付用QRコードをお送りします",
    body: (eventTitle: string, orgName: string) => `
${eventTitle}
参加者各位

${orgName}です。
いよいよ開催が近づいてまいりました。

当日の受付用QRコードをお送りします。
以下のQRコードを受付にてご提示ください。

{qr}

皆様のご来場を心よりお待ちしております。

--------------------------------------------------
${orgName}
--------------------------------------------------
`
  },
  custom: {
    label: "手動入力（空紙）",
    subject: "",
    body: () => ""
  }
};

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventData[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [currentUserTenant, setCurrentUserTenant] = useState<string>("");
  
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [tenantList, setTenantList] = useState<Tenant[]>([]);

  const [counts, setCounts] = useState<{[key:string]: number}>({});
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrEvent, setQrEvent] = useState<EventData | null>(null);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  
  // Mail Modal
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [sendingMail, setSendingMail] = useState(false);
  // ✅ これを足すだけで波線は消えるぞい！
  const [modalStep, setModalStep] = useState(1);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  // ▼ ここから貼り付ける ▼
  const [mailTargetType, setMailTargetType] = useState<'checked-in' | 'all' | 'individual' | 'selected'>('checked-in');
  const [targetParticipant, setTargetParticipant] = useState<ReservationData | null>(null);
  
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const toggleSelectAll = () => {
    if (selectedParticipantIds.length === participants.length) setSelectedParticipantIds([]);
    else setSelectedParticipantIds(participants.map(p => p.id));
  };
  const toggleSelectParticipant = (id: string) => {
    setSelectedParticipantIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };
  // ▲ ここまで貼り付ける ▲
  const [orgName, setOrgName] = useState("絆太郎 Event Manager"); 
  const [editingOrgName, setEditingOrgName] = useState(""); 

  const [currentEventForList, setCurrentEventForList] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<ReservationData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  
  const [newAdminBranch, setNewAdminBranch] = useState(""); 
  const [newAdminTenantId, setNewAdminTenantId] = useState(""); 
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  // ▼▼▼ 追加：複製機能のロジック ▼▼▼
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  // テナント情報をここで確定させる
  const currentTenantData = tenantList.find(t => t.id === currentUserTenant);
  
  // ★ ここを書き換え：プランが 'FREE' なら true になるようにする
  const isFreePlan = currentTenantData?.plan?.toUpperCase() === 'FREE';

  const handleDuplicate = async (e: React.MouseEvent, event: EventData) => {
    e.stopPropagation();
    if (!confirm('このイベントを複製しますか？\n（タイトルに「のコピー」が付き、下書き状態で作成されます）')) return;
    
    setDuplicatingId(event.id);
    try {
      // IDと作成日以外のデータをコピー
      const { id, createdAt, ...eventData } = event; 
      
      await addDoc(collection(db, 'events'), {
        ...eventData,
        title: `${eventData.title} のコピー`, // タイトルを変更
        status: 'draft', // ステータスは下書きに戻す
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Duplicate error:", error);
      alert("複製に失敗しました");
    } finally {
      setDuplicatingId(null);
    }
  };
  // ▲▲▲ 追加ここまで ▲▲▲

  const router = useRouter();
  // ★追加： 「本部」という名前を、会社名（署名）に書き換える関数
  const formatBranchName = (bName: string) => {
    // もし名前が「本部」で、かつ署名名(orgName)が設定されていたら、署名名を表示
    if (bName === "本部" && orgName) return orgName;
    return bName;
  };

  // ★安全装置: 変なデータが来てもエラーにしない関数
  const safeStr = (val: any) => {
    if (typeof val === 'string') return val;
    // オブジェクトが来たら無理やり文字列に変換せず、空文字か安全な値を返す
    return "";
  };

  // Auth & Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser?.email) { router.push("/admin/login"); return; }
      
      const currentEmailClean = currentUser.email.replace(/\s+/g, '').toLowerCase();
      const superAdminEmailClean = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();

      try {
        const tenants = await fetchAllTenants();
        setTenantList(tenants);
      } catch (e) {
        console.error("Tenants fetch error", e);
      }

      if (currentEmailClean === superAdminEmailClean) {
        setUser(currentUser);
        setCurrentUserTenant("super_admin");
        setIsSuperAdminMode(true);
      } else {
        const d = await getDoc(doc(db, "admin_users", currentUser.email));
        if (d.exists()) {
           const data = d.data() as AdminUser;
           setUser(currentUser);

           if (safeStr(data.branchId) === "sys_master_v9Xk2_secret") {
             setCurrentUserTenant("super_admin");
             setIsSuperAdminMode(true);
           } else {
             setCurrentUserTenant(safeStr(data.tenantId) || "demo");
             setIsSuperAdminMode(false);
           }
        } else { 
          if (currentEmailClean === superAdminEmailClean) {
             setUser(currentUser);
             setCurrentUserTenant("super_admin");
             setIsSuperAdminMode(true);
          } else {
             router.push("/onboarding");
             return;
          }
        }
      }
      setLoading(false); // Loading終了を確実に呼ぶ
    });
    return () => unsubscribe();
  }, [router]);

  // ▼ ここを追加：初回ログイン判定ロジック
  useEffect(() => {
    if (!loading && user) {
      // ユーザーごとに「見たよ」フラグを保存するっぺ
      const hasVisited = localStorage.getItem(`bantaro_visited_${user.email}`);
      if (!hasVisited) {
        setIsWelcomeModalOpen(true);
      }
    }
  }, [user, loading]);

  // モーダルを閉じる時の関数
  const closeWelcomeModal = () => {
    if (user?.email) {
      localStorage.setItem(`bantaro_visited_${user.email}`, 'true');
    }
    setIsWelcomeModalOpen(false);
  };

useEffect(() => {
    if (!user || !currentUserTenant) return; // テナントID確定まで待つ

    // 1. イベント取得（スーパー管理者は全件、それ以外は自分のテナントのみ）
    const eventQuery = isSuperAdminMode 
      ? query(collection(db, "events"))
      : query(collection(db, "events"), where("tenantId", "==", currentUserTenant));

    const unsub1 = onSnapshot(eventQuery, (s) => {
      const d = s.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventData[];
      d.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setEvents(d); 
    });

    // 2. 管理者一覧取得（同上）
    const adminQuery = isSuperAdminMode
      ? query(collection(db, "admin_users"))
      : query(collection(db, "admin_users"), where("tenantId", "==", currentUserTenant));

    const unsub2 = onSnapshot(adminQuery, (s) => setAdminUsers(s.docs.map(d => d.data() as AdminUser)));

    // 3. 設定（署名・組織名）の取得 ★ここが重要！
    // 共通の "settings/config" ではなく、自分のテナント情報を参照するように変更
    const unsub3 = onSnapshot(doc(db, "tenants", currentUserTenant), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // データがあればそれをセット。なければ "Event Manager" などのデフォルト値
        const name = data.orgName || data.name || "絆太郎"; // orgName(署名用)優先、なければテナント名
        setOrgName(name);
        setEditingOrgName(name);
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user, currentUserTenant, isSuperAdminMode]); // 依存配列に currentUserTenant を追加
// ▲▲▲ 修正ここまで ▲▲▲

  useEffect(() => {
    if (events.length === 0) return;
    const unsubs = events.map(ev => {
       return onSnapshot(collection(db, "events", ev.id, "reservations"), (snap) => {
          setCounts(prev => ({...prev, [ev.id]: snap.size}));
       });
    });
    return () => unsubs.forEach(u => u());
  }, [events]);

  useEffect(() => {
    if (!isParticipantsOpen || !currentEventForList) { setParticipants([]); return; }
    const q = query(collection(db, "events", currentEventForList.id, "reservations"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (s) => {
      const loadedData = s.docs.map(d => {
        const data = d.data();
        return { 
           id: d.id, 
           ...data,
           checkedIn: data.status === 'attended' || data.checkedIn === true
        };
      }) as ReservationData[];
      setParticipants(loadedData);
    });
  }, [isParticipantsOpen, currentEventForList]);

  useEffect(() => {
    if (!isFeedbackOpen || !currentEventForList) return;
    
    // フィードバック（回答）をリアルタイム取得
    const q = query(collection(db, "events", currentEventForList.id, "feedbacks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
       const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
       setFeedbacks(data);
    });
    return () => unsubscribe();
  }, [isFeedbackOpen, currentEventForList]);

  // Actions
  const handleLogout = async () => { await signOut(auth); router.push("/"); };
  const handleDelete = async (e: React.MouseEvent, id: string) => { e.stopPropagation(); if(confirm("削除しますか？")) deleteDoc(doc(db, "events", id)); };
  
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    if (!newAdminBranch || !newAdminTenantId) {
      alert("所属を選択してください");
      return;
    }
    
    if (!confirm(`${newAdminEmail} を管理者に追加しますか？\n所属: ${newAdminBranch}`)) return;

    try {
      const res = await fetch('/api/admin/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           email: newAdminEmail, 
           branchId: newAdminBranch,
           tenantId: newAdminTenantId 
        }),
      });
      const data = await res.json();
      if (!res.ok) { alert(`エラー: ${data.error}`); return; }
      alert(`追加しました！\n所属: ${newAdminBranch}`);
      setNewAdminEmail(""); 
      setNewAdminBranch(""); 
      setNewAdminTenantId("");
    } catch (err) { console.error(err); alert("通信エラーが発生しました"); }
  };

  const handleRemoveAdmin = async (email: string) => { if(email!==SUPER_ADMIN_EMAIL && confirm("削除しますか？")) deleteDoc(doc(db, "admin_users", email)); };
  
  const toggleCheckIn = async (r: ReservationData) => {
    if (!currentEventForList) return;
    const ref = doc(db, "events", currentEventForList.id, "reservations", r.id);
    const newStatus = r.checkedIn ? null : "attended";
    await updateDoc(ref, { 
       status: newStatus,
       checkedIn: !r.checkedIn,
       attendedAt: r.checkedIn ? null : new Date().toISOString()
    });
  };
  
  const handleSaveOrgName = async () => {
    try {
      // 共通設定ではなく、自分のテナント情報に「署名用名称(orgName)」として保存
      await updateDoc(doc(db, "tenants", currentUserTenant), { 
        orgName: editingOrgName 
      });
      alert("団体名・署名を保存しました！\nメールテンプレートに反映されます。");
    } catch (e) { 
      alert("保存に失敗しました"); 
      console.error(e); 
    }
  };

  const openMailModal = (target?: ReservationData) => {
    if (!currentEventForList) return;
    
    if (target) {
       setTargetParticipant(target);
       setMailTargetType('individual');
       setMailSubject(`【${currentEventForList.title}】ご案内`);
       setMailBody(`${target.name} 様\n\nお世話になっております。\n${orgName}です。\n\n`);
    } else if (selectedParticipantIds.length > 0) {
       // ▼ 複数選択モード
       setTargetParticipant(null);
       setMailTargetType('selected');
       setMailSubject(`【${currentEventForList.title}】ご案内`);
       setMailBody(`参加者各位\n\nお世話になっております。\n${orgName}です。\n\n`);
    } else {
       setTargetParticipant(null);
       setMailTargetType('checked-in'); 
       setMailSubject(MAIL_TEMPLATES.thankyou.subject);
       setMailBody(MAIL_TEMPLATES.thankyou.body(currentEventForList.title, orgName));
    }
    setIsMailModalOpen(true);
  };

  const applyTemplate = (key: keyof typeof MAIL_TEMPLATES) => {
    if (!currentEventForList) return;
    const tmpl = MAIL_TEMPLATES[key];
    setMailSubject(tmpl.subject);
    setMailBody(typeof tmpl.body === 'function' ? tmpl.body(currentEventForList.title, orgName) : tmpl.body);
    
    if (key === 'remind' || key === 'ticket') {
       if (mailTargetType !== 'individual' && mailTargetType !== 'selected') setMailTargetType('all');
    } else if (key === 'thankyou') {
       if (mailTargetType !== 'individual' && mailTargetType !== 'selected') setMailTargetType('checked-in');
    }
  };

  const sendMail = async () => {
    if (!currentEventForList) return;
    
    let targets: ReservationData[] = [];
    if (mailTargetType === 'individual' && targetParticipant) {
       targets = [targetParticipant];
    } else if (mailTargetType === 'selected') {
       // ▼ チェックされた人だけを抽出
       targets = participants.filter(p => selectedParticipantIds.includes(p.id));
    } else {
       targets = mailTargetType === 'all' ? participants : participants.filter(p => p.checkedIn);
    }

    if (targets.length === 0) { alert("送信対象がいません。"); return; }
    if (!mailSubject || !mailBody) { alert("件名と本文を入力してください。"); return; }
    
    const targetName = mailTargetType === 'individual' 
       ? `${targetParticipant?.name} 様` 
       : (mailTargetType === 'selected' ? `【選択した${targets.length}名】` : (mailTargetType === 'all' ? "【全員】" : "【受付済（参加者）のみ】"));

    if (!confirm(`【最終確認】\n宛先: ${targetName}\n件数: ${targets.length} 名\n\nお一人ずつ宛名（〇〇様）を入れて送信します。\n送信には少し時間がかかりますが、そのままお待ちください。\n\n本当によろしいですか？`)) return;
    
    setSendingMail(true);
    try {
      const res = await fetch('/api/send-thankyou', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          recipients: targets.map(p => ({ name: p.name, email: p.email, id: p.id })), 
          subject: mailSubject, 
          body: mailBody,
          eventTitle: currentEventForList.title,
          eventDate: currentEventForList.date,
          venueName: currentEventForList.venueName || "詳細は本文をご確認ください",
          // ★ 追加：イベントに設定されたお問い合わせ先をAPIに渡す
        contactName: currentEventForList.contactName || orgName,
        contactEmail: currentEventForList.contactEmail || "",
        contactPhone: currentEventForList.contactPhone || "",
        }),
      });
      if (res.ok) { alert("送信が完了しました！"); setIsMailModalOpen(false); } 
      else { alert("送信中にエラーが発生しました。"); }
    } catch (e) { alert("通信エラーが発生しました"); } finally { setSendingMail(false); }
  };

  const handleDownloadCSV = async (e: React.MouseEvent, eventId: string, title: string) => {
     e.stopPropagation();
     
  
  // ▲▲▲ 追加ここまで ▲▲▲ 
       
      setDownloadingId(eventId);
      const formatPhone = (input: any) => {
        if (!input) return "";
        const num = input.toString().replace(/[^0-9]/g, "");
        if (num.length === 11) { return num.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3"); }
        if (num.length === 10) {
           if (num.startsWith("03") || num.startsWith("06")) { return num.replace(/^(\d{2})(\d{4})(\d{4})$/, "$1-$2-$3"); }
           return num.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");
        }
        return input.toString().replace(/[="]/g, "").trim();
      };

      try {
        const s = await getDocs(query(collection(db, "events", eventId, "reservations")));
        const r = s.docs.map(d => d.data() as ReservationData).sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0));
        if(!r.length) { alert("データなし"); return; }
        const csv = [
          "ステータス,名前,メール,電話,会社,部署,形式,職種,きっかけ,紹介,会員,日時", 
          ...r.map(x => {
            const cleanPhone = formatPhone(x.phone);
            return [
              `"${x.checkedIn ? "受付済" : "未"}"`,
              `"${x.name}"`,
              `"${x.email}"`,
              `"${cleanPhone}"`,
              `"${x.company}"`,
              `"${x.department}"`,
              `"${x.type}"`,
              `"${x.jobTitles}"`,
              `"${x.source}"`,
              `"${x.referrer}"`,
              `"${x.membership}"`,
              `"${x.createdAt?.toDate ? x.createdAt.toDate().toLocaleString() : ""}"`
            ].join(",");
          })
        ].join("\r\n");
        const a = document.createElement("a"); 
        a.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF,0xBB,0xBF]), csv], {type:"text/csv"})); 
        a.download = `${title}_リスト.csv`; 
        a.click();
      } catch(e) { alert("失敗"); } finally { setDownloadingId(null); }
  };

// ... (export default function の中にある downloadFeedbackCSV をこれに書き換え) ...

  const downloadFeedbackCSV = () => {
    if (!feedbacks || feedbacks.length === 0) return alert("データがありません");
    
    // 1. 全回答から「質問の項目名」をすべて洗い出す (重複なし)
    // 順番を揃えるため、イベント設定に保存されているsurveyFieldsがあればそれを優先、なければ回答データから抽出
    let questionKeys: string[] = [];
    
    if (currentEventForList?.surveyFields && Array.isArray(currentEventForList.surveyFields)) {
      questionKeys = currentEventForList.surveyFields.map((f: any) => f.label);
    } else {
      questionKeys = Array.from(new Set(feedbacks.flatMap(f => Object.keys(f.answers || {}))));
    }

    // 2. CSVのヘッダー行を作成 (日時, 評価, [質問1], [質問2]...)
    const headers = ["回答日時", "評価(1-5)", ...questionKeys];
    
    // 3. データをCSV行に変換
    const csvRows = feedbacks.map(fb => {
      // 日付
      const date = fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleString() : "";
      
      // 各質問への回答を取り出す
      const answerColumns = questionKeys.map(key => {
        const val = fb.answers?.[key];
        // 配列なら結合、文字ならエスケープ処理
        let cellData = "";
        if (Array.isArray(val)) {
          cellData = val.join(" / "); // 複数回答はスラッシュ区切り
        } else if (val) {
          cellData = String(val);
        }
        // CSVで崩れないようにダブルクォートで囲み、中のダブルクォートは2つ重ねる
        return `"${cellData.replace(/"/g, '""')}"`;
      });

      return [
        `"${date}"`,
        fb.rating,
        ...answerColumns
      ].join(",");
    });

    // 4. 全部つなげてBlobにする
    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `アンケート結果_${currentEventForList?.title || "data"}.csv`;
    link.click();
  };

  const copyEmails = (type: "checked-in" | "all") => {
    const t = type==="checked-in"?participants.filter(p=>p.checkedIn):participants;
    if(!t.length)alert("対象なし"); else {navigator.clipboard.writeText(t.map(p=>p.email).join(", ")); alert("コピー完了");}
  };

  const handleAdminBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
       setNewAdminBranch("");
       setNewAdminTenantId("");
       return;
    }
    const [tid, bname] = val.split("::");
    setNewAdminTenantId(tid);
    setNewAdminBranch(bname);
  };

  const filteredEvents = events;
  
  const targetCount = mailTargetType === 'individual' ? 1 : (mailTargetType === 'selected' ? selectedParticipantIds.length : (mailTargetType === 'all' ? participants.length : participants.filter(p => p.checkedIn).length));

  
  if (permissionError) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><ShieldAlert className="text-red-500 w-16 mb-4"/><p>権限がありません</p></div>;
  if (loading || !user) return <div className="h-screen flex items-center justify-center bg-slate-950 text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans">
      {/* ▼▼▼ 1. このスタイル定義を追加してください ▼▼▼ */}
      <style>{`
        @keyframes burnEffect {
          0% { background-position: 0% 50%; box-shadow: 0 0 5px rgba(249, 115, 22, 0.5); }
          50% { background-position: 100% 50%; box-shadow: 0 0 20px rgba(220, 38, 38, 0.8), 0 0 10px rgba(251, 191, 36, 0.6); transform: scale(1.02); }
          100% { background-position: 0% 50%; box-shadow: 0 0 5px rgba(249, 115, 22, 0.5); }
        }
        .btn-fire {
          background: linear-gradient(90deg, #f59e0b, #ef4444, #f97316); /* 黄→赤→オレンジ */
          background-size: 200% 200%; /* グラデーションを伸ばして動かす */
          animation: burnEffect 2s infinite ease-in-out; /* 2秒かけてメラメラ動く */
          border: none; /* 枠線を消す */
        }
      `}</style>
      {/* ▲▲▲ 追加ここまで ▲▲▲ */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center gap-4">
          
          {/* ▼ 管理画面：ロゴとインフォメーション（絆太郎版） */}
<div className="flex items-center gap-3 shrink-0">
  <div className="flex items-center gap-2.5">
    {/* 1. BarChart3 アイコンをロゴ画像に差し替え！ */}
    <img 
      src="/icon.webp" 
      alt="絆太郎" 
      className="h-8 w-8 object-contain drop-shadow-sm" 
    />
    
    {/* 2. 名前はそのまま「絆太郎 Event Manager」を活かすべ */}
    <h1 className="text-xl font-bold text-slate-800 hidden sm:block tracking-tight">
      絆太郎 <span className="text-sm font-medium text-slate-400">Event Manager</span>
    </h1>
  </div>

  {/* インフォメーションボタン */}
  <button 
    onClick={() => router.push("/admin/info")} 
    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-orange-50 text-slate-600 hover:text-orange-600 rounded-full transition-all text-xs font-bold border border-slate-200"
  >
    <Megaphone size={14} /> 
    <span className="hidden md:inline">Information</span>
  </button>
</div>

          {/* 右側：メニューボタン群（スマホで横スクロール可能） */}
          <div className="flex gap-3 overflow-x-auto py-2 px-1 hide-scrollbar -mr-4 pr-4 md:mr-0 md:pr-0 w-full justify-end items-center">
             
             {/* 📂 ヘッダー内のボタン部分を見つけて差し替え */}
<button 
  onClick={() => {
    if (isFreePlan) {
      setIsUpgradeModalOpen(true); // フリープランなら警告を出す
    } else {
      router.push("/admin/marketing"); // 有料ならページ移動
    }
  }}
  className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 rounded-lg transition-all text-xs font-bold whitespace-nowrap shadow-sm"
>
  <Mail size={16}/> 
  <span className="hidden lg:inline">メールマーケティング</span>
  {isFreePlan && <Lock size={12} className="ml-1 text-slate-400" />} {/* 鍵アイコンを添えると親切！ */}
</button>
            
            {/* 分析・データ管理 */}
            <button onClick={() => router.push("/admin/analytics")} className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 rounded-lg transition-all text-xs font-bold whitespace-nowrap shadow-sm">
               <BarChart2 size={16}/> <span className="hidden lg:inline">分析・データ管理</span>
            </button>
            
            {/* 当日受付・QR */}
            <button onClick={() => router.push("/admin/scan")} className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-200 rounded-lg transition-all text-xs font-bold whitespace-nowrap shadow-sm">
               <ScanBarcode size={16}/> <span className="hidden lg:inline">当日受付・QR</span>
            </button>

            {/* お問い合わせ管理 (スーパー管理者のみ) */}
            {isSuperAdminMode && (
              <button 
                onClick={() => router.push("/admin/contacts")} 
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-all text-xs font-bold whitespace-nowrap shadow-sm"
              >
                 <MessageSquare size={16}/> 
                 <span className="hidden lg:inline">お問い合わせ管理</span>
              </button>
            )}

            {/* 契約・請求ボタン */}
            <button onClick={() => router.push("/dashboard")} className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg transition-all text-xs font-bold whitespace-nowrap shadow-sm">
               <CreditCard size={16}/> <span className="hidden lg:inline">契約・請求</span>
            </button>

            {/* 設定・ログアウト */}
            <button onClick={()=>setIsSettingsOpen(true)} className="shrink-0 p-1.5 hover:bg-slate-100 rounded-md text-slate-500 transition-colors"><Settings size={20}/></button>
            <button onClick={handleLogout} className="shrink-0 p-1.5 hover:bg-red-50 rounded-md text-slate-500 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
{/* ▼▼▼ 修正：黒背景をやめ、清潔感のある薄いエメラルドグリーンに変更 ▼▼▼ */}
{user?.email === SUPER_ADMIN_EMAIL && (
  <div className="mb-8 p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm animate-in fade-in">
    <div>
      <h3 className="text-emerald-800 font-bold flex items-center gap-2 text-lg">
        <Shield size={22} className="text-emerald-600"/> スーパー管理者エリア
      </h3>
      <p className="text-emerald-600/80 text-sm mt-1">新規テナントの契約・発行などの管理業務はこちらから</p>
    </div>
    <Link 
      href="/super-admin"
      className="bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50 px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm hover:shadow-md whitespace-nowrap"
    >
      管理コンソールへ移動
    </Link>
  </div>
)}
{/* ▲▲▲ 追加ここまで ▲▲▲ */}
        {/* ▼▼▼ 修正：ボタンを水色グラデーションに変更 ▼▼▼ */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Events</h2>
          <button 
            onClick={() => { setSelectedEvent(null); setIsEventModalOpen(true); }} 
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold flex gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 items-center"
          >
            <Plus size={20} strokeWidth={3}/> 新規イベント
          </button>
        </div>
        
        {/* グリッドをやめて、縦積みのリストにする (max-w-6xl で幅広に) */}
<div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredEvents.map((ev) => {
            const isPublished = ev.status === 'published';
            // ★安全装置: テナント名が取れない場合のガード
            const tObj = tenantList.find(t => t.id === ev.tenantId);
            const tenantName = safeStr(tObj?.name) || safeStr(ev.tenantId) || "不明";
            // ★安全装置: branchTag がオブジェクトでも壊れないようにする
            const branchLabel = ev.branchTag && typeof ev.branchTag === 'string' ? ` (${ev.branchTag})` : "";
            const displayLabel = `${tenantName}${branchLabel}`;

            return (
            <div 
              key={ev.id} 
              onClick={()=>{setSelectedEvent(ev);setIsEventModalOpen(true);}} 
              className={`
                relative group flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer border
                ${isPublished 
                  /* 公開中：枠線を少し濃くし、影を強調 */
                  ? "bg-white border-orange-400/50 shadow-md hover:shadow-xl hover:border-orange-500 ring-1 ring-orange-100" 
                  : "bg-white border-slate-300 shadow-sm hover:shadow-md hover:border-slate-400"
                }
              `}
            >
              {/* ▼▼▼ 修正：黄色〜淡いオレンジの優しいグラデーションに変更 ▼▼▼ */}
<div className={`h-2 w-full absolute top-0 z-10 ${isPublished ? 'bg-gradient-to-r from-amber-200 via-orange-300 to-orange-400 shadow-sm' : 'bg-slate-300'}`}/>
              
              <div className="p-6 flex-1 relative z-10">
                <div className="flex justify-between mb-4">
                  <div className="flex gap-2">
                    {/* ▼▼▼ 修正：公開中の時だけ btn-fire を適用 ▼▼▼ */}
<span className={`
  text-xs px-3 py-0.5 rounded-full flex items-center gap-1 font-bold tracking-wide
  ${isPublished 
    /* 公開中：メラメラ燃えるエフェクト（枠線なし） */
    ? "btn-fire text-white shadow-md" 
    /* 下書き：グレー背景＋枠線あり */
    : "bg-slate-100 text-slate-500 border border-slate-300"
  }
`}>
  {isPublished ? '公開中' : '下書き'}
</span>
                    
                    {isSuperAdminMode && (
                       /* ▼▼▼ 修正：テナント名を「ネイビー背景・白文字」に変更 ▼▼▼ */
                       <span className="text-[10px] bg-slate-800 text-white px-3 py-0.5 rounded flex items-center gap-1 border border-slate-700 truncate max-w-[150px] shadow-sm">
                         <Tag size={10} className="text-slate-300"/> 
                         {displayLabel}
                       </span>
                    )}
                  </div>
                  {/* ▼▼▼ ここに変更！ゴミ箱の左に複製ボタンを追加 ▼▼▼ */}
                  <div className="flex items-center gap-1">
                    {/* 複製ボタン */}
                    <button 
                      onClick={(e)=>handleDuplicate(e,ev)} 
                      disabled={duplicatingId===ev.id}
                      className="text-slate-400 hover:text-orange-600 transition-colors bg-white rounded-full p-1.5 hover:bg-orange-50" 
                      title="イベントを複製"
                    >
                        {duplicatingId===ev.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-orange-500 rounded-full"/>
                        ) : (
                          <Copy size={18}/>
                        )}
                    </button>

                    {/* 削除ボタン（既存） */}
                    <button 
                      onClick={(e)=>handleDelete(e,ev.id)} 
                      className="text-slate-400 hover:text-red-600 transition-colors bg-white rounded-full p-1.5 hover:bg-red-50" 
                      title="削除"
                    >
                        <Trash2 size={18}/>
                    </button>
                  </div>
                  {/* ▲▲▲ ここまで ▲▲▲ */}
                </div>
                
                {/* ★ここが重要！文字色を text-white から text-slate-900 (黒) に変更 */ }
                <h3 className="text-xl font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors leading-snug">
                  {ev.title}
                </h3>
                
                <div className="text-sm text-slate-600 flex flex-col gap-1.5 font-medium">
                  <span className="flex gap-2 items-center">
                    <Calendar size={16} className={isPublished ? "text-orange-600" : "text-slate-400"}/>
                    {ev.date}
                  </span>
                  <span className="flex gap-2 items-center">
                    <MapPin size={16} className={isPublished ? "text-orange-600" : "text-slate-400"}/>
                    {safeStr(ev.venueName)||"場所未定"}
                  </span>
                </div>
              </div>

              {/* ▼▼▼ 修正：背景をグレーからベージュ（bg-orange-50）に変更 ▼▼▼ */}
<div className="bg-orange-50 px-5 py-4 border-t border-orange-100 flex flex-wrap md:flex-nowrap justify-between items-center gap-4 relative z-10" onClick={e=>e.stopPropagation()}>
                
                {/* 左側：参加者ボタン（ここをグラデーションボタン化！） */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button 
                      onClick={(e)=>{e.stopPropagation();setCurrentEventForList(ev);setIsParticipantsOpen(true);}} 
                      /* ▼▼▼ 修正：黄色〜淡いオレンジのグラデーションに変更（ホバー時は少し濃く） ▼▼▼ */
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-amber-200 via-orange-300 to-orange-400 hover:from-amber-300 hover:via-orange-400 hover:to-orange-500 text-[#051e34] px-6 py-2.5 rounded-lg transition-all border-none text-sm font-bold shadow-md hover:shadow-lg active:scale-95"
                      title="参加者リスト"
                  >
                      <ListChecks size={18} className="text-[#051e34]"/> 
                      <span>参加者リスト</span>
                  </button>
                  
                  {/* 人数バッジ：導火線エフェクト（火花2本バージョン！） */}
                  <div className="relative group rounded-full p-[2px] overflow-hidden">
                    {/* ▼火花のアニメーション（2つの火花が追いかけっこ） */}
                    <div className="absolute inset-[-100%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_35%,#fbbf24_45%,#ef4444_50%,transparent_50%,transparent_85%,#fbbf24_95%,#ef4444_100%)]" />
                    
                    {/* ▼前面の白いプレート */}
                    <div className="relative flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-700 font-bold text-xs shadow-sm">
                       <Users size={14} className="text-slate-500"/>
                       <span>{counts[ev.id] || 0}名</span>
                    </div>
                  </div>
                </div>

                {/* 右側：アクションボタン群（文字と枠を濃く） */}
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                   
                   {/* 共通スタイル：border-slate-300, text-slate-600 に変更 */}
                   <button 
                     onClick={(e) => { 
  e.stopPropagation(); 
  setQrEvent(ev); 
  setIsQrModalOpen(true); 
}}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 px-4 py-2.5 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm font-bold text-xs"
                   >
                       <QrCode size={18}/>
                       <span className="hidden lg:inline">QR表示</span>
                   </button>

                   <button 
                     onClick={(e) => { 
  e.stopPropagation(); 
  setCurrentEventForList(ev); 
  setIsFeedbackOpen(true); 
}}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 px-4 py-2.5 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm font-bold text-xs"
                   >
                       <MessageSquare size={18}/>
                       <span className="hidden lg:inline">結果</span>
                   </button>

                   <button 
                     onClick={(e)=>handleDownloadCSV(e,ev.id,ev.title)} 
                     disabled={downloadingId===ev.id} 
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 px-4 py-2.5 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm font-bold text-xs" 
                   >
                       {downloadingId===ev.id?<div className="animate-spin w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent"/>:<FileDown size={18}/>}
                       <span className="hidden lg:inline">CSV</span>
                   </button>
                   
                   <button 
                     onClick={(e)=>{e.stopPropagation();navigator.clipboard.writeText(`${window.location.origin}/t/${ev.tenantId}/e/${ev.id}`);setCopiedId(ev.id);setTimeout(()=>setCopiedId(null),2000);}} 
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm font-bold text-xs" 
                   >
                       {copiedId===ev.id?<Check size={18} className="text-emerald-500"/>:<Share2 size={18}/>}
                       <span className="hidden lg:inline">URL</span>
                   </button>
                   
                   <a 
                     href={`/t/${safeStr(ev.tenantId)||"default"}/e/${ev.id}`} 
                     target="_blank" 
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-slate-100 px-4 py-2.5 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm font-bold text-xs" 
                   >
                       <ExternalLink size={18}/>
                       <span className="hidden lg:inline">公開P</span>
                   </a>
                </div>
              </div>
              {/* ▲▲▲ 差し替えここまで ▲▲▲ */}
            </div>
            );
          })}
        </div>
      </main>

      {/* モーダル類 */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f111a] border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
             <div className="p-4 border-b border-slate-800 flex justify-between bg-[#0f111a] sticky top-0 z-10"><h2 className="text-xl font-bold text-white">イベント編集</h2><button onClick={()=>setIsEventModalOpen(false)}><X/></button></div>
             <div className="p-6"><EventForm event={selectedEvent} onSuccess={()=>setIsEventModalOpen(false)}/></div>
          </div>
        </div>
      )}

      {isParticipantsOpen && currentEventForList && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0f111a] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0f111a] shrink-0">
              <div><h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2"><ListChecks className="text-orange-400"/> 参加者・受付</h2><p className="text-xs md:text-sm text-slate-400 line-clamp-1">{currentEventForList.title}</p></div>
              <button onClick={()=>setIsParticipantsOpen(false)} className="text-slate-400 hover:text-white min-w-[40px] flex justify-end"><X/></button>
            </div>
            
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2 justify-between items-center shrink-0">
               <div className="flex gap-2">
                 <button onClick={()=>copyEmails("checked-in")} className="text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded flex gap-2"><Copy size={14}/> 受付済メアド</button>
                 <button onClick={()=>copyEmails("all")} className="hidden md:flex text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded gap-2"><Copy size={14}/> 全員メアド</button>
               </div>
               <button onClick={() => openMailModal()} className="text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-3 py-2 rounded-lg font-bold flex gap-2 shadow-lg items-center">
  <Mail size={16}/> {selectedParticipantIds.length > 0 ? `${selectedParticipantIds.length}名に送信` : 'メール送信'}
</button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
               {!participants.length ? <div className="p-10 text-center text-slate-500">参加者なし</div> : (
                 <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-xs text-slate-500 sticky top-0 z-10">
                     <tr>
                       <th className="p-2 w-10 text-center"><input type="checkbox" className="w-4 h-4 accent-indigo-500 cursor-pointer" checked={participants.length > 0 && selectedParticipantIds.length === participants.length} onChange={toggleSelectAll} /></th>
                       <th className="p-2 md:p-4 whitespace-nowrap">受付</th>
                       <th className="p-2 md:p-4">参加者情報</th>
                       <th className="hidden md:table-cell p-4">会社</th>
                       <th className="hidden md:table-cell p-4">形式</th>
                       <th className="p-2 md:p-4 text-center">個別送信</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
                     {participants.map(p=>(
                       <tr key={p.id} className={p.checkedIn?'bg-emerald-900/10':''}>
                         <td className="p-2 text-center align-middle"><input type="checkbox" className="w-4 h-4 accent-indigo-500 cursor-pointer" checked={selectedParticipantIds.includes(p.id)} onChange={() => toggleSelectParticipant(p.id)} /></td>
                         <td className="p-2 md:p-4 align-middle">
                           <button onClick={()=>toggleCheckIn(p)} className={`w-full md:w-auto px-2 md:px-3 py-2 md:py-1.5 rounded text-xs font-bold flex justify-center items-center gap-1 transition-all active:scale-95 ${p.checkedIn?'bg-emerald-500 text-white shadow-emerald-500/20':'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                             {p.checkedIn?<Check size={16} strokeWidth={3}/>:<UserCheck size={16}/>} 
                             <span className="hidden md:inline">{p.checkedIn?"受付済":"受付する"}</span>
                           </button>
                         </td>
                         <td className="p-2 md:p-4">
                           <div className="font-bold text-white text-sm md:text-base mb-0.5">{p.name}</div>
                           <div className="md:hidden space-y-1">
                             <div className="text-xs text-slate-400">🏢 {p.company}</div>
                             <div className="flex items-center gap-2">
                               <span className={`text-[10px] px-1.5 py-0.5 rounded border ${p.type==='online'?'border-blue-500/30 text-blue-400':'border-orange-500/30 text-orange-400'}`}>{p.type==='online'?'オンライン':'会場参加'}</span>
                             </div>
                           </div>
                           <div className="text-xs text-slate-500 hidden md:block">{p.email}</div>
                         </td>
                         <td className="p-4 text-sm text-slate-300 hidden md:table-cell">{p.company}</td>
                         <td className="p-4 hidden md:table-cell"><span className={`text-xs px-2 py-1 rounded border ${p.type==='online'?'border-blue-500/30 text-blue-400':'border-orange-500/30 text-orange-400'}`}>{p.type==='online'?'Online':'Venue'}</span></td>
                         <td className="p-2 md:p-4 text-center">
   <button onClick={()=>openMailModal(p)} className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded transition-colors" title="個別にメール">
     <Mail size={16}/>
   </button>
</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               )}
            </div>
            <div className="p-3 bg-slate-900 text-xs text-slate-400 flex justify-between shrink-0">
              <span>Total: {participants.length}</span>
              <span className="text-emerald-400 font-bold">受付済: {participants.filter(p=>p.checkedIn).length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ★追加: アンケートQRモーダル */}
      {isQrModalOpen && qrEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]" onClick={() => setIsQrModalOpen(false)}>
          <div className="bg-white text-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 relative" onClick={e => e.stopPropagation()}>
             <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"><X size={24}/></button>
             
             <h3 className="text-xl font-bold mb-1">アンケートのお願い</h3>
             <p className="text-slate-500 text-xs mb-6">{qrEvent.title}</p>
             
             <div className="bg-white p-2 rounded-xl border-2 border-slate-100 inline-block mb-6 shadow-inner">
               {/* QRコード生成APIを使って画像を表示 */}
               <img 
                 src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${window.location.origin}/t/${qrEvent.tenantId || "default"}/e/${qrEvent.id}/survey`)}`} 
                 alt="Survey QR" 
                 className="w-64 h-64 object-contain"
               />
             </div>
             
             <div className="bg-slate-50 p-4 rounded-xl text-left">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Answer URL</p>
                <p className="text-xs text-slate-600 break-all font-mono select-all">
                  {`${window.location.origin}/t/${qrEvent.tenantId || "default"}/e/${qrEvent.id}/survey`}
                </p>
             </div>

             <div className="mt-6">
                <p className="text-sm font-bold text-slate-700">こちらのQRコードを読み取って<br/>回答にご協力ください</p>
             </div>
          </div>
        </div>
      )}
      
{/* ★修正: アンケート結果分析モーダル（日本語・回答率付き） */}
      {isFeedbackOpen && currentEventForList && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsFeedbackOpen(false)} />
          
          <div className="relative w-full max-w-5xl h-[85vh] bg-[#0f111a] border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#131625] shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="text-indigo-400" size={24}/> 
                  アンケート集計・分析
                </h2>
                <p className="text-xs text-slate-400 mt-1">{currentEventForList.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                   onClick={downloadFeedbackCSV}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
                 >
                   <FileText size={16}/> <span className="hidden sm:inline">CSV出力</span>
                 </button>
                <button onClick={() => setIsFeedbackOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                  <X size={24}/>
                </button>
              </div>
            </div>

            {/* メインコンテンツ */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[#0f111a]">
              
              {feedbacks.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 opacity-50">
                  <MessageSquare size={48} strokeWidth={1} />
                  <p>まだ回答がありません</p>
                </div>
              ) : (
                <div className="space-y-10">
                  
                  {/* 1. スコアボード (日本語化 & 回答率追加) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* 回答数 & 回答率 */}
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Users size={24}/></div>
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">回答数 / 参加者</div>
                        <div className="text-2xl font-bold text-white flex items-end gap-2">
                          {feedbacks.length}
                          <span className="text-sm text-slate-500 mb-1">件</span>
                          
                          {/* 回答率の計算: (回答数 / 参加者数) * 100 */}
                          <span className="text-sm text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-500/30 mb-1 ml-auto">
                            回答率 {counts[currentEventForList.id] ? Math.round((feedbacks.length / counts[currentEventForList.id]) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 平均満足度 */}
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                      <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-lg"><Star size={24} fill="currentColor"/></div>
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">平均満足度</div>
                        <div className="text-2xl font-bold text-white">
                          {(feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1)}
                          <span className="text-sm text-slate-500 ml-1">/ 5.0</span>
                        </div>
                      </div>
                    </div>

                    {/* 最終回答日時 */}
                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl flex items-center gap-4">
                      <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><Clock size={24}/></div>
                      <div>
                        <div className="text-xs text-slate-400 font-bold uppercase">最終回答日時</div>
                        <div className="text-sm font-bold text-white mt-1">
                          {feedbacks[0]?.createdAt?.toDate ? feedbacks[0].createdAt.toDate().toLocaleString() : "---"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. 満足度分布グラフ */}
                  <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Star size={16} className="text-yellow-400"/> 満足度の内訳</h3>
                    <div className="space-y-3">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = feedbacks.filter(f => f.rating === star).length;
                        const percent = (count / feedbacks.length) * 100;
                        return (
                          <div key={star} className="flex items-center gap-3 text-xs">
                            <span className="w-8 font-bold text-slate-400 flex justify-end gap-1">{star} <Star size={12} className="mt-0.5"/></span>
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-500 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                            </div>
                            <span className="w-10 text-right text-slate-300">{count}件</span>
                            <span className="w-12 text-right text-slate-500">({percent.toFixed(0)}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. 質問ごとの自動集計 */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                       <ListChecks size={20} className="text-emerald-400"/> 質問別レポート
                    </h3>
                    
                    {Array.from(new Set(feedbacks.flatMap(f => Object.keys(f.answers || {})))).map((questionKey) => {
                      
                      const aggregates: {[key: string]: number} = {};
                      let textAnswers: string[] = [];
                      let isTextType = false;

                      feedbacks.forEach(f => {
                         const val = f.answers?.[questionKey];
                         if (!val) return;

                         if (Array.isArray(val)) {
                           val.forEach(v => { aggregates[v] = (aggregates[v] || 0) + 1; });
                         } else if (String(val).length > 20) { // 少し長めの回答はテキスト扱い
                           isTextType = true;
                           textAnswers.push(String(val));
                         } else {
                           aggregates[String(val)] = (aggregates[String(val)] || 0) + 1;
                         }
                      });

                      const sortedAggregates = Object.entries(aggregates).sort((a, b) => b[1] - a[1]);

                      return (
                        <div key={questionKey} className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                           <h4 className="font-bold text-indigo-300 text-sm mb-4 flex gap-2">
                             <span className="bg-indigo-500/10 px-2 py-0.5 rounded text-indigo-400">Q</span> {questionKey}
                           </h4>

                           {isTextType ? (
                             <div className="bg-slate-950 rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar space-y-2 border border-slate-800/50">
                                {textAnswers.map((txt, idx) => (
                                  <div key={idx} className="text-xs text-slate-300 border-b border-slate-800/50 last:border-0 pb-2 last:pb-0">
                                    {txt}
                                  </div>
                                ))}
                                {textAnswers.length === 0 && <p className="text-xs text-slate-600">回答なし</p>}
                             </div>
                           ) : (
                             <div className="space-y-3">
                                {sortedAggregates.map(([label, count]) => {
                                  const percent = (count / feedbacks.length) * 100;
                                  return (
                                    <div key={label} className="group">
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-slate-200 font-bold">{label}</span>
                                        <span className="text-slate-400">{count}件 ({percent.toFixed(1)}%)</span>
                                      </div>
                                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500 group-hover:bg-emerald-400" style={{ width: `${percent}%` }}></div>
                                      </div>
                                    </div>
                                  );
                                })}
                                {sortedAggregates.length === 0 && <p className="text-xs text-slate-600">回答なし</p>}
                             </div>
                           )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 4. 個別の回答一覧 (新着順) */}
                  <div className="pt-8 border-t border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 mb-4">個別の回答一覧（新着順）</h3>
                    <div className="grid grid-cols-1 gap-4 opacity-90 hover:opacity-100 transition-opacity">
                      {feedbacks.map((fb, i) => (
                        <div key={i} className="bg-slate-900/30 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row gap-4 text-xs">
                           
                           {/* 日時と評価 */}
                           <div className="w-32 shrink-0 text-slate-500">
                             <div className="mb-1 font-mono">
                               {fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleString() : "---"}
                             </div>
                             {/* 星評価 */}
                             <div className="flex text-yellow-500">
                               {[1, 2, 3, 4, 5].map((s) => (
                                  <Star 
                                    key={s} 
                                    size={10} 
                                    fill={(fb.rating || 0) >= s ? "currentColor" : "none"} 
                                    className={(fb.rating || 0) >= s ? "" : "text-slate-800"} 
                                  />
                               ))}
                             </div>
                           </div>
                           
                           {/* 回答内容（ここに名前も表示されます） */}
                           <div className="flex-1 space-y-2">
                             {Object.entries(fb.answers || {}).map(([k, v]) => (
                               <div key={k} className="flex flex-col sm:flex-row gap-1 sm:gap-2 border-b border-slate-800/30 last:border-0 pb-1 last:pb-0">
                                 <span className="text-indigo-400/80 font-bold shrink-0 min-w-[100px]">{k}:</span>
                                 <span className="text-slate-200 break-all">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                               </div>
                             ))}
                           </div>

                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* メール送信モーダル */}
      {isMailModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
           <div className="bg-[#0f111a] border border-slate-700 rounded-2xl w-full max-w-3xl p-6 flex flex-col max-h-[90vh]">
             {/* ...省略なし... */}
             <div className="flex justify-between mb-4 border-b border-slate-800 pb-3">
               <h2 className="text-xl font-bold text-white flex items-center gap-2"><Mail size={22}/> メール送信</h2>
               <button onClick={()=>setIsMailModalOpen(false)}><X/></button>
             </div>

             <div className="flex gap-2 mb-6 overflow-x-auto pb-2 shrink-0">
               <span className="text-xs text-slate-500 py-1.5">テンプレート:</span>
               <button onClick={()=>applyTemplate('thankyou')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">御礼 (受付済)</button>
               <button onClick={()=>applyTemplate('remind')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">リマインド (全員)</button>
               <button onClick={()=>applyTemplate('ticket')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-orange-400 border-orange-500/50 hover:bg-slate-800 hover:text-orange-300 transition-colors">🎟️ チケット (QR)</button>
               <button onClick={()=>applyTemplate('custom')} className="whitespace-nowrap px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">空紙</button>
             </div>

             <div className="space-y-4 flex-1 overflow-y-auto pr-2">
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                 <label className="block text-xs text-slate-400 mb-3 font-bold">送信先を選択</label>
{/* ▼ 置き換えここから ▼ */}
{mailTargetType === 'individual' && targetParticipant ? (
   <div className="bg-indigo-900/30 border border-indigo-500 p-3 rounded-lg flex items-center gap-3">
      <div className="bg-indigo-500 text-white rounded-full p-1"><UserCheck size={16}/></div>
      <div>
         <div className="text-sm font-bold text-white">{targetParticipant.name} 様</div>
         <div className="text-xs text-indigo-300">個別送信モード</div>
      </div>
   </div>
) : mailTargetType === 'selected' ? (
   <div className="bg-orange-900/30 border border-orange-500 p-3 rounded-lg flex items-center gap-3">
      <div className="bg-orange-500 text-white rounded-full p-1"><Check size={16}/></div>
      <div>
         <div className="text-sm font-bold text-white">選択した {selectedParticipantIds.length} 名</div>
         <div className="text-xs text-orange-300">複数選択モード</div>
      </div>
   </div>
) : (
   <div className="flex flex-col sm:flex-row gap-4">
     <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all flex-1 ${mailTargetType==='all' ? 'bg-indigo-900/30 border-indigo-500 ring-1 ring-indigo-500' : 'bg-slate-950 border-slate-700 hover:bg-slate-800'}`}>
       <input type="radio" name="target" checked={mailTargetType==='all'} onChange={()=>setMailTargetType('all')} className="accent-indigo-500 w-5 h-5"/>
       <div><div className="text-sm font-bold text-white">全員に送る</div><div className="text-xs text-slate-400">未受付の人も含む ({participants.length}名)</div></div>
     </label>
     <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all flex-1 ${mailTargetType==='checked-in' ? 'bg-emerald-900/30 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-950 border-slate-700 hover:bg-slate-800'}`}>
       <input type="radio" name="target" checked={mailTargetType==='checked-in'} onChange={()=>setMailTargetType('checked-in')} className="accent-emerald-500 w-5 h-5"/>
       <div><div className="text-sm font-bold text-white">受付済のみに送る</div><div className="text-xs text-slate-400">来場した人のみ ({participants.filter(p=>p.checkedIn).length}名)</div></div>
     </label>
   </div>
)}
{/* ▲ 置き換えここまで ▲ */}
               </div>
               <div>
                 <label className="block text-xs text-slate-500 mb-2">件名</label>
                 <input type="text" value={mailSubject} onChange={e=>setMailSubject(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="件名を入力"/>
               </div>
               <div className="flex flex-col">
                 <label className="block text-xs text-slate-500 mb-2">本文</label>
                 <textarea value={mailBody} onChange={e=>setMailBody(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none resize-none min-h-[300px] leading-relaxed" placeholder="本文を入力"/>
               </div>
             </div>

             <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
               <div className="text-xs text-slate-500">送信対象: <span className="text-white font-bold text-base">{targetCount}</span> 名</div>
               <div className="flex gap-3">
                 <button onClick={()=>setIsMailModalOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm">キャンセル</button>
                 <button onClick={sendMail} disabled={sendingMail || targetCount===0} className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50">
                   {sendingMail?<div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>:<Send size={16}/>}送信する
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* 設定モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
           <div className="bg-[#0f111a] border border-slate-700 rounded-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh]">
             <div className="flex justify-between mb-4 border-b border-slate-800 pb-3"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={22}/> 設定</h2><button onClick={()=>setIsSettingsOpen(false)}><X/></button></div>
             <div className="space-y-6 overflow-y-auto pr-1">
               
               {/* 1. 署名設定（全員共通） */}
               <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                 <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><Building2 size={16}/> 署名・表示名設定</h3>
                 <p className="text-xs text-slate-500 mb-2">メールの署名などに使われます。</p>
                 <div className="flex gap-2">
                   <input type="text" value={editingOrgName} onChange={(e)=>setEditingOrgName(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" placeholder="組織名" />
                   <button onClick={handleSaveOrgName} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap">保存</button>
                 </div>
               </div>
               <div className="space-y-4 mt-4">
                  {/* ✨ 追加：システム利用料（アップグレード）への導線 */}
                  <div className="bg-indigo-900/20 p-4 rounded-xl border border-indigo-500/30">
                    <h3 className="text-sm font-bold text-indigo-400 mb-2 flex items-center gap-2">
                      <Sparkles size={16} className="text-yellow-400"/> プランのお支払い・管理
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                      スタンダードプランへのアップグレードや領収書の確認はこちら
                    </p>
                    <button 
                      onClick={() => router.push("/dashboard")}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                      支払い管理画面を開く
                    </button>
                  </div>

                  {/* 修正：名前を変えて、口座連携ボタンはそのまま残す */}
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2">
                      <Building2 size={16}/> 【主催者用】売上受取の設定
                    </h3>
                    <p className="text-[10px] text-slate-500 mb-3">
                      有料イベントの売上を受け取るための口座連携設定です
                    </p>
                    <StripeConnectButton 
                      tenantId={currentUserTenant}
                      isConnected={(tenantList.find(t => t.id === currentUserTenant) as any)?.stripeConnectEnabled || false}
                    />
                  </div>
                </div>

{/* 2. スタッフ招待（全ユーザーに開放：価値ある機能として提供） */}
               <div className="bg-slate-900 p-4 rounded-xl border border-indigo-900/50">
                 <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
                    <UserPlus size={16}/> スタッフ・管理者招待
                 </h3>
                 
                 {/* プラン制限を撤廃し、常に適切なフォームを表示します */}
                 {isSuperAdminMode ? (
                    // スーパー管理者の場合：全テナントから選べる
                    <form onSubmit={handleAddAdmin} className="space-y-2">
                      <p className="text-xs text-orange-400 mb-1">※スーパー管理者権限で操作中</p>
                      <input 
                        value={newAdminEmail} 
                        onChange={e=>setNewAdminEmail(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" 
                        placeholder="追加するメールアドレス" 
                        required 
                      />
                      <select 
                         value={`${newAdminTenantId}::${newAdminBranch}`} 
                         onChange={handleAdminBranchChange} 
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                       >
                        <option value="::">（所属を選択してください）</option>
                        {tenantList.map((tenant) => (
                          <optgroup key={tenant.id} label={tenant.name}>
                            {(Array.isArray(tenant.branches) ? tenant.branches : ["本部"]).flatMap((b:any) => typeof b === 'string' ? b : []).map((branch:any) => (
                              <option key={`${tenant.id}-${branch}`} value={`${tenant.id}::${branch}`}>{branch}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <div className="flex justify-end">
                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm">
                          権限付与して招待
                        </button>
                      </div>
                    </form>
                 ) : (
                    // 一般主催者の場合：自分のテナントの支部・部門のみ選べる
                    <form onSubmit={async (e) => {
                       e.preventDefault();
                       if(!newAdminEmail || !newAdminBranch) return alert("入力してください");
                       if(!confirm(`${newAdminEmail} を招待しますか？`)) return;
                       try {
                         const res = await fetch('/api/admin/add', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ email: newAdminEmail, branchId: newAdminBranch, tenantId: currentUserTenant }),
                         });
                         if(res.ok) { 
                           alert("スタッフを招待しました！"); 
                           setNewAdminEmail(""); 
                         } else { 
                           alert("招待に失敗しました。権限や入力内容を確認してください。"); 
                         }
                       } catch(err) { 
                         alert("通信エラーが発生しました"); 
                       }
                    }} className="space-y-2">
                      <input 
                        value={newAdminEmail} 
                        onChange={e=>setNewAdminEmail(e.target.value)} 
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white" 
                        placeholder="招待するスタッフのメール" 
                        required 
                      />
                      <select 
                         value={newAdminBranch} 
                         onChange={e=>setNewAdminBranch(e.target.value)} 
                         className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                       >
                        <option value="">（所属部門・教室を選択）</option>
                        {tenantList.find(t => t.id === currentUserTenant)?.branches?.map((b: any) => (
                           typeof b === 'string' && <option key={b} value={b}>{formatBranchName(b)}</option>
                        ))}
                      </select>
                      <div className="flex justify-end">
                        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20">
                          スタッフを招待する
                        </button>
                      </div>
                    </form>
                 )}
               </div>

               {/* 3. 管理者リスト表示（自分のテナントの仲間だけ見える） */}
               <div>
                 <h3 className="text-sm font-bold text-slate-400 mb-2">登録済みスタッフ一覧</h3>
                 <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                   {adminUsers
                     .filter(u => isSuperAdminMode || u.tenantId === currentUserTenant) // 自分の会社の仲間だけフィルタリング
                     .map(u=>(
                      <div key={u.email} className="flex justify-between items-center p-3 bg-slate-900 rounded-lg border border-slate-800">
                        <div><div className="text-sm">{u.email}</div><div className="text-xs text-indigo-400">{formatBranchName(safeStr(u.branchId))}</div></div>
                        {(isSuperAdminMode || (u.email !== user?.email && u.role !== 'owner')) && ( 
                          <button onClick={()=>handleRemoveAdmin(u.email)} className="text-slate-500 hover:text-red-400"><Trash2 size={16}/></button> 
                        )}
                      </div>
                   ))}
                 </div>
               </div>

               {/* 4. 拠点・プラン情報（ユーザーは見るだけ） */}
               {!isSuperAdminMode && (
                 <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                    <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase">現在のプラン・拠点</h3>
                    <div className="text-sm text-white mb-2">
                      プラン: <span className="font-bold text-emerald-400 uppercase">{tenantList.find(t=>t.id===currentUserTenant)?.plan || "Free"}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tenantList.find(t=>t.id===currentUserTenant)?.branches?.map((b:any) => {
  const targetTenant = tenantList.find(t => t.id === currentUserTenant);
  
  // ★ここを修正！ (targetTenant as any) をつけました
  const displayName = (b === "本部" && targetTenant) 
      ? ((targetTenant as any).orgName || targetTenant.name || b) 
      : b;

  return (
    typeof b === 'string' && (
      <span key={b} className="text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">
        {displayName}
      </span>
    )
  );
})}

                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/50">
                      ※拠点（教室）の追加やプラン変更をご希望の場合は、本部へお問い合わせください。
                    </p>
                 </div>
               )}

             </div>
           </div>
        </div>
      )}
        {/* ★★★ 絆太郎：おもてなしウェルカムモーダル（完全版） ★★★ */}
      {isWelcomeModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* 背景の強力ぼかし（すりガラス） */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-700"></div>

          {/* モーダル本体（あの気に入ってくれたデザインを維持！） */}
          <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white overflow-hidden animate-in zoom-in duration-500">
            
            {/* 華やかな装飾の光 */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl"></div>

            <div className="relative p-8 md:p-12 text-center">
              {/* 共通ロゴ */}
              <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-xl mb-8 border border-slate-100">
                <img src="/icon.webp" alt="絆太郎" className="w-14 h-14 object-contain" />
              </div>

              {/* === ▼▼▼ ここからスライド切り替え ▼▼▼ === */}
              {modalStep === 1 ? (
                /* 1枚目：歓迎スライド（標準語） */
                <div className="animate-in fade-in">
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4 tracking-tight">
                    絆太郎へようこそ！
                  </h2>
                  <p className="text-slate-600 font-medium mb-10 leading-relaxed text-lg">
                    今日からあなたのセミナー運営が、<br className="hidden md:inline" />
                    もっと楽しく、もっと「絆」が深まるものに変わります。
                  </p>

                  {/* 3つの特徴（あのデザインを維持） */}
                  <div className="grid gap-4 text-left mb-12">
                    {[
                      { title: "セミナーの案内", desc: "文字を入れるだけで、想いが伝わるページが完成", color: "text-blue-600", bg: "bg-blue-50" },
                      { title: "スマートな受付", desc: "当日はスマホをかざすだけ。笑顔で迎える準備を", color: "text-indigo-600", bg: "bg-indigo-50" },
                      { title: "絆を深めるファン作り", desc: "一度きりで終わらせない、次のご縁を大切に", color: "text-emerald-600", bg: "bg-emerald-50" },
                    ].map((item, idx) => (
                      <div key={idx} className={`flex items-start gap-4 p-5 ${item.bg} rounded-2xl border border-white/50 shadow-sm`}>
                        <div className={`mt-1 p-1.5 rounded-full bg-white shadow-sm ${item.color}`}>
                          <Check size={18} strokeWidth={3} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900">{item.title}</h4>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 2枚目へ進むボタン */}
                  <button
                    onClick={() => setModalStep(2)}
                    className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-300 flex items-center justify-center gap-2 group text-xl"
                  >
                    具体的な使い方を見る
                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              ) : (
                /* 2枚目：使い方ガイド（デザイン統一＆標準語） */
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-4 tracking-tight">
                    活用までの3ステップ
                  </h2>
                  <p className="text-slate-600 font-medium mb-10 leading-relaxed">
                    まずはこの流れで、最初のイベントを開催してみましょう。
                  </p>

                  {/* 3つのステップ（1枚目と同じデザインで統一！） */}
                  <div className="grid gap-4 text-left mb-12">
                    {[
                      { step: "01", title: "イベントを作成", desc: "「新規イベント」から、タイトルや日時を入力して募集ページを準備します。", color: "text-blue-600", bg: "bg-blue-50", icon: <Plus size={18} strokeWidth={3}/> },
                      { step: "02", title: "QRコードで受付", desc: "イベント当日は「QR表示」でコードを掲示。参加者が読み取るだけで受付完了です。", color: "text-indigo-600", bg: "bg-indigo-50", icon: <QrCode size={18} strokeWidth={3}/> },
                      { step: "03", title: "御礼メールを送信", desc: "終了後は「参加者リスト」から感謝のメールを一斉送信。次につなげます。", color: "text-emerald-600", bg: "bg-emerald-50", icon: <Mail size={18} strokeWidth={3}/> },
                    ].map((item, idx) => (
                      <div key={idx} className={`flex items-start gap-4 p-5 ${item.bg} rounded-2xl border border-white/50 shadow-sm`}>
                        <div className={`mt-1 p-1.5 rounded-full bg-white shadow-sm ${item.color} flex items-center justify-center font-black`}>
                          {/* アイコンを表示 */}
                          {item.icon}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 flex items-center gap-2">
                            <span className="text-xs bg-white px-2 py-0.5 rounded-full shadow-sm border border-slate-100">{item.step}</span>
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 完了ボタン（閉じる） */}
                  <button
                    onClick={closeWelcomeModal}
                    className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group text-xl"
                  >
                    利用を開始する
                  </button>
                </div>
              )}
              {/* === ▲▲▲ 切り替えここまで ▲▲▲ === */}
              
              <p className="mt-6 text-slate-400 text-xs font-bold">
                ※右上の「Information」からいつでも使い方を確認できます
              </p>
            </div>
          </div>
        </div>
      )}
      {/* 📂 ファイルの一番下（モーダル類が集まっている場所）に追加 */}
{isUpgradeModalOpen && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[300]">
    <div className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-md w-full text-center shadow-2xl animate-in zoom-in duration-300">
      <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
        <Shield size={40} />
      </div>
      
      <h3 className="text-2xl font-black text-slate-900 mb-4">
        スタンダードプラン専用機能
      </h3>
      
      <p className="text-slate-600 font-bold mb-8 leading-relaxed">
        メールマーケティング機能は、<br />
        <span className="text-indigo-600">スタンダードプラン（月額）</span>限定です。<br />
        アップグレードして、ファン作りを加速させましょう！
      </p>
      
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => router.push("/dashboard")} 
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
        >
          プランを確認・変更する
        </button>
        <button 
          onClick={() => setIsUpgradeModalOpen(false)} 
          className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-all"
        >
          今は閉じる
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}