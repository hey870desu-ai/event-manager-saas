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
import StripeConnectButton from "../../components/admin/StripeConnectButton";
import { where } from "firebase/firestore";

// ★相対パスのまま維持
import { fetchAllTenants, type Tenant } from "../../lib/tenants";

// Icons
import { Menu,Plus, LogOut, Calendar, MapPin, ExternalLink, Trash2, BarChart3, Users, Check, Eye, Share2, FileDown, ShieldAlert, Settings, UserPlus, X, UserCheck, ListChecks, Copy, Mail, Send, Building2, Tag, Megaphone, BarChart2, ScanBarcode, QrCode, Star,Sparkles, MessageSquare, Clock, FileText, Shield, CreditCard, ArrowRight, Lock,ScanLine,Instagram,MessageCircle,Facebook,UserX } from "lucide-react"; 

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

type EventData = { id: string; title: string; date: string; location: string; venueName?: string; tenantId?: string; branchTag?: string; slug?: string; content: string; status?: string; createdAt?: any;surveyFields?:any[];theme?: string;lecturers?:  any[];contactName?: string;contactEmail?: string;contactPhone?: string;isSpotPaid?: boolean; };
type AdminUser = { email: string; tenantId: string; branchId?: string; role?: string; addedAt: any; addedBy: string; };
type ReservationData = { id: string; name: string; email: string; phone: string; company: string; department: string; type: string; jobTitles: string[] | string; source: string; referrer: string; membership: string; createdAt: any; checkedIn?: boolean;amount?: number;paymentStatus?: string;paymentMethod?: string; };

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [mailScheduledTime, setMailScheduledTime] = useState("");
  const [sendingMail, setSendingMail] = useState(false);
  // ✅ これを足すだけで波線は消えるぞい！
  const [modalStep, setModalStep] = useState(1);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [showGuideTooltip, setShowGuideTooltip] = useState(false);
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

  const [legalCompanyName, setLegalCompanyName] = useState(""); // 正式な会社名
  const [representative, setRepresentative] = useState("");     // 代表者名
  const [legalAddress, setLegalAddress] = useState("");        // 所在地
  const [legalPhone, setLegalPhone] = useState("");          // 連絡先電話番号
  const [legalEmail, setLegalEmail] = useState("");           // 連絡先メールアドレス
  const [legalHomepage, setLegalHomepage] = useState("");      // 公式HP

  const [currentEventForList, setCurrentEventForList] = useState<EventData | null>(null);
  const [participants, setParticipants] = useState<ReservationData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState(""); // ✨ お名前用を追加だばい！
  
  const [newAdminBranch, setNewAdminBranch] = useState(""); 
  const [newAdminTenantId, setNewAdminTenantId] = useState(""); 
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  // ▼▼▼ 追加：複製機能のロジック ▼▼▼
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  // ✨ SNSリンク用のStateを追加だばい！
  const [instagramUrl, setInstagramUrl] = useState("");
  const [lineUrl, setLineUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  // テナント情報をここで確定させる
  const currentTenantData = tenantList.find(t => t.id === currentUserTenant);
  
  // 両方の判定を持っておくのがコツだばい！
  const isFreePlan = currentTenantData?.plan?.toUpperCase() === 'FREE';
  const isStandard = currentTenantData?.plan?.toUpperCase() === 'STANDARD';
  // ❌ 参加者のキャンセル処理（返金対応・通知メール統合版）
  const handleCancelParticipant = async (p: ReservationData) => {
    if (!currentEventForList) return;

    const isPaid = (p as any).paymentStatus === 'paid';
    const confirmMsg = isPaid
      ? `${p.name} 様の申し込みをキャンセルし、参加費を返金しますか？\n（※キャンセルと返金処理が行われ、本人に通知メールが届きます）`
      : `${p.name} 様の申し込みをキャンセルし、本人へ通知メールを送信しますか？\n（※この操作は取り消せません）`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/cancel-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: p.id,
          eventId: currentEventForList.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isPaid && data.refunded) {
        alert(`キャンセル完了！¥${data.refundAmount?.toLocaleString() || 0}（${data.refundRate}%）を返金しました。本人に通知メール送信済みです。`);
      } else if (isPaid && data.refundRate === 0) {
        alert("キャンセル完了！キャンセルポリシーにより返金なし（0%）です。本人に通知メール送信済みです。");
      } else if (isPaid && !data.refunded) {
        alert("キャンセルは完了しましたが、返金処理に失敗しました。Stripeダッシュボードから手動で返金してください。");
      } else {
        alert("キャンセル完了！本人に通知メールを送信しました。");
      }
    } catch (error) {
      console.error("Cancel Error:", error);
      alert("キャンセル処理に失敗しました。通信状況を確認してください。");
    }
  };

 // 📂 app/admin/page.tsx 147行目付近

  const handleDuplicate = async (e: React.MouseEvent, event: EventData) => {
  e.stopPropagation();

  // ★ スタンダード（サブスク）以外は、たとえスポットでお金を払ってても複製は禁止だぞい！
  if (!isStandard) {
    setIsUpgradeModalOpen(true);
    return;
  }

  if (!confirm('このイベントを複製しますか？')) return;
    
    setDuplicatingId(event.id);
    try {
      // IDと作成日以外のデータをコピー
      const { id, createdAt, ...eventData } = event; 
      
      await addDoc(collection(db, 'events'), {
        ...eventData,
        title: `${eventData.title} のコピー`, // タイトルを変更
        status: 'draft', // ステータスは必ず下書きに戻すっぺ！
        isSpotPaid: false, // ★重要：コピー先は「未払い」状態からスタートだぞい！
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Duplicate error:", error);
      alert("複製に失敗しました。"); // 標準語でスマートに！
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
    // ウェルカムモーダルを閉じた後、新規イベントボタンへのガイドを表示
    setTimeout(() => setShowGuideTooltip(true), 500);
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
        // ✨ 法人情報をセット
        setLegalCompanyName(data.legalCompanyName || "");
        setRepresentative(data.representative || "");
        setLegalAddress(data.address || "");
        setLegalPhone(data.phone || "");
        setLegalEmail(data.legalEmail || "");
        setLegalHomepage(data.homepage || "");
      }
    });

    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user, currentUserTenant, isSuperAdminMode]); // 依存配列に currentUserTenant を追加
// ▲▲▲ 修正ここまで ▲▲▲

  useEffect(() => {
    if (events.length === 0) return;
    const unsubs = events.map(ev => {
       return onSnapshot(collection(db, "events", ev.id, "reservations"), (snap) => {
          // 🏆 【修正！】全件数（snap.size）ではなく、キャンセル以外を数えるぞい！
          const activeCount = snap.docs.filter(doc => doc.data().status !== 'cancelled').length;
          setCounts(prev => ({...prev, [ev.id]: activeCount}));
       });
    });
    return () => unsubs.forEach(u => u());
  }, [events]);

  useEffect(() => {
    if (!isParticipantsOpen || !currentEventForList) { setParticipants([]); return; }
    const q = query(collection(db, "events", currentEventForList.id, "reservations"), orderBy("createdAt", "asc"));
    
    return onSnapshot(q, (s) => {
      const loadedData = s.docs
        .map(d => {
          const data = d.data();
          return { 
             id: d.id, 
             ...data,
             checkedIn: data.status === 'attended' || data.checkedIn === true
          };
        })
        // 🏆 【ここが追加ポイント！】ステータスが 'cancelled' 以外の人だけを残すぞい！
        .filter((p: any) => p.status !== 'cancelled') as ReservationData[];
        
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

  const [inviting, setInviting] = useState(false); // 送信中フラグ

  // ✨ targetName を追加したぞい！
const handleInviteStaff = async (e: React.FormEvent, targetEmail: string, targetName: string, targetTenantId: string, targetBranch: string) => {
  e.preventDefault();
  if (!targetEmail || !targetName || !targetTenantId) return alert("名前とメアドを入れてくんちぇ！");

  if (!confirm(`${targetName} さんを「絆太郎」に招待してもいいべか？`)) return;

  setInviting(true);
  try {
    // 1. DB（admin_users）に名前も一緒に登録するっぺ
    await setDoc(doc(db, "admin_users", targetEmail), {
      name: targetName, // ✨ 名前を保存！
      email: targetEmail,
      tenantId: targetTenantId,
      branchId: targetBranch,
      role: "staff",
      addedAt: serverTimestamp(),
    });

    // 2. メール送信APIにお名前もバトンタッチするぞい！
    const res = await fetch('/api/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: targetEmail, 
        name: targetName, // ✨ これでメールに名前がいくっぺ！
        tenantId: targetTenantId,
        tenantName: orgName 
      }),
    });

    if (res.ok) {
      alert("招待メールを飛ばしたぞい！");
      setNewAdminEmail("");
      setNewAdminName(""); // ✨ 入力欄を空にする
      setNewAdminBranch("");
    } else {
      throw new Error("メールの送信に失敗したっぺ...");
    }
  } catch (err: any) {
    console.error(err);
    alert("エラーだばい: " + err.message);
  } finally {
    setInviting(false);
  }
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
  
  const handleSaveTenantSettings = async () => {
  try {
    await updateDoc(doc(db, "tenants", currentUserTenant), { 
      orgName: editingOrgName, // 表の顔（CARE DESIGN WORKS）
      legalCompanyName,        // 裏の顔（株式会社はなひろ）
      representative,
      address: legalAddress,
      phone: legalPhone,
      legalEmail: legalEmail,
      homepage: legalHomepage,
      instagramUrl,
      lineUrl,
      facebookUrl,
      updatedAt: serverTimestamp()
    });
    alert("基本情報と特商法用データを保存したよ！\nこれでStripeの審査も怖くない！");
  } catch (e) { 
    alert("保存に失敗した..."); 
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

    const confirmMsg = mailScheduledTime
      ? `【予約配信の確認】\n宛先: ${targetName}\n件数: ${targets.length} 名\n配信日時: ${new Date(mailScheduledTime).toLocaleString('ja-JP')}\n\n予約しますか？`
      : `【最終確認】\n宛先: ${targetName}\n件数: ${targets.length} 名\n\nお一人ずつ宛名（〇〇様）を入れて送信します。\n送信には少し時間がかかりますが、そのままお待ちください。\n\n本当によろしいですか？`;

    if (!confirm(confirmMsg)) return;

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
        contactName: currentEventForList.contactName || orgName,
        contactEmail: currentEventForList.contactEmail || "",
        contactPhone: currentEventForList.contactPhone || "",
        scheduledAt: mailScheduledTime ? new Date(mailScheduledTime).toISOString() : undefined,
        }),
      });
      if (res.ok) {
        alert(mailScheduledTime
          ? `${new Date(mailScheduledTime).toLocaleString('ja-JP')} に ${targets.length}名への配信を予約しました。`
          : "送信が完了しました！");
        setIsMailModalOpen(false);
        setMailScheduledTime("");
      } else { alert("送信中にエラーが発生しました。"); }
    } catch (e) { alert("通信エラーが発生しました"); } finally { setSendingMail(false); }
  };

  const handleDownloadCSV = async (e: React.MouseEvent, eventId: string, title: string) => {
  e.stopPropagation();

  // ★ ここに追加！フリープランなら門前払いだばい！
  if (isFreePlan) {
    setIsUpgradeModalOpen(true);
    return;
  }

  setDownloadingId(eventId);

  // 電話番号の整形関数
  const formatPhone = (input: any) => {
    if (!input) return "";
    const num = input.toString().replace(/[^0-9]/g, "");
    if (num.length === 11) return num.replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3");
    if (num.length === 10) {
      if (num.startsWith("03") || num.startsWith("06")) return num.replace(/^(\d{2})(\d{4})(\d{4})$/, "$1-$2-$3");
      return num.replace(/^(\d{3})(\d{3})(\d{4})$/, "$1-$2-$3");
    }
    return input.toString().replace(/[="]/g, "").trim();
  };

  try {
    // 1. まずイベント情報を取得して、今の質問項目(customFields)を特定するっぺ！
    const eventSnap = await getDoc(doc(db, "events", eventId));
    if (!eventSnap.exists()) { alert("イベントが見つかりません"); return; }
    const eventData = eventSnap.data();
    const customFields = eventData.customFields || []; // 今の質問リスト

    // 2. 予約データを取得（キャンセル者を最後に並べる）
    const s = await getDocs(query(collection(db, "events", eventId, "reservations")));
    const r = s.docs.map(d => d.data() as any)
      .sort((a, b) => {
        // キャンセル者を最後に
        const aCancelled = a.status === 'cancelled' ? 1 : 0;
        const bCancelled = b.status === 'cancelled' ? 1 : 0;
        if (aCancelled !== bCancelled) return aCancelled - bCancelled;
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      });
    if(!r.length) { alert("データなし"); return; }

    // 3. CSVヘッダーの作成
    const baseHeaders = ["ステータス", "名前", "メール", "電話", "形式", "チケット種別", "金額"];
    const customLabels = customFields.map((f: any) => f.label);
    const headers = [...baseHeaders, ...customLabels, "申込日時"];

    // 4. 各行のデータ作成
    const csvRows = r.map(x => {
      const cleanPhone = formatPhone(x.phone);

      // ステータス判定
      let statusLabel = "未受付";
      if (x.status === 'cancelled') statusLabel = "キャンセル";
      else if (x.checkedIn || x.status === 'attended') statusLabel = "受付済";

      const row = [
        `"${statusLabel}"`,
        `"${x.name || ""}"`,
        `"${x.email || ""}"`,
        `"${cleanPhone}"`,
        `"${x.type === 'online' ? "オンライン" : "会場"}"`,
        `"${x.selectedTicket || "通常参加"}"`,
        `"${x.price || 0}"`
      ];

      // カスタム回答（配列形式とオブジェクト形式の両方に対応）
      customLabels.forEach((label: string) => {
        let answer = "";
        if (Array.isArray(x.customAnswers)) {
          // 新形式（配列）
          const found = x.customAnswers.find((a: any) => a.label === label);
          answer = found ? (Array.isArray(found.value) ? found.value.join("/") : String(found.value)) : "";
        } else if (x.customAnswers) {
          // 旧形式（オブジェクト）
          const val = x.customAnswers[label];
          answer = Array.isArray(val) ? val.join("/") : (val || "");
        }
        row.push(`"${answer.toString().replace(/"/g, '""')}"`);
      });

      row.push(`"${x.createdAt?.toDate ? x.createdAt.toDate().toLocaleString() : ""}"`);
      return row.join(",");
    });

    // 5. CSVの合体とダウンロード
    const csv = [headers.join(","), ...csvRows].join("\r\n");
    const a = document.createElement("a"); 
    a.href = URL.createObjectURL(new Blob([new Uint8Array([0xEF,0xBB,0xBF]), csv], {type:"text/csv"})); 
    a.download = `${title}_参加者リスト.csv`; 
    a.click();

  } catch(err) { 
    console.error(err);
    alert("CSVの作成に失敗しました"); 
  } finally { 
    setDownloadingId(null); 
  }
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
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50 shadow-sm">
  <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center relative">
    
    {/* 左側：ロゴとインフォ */}
    <div className="flex items-center gap-3 shrink-0">
      <img src="/icon.webp" alt="絆太郎" className="h-8 w-8 object-contain" />
      <h1 className="text-xl font-bold text-slate-800 hidden sm:block">絆太郎</h1>
      
      {/* インフォメーションボタン（これだけは外に出しておくと便利だっぺ！） */}
      <button onClick={() => router.push("/admin/info")} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full hover:bg-orange-50 transition-all border border-slate-200">
        <Megaphone size={14} /> 
        <span className="hidden md:inline text-xs font-bold">Information</span>
      </button>
    </div>

    {/* 【PC版】横並びメニュー（md以上の画面で見える） */}
    <div className="hidden md:flex gap-2 items-center">
      {/* 1. 名刺スキャン */}
      <button onClick={() => router.push("/admin/marketing/scan")} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1.5 items-center hover:bg-orange-50">
  <ScanLine size={16} /> <span>名刺スキャン</span>
</button>
      {/* 2. 絆リスト */}
      <button onClick={() => router.push("/admin/marketing")} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1.5 items-center hover:bg-orange-50">
        <Mail size={16}/> <span>絆リスト</span>
      </button>
      {/* 3. 分析 */}
      <button onClick={() => router.push("/admin/analytics")} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1.5 items-center hover:bg-orange-50">
        <BarChart2 size={16}/> <span>分析</span>
      </button>
      {/* 4. 当日受付 */}
      <button onClick={() => router.push("/admin/scan")} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1.5 items-center hover:bg-orange-50">
        <ScanBarcode size={16}/> <span>当日受付</span>
      </button>
      {/* 5. 契約 */}
      <button onClick={() => router.push("/dashboard")} className="bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold flex gap-1.5 items-center hover:bg-slate-100">
        <CreditCard size={16}/> <span>契約</span>
      </button>
      {/* 2.8 営業ツール（リッチメール） ✨新登場だばい！ */}
      <button 
        onClick={() => router.push("/admin/marketing/newsletter")} 
        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-black flex gap-1.5 items-center hover:shadow-md transition-all shadow-blue-200/50 border-none"
      >
        <Sparkles size={16}/> <span>営業ツール</span>
      </button>
      
      <div className="w-px h-4 bg-slate-200 mx-1" /> {/* 仕切り線 */}
      
      {/* 6. 設定 / 7. ログアウト */}
      <button onClick={()=>setIsSettingsOpen(true)} className="p-1.5 hover:bg-slate-100 rounded-md text-slate-500"><Settings size={20}/></button>
      <button onClick={handleLogout} className="p-1.5 hover:bg-red-50 rounded-md text-slate-500 hover:text-red-500"><LogOut size={20}/></button>
    </div>

    {/* 【スマホ版】メニュー切り替えボタン（md未満の画面で見える） */}
    <button 
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="md:hidden p-2 text-slate-600 bg-slate-100 rounded-lg active:scale-95 transition-all"
    >
      {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
    </button>

    {/* 【スマホ用】スライドメニュー本体 */}
    {isMobileMenuOpen && (
      <div className="absolute top-16 left-0 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-2xl flex flex-col p-4 gap-2 animate-in slide-in-from-top duration-300 md:hidden z-50">
        
        {/* 1. 名刺スキャン（特等席！） */}
        <button
  onClick={() => { router.push("/admin/marketing/scan"); setIsMobileMenuOpen(false); }}
  className="flex items-center gap-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 rounded-2xl font-black border border-indigo-100 shadow-sm"
>
  <ScanLine size={24} /> <span className="text-base">名刺スキャン</span>
</button>
{/* 営業ツール（スマホでは目立つように一番上に！） */}
        <button 
          onClick={() => { router.push("/admin/marketing/newsletter"); setIsMobileMenuOpen(false); }} 
          className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-2xl font-black border border-blue-100 shadow-sm"
        >
          <Sparkles size={22} className="text-blue-600" /> <span className="text-base">営業ツール（リッチメール）</span>
        </button>

        <div className="grid grid-cols-1 gap-2 mt-1">
          {/* 2. 絆リスト */}
          <button onClick={() => { setIsMobileMenuOpen(false); router.push("/admin/marketing"); }} className="flex items-center gap-4 p-4 bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-100">
            <Mail size={22} className="text-orange-500" /> <span className="text-base">絆リスト</span>
          </button>
          
          {/* 3. 分析・データ管理 */}
          <button onClick={() => { router.push("/admin/analytics"); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-100">
            <BarChart2 size={22} className="text-blue-500" /> <span className="text-base">分析・データ管理</span>
          </button>
          
          {/* 4. 当日受付・QR */}
          <button onClick={() => { router.push("/admin/scan"); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-100">
            <ScanBarcode size={22} className="text-emerald-500" /> <span className="text-base">当日受付・QR</span>
          </button>
          
          {/* 5. 契約・請求 */}
          <button onClick={() => { router.push("/dashboard"); setIsMobileMenuOpen(false); }} className="flex items-center gap-4 p-4 bg-slate-50 text-slate-700 rounded-2xl font-bold border border-slate-100">
            <CreditCard size={22} className="text-slate-500" /> <span className="text-base">契約・請求</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          {/* 6. 設定 */}
          <button onClick={() => { setIsSettingsOpen(true); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 p-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold">
            <Settings size={20} /> 設定
          </button>
          {/* 7. ログアウト */}
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold">
            <LogOut size={20} /> ログアウト
          </button>
        </div>
      </div>
    )}
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
          <div className="relative">
            <button
  onClick={() => {
    setShowGuideTooltip(false);
    // ★ スタンダードじゃない（＝フリーの人）は1件制限だっぺ！
    if (!isStandard && events.length >= 1) {
      setIsUpgradeModalOpen(true);
      return;
    }
    setSelectedEvent(null);
    setIsEventModalOpen(true);
  }}
  className={`px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold flex gap-2 shadow-lg shadow-cyan-500/20 transition-all active:scale-95 items-center ${showGuideTooltip ? 'ring-4 ring-cyan-300 ring-offset-2 animate-pulse' : ''}`}
>
  <Plus size={20} strokeWidth={3}/> 新規イベント
</button>

            {/* 初回ガイドツールチップ */}
            {showGuideTooltip && (
              <div className="absolute top-full right-0 mt-3 z-50 animate-in fade-in slide-in-from-top-2 duration-500">
                {/* 吹き出しの三角 */}
                <div className="absolute -top-2 right-8 w-4 h-4 bg-slate-900 rotate-45 rounded-sm"></div>
                <div className="bg-slate-900 text-white rounded-2xl px-5 py-4 shadow-2xl w-72">
                  <p className="font-bold text-sm mb-1">まずはここから！</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    「新規イベント」を押して、最初のイベントを作ってみましょう。タイトルと日時を入れるだけで、すぐに告知ページが完成します。
                  </p>
                  <button
                    onClick={() => setShowGuideTooltip(false)}
                    className="mt-3 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                  >
                    OK、わかりました
                  </button>
                </div>
              </div>
            )}
          </div>
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
                     onClick={(e) => {
  e.stopPropagation();
  
  navigator.clipboard.writeText(`${window.location.origin}/t/${ev.tenantId}/e/${ev.id}`);
  setCopiedId(ev.id);
  setTimeout(() => setCopiedId(null), 2000);
}}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 px-4 py-2.5 rounded-lg text-slate-600 transition-all border border-slate-300 shadow-sm font-bold text-xs" 
                   >
                       {copiedId===ev.id?<Check size={18} className="text-emerald-500"/>:<Share2 size={18}/>}
                       <span className="hidden lg:inline">URL</span>
                   </button>
                   
                   <button 
  onClick={(e) => {
    e.stopPropagation();
    if (ev.status !== 'published') {
      alert("このイベントは現在「下書き」状態です。公開設定に変更するまで、参加者はこのURLにアクセスしても閲覧できません。");
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;
    window.open(`${baseUrl}/t/${safeStr(ev.tenantId)||"default"}/e/${ev.id}`, '_blank');
  }}
  className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-all border shadow-sm font-bold text-xs ${
    ev.status === 'published' 
    ? "bg-white hover:bg-slate-100 text-slate-600 border-slate-300" 
    : "bg-slate-50 text-slate-400 border-dashed border-slate-300 cursor-not-allowed"
  }`}
>
  {ev.status === 'published' ? <ExternalLink size={18}/> : <Lock size={18}/>}
  <span className="hidden lg:inline">{ev.status === 'published' ? '公開P' : '非公開中'}</span>
</button>
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
             <div className="p-6"><EventForm event={selectedEvent} onSuccess={()=>setIsEventModalOpen(false)}isFreePlan={isFreePlan}/></div>
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
                       <th className="p-2 md:p-4">お支払い</th>
                       <th className="p-2 md:p-4">チケット</th>
                       <th className="hidden md:table-cell p-4">会社</th>
                       <th className="hidden md:table-cell p-4">形式</th>
                       <th className="p-2 md:p-4 text-center">個別送信</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-800">
  {participants.map((p) => (
    <tr key={p.id} className={p.checkedIn ? 'bg-emerald-900/10' : ''}>
      {/* 1. チェックボックス */}
      <td className="p-2 text-center align-middle">
        <input
          type="checkbox"
          className="w-4 h-4 accent-indigo-500 cursor-pointer"
          checked={selectedParticipantIds.includes(p.id)}
          onChange={() => toggleSelectParticipant(p.id)}
        />
      </td>

      {/* 2. 受付ボタン */}
      <td className="p-2 md:p-4 align-middle">
        <button
          onClick={() => toggleCheckIn(p)}
          className={`w-full md:w-auto px-2 md:px-3 py-2 md:py-1.5 rounded text-xs font-bold flex justify-center items-center gap-1 transition-all active:scale-95 ${
            p.checkedIn
              ? 'bg-emerald-500 text-white shadow-emerald-500/20'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          {p.checkedIn ? <Check size={16} strokeWidth={3} /> : <UserCheck size={16} />}
          <span className="hidden md:inline">{p.checkedIn ? "受付済" : "受付する"}</span>
        </button>
      </td>

      {/* 3. 参加者情報 */}
      <td className="p-2 md:p-4">
        <div className="font-bold text-white text-sm md:text-base mb-0.5">{p.name}</div>
        <div className="md:hidden space-y-1">
          <div className="text-xs text-slate-400">🏢 {p.company}</div>
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded border ${
                p.type === 'online' ? 'border-blue-500/30 text-blue-400' : 'border-orange-500/30 text-orange-400'
              }`}
            >
              {p.type === 'online' ? 'オンライン' : '会場参加'}
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-500 hidden md:block">{p.email}</div>
      </td>

      {/* ★ 追加：お支払い金額（ここが今回のキモだっぺ！） */}
      <td className="p-2 md:p-4 align-middle">
        <div className="flex flex-col gap-1">
          {/* 金額の表示 */}
          <span className="text-white font-black text-sm md:text-base">
            ¥{(Number((p as any).price) || 0).toLocaleString()}
          </span>
          
          {/* 支払いステータスの出し分け */}
          {(p as any).status === 'paid' ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 w-fit">
              <Check size={10} strokeWidth={3} /> 決済済み
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px] font-bold border border-orange-500/30 w-fit">
              当日現金
            </span>
          )}
        </div>
      </td>

      {/* チケット種別 */}
      <td className="p-2 md:p-4 align-middle">
        {(p as any).selectedTicket && (
          <span className="inline-flex px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
            {(p as any).selectedTicket}
          </span>
        )}
      </td>

      {/* 4. 会社名（PCのみ） */}
      <td className="p-4 text-sm text-slate-300 hidden md:table-cell">{p.company}</td>

      {/* 5. 形式（PCのみ） */}
      <td className="p-4 hidden md:table-cell">
        <span
          className={`text-xs px-2 py-1 rounded border ${
            p.type === 'online' ? 'border-blue-500/30 text-blue-400' : 'border-orange-500/30 text-orange-400'
          }`}
        >
          {p.type === 'online' ? 'Online' : 'Venue'}
        </span>
      </td>

      {/* 6. 個別メールボタン（ここを見つけて、下のコードに貼り替えるぞい！） */}
      <td className="p-2 md:p-4 text-center align-middle">
        <div className="flex items-center justify-center gap-2">
          {/* ❌ キャンセルボタン（新登場！） */}
          <button
            onClick={() => handleCancelParticipant(p)}
            className="p-2 bg-slate-800 hover:bg-red-600 text-slate-400 hover:text-white rounded transition-all active:scale-90"
            title="申し込みをキャンセルして通知を送る"
          >
            <UserX size={16} />
          </button>

          {/* ✉️ 個別メールボタン（もともとあったやつだばい） */}
          <button
            onClick={() => openMailModal(p)}
            className="p-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded transition-all active:scale-90"
            title="個別にメール"
          >
            <Mail size={16} />
          </button>
        </div>
      </td>
    </tr>
  ))}
</tbody>
                 </table>
               )}
            </div>
            {/* ▼▼▼ フッター：合計金額の計算と表示をパワーアップ！ ▼▼▼ */}
<div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
  {/* 左側：人数統計 */}
  <div className="flex gap-4 text-xs text-slate-400">
    <span>申込数: <span className="text-white font-bold">{participants.length}</span> 名</span>
    <span>受付済: <span className="text-emerald-400 font-bold">{participants.filter(p=>p.checkedIn).length}</span> 名</span>
  </div>

  {/* 右側：金額合計（ここが塙さんのこだわりだっぺ！） */}
  <div className="flex flex-wrap justify-end gap-3 md:gap-6">
    {/* 1. 全体の売上予定額 */}
    <div className="flex flex-col items-end">
      <span className="text-[10px] text-slate-500 uppercase font-bold">売上予定（合計）</span>
      <span className="text-white font-black text-lg">
        ¥{participants.reduce((sum, p) => sum + (Number((p as any).price) || 0), 0).toLocaleString()}
      </span>
    </div>

    {/* 2. 当日現金で回収するべき残額 */}
    <div className="flex flex-col items-end border-l border-slate-700 pl-4 md:pl-6">
      <span className="text-[10px] text-orange-400 uppercase font-bold">当日現金（未回収分）</span>
      <span className="text-orange-500 font-black text-lg">
        ¥{participants
          .filter(p => (p as any).status !== 'paid') // 決済済み以外を集計
          .reduce((sum, p) => sum + (Number((p as any).price) || 0), 0)
          .toLocaleString()}
      </span>
    </div>
  </div>
</div>
{/* ▲▲▲ 修正ここまで ▲▲▲ */}
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
                {!isFreePlan && (
                <button
                   onClick={downloadFeedbackCSV}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition-colors"
                 >
                   <FileText size={16}/> <span className="hidden sm:inline">CSV出力</span>
                 </button>
                )}
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

                  {/* 無料プランの場合、ここから先はロック */}
                  {isFreePlan ? (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f111a]/80 to-[#0f111a] z-10 flex flex-col items-center justify-center pt-20">
                        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 text-center max-w-md shadow-2xl">
                          <Lock size={32} className="text-indigo-400 mx-auto mb-4" />
                          <h3 className="text-lg font-black text-white mb-2">アンケート結果の詳細を見る</h3>
                          <p className="text-sm text-slate-400 mb-1">
                            <strong className="text-indigo-400">{feedbacks.length}件</strong> の回答が届いています
                          </p>
                          <p className="text-xs text-slate-500 mb-6">満足度の内訳・質問別レポート・CSV出力は有料プランでご利用いただけます。</p>
                          <button
                            onClick={() => { setIsFeedbackOpen(false); setIsUpgradeModalOpen(true); }}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                          >
                            プランをアップグレード
                          </button>
                        </div>
                      </div>
                      <div className="filter blur-md opacity-40 pointer-events-none select-none" aria-hidden="true">
                        <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-xl mb-6">
                          <div className="h-32 bg-slate-800/50 rounded-lg"></div>
                        </div>
                        <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-xl">
                          <div className="h-48 bg-slate-800/50 rounded-lg"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <>

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

                  </>
                  )}

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

             {/* 配信タイミング選択 */}
             <div className="mt-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
               <label className="block text-xs text-slate-400 mb-3 font-bold">配信タイミング</label>
               <div className="flex flex-col sm:flex-row gap-3">
                 <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all flex-1 ${!mailScheduledTime ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-950 border-slate-700'}`}>
                   <input type="radio" name="mailTiming" checked={!mailScheduledTime} onChange={() => setMailScheduledTime("")} className="accent-indigo-500 w-4 h-4"/>
                   <span className="text-sm text-white font-bold">今すぐ送信</span>
                 </label>
                 <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all flex-1 ${mailScheduledTime ? 'bg-emerald-900/30 border-emerald-500' : 'bg-slate-950 border-slate-700'}`}>
                   <input type="radio" name="mailTiming" checked={!!mailScheduledTime} onChange={() => { const d = new Date(); d.setDate(d.getDate() + 1); setMailScheduledTime(`${d.toISOString().split('T')[0]}T09:00`); }} className="accent-emerald-500 w-4 h-4"/>
                   <span className="text-sm text-white font-bold">予約配信</span>
                 </label>
               </div>
               {mailScheduledTime && (
                 <div className="mt-3">
                   <div className="flex gap-2 items-center">
                     <input type="date" value={mailScheduledTime.split('T')[0] || ''} onChange={(e) => { const time = mailScheduledTime.split('T')[1] || '09:00'; setMailScheduledTime(`${e.target.value}T${time}`); }} className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 [color-scheme:dark]" />
                     <select value={mailScheduledTime.split('T')[1] || '09:00'} onChange={(e) => { const date = mailScheduledTime.split('T')[0] || new Date().toISOString().split('T')[0]; setMailScheduledTime(`${date}T${e.target.value}`); }} className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2.5 outline-none focus:border-emerald-500 [color-scheme:dark]">
                       {Array.from({length: 24}, (_, h) => [0,10,20,30,40,50].map(m => { const val = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; return <option key={val} value={val}>{h}:{String(m).padStart(2,'0')}</option>; })).flat()}
                     </select>
                   </div>
                 </div>
               )}
             </div>

             <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
               <div className="text-xs text-slate-500">送信対象: <span className="text-white font-bold text-base">{targetCount}</span> 名</div>
               <div className="flex gap-3">
                 <button onClick={()=>{setIsMailModalOpen(false); setMailScheduledTime("");}} className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-sm">キャンセル</button>
                 <button onClick={sendMail} disabled={sendingMail || targetCount===0} className={`px-8 py-2.5 rounded-xl text-white font-bold hover:shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 ${mailScheduledTime ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
                   {sendingMail?<div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"/>:<Send size={16}/>}{mailScheduledTime ? '予約する' : '送信する'}
                 </button>
               </div>
             </div>
           </div>
        </div>
      )}

      {/* 設定モーダル */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 flex flex-col max-h-[90vh] shadow-2xl">
             <div className="flex justify-between mb-4 border-b border-slate-200 pb-3">
               <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2"><Settings size={22} className="text-indigo-500"/> 設定</h2>
               <button onClick={()=>setIsSettingsOpen(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"><X/></button>
             </div>
             <div className="space-y-6 overflow-y-auto pr-1">

               {/* 1. テナント・法人基本設定 */}
<div className="space-y-6">
{/* A. ブランド設定 */}
  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
      <Sparkles size={16} className="text-yellow-500"/> ブランド・SNS設定
    </h3>
    <p className="text-[10px] text-slate-500 mb-3">LPやメールの署名、SNSアイコンのリンク先に反映されます。</p>

    <div className="space-y-4">
      <div>
        <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase tracking-wider">主催者・表示名</label>
        <input
          type="text"
          value={editingOrgName}
          onChange={(e)=>setEditingOrgName(e.target.value)}
          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
          placeholder="例：CARE DESIGN WORKS"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase tracking-wider">SNS連携（広報誌メールに表示）</label>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 focus-within:border-pink-500 transition-all">
          <Instagram size={14} className="text-pink-500" />
          <input type="text" value={instagramUrl} onChange={(e)=>setInstagramUrl(e.target.value)} className="bg-transparent text-[10px] text-slate-900 outline-none flex-1 font-mono" placeholder="Instagram URL" />
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 focus-within:border-green-500 transition-all">
          <MessageCircle size={14} className="text-green-500" />
          <input type="text" value={lineUrl} onChange={(e)=>setLineUrl(e.target.value)} className="bg-transparent text-[10px] text-slate-900 outline-none flex-1 font-mono" placeholder="LINE公式アカウント URL" />
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 focus-within:border-blue-500 transition-all">
          <Facebook size={14} className="text-blue-500" />
          <input type="text" value={facebookUrl} onChange={(e)=>setFacebookUrl(e.target.value)} className="bg-transparent text-[10px] text-slate-900 outline-none flex-1 font-mono" placeholder="Facebook URL" />
        </div>
      </div>
    </div>
  </div>

  {/* B. 法人・特商法情報 */}
  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
      <Shield size={16} className="text-emerald-500"/> 法人・特商法情報（決済審査用）
    </h3>
    <p className="text-[10px] text-slate-500 mb-4">Stripeの審査や、自動生成される「特商法ページ」に使われる正式な情報です。</p>

    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase">正式な会社名・事業者名</label>
        <input type="text" value={legalCompanyName} onChange={(e)=>setLegalCompanyName(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 outline-none" placeholder="例：株式会社はなひろ" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase">代表者名</label>
          <input type="text" value={representative} onChange={(e)=>setRepresentative(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 outline-none" placeholder="塙 浩之" />
        </div>
        <div>
          <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase">電話番号</label>
          <input type="text" value={legalPhone} onChange={(e)=>setLegalPhone(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 outline-none" placeholder="0248-xx-xxxx" />
        </div>
      </div>
      <div>
        <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase">メールアドレス（特商法ページに表示）</label>
        <input type="email" value={legalEmail} onChange={(e)=>setLegalEmail(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 outline-none" placeholder="info@example.com" />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase">所在地</label>
        <input type="text" value={legalAddress} onChange={(e)=>setLegalAddress(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 outline-none" placeholder="福島県須賀川市..." />
      </div>
      <div>
        <label className="text-[10px] text-slate-500 ml-1 font-bold uppercase">ホームページURL</label>
        <input type="text" value={legalHomepage} onChange={(e)=>setLegalHomepage(e.target.value)} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:border-indigo-500 outline-none" placeholder="https://hana-hiro.com" />
      </div>
    </div>

    <button
      onClick={handleSaveTenantSettings}
      className="w-full mt-6 bg-slate-900 hover:bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
    >
      <Check size={18}/> 設定をすべて保存する
    </button>
  </div>

  {/* C. 決済連携設定 */}
  <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-200">
    <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
      <CreditCard size={16} className="text-indigo-500"/> 有料イベントの決済設定
    </h3>
    <p className="text-[10px] text-slate-500 mb-4">
      有料セミナーを開催するには、Stripeアカウントとの連携が必要です。<br />
      参加者が支払った参加費は、手数料（2%）を除きあなたの銀行口座に直接振り込まれます。
    </p>
    <StripeConnectButton
      tenantId={currentUserTenant}
      isConnected={!!(currentTenantData as any)?.stripeConnectId}
      legalPageUrl={typeof window !== 'undefined' ? `${window.location.origin}/${currentUserTenant}/legal` : ''}
      legalInfo={{
        companyName: legalCompanyName,
        representative: representative,
        address: legalAddress,
        phone: legalPhone,
        email: legalEmail,
      }}
    />
  </div>
</div>

{/* 特商法ページURL */}
<div className="mt-4 pt-4 border-t border-slate-200">
  <p className="text-[10px] text-slate-500 mb-2 font-bold uppercase">特商法ページURL</p>
  <div className="flex gap-2">
    <input
      readOnly
      value={`${window.location.origin}/${currentUserTenant}/legal`}
      className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] text-slate-600 font-mono"
    />
    <button
      onClick={() => window.open(`/${currentUserTenant}/legal`, '_blank')}
      className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] px-3 py-1 rounded font-bold transition-all"
    >
      ページを確認
    </button>
  </div>
</div>

{/* 2. スタッフ招待 */}
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                 <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <UserPlus size={16} className="text-indigo-500"/> スタッフ・管理者招待
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

<form onSubmit={(e) => handleInviteStaff(e, newAdminEmail, newAdminName, currentUserTenant, newAdminBranch)} className="space-y-2">
  {/* ✨ 名前入力欄を追加！ */}
  <input 
    value={newAdminName} 
    onChange={e=>setNewAdminName(e.target.value)} 
    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-indigo-500 outline-none"
    placeholder="スタッフのお名前（例：塙 太郎）"
    required
  />
  <input
    value={newAdminEmail}
    onChange={e=>setNewAdminEmail(e.target.value)}
    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-indigo-500 outline-none"
    placeholder="招待するスタッフのメールアドレス"
    required
  />
  <select
    value={newAdminBranch}
    onChange={e=>setNewAdminBranch(e.target.value)}
    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:border-indigo-500 outline-none"
  >
    <option value="">（所属部門・教室を選択）</option>
    {tenantList.find(t => t.id === currentUserTenant)?.branches?.map((b: any) => (
      typeof b === 'string' && <option key={b} value={b}>{formatBranchName(b)}</option>
    ))}
  </select>
  <div className="flex justify-end">
    <button 
      disabled={inviting}
      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 disabled:opacity-50"
    >
      {inviting ? "送信中..." : "スタッフを招待する"}
    </button>
  </div>
</form>
                 )}
               </div>

               {/* 3. 管理者リスト表示（自分のテナントの仲間だけ見える） */}
               <div>
                 <h3 className="text-sm font-bold text-slate-700 mb-2">登録済みスタッフ一覧</h3>
                 <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                   {adminUsers
                     .filter(u => isSuperAdminMode || u.tenantId === currentUserTenant)
                     .map(u=>(
                      <div key={u.email} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-200">
                        <div><div className="text-sm text-slate-900">{u.email}</div><div className="text-xs text-indigo-500">{formatBranchName(safeStr(u.branchId))}</div></div>
                        {(isSuperAdminMode || (u.email !== user?.email && u.role !== 'owner')) && ( 
                          <button onClick={()=>handleRemoveAdmin(u.email)} className="text-slate-500 hover:text-red-400"><Trash2 size={16}/></button> 
                        )}
                      </div>
                   ))}
                 </div>
               </div>

               {/* 4. 拠点・プラン情報（ユーザーは見るだけ） */}
               {!isSuperAdminMode && (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-4">
                    <h3 className="text-xs font-bold text-slate-500 mb-2 uppercase">現在のプラン・拠点</h3>
                    <div className="text-sm text-slate-900 mb-2">
                      プラン: <span className="font-bold text-indigo-600 uppercase">{tenantList.find(t=>t.id===currentUserTenant)?.plan || "Free"}</span>
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
      <span key={b} className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-700">
        {displayName}
      </span>
    )
  );
})}

                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
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
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xl animate-in fade-in duration-700"></div>

          <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in duration-500 max-h-[90vh] overflow-y-auto">

            {/* ヘッダー：ロゴ＋ウェルカムメッセージ */}
            <div className="relative bg-gradient-to-b from-slate-50 to-white px-8 pt-10 pb-6 text-center border-b border-slate-100">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-3xl shadow-lg mb-6 border border-slate-100">
                <img src="/icon.webp" alt="絆太郎" className="w-12 h-12 object-contain" />
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                絆太郎へようこそ！
              </h2>
              <p className="text-slate-500 font-medium mt-3 leading-relaxed">
                セミナー運営をもっと楽しく、もっと「絆」が深まるものに。
              </p>
            </div>

            <div className="px-8 md:px-10 py-8">

              {/* 絆太郎でできること */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full border border-indigo-100">絆太郎でできること</span>
                </div>
                <div className="grid gap-3">
                  {[
                    { title: "プロ品質のイベントページ", desc: "テーマを選んで情報を入力するだけ。デザイナー不要で美しい告知ページが完成します。", bg: "bg-blue-50", color: "text-blue-600" },
                    { title: "申し込み・参加者管理", desc: "フォーム作成からリアルタイムの参加者リスト、キャンセル管理まで一元化。Excelでの手作業から解放されます。", bg: "bg-violet-50", color: "text-violet-600" },
                    { title: "QRコードでスマート受付", desc: "当日はQRコードを表示するだけ。参加者がスマホで読み取って、スムーズにチェックイン。", bg: "bg-indigo-50", color: "text-indigo-600" },
                    { title: "メール配信・ファン作り", desc: "リマインド・お礼・ニュースレターを簡単送信。参加者との絆を深めてリピーターを増やします。", bg: "bg-emerald-50", color: "text-emerald-600" },
                  ].map((item, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-4 ${item.bg} rounded-xl`}>
                      <div className={`mt-0.5 p-1 rounded-full bg-white shadow-sm ${item.color} flex-shrink-0`}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* はじめの3ステップ */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full border border-slate-200">はじめの3ステップ</span>
                </div>
                <div className="grid gap-3">
                  {[
                    { step: "1", title: "イベントを作成する", desc: "左上の「新規イベント」から、タイトル・日時・場所を入力。5つのテーマから好みのデザインを選べます。", color: "text-blue-600", icon: <Plus size={15} strokeWidth={3}/> },
                    { step: "2", title: "当日はQRコードで受付", desc: "イベント一覧の「QR」ボタンを押すと受付用コードが表示されます。プロジェクターやタブレットに映すだけ。", color: "text-indigo-600", icon: <QrCode size={15} strokeWidth={3}/> },
                    { step: "3", title: "参加者にお礼メールを送る", desc: "イベントをクリック →「参加者リスト」→ テンプレートを選んで一斉送信。次回の案内も一緒に送れます。", color: "text-emerald-600", icon: <Mail size={15} strokeWidth={3}/> },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                      <div className={`mt-0.5 w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xs font-black">{item.step}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 開始ボタン */}
              <button
                onClick={closeWelcomeModal}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 group text-lg"
              >
                さっそく始める
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <p className="mt-4 text-slate-400 text-[11px] font-medium text-center">
                ※ この案内は右上の「Information」からいつでも確認できます
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
      
      {/* ★ タイトルを修正：両方のプラン名を並べるぞい！ */}
      <h3 className="text-2xl font-black text-slate-900 mb-4">
        スタンダードプラン・スポット利用 限定機能
      </h3>
      
      {/* ★ 説明文もより丁寧に修正っぺ */}
      <p className="text-slate-600 font-bold mb-8 leading-relaxed">
        データ出力や分析機能は、<br />
        <span className="text-indigo-600">スタンダードプラン</span>のお客様、または<br />
        <span className="text-orange-600">スポット利用（単発決済）</span>のお客様専用です。
      </p>
      
      <div className="flex flex-col gap-3">
        <button 
          onClick={() => router.push("/dashboard")} 
          className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200"
        >
          プランを確認・お支払い
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