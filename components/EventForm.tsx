// 📂 components/EventForm.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Save, Calendar, MapPin, User, Video, Mail, Globe, AlignLeft, Layout, Image as ImageIcon, Upload, X, Lock, Plus, Trash2, ListChecks, GripVertical, Briefcase, MessageSquare, ArrowUp, ArrowDown,Palette, 
  CheckCircle, Building2, Smile, Sparkles, RefreshCcw } from "lucide-react";
import { fetchTenantData, type Tenant } from "../lib/tenants";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

type CustomField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox";
  optionsString: string;
  options?: string[];
  required: boolean;
};


type Props = {
  event?: any;
  onSuccess: () => void;
  isFreePlan?: boolean;
};

type TimeSlot = {
  start: string;
  end: string;
  label: string;
};

type Lecturer = {
  id: string;
  name: string;
  title: string;
  profile: string;
  image: string;
  suffix: string;
};

type Ticket = {
  id: string;
  name: string;
  price: number;
};

export default function EventForm({ event, onSuccess, isFreePlan= false }: Props) {
  const [loading, setLoading] = useState(false);
  const [uploadingLecturer, setUploadingLecturer] = useState(false);
  // ★追加: 今編集しているイベントのIDを管理する（新規作成後の連続保存対策）
  const [currentEventId, setCurrentEventId] = useState<string | null>(event?.id || null);
  // ★追加: アンケート用の質問箱を作る
  const [surveyFields, setSurveyFields] = useState<CustomField[]>(event?.surveyFields || []);
  const [uploadingOgp, setUploadingOgp] = useState(false);
  
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantData, setTenantData] = useState<Tenant | null>(null);
  const [userBranchLabel, setUserBranchLabel] = useState("");

  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { start: "14:00", end: "14:05", label: "開会挨拶" }
  ]);

  // ★変更点: 新規作成時はデフォルトで「会社名」「部署・役職」を入れておく
  const [customFields, setCustomFields] = useState<CustomField[]>([
    {
      id: "default_company", 
      label: "会社名",
      type: "text",
      optionsString: "",
      required: true, 
      options: []
    },
    {
      id: "default_dept",
      label: "部署・役職",
      type: "text",
      optionsString: "",
      required: false, 
      options: []
    }
  ]);

  const [formData, setFormData] = useState({
    tenantId: "",
    branchTag: "",
    organizer: "",

    title: "",
    date: "",
    startTime: "14:00",
    endTime: "16:00",
    openTime: "13:30",
    price: "無料",
    capacity: "50",
    status: "draft",
    
    venueName: "",
    venueAddress: "",
    venueAccess: "",
    
    lecturer: "",
    lecturerTitle: "",
    lecturerProfile: "",
    lecturerImage: "",
    content: "",
    
    hasOffline: true,
    hasOnline: false,

    zoomUrl: "",
    meetingId: "",
    zoomPasscode: "",
    zoomGuideUrl: "",
    
    ogpImage: "",

    theme: "dark",
    
    replyTemplateId: "default",
    adminTemplateId: "default",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    replyMessage: "",       // 自動返信メールの追加メッセージ
    preSurveyUrl: "",       // 事前アンケートURL
  });

  // キャンセルポリシー設定
  // キャンセルポリシー: [{days: N日前, rate: 返金率%}, ...] を日数の大きい順で管理
  const [cancelPolicy, setCancelPolicy] = useState<{days: number, rate: number}[]>([
    { days: 2, rate: 100 },
    { days: 1, rate: 50 },
  ]);

  // ★追加：複数講師の管理
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);

  // ★追加：複数チケット（価格）の管理
const [tickets, setTickets] = useState<Ticket[]>([
  { id: "default", name: "通常参加", price: 0 }
]);

// ★追加：チケット操作用の関数
const addTicket = () => {
  setTickets([...tickets, { id: Math.random().toString(36).substring(2), name: "", price: 0 }]);
};

const updateTicket = (index: number, field: keyof Ticket, value: any) => {
  const newTickets = [...tickets];
  newTickets[index] = { ...newTickets[index], [field]: value };
  setTickets(newTickets);
};

const removeTicket = (index: number) => {
  if (tickets.length <= 1) {
    alert("最低でも1つはチケット（価格）設定が必要だっぺ！");
    return;
  }
  if (confirm("このチケット設定を削除しますか？")) {
    setTickets(tickets.filter((_, i) => i !== index));
  }
};

  const addLecturer = () => {
  setLecturers([...lecturers, { 
    id: Math.random().toString(36), 
    name: "", 
    title: "", 
    profile: "", 
    image: "",
    suffix: "様" // 🏆 最初は「様」にしておくっぺ！
  }]);
};

  const updateLecturer = (index: number, field: keyof Lecturer, value: string) => {
    const newLecturers = [...lecturers];
    newLecturers[index] = { ...newLecturers[index], [field]: value };
    setLecturers(newLecturers);
  };

  const removeLecturer = (index: number) => {
    if (confirm("この講師情報を削除しますか？")) {
      setLecturers(lecturers.filter((_, i) => i !== index));
    }
  };

  const handleLecturerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fileId = Math.random().toString(36).substring(2);
      const storageRef = ref(storage, `uploads/lecturers/${fileId}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      updateLecturer(index, "image", downloadURL);
    } catch (error) {
      console.error(error); alert("画像のアップロードに失敗しました。");
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const email = user.email!.replace(/\s+/g, '').toLowerCase();
        const superEmail = SUPER_ADMIN_EMAIL.replace(/\s+/g, '').toLowerCase();
        
        let myTenantId = "demo";
        let myBranch = "本部";
        
        if (email === superEmail) {
          setIsSuperAdmin(true);
          myTenantId = "demo";
        } else {
          setIsSuperAdmin(false);
          const userDoc = await getDoc(doc(db, "admin_users", user.email!));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            myTenantId = userData.tenantId || "demo";
            myBranch = userData.branchId || "本部";
          }
        }
        
        setUserBranchLabel(myBranch);
        const tData = await fetchTenantData(myTenantId);
        if (tData) {
          setTenantData(tData);
          if (!event) {
            setFormData(prev => ({
              ...prev,
              tenantId: tData.id,
              branchTag: myBranch,
              organizer: `${tData.name} ${myBranch}`
            }));
          }
        }
      }
    });
    return () => unsubscribe();
  }, [event]);

useEffect(() => {
    if (event) {
      setFormData({
        tenantId: event.tenantId || "demo",
        branchTag: event.branchTag || "本部",
        organizer: event.organizer || "",
        title: event.title || "",
        date: event.date || "",
        startTime: event.startTime || "14:00",
        endTime: event.endTime || "16:00",
        openTime: event.openTime || "13:30",
        price: event.price || "無料",
        capacity: event.capacity || "50",
        status: event.status || "draft",
        venueName: event.venueName || event.location || "",
        venueAddress: event.venueAddress || "",
        venueAccess: event.venueAccess || "",
        lecturer: event.lecturer || "",
        lecturerTitle: event.lecturerTitle || "",
        lecturerProfile: event.lecturerProfile || "",
        lecturerImage: event.lecturerImage || "",
        content: event.content || "",
        
        hasOffline: event.hasOffline ?? true,
        hasOnline: event.hasOnline ?? false,
        zoomUrl: event.zoomUrl || "",
        meetingId: event.meetingId || "",
        zoomPasscode: event.zoomPasscode || "",
        zoomGuideUrl: event.zoomGuideUrl || "",
        ogpImage: event.ogpImage || "",
        theme: event.theme || "dark",
        replyTemplateId: event.replyTemplateId || "default",
        adminTemplateId: event.adminTemplateId || "default",
        // 👇 ここに3つ追加（既存データがあれば読み込む）
        contactName: event.contactName || "",
        contactEmail: event.contactEmail || "",
        contactPhone: event.contactPhone || "",
        replyMessage: event.replyMessage || "",
        preSurveyUrl: event.preSurveyUrl || "",
      });
      // ★追加：講師リストの読み込み
      if (event.lecturers && Array.isArray(event.lecturers)) {
        setLecturers(event.lecturers);
      } else if (event.lecturer) {
        // 古いデータがある場合は、それを1人目の講師としてリストに入れる
        setLecturers([{
          id: "legacy",
          name: event.lecturer,
          title: event.lecturerTitle || "",
          profile: event.lecturerProfile || "",
          image: event.lecturerImage || "",
          suffix: "様"
        }]);
      }

      // キャンセルポリシーの読み込み
      if (event.cancelPolicy) {
        if (Array.isArray(event.cancelPolicy)) {
          // 新形式: 配列
          setCancelPolicy(event.cancelPolicy);
        } else {
          // 旧形式: { fullRefundDays, halfRefundDays } → 配列に変換
          setCancelPolicy([
            { days: event.cancelPolicy.fullRefundDays ?? 2, rate: 100 },
            { days: event.cancelPolicy.halfRefundDays ?? 1, rate: 50 },
          ]);
        }
      }

      if (event.tickets && Array.isArray(event.tickets)) {
  setTickets(event.tickets);
} else if (event.price) {
  // 古いデータ（単一価格）がある場合は、それを1つ目のチケットとして読み込むっぺ
  const legacyPrice = event.price === "無料" ? 0 : parseInt(event.price) || 0;
  setTickets([{ id: "legacy", name: "通常参加", price: legacyPrice }]);
}

      if (event.timeTable) {
        const lines = event.timeTable.split('\n');
        const parsedSlots: TimeSlot[] = [];
        lines.forEach((line: string) => {
           const match = line.match(/^(\d{1,2}:\d{2})\s*[-〜]\s*(\d{1,2}:\d{2})\s*[:：]\s*(.+)$/);
           if (match) {
             parsedSlots.push({ start: match[1], end: match[2], label: match[3] });
           }
        });
        if (parsedSlots.length > 0) setTimeSlots(parsedSlots);
      }

      // ▼▼▼ ここから下を修正・追加しました ▼▼▼

      // 1. 申し込みフォーム (customFields) の読み込み
      if (event.customFields && Array.isArray(event.customFields) && event.customFields.length > 0) {
        setCustomFields(event.customFields.map((f: any) => ({
          ...f,
          // IDが不正（全角文字や記号を含む）場合は安全なIDに置き換え
          id: /^[a-zA-Z0-9_-]+$/.test(f.id) ? f.id : Math.random().toString(36).substring(2, 9),
          optionsString: f.options ? f.options.join("\n") : ""
        })));
      } else if (event.id) {
        setCustomFields([]);
      }

      // 2. アンケート (surveyFields) の読み込み
      // ★追加: これがないと保存したアンケートが表示されません
      if (event.surveyFields && Array.isArray(event.surveyFields) && event.surveyFields.length > 0) {
        setSurveyFields(event.surveyFields.map((f: any) => ({
          ...f,
          id: /^[a-zA-Z0-9_-]+$/.test(f.id) ? f.id : Math.random().toString(36).substring(2, 9),
          optionsString: f.options ? f.options.join("\n") : ""
        })));
      }
      // ▲▲▲ 修正ここまで ▲▲▲

    }
  }, [event]);

  const handleTimeSlotChange = (index: number, field: keyof TimeSlot, value: string) => {
    const newSlots = [...timeSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setTimeSlots(newSlots);
  };
  const addTimeSlot = () => {
    const lastSlot = timeSlots[timeSlots.length - 1];
    const newStart = lastSlot ? lastSlot.end : "14:00";
    setTimeSlots([...timeSlots, { start: newStart, end: "", label: "" }]);
  };
  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const addCustomField = () => {
    const newField: CustomField = {
      id: Math.random().toString(36).substring(2, 9),
      label: "",
      type: "text",
      optionsString: "",
      required: false
    };
    setCustomFields([...customFields, newField]);
  };
  
   // ★追加: 質問の順番を入れ替える関数
   const moveCustomField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...customFields];
    
    if (direction === 'up') {
      if (index === 0) return; // 一番上なら何もしない
      // ひとつ前の要素と入れ替え
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else {
      if (index === newFields.length - 1) return; // 一番下なら何もしない
      // ひとつ後の要素と入れ替え
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    
    setCustomFields(newFields);
  };

  const moveTimeSlot = (index: number, direction: 'up' | 'down') => {
  const newSlots = [...timeSlots];
  
  if (direction === 'up') {
    if (index === 0) return; // 一番上なら何もしない
    [newSlots[index], newSlots[index - 1]] = [newSlots[index - 1], newSlots[index]];
  } else {
    if (index === timeSlots.length - 1) return; // 一番下なら何もしない
    [newSlots[index], newSlots[index + 1]] = [newSlots[index + 1], newSlots[index]];
  }
  
  setTimeSlots(newSlots);
};

  const moveSurveyField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...surveyFields];
    if (direction === 'up') {
      if (index === 0) return; // 一番上なら何もしない
      [newFields[index], newFields[index - 1]] = [newFields[index - 1], newFields[index]];
    } else {
      if (index === newFields.length - 1) return; // 一番下なら何もしない
      [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    }
    setSurveyFields(newFields);
  };
  const updateCustomField = (index: number, field: keyof CustomField, value: any) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], [field]: value };
    setCustomFields(updated);
  };

  const removeCustomField = (index: number) => {
    if (confirm("この質問を削除してもよろしいですか？")) {
      setCustomFields(customFields.filter((_, i) => i !== index));
    }
  };

  // ★ここを追加：ビジネス用セットボタンの機能
  const addBusinessFields = () => {
    if(!confirm("「会社名」と「部署・役職」を追加しますか？")) return;
    const newFields: CustomField[] = [
      { id: Math.random().toString(36), label: "会社名", type: "text", optionsString: "", required: true },
      { id: Math.random().toString(36), label: "部署・役職", type: "text", optionsString: "", required: false }
    ];
    setCustomFields([...customFields, ...newFields]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedBranchName = e.target.value;
    const tenantName = tenantData?.name || "組織名未設定";
    const newOrganizer = `${tenantName} ${selectedBranchName}`;
    setFormData(prev => ({ ...prev, branchTag: selectedBranchName, organizer: newOrganizer }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'lecturerImage' | 'ogpImage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (field === 'lecturerImage') setUploadingLecturer(true);
    else setUploadingOgp(true);

    try {
      const fileId = Math.random().toString(36).substring(2);
      const storagePath = `uploads/${fileId}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, [field]: downloadURL }));
    } catch (error) {
      console.error("Upload failed:", error);
      alert("画像のアップロードに失敗しました。");
    } finally {
      if (field === 'lecturerImage') setUploadingLecturer(false);
      else setUploadingOgp(false);
    }
  };

  const handleRemoveImage = (field: 'lecturerImage' | 'ogpImage') => {
    setFormData(prev => ({ ...prev, [field]: "" }));
  };

// 📂 components/EventForm.tsx の handleSubmit を書き換え

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.tenantId || formData.tenantId === "demo") {
    alert("組織情報の読み込みに失敗しました。画面を更新してもう一度お試しください。");
    return;
  }
    setLoading(true);

    try {
      const formattedTimeTable = timeSlots
        .filter(slot => slot.start && slot.label)
        .map(slot => `${slot.start} - ${slot.end || "未定"} : ${slot.label}`)
        .join("\n");

      // カスタムフィールドの整形
      const formattedCustomFields = customFields.map(f => {
        let options: string[] = [];
        if (f.type === "select" || f.type === "checkbox") {
           options = f.optionsString.split(/\n|,|、/).map(s => s.trim()).filter(s => s !== "");
        }
        return {
           id: f.id,
           label: f.label,
           type: f.type,
           required: f.required,
           options: options
        };
      }).filter(f => f.label !== "");

      // アンケートフィールドの整形
      const formattedSurveyFields = surveyFields.map(f => {
        let options: string[] = [];
        if (f.type === "select" || f.type === "checkbox") {
           options = f.optionsString.split(/\n|,|、/).map(s => s.trim()).filter(s => s !== "");
        }
        return {
           id: f.id,
           label: f.label,
           type: f.type,
           required: f.required,
           options: options
        };
      }).filter(f => f.label !== "");

      // 👇 この3行を挿入してください（これで formatFields が使えるようになります）
      const formatFields = (fields: CustomField[]) => fields.map(f => ({
        ...f, options: (f.type==="select"||f.type==="checkbox") ? f.optionsString.split(/\n|,|、/).map(s=>s.trim()).filter(s=>s!=="") : []
      })).filter(f => f.label !== "");

      const savePayload = {
        ...formData,
        timeTable: formattedTimeTable,
        customFields: formatFields(customFields),
        surveyFields: formatFields(surveyFields),
        time: `${formData.startTime} - ${formData.endTime}`,
        location: formData.venueName,
        updatedAt: new Date(),
        branchTag: formData.branchTag || "本部",
        tickets: tickets,
        cancelPolicy: cancelPolicy,
        price: tickets[0]?.price === 0 ? "無料" : tickets[0]?.price.toString(),
        
        // ★追加：講師リストを保存
        lecturers: lecturers,
        // 互換性のため、1人目のデータを古いフィールドにも入れておく
        lecturer: lecturers[0]?.name || "",
        lecturerSuffix: lecturers[0]?.suffix !== undefined ? lecturers[0].suffix : "様",
        lecturerTitle: lecturers[0]?.title || "",
        lecturerProfile: lecturers[0]?.profile || "",
        lecturerImage: lecturers[0]?.image || "",
      };

      // ★修正: currentEventId を見て判定する
      if (currentEventId) {
        // 更新 (Update)
        await updateDoc(doc(db, "events", currentEventId), savePayload);
        alert("更新しました！"); // 画面は閉じずにアラートだけ出す
      } else {
        // 新規作成 (Create)
        const newEvent = {
          ...savePayload,
          createdAt: new Date(),
          slug: Math.random().toString(36).substring(2, 8),
          views: 0
        };
        const docRef = await addDoc(collection(db, "events"), newEvent);
        
        // ★重要: 新規作成したら、そのIDをセットして「編集モード」に切り替える
        setCurrentEventId(docRef.id);
        
        alert("イベントを作成しました！続けて編集できます。"); 
      }
      
      // onSuccess(); // 👈 これを削除したので、画面が勝手に閉じなくなります！

    } catch (error) {
      console.error("保存エラー:", error);
      alert("保存に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  const safeBranches = Array.isArray(tenantData?.branches) 
    ? tenantData.branches.flatMap((b: any) => {
        if (typeof b === 'string') return b;
        if (b && typeof b === 'object' && Array.isArray(b.branches)) return b.branches;
        return [];
      })
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 text-slate-300 pb-4">
      <style dangerouslySetInnerHTML={{__html: `
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
            filter: invert(1) brightness(1.5);
            cursor: pointer;
            transition: filter 0.3s;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="time"]::-webkit-calendar-picker-indicator:hover {
            filter: invert(1) drop-shadow(0 0 4px #22d3ee);
        }
      `}} />

      {/* 0. 支部設定・ステータス（修正版） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/50 p-5 rounded-xl border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          
          {/* ▼▼▼ 修正: ラベルを「主催名」に変更 ▼▼▼ */}
          <label className="block text-xs text-indigo-400 font-bold mb-2 flex items-center gap-2">
            <Globe size={14}/> 主催名 
            <span className="text-white">
              {/* ▼▼▼ 修正: orgName(MBS)があればそれを優先表示、なければnameを表示 ▼▼▼ */}
              {tenantData ? (
                // @ts-ignore (型定義にorgNameがない場合の回避策)
                `(${tenantData.orgName || tenantData.name})`
              ) : (
                <span className="animate-pulse opacity-50">(読み込み中...)</span>
              )}
            </span>
            {!isSuperAdmin && <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 flex items-center gap-1"><Lock size={10}/> 固定</span>}
          </label>

          <div className="flex flex-col md:flex-row gap-4">
            <select 
              name="branchTag" 
              value={formData.branchTag} 
              onChange={handleBranchChange} 
              disabled={!isSuperAdmin} 
              className={`bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none font-bold flex-1 ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* ▼▼▼ 修正: 選択肢の表示もMBS優先に変更 ▼▼▼ */}
              <option value={tenantData?.name || "-"}>
                {/* @ts-ignore */}
                {(tenantData?.orgName || tenantData?.name) || "-"}
              </option>
              
              {safeBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {/* ▼▼▼ 修正: 「本部」なら会社名(orgName)を表示する ▼▼▼ */}
                  {branch === "本部" 
                    // @ts-ignore (型定義エラー回避)
                    ? (tenantData?.orgName || tenantData?.name || branch) 
                    : branch}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* 右側のステータス選択はそのまま */}
        <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
           <label className="block text-xs text-slate-400 font-bold mb-2">公開ステータス</label>
           <select name="status" value={formData.status} onChange={handleChange} className={`w-full border border-slate-700 rounded-lg p-3 font-bold outline-none cursor-pointer transition-colors ${formData.status === 'published' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'bg-slate-950 text-slate-400'}`}>
             <option value="draft">下書き (準備中)</option>
             <option value="published">🚀 公開する</option>
           </select>
        </div>
      </div>

      {/* 1. 基本情報 (ここから) */}
<div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
  <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg">
    <Calendar size={20} className="text-indigo-400"/> 基本情報
  </h3>
  <div className="space-y-6">
    {/* イベント名 */}
    <div>
      <label className="block text-xs text-slate-500 mb-2">イベント名 <span className="text-red-500">*</span></label>
      <input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-lg text-white focus:border-indigo-500 outline-none" placeholder="例: 定例セミナー"/>
    </div>

    {/* 日時設定 */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div>
  <label className="block text-xs text-slate-500 mb-2 flex justify-between items-center">
    <span>開催日 <span className="text-red-500">*</span></span>
    
    {/* ★ 追加：スポット決済済みの場合に「ロック中」の警告を出すっぺ！ */}
    {event?.isSpotPaid && (
      <span className="text-[10px] text-amber-500 flex items-center gap-1 font-bold animate-pulse">
        <Lock size={10} /> スポット決済済みのため日付固定
      </span>
    )}
  </label>
  
  <input 
    required 
    type="date" 
    name="date" 
    value={formData.date} 
    onChange={handleChange} 
    
    // ★ 条件をシンプルにするっぺ！「支払い済み（isSpotPaid）」なら、下書きだろうが何だろうが編集不可！
    disabled={event?.isSpotPaid}
    
    // 見た目も「触れない感」を出すために opacity（透明度）を下げるっぺ
    className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none transition-all ${
      (event?.isSpotPaid && formData.status === 'published') 
        ? 'opacity-50 cursor-not-allowed bg-slate-900' 
        : ''
    }`} 
  />
</div>
      <div className="grid grid-cols-2 gap-2 md:col-span-2">
        <div><label className="block text-xs text-slate-500 mb-2">開始</label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
        <div><label className="block text-xs text-slate-500 mb-2">終了</label><input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
      </div>
      <div><label className="block text-xs text-slate-500 mb-2">受付開始</label><input type="time" name="openTime" value={formData.openTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
    </div>

    {/* 定員と参加費の横並び */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <label className="block text-xs text-slate-500 mb-2">定員</label>
        <input type="text" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
      </div>

      <div className="md:col-span-2"> {/* 横幅を広く使うために調整だっぺ */}
  <label className="block text-xs text-slate-500 mb-4 font-bold flex items-center gap-2">
    <CheckCircle size={14} className="text-indigo-400"/> チケット・参加費設定（複数設定可能）
  </label>
  
  <div className="space-y-3">
    {tickets.map((ticket, index) => (
      <div key={ticket.id} className="flex flex-col md:flex-row gap-3 bg-slate-950 p-4 rounded-xl border border-slate-700/50 animate-in fade-in slide-in-from-left-2 group">
        {/* チケット名入力 */}
        <div className="flex-1">
          <label className="text-[10px] text-slate-500 block mb-1">チケット名称</label>
          <input 
            type="text" 
            value={ticket.name} 
            onChange={(e) => updateTicket(index, "name", e.target.value)} 
            placeholder="例：第1部のみ参加 / 懇親会セット など" 
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-indigo-500 outline-none" 
          />
        </div>

        {/* 金額入力 */}
        <div className="w-full md:w-48">
          <label className="text-[10px] text-slate-500 block mb-1">金額 (0円で無料表示)</label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-slate-500 text-xs font-mono">¥</span>
            <input 
              type="number" 
              value={ticket.price} 
              onChange={(e) => updateTicket(index, "price", parseInt(e.target.value) || 0)} 
              className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 pl-7 pr-10 text-white text-sm focus:border-indigo-500 outline-none font-mono font-bold" 
            />
            <span className="absolute right-3 text-[10px] text-slate-500">円</span>
          </div>
        </div>

        {/* 削除ボタン */}
        <div className="flex items-end pb-1.5">
          <button 
            type="button" 
            onClick={() => removeTicket(index)} 
            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="削除"
          >
            <Trash2 size={20}/>
          </button>
        </div>
      </div>
    ))}
    
    {/* 追加ボタン */}
    <button 
      type="button" 
      onClick={addTicket} 
      className="w-full py-3 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-900/10 rounded-xl text-slate-500 hover:text-indigo-400 text-sm font-bold flex items-center justify-center gap-2 transition-all group"
    >
      <Plus size={18} className="group-hover:scale-110 transition-transform"/> 
      チケット種別（価格）を追加する
    </button>
  </div>
</div>

{/* キャンセルポリシー設定 */}
{tickets.some(t => t.price > 0) && (
<div className="mt-6">
  <label className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
    <RefreshCcw size={14} className="text-indigo-400"/> キャンセル・返金ポリシー
  </label>
  <div className="bg-slate-950 p-4 rounded-xl border border-slate-700/50 space-y-3">
    {cancelPolicy.map((tier, idx) => (
      <div key={idx} className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">開催日の</span>
        <input
          type="number" min="0" max="60"
          value={tier.days}
          onChange={(e) => {
            const updated = [...cancelPolicy];
            updated[idx] = { ...tier, days: parseInt(e.target.value) || 0 };
            setCancelPolicy(updated);
          }}
          className="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:border-indigo-500 outline-none font-mono font-bold"
        />
        <span className="text-xs text-slate-400">日前まで</span>
        <input
          type="number" min="0" max="100"
          value={tier.rate}
          onChange={(e) => {
            const updated = [...cancelPolicy];
            updated[idx] = { ...tier, rate: parseInt(e.target.value) || 0 };
            setCancelPolicy(updated);
          }}
          className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:border-indigo-500 outline-none font-mono font-bold"
        />
        <span className="text-xs text-slate-400">% 返金</span>
        {cancelPolicy.length > 1 && (
          <button type="button" onClick={() => setCancelPolicy(cancelPolicy.filter((_, i) => i !== idx))}
            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
            <Trash2 size={14}/>
          </button>
        )}
      </div>
    ))}
    <button type="button"
      onClick={() => setCancelPolicy([...cancelPolicy, { days: 0, rate: 0 }])}
      className="w-full py-2 border border-dashed border-slate-800 hover:border-indigo-500/50 rounded-lg text-slate-500 hover:text-indigo-400 text-xs font-bold flex items-center justify-center gap-1 transition-all">
      <Plus size={14}/> 段階を追加
    </button>
    <div className="bg-slate-900/50 rounded-lg p-3 text-[11px] text-slate-400 leading-relaxed">
      <p className="font-bold text-slate-300 mb-1">適用される返金ルール：</p>
      {[...cancelPolicy].sort((a, b) => b.days - a.days).map((tier, idx) => (
        <p key={idx}>・開催日の <strong className="text-indigo-400">{tier.days}日前</strong> まで → <strong className={tier.rate >= 80 ? "text-emerald-400" : tier.rate >= 30 ? "text-yellow-400" : "text-red-400"}>{tier.rate}% 返金</strong></p>
      ))}
      <p>・それ以降（当日含む）→ <strong className="text-red-400">返金なし（0%）</strong></p>
    </div>
  </div>
</div>
)}

    </div>
  </div>
</div>
{/* 1. 基本情報 (ここまで) */}

{/* 2. お問い合わせ先設定 (独立した新しいセクションとして配置) */}
<div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800 mt-6">
  <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg">
    <User size={20} className="text-indigo-400"/> お問い合わせ先設定
  </h3>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
    <div className="space-y-2">
      <label className="block text-xs text-slate-500 font-bold">担当者・事務局名</label>
      <input type="text" name="contactName" value={formData.contactName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none" placeholder="例：事務局 塙" />
    </div>
    <div className="space-y-2">
      <label className="block text-xs text-slate-500 font-bold">問い合わせメール</label>
      <input type="email" name="contactEmail" value={formData.contactEmail} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none" placeholder="info@example.com" />
    </div>
    <div className="space-y-2 md:col-span-1">
      <label className="block text-xs text-slate-500 font-bold">問い合わせ電話番号</label>
      <input type="tel" name="contactPhone" value={formData.contactPhone} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none" placeholder="024-xxx-xxxx" />
    </div>
  </div>
  <p className="text-[10px] text-slate-500 mt-4 border-t border-slate-800 pt-4">
    ※ここに入力した情報は、イベントページおよび自動返信メールの署名に反映されます。
  </p>
</div>

{/* 3. 自動返信メール・事前アンケート設定 */}
<div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800 mt-6">
  <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg">
    <Mail size={20} className="text-cyan-400"/> 自動返信メール設定
  </h3>
  <div className="space-y-6">
    <div className="space-y-2">
      <label className="block text-xs text-slate-500 font-bold">自動返信メールへの追加メッセージ</label>
      <textarea
        name="replyMessage"
        value={formData.replyMessage}
        onChange={handleChange}
        rows={4}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none resize-none text-sm"
        placeholder="例：当日は筆記用具をお持ちください。&#10;駐車場は第2駐車場をご利用ください。"
      />
      <p className="text-[10px] text-slate-500">申込完了メールの中に、この文章が追加されます。空欄の場合は表示されません。</p>
    </div>

    <div className="space-y-2">
      <label className="block text-xs text-slate-500 font-bold">事前アンケートURL（任意）</label>
      <input
        type="url"
        name="preSurveyUrl"
        value={formData.preSurveyUrl}
        onChange={handleChange}
        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white focus:border-indigo-500 outline-none text-sm"
        placeholder="https://forms.google.com/... など"
      />
      <p className="text-[10px] text-slate-500">入力すると、申込完了メールに事前アンケートへのリンクが追加されます。Googleフォーム等のURLを貼り付けてください。</p>
    </div>
  </div>
</div>

      {/* ★★★ デザインテーマ設定 (3パターン) ★★★ */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg">
          <Palette size={20} className="text-pink-400"/> デザインテーマ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Dark (Tech) */}
          <label className={`
            cursor-pointer relative rounded-xl border-2 p-4 transition-all flex flex-col gap-3
            ${formData.theme === 'dark' 
              ? 'bg-slate-900 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' 
              : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }
          `}>
            <input type="radio" name="theme" value="dark" checked={formData.theme === 'dark'} onChange={handleChange} className="hidden" />
            <div className="w-full h-20 bg-slate-900 border border-slate-700 rounded-lg flex flex-col gap-1 p-2 shadow-inner">
               <div className="w-full h-1.5 bg-slate-700 rounded-full mb-1"></div>
               <div className="w-2/3 h-1.5 bg-slate-700 rounded-full"></div>
               <div className="mt-auto w-full h-6 bg-indigo-900/50 rounded flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
               </div>
            </div>
            <div>
               <div className="font-bold text-white text-sm">Tech (Dark)</div>
               <div className="text-[10px] text-slate-500 mt-0.5">ハッカソン・勉強会向け</div>
            </div>
            {formData.theme === 'dark' && <div className="absolute top-2 right-2 text-indigo-500"><CheckCircle size={16}/></div>}
          </label>

          {/* 2. Corporate (Business/Light) */}
          <label className={`
            cursor-pointer relative rounded-xl border-2 p-4 transition-all flex flex-col gap-3
            ${formData.theme === 'corporate' 
              ? 'bg-slate-100 border-indigo-500 shadow-[0_0_15px_rgba(255,255,255,0.2)]' 
              : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }
          `}>
            <input type="radio" name="theme" value="corporate" checked={formData.theme === 'corporate'} onChange={handleChange} className="hidden" />
            <div className="w-full h-20 bg-white border border-slate-200 rounded-lg flex flex-col gap-1 p-2 shadow-inner relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-slate-200"></div>
               <div className="w-full h-1.5 bg-slate-200 rounded-full mb-1 mt-2"></div>
               <div className="w-2/3 h-1.5 bg-slate-200 rounded-full"></div>
               <div className="mt-auto w-full h-6 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase tracking-widest">
                  Entry
               </div>
            </div>
            <div>
               <div className={`font-bold text-sm ${formData.theme === 'corporate' ? 'text-slate-900' : 'text-slate-300'}`}>Corporate (White)</div>
               <div className="text-[10px] text-slate-500 mt-0.5">セミナー・企業向け</div>
            </div>
            {formData.theme === 'corporate' && <div className="absolute top-2 right-2 text-indigo-500"><CheckCircle size={16}/></div>}
          </label>

          {/* 3. Pop (Friendly) ※準備中 */}
          <label className={`
            cursor-pointer relative rounded-xl border-2 p-4 transition-all flex flex-col gap-3
            ${formData.theme === 'pop' 
              ? 'bg-orange-50 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
              : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }
          `}>
            <input type="radio" name="theme" value="pop" checked={formData.theme === 'pop'} onChange={handleChange} className="hidden" />
            <div className="w-full h-20 bg-orange-100 border-2 border-orange-200 rounded-lg flex flex-col gap-1 p-2 shadow-inner border-dashed relative">
               <div className="w-full h-1.5 bg-orange-300 rounded-full mb-1"></div>
               <div className="w-2/3 h-1.5 bg-orange-300 rounded-full"></div>
               <div className="absolute bottom-2 right-2"><Smile size={16} className="text-orange-400"/></div>
            </div>
            <div>
               <div className={`font-bold text-sm ${formData.theme === 'pop' ? 'text-orange-900' : 'text-slate-300'}`}>Pop (Friendly)</div>
               <div className="text-[10px] text-slate-500 mt-0.5">地域イベント・祭り向け</div>
            </div>
            {formData.theme === 'pop' && <div className="absolute top-2 right-2 text-orange-500"><CheckCircle size={16}/></div>}
          </label>


          {/* 4. Mimosa (New!) */}
          <label className={`
            cursor-pointer relative rounded-xl border-2 p-4 transition-all flex flex-col gap-3
            ${formData.theme === 'mimosa' 
              ? 'bg-[#141814] border-[#FFE000] shadow-[0_0_15px_rgba(255,224,0,0.3)]' 
              : 'bg-slate-950 border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-600'
            }
          `}>
            <input type="radio" name="theme" value="mimosa" checked={formData.theme === 'mimosa'} onChange={handleChange} className="hidden" />
            <div className="w-full h-20 bg-[#141814] border border-[#FFE000]/30 rounded-lg flex flex-col gap-1 p-2 shadow-inner relative overflow-hidden">
               <div className="w-full h-1.5 bg-yellow-500/20 rounded-full mb-1"></div>
               <div className="w-2/3 h-1.5 bg-yellow-500/20 rounded-full"></div>
               {/* ミモザの花をイメージした点々 */}
               <div className="absolute top-2 right-2 flex gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFE000]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FFE000] translate-y-1"></div>
               </div>
               <div className="mt-auto w-full h-6 bg-[#FFE000]/10 rounded flex items-center justify-center">
                 <div className="w-2 h-2 rounded-full bg-[#FFE000]"></div>
               </div>
            </div>
            <div>
               <div className="font-bold text-[#FFE000] text-sm">Mimosa (Yellow)</div>
               <div className="text-[10px] text-slate-500 mt-0.5">春の温かさと知的なデザイン</div>
            </div>
            {formData.theme === 'mimosa' && <div className="absolute top-2 right-2 text-[#FFE000]"><CheckCircle size={16}/></div>}
          </label>

          {/* ★カメレオン（おまかせ配色）を追加 */}
  <label className={`
    cursor-pointer relative rounded-xl border-2 p-4 transition-all flex flex-col gap-3
    ${formData.theme === 'chameleon' 
      ? 'bg-white border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
      : 'bg-slate-50 border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300'
    }
  `}>
    <input type="radio" name="theme" value="chameleon" checked={formData.theme === 'chameleon'} onChange={handleChange} className="hidden" />
    <div className="w-full h-16 bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 rounded-lg flex items-center justify-center shadow-inner overflow-hidden">
       {/* 虹色のグラデーションで「おまかせ感」を演出 */}
       <Sparkles className="text-white/80 animate-pulse" size={24}/>
    </div>
    <div className="text-center">
       <div className="font-bold text-slate-800 text-[10px] md:text-xs">Chameleon</div>
       <div className="text-[8px] text-slate-400 mt-0.5 whitespace-nowrap">画像から自動配色</div>
    </div>
  </label>

        </div>
      </div>

      {/* 2. 会場 */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><MapPin size={20} className="text-orange-400"/> 会場・アクセス</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div><label className="block text-xs text-slate-500 mb-2">会場名</label><input type="text" name="venueName" value={formData.venueName} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
            <div><label className="block text-xs text-slate-500 mb-2">住所</label><input type="text" name="venueAddress" value={formData.venueAddress} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
          </div>
          <div><label className="block text-xs text-slate-500 mb-2">アクセス</label><textarea name="venueAccess" value={formData.venueAccess} onChange={handleChange} rows={5} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white resize-none" /></div>
        </div>
      </div>

      {/* 3. 講師・内容（複数対応版） */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><User size={20} className="text-pink-400"/> 講師・登壇者設定</h3>
        
        {/* ▼▼▼ ここから：講師リスト（何人でも追加可能） ▼▼▼ */}
        <div className="space-y-6 mb-6">
          {lecturers.length === 0 && <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg text-slate-500 text-sm">講師情報が登録されていません</div>}
          
          {lecturers.map((lec, index) => (
            <div key={index} className="bg-slate-950 border border-slate-700 rounded-xl p-4 md:p-6 relative group">
              {/* 削除ボタン */}
              <div className="absolute top-4 right-4 flex gap-2">
                 <button type="button" onClick={() => removeLecturer(index)} className="p-2 bg-slate-900 hover:bg-red-900/50 text-slate-500 hover:text-red-400 rounded-lg transition-colors"><Trash2 size={16}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* 左側：講師写真 */}
                <div className="md:col-span-3 lg:col-span-2">
                   <div className="w-full aspect-[3/4] bg-slate-900 rounded-lg border border-slate-800 overflow-hidden relative flex items-center justify-center group/img">
                      {lec.image ? <img src={lec.image} alt={lec.name} className="w-full h-full object-cover"/> : <User className="text-slate-700" size={32}/>}
                      <label className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                         <span className="text-xs text-white font-bold flex items-center gap-1"><Upload size={12}/> 変更</span>
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLecturerImageUpload(e, index)} />
                      </label>
                   </div>
                </div>
                
                {/* 右側：入力欄 */}
<div className="md:col-span-9 lg:col-span-10 space-y-4">
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-10">
     <div>
        <label className="text-[10px] text-slate-500 block mb-1">氏名</label>
        {/* 🏆 ここを横並び（flex）にして、敬称を選べるようにしたぞい！ */}
        <div className="flex gap-2">
           <input 
              type="text" 
              value={lec.name} 
              onChange={(e) => updateLecturer(index, "name", e.target.value)} 
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-pink-500" 
              placeholder="氏名"
           />
           <select 
              value={lec.suffix}
              onChange={(e) => updateLecturer(index, "suffix", e.target.value)}
              className="w-20 bg-slate-900 border border-slate-700 rounded px-1 py-2 text-white text-xs outline-none focus:border-pink-500 cursor-pointer"
           >
              <option value="様">様</option>
              <option value="氏">氏</option>
              <option value="先生">先生</option>
              <option value="">(なし)</option>
           </select>
        </div>
     </div>
     <div>
                        <label className="text-[10px] text-slate-500 block mb-1">肩書</label>
                        <input type="text" value={lec.title} onChange={(e) => updateLecturer(index, "title", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" placeholder="役職など"/>
                     </div>
                   </div>
                   <div>
                      <label className="text-[10px] text-slate-500 block mb-1">プロフィール</label>
                      <textarea value={lec.profile} onChange={(e) => updateLecturer(index, "profile", e.target.value)} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm" placeholder="経歴など"/>
                   </div>
                </div>
              </div>
            </div>
          ))}
          
          <button type="button" onClick={addLecturer} className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-pink-500/50 hover:bg-pink-900/10 rounded-xl text-slate-400 hover:text-pink-400 font-bold flex items-center justify-center gap-2 transition-all">
             <Plus size={16}/> 登壇者を追加する
          </button>
        </div>
        {/* ▲▲▲ ここまで：講師リスト ▲▲▲ */}


       {/* 🎯 運命の修正：md:grid-cols-2 を完全に廃止して、上下に配置するぞい！ */}
        <div className="flex flex-col gap-8 pt-8 border-t border-slate-800">
          
          {/* A. イベント概要（横幅 100% で広々と！） */}
          <div className="w-full">
            <label className="block text-sm text-slate-400 font-bold mb-3 flex items-center gap-2">
              <AlignLeft size={18} className="text-indigo-400"/> イベント概要 (HTML対応)
            </label>
            <textarea 
              name="content" 
              value={formData.content} 
              onChange={handleChange} 
              rows={6} 
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-sans text-base leading-relaxed focus:border-indigo-500 outline-none shadow-inner" 
              placeholder="イベントの詳細情報を入力してください..."
            />
          </div>
          
          {/* B. タイムテーブル（概要の下に配置。横幅をフルに使ってボタンを救出！） */}
          <div className="w-full bg-slate-950 rounded-xl border border-slate-800 p-4 md:p-6 shadow-2xl">
            <label className="block text-sm text-indigo-400 font-bold mb-4 flex items-center gap-2">
              <Layout size={18}/> タイムテーブル構成
            </label>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {timeSlots.map((slot, idx) => (
                <div 
                  key={idx} 
                  className="grid grid-cols-1 md:grid-cols-[280px_1fr_180px] gap-4 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-800 hover:border-indigo-500/30 transition-all"
                >
                  {/* ⏰ 1. 時間設定（幅をしっかり確保） */}
                  <div className="flex items-center gap-2">
                    <div className="text-slate-700 hidden md:block"><GripVertical size={16} /></div>
                    <input type="time" value={slot.start} onChange={(e) => handleTimeSlotChange(idx, "start", e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm" />
                    <span className="text-slate-500">~</span>
                    <input type="time" value={slot.end} onChange={(e) => handleTimeSlotChange(idx, "end", e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-white text-sm" />
                  </div>

                  {/* 📝 2. 内容（真ん中を広く使うっぺ） */}
                  <input type="text" placeholder="内容（例：ワークショップ、休憩など）" value={slot.label} onChange={(e) => handleTimeSlotChange(idx, "label", e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm" />
                  
                  {/* 🔘 3. 操作ボタン（180pxの「専用シート」で、上・下・削除を完備！） */}
                  <div className="flex items-center justify-end gap-1 border-t md:border-t-0 border-slate-800 pt-2 md:pt-0 shrink-0">
                    <button type="button" onClick={() => moveTimeSlot(idx, 'up')} disabled={idx === 0} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 md:bg-transparent rounded-lg transition-all disabled:opacity-0">
                      <ArrowUp size={22} />
                    </button>
                    <button type="button" onClick={() => moveTimeSlot(idx, 'down')} disabled={idx === timeSlots.length - 1} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 md:bg-transparent rounded-lg transition-all disabled:opacity-0">
                      <ArrowDown size={22} />
                    </button>
                    <div className="w-px h-6 bg-slate-700 mx-2 hidden md:block"></div>
                    <button type="button" onClick={() => removeTimeSlot(idx)} className="p-2 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all">
                      <Trash2 size={22} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <button type="button" onClick={addTimeSlot} className="mt-4 w-full py-4 flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-xl text-sm font-black text-slate-400 hover:text-indigo-400 hover:bg-indigo-900/10 transition-all">
              <Plus size={18}/> 新しい予定を追加する
            </button>
          </div>
        </div>
      </div>
      
{/* 📂 components/EventForm.tsx の表示部分 */}

{/* ★★★ 4. アンケート設定 (固定項目表示 + 便利ボタン) ★★★ */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><ListChecks size={20} className="text-purple-400"/> 申し込みフォームの質問設定</h3>
        <p className="text-xs text-slate-500 mb-4">申し込みフォームに追加する独自の質問を設定できます。</p>
        
        {/* 固定項目の表示エリア（安心用・編集不可） */}
        <div className="space-y-3 mb-6">
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-800 pb-1">基本項目 (システム必須・削除不可)</p>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
              <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 flex items-center gap-2 text-slate-400">
                 <Lock size={12} /> <span className="text-sm font-bold">お名前</span> <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">必須</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 flex items-center gap-2 text-slate-400">
                 <Lock size={12} /> <span className="text-sm font-bold">メールアドレス</span> <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">必須</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded px-3 py-2 flex items-center gap-2 text-slate-400">
                 <Lock size={12} /> <span className="text-sm font-bold">電話番号</span> <span className="ml-auto text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">必須</span>
              </div>
           </div>
        </div>
        
        {/* 自由設定エリア */}
        <div className="space-y-3">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-800 pb-1">追加の質問</p>
          {customFields.length === 0 && (
             <div className="text-center py-8 text-slate-600 text-sm border border-dashed border-slate-800 rounded-lg">
                追加の質問はありません
             </div>
          )}

          {customFields.map((field, index) => (
            <div key={field.id} className="bg-slate-950 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center relative group">
              <div className="flex items-center text-slate-600 cursor-move"><GripVertical size={16}/></div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                <div className="md:col-span-5">
                   <label className="text-[10px] text-slate-500 block mb-1">質問ラベル</label>
                   <input type="text" value={field.label} onChange={(e) => updateCustomField(index, "label", e.target.value)} placeholder="例: 懇親会に参加しますか？" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" />
                </div>
                
                <div className="md:col-span-3">
                   <label className="text-[10px] text-slate-500 block mb-1">回答タイプ</label>
                   <select value={field.type} onChange={(e) => updateCustomField(index, "type", e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none">
                     <option value="text">自由入力 (1行)</option>
                     <option value="textarea">自由入力 (複数行)</option>
                     <option value="select">選択肢 (プルダウン)</option>
                     <option value="checkbox">複数選択 (チェックボックス)</option>
                   </select>
                </div>

                <div className="md:col-span-3">
                   {(field.type === "select" || field.type === "checkbox") ? (
                      <div>
                         <label className="text-[10px] text-slate-500 block mb-1">選択肢 (改行で区切ってください)</label>
                         <textarea 
                            rows={3} 
                            value={field.optionsString} 
                            onChange={(e) => updateCustomField(index, "optionsString", e.target.value)} 
                            placeholder={`選択肢A\n選択肢B\n選択肢C`} 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none resize-y" 
                         />
                      </div>
                   ) : (
                      <div className="h-full flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(index, "required", e.target.checked)} className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500" />
                           <span className="text-xs text-slate-400">必須にする</span>
                        </label>
                      </div>
                   )}
                </div>
                
                {/* ★修正: 右端のボタンエリア (↑ ↓ 削除) */}
                <div className="md:col-span-1 flex flex-col justify-center items-center gap-1 mt-auto">
                   {/* ▲ 上へボタン */}
                   <button 
                     type="button" 
                     onClick={() => moveCustomField(index, 'up')}
                     disabled={index === 0}
                     className="p-1.5 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <ArrowUp size={14}/>
                   </button>
                   
                   {/* ▼ 下へボタン */}
                   <button 
                     type="button" 
                     onClick={() => moveCustomField(index, 'down')}
                     disabled={index === customFields.length - 1}
                     className="p-1.5 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <ArrowDown size={14}/>
                   </button>

                   {/* 🗑️ 削除ボタン */}
                   <button type="button" onClick={() => removeCustomField(index)} className="p-1.5 mt-1 text-slate-600 hover:text-red-400 bg-slate-900 hover:bg-slate-800 rounded transition-colors">
                     <Trash2 size={16}/>
                   </button>
                </div>
              </div>

              {(field.type === "select" || field.type === "checkbox") && (
                 <div className="absolute -bottom-2 right-4 bg-slate-950 px-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" checked={field.required} onChange={(e) => updateCustomField(index, "required", e.target.checked)} className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500" />
                       <span className="text-[10px] text-slate-400">必須回答</span>
                    </label>
                 </div>
              )}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
             <button type="button" onClick={addCustomField} className="py-3 border border-dashed border-slate-700 hover:border-purple-500/50 hover:bg-purple-900/10 rounded-lg text-slate-400 hover:text-purple-400 text-sm font-bold flex items-center justify-center gap-2 transition-all">
               <Plus size={16}/> 質問を追加
             </button>
             {/* ★ここがビジネス用ボタン */}
             <button type="button" onClick={addBusinessFields} className="py-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white text-sm font-bold flex items-center justify-center gap-2 transition-all">
               <Briefcase size={16}/> 会社名・役職を追加
             </button>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* ★追加: アンケート設定エリア (申し込みフォーム設定の下に追加) */}
      {/* ================================================================= */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800 mt-6">
        <h3 className="text-white font-bold flex items-center gap-2 mb-2 text-lg">
          <MessageSquare size={20} className="text-emerald-400"/> イベント終了後アンケート
        </h3>
        <p className="text-xs text-slate-500 mb-6">イベント終了後に回答してもらうアンケート項目を設定できます。</p>

        <div className="space-y-4">
          {surveyFields.length === 0 && (
             <div className="text-center py-8 text-slate-600 text-sm border border-dashed border-slate-800 rounded-lg">
                アンケート項目は設定されていません
             </div>
          )}

{/* ▼▼▼ ステップ2：ここを書き換えます ▼▼▼ */}
          {surveyFields.map((field, index) => (
            <div key={index} className="bg-slate-950 border border-slate-700 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start md:items-center relative group">
              {/* ドラッグ用グリップアイコン（装飾） */}
              <div className="flex items-center text-slate-600 cursor-move"><GripVertical size={16}/></div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-3 w-full">
                {/* 質問文の入力欄 */}
                <div className="md:col-span-5">
                   <label className="text-[10px] text-slate-500 block mb-1">質問文</label>
                   <input 
                     type="text" 
                     value={field.label} 
                     onChange={(e) => {
                        const newFields = [...surveyFields];
                        newFields[index].label = e.target.value;
                        setSurveyFields(newFields);
                     }} 
                     placeholder="例: 本日の感想をお聞かせください" 
                     className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" 
                   />
                </div>
                
                {/* 回答タイプの選択 */}
                <div className="md:col-span-3">
                   <label className="text-[10px] text-slate-500 block mb-1">回答タイプ</label>
                   <select 
                     value={field.type} 
                     onChange={(e) => {
                        const newFields = [...surveyFields];
                        newFields[index].type = e.target.value as any;
                        setSurveyFields(newFields);
                     }} 
                     className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                   >
                     <option value="text">自由入力 (1行)</option>
                     <option value="textarea">自由入力 (複数行)</option>
                     <option value="select">選択肢 (プルダウン)</option>
                     <option value="checkbox">複数選択 (チェックボックス)</option>
                   </select>
                </div>

                {/* 選択肢 または 必須チェック */}
                <div className="md:col-span-3">
                   {(field.type === "select" || field.type === "checkbox") ? (
                      <div>
                         <label className="text-[10px] text-slate-500 block mb-1">選択肢 (改行区切り)</label>
                         <textarea 
                            rows={1} 
                            value={field.optionsString || ""} 
                            onChange={(e) => {
                               const newFields = [...surveyFields];
                               newFields[index].optionsString = e.target.value;
                               setSurveyFields(newFields);
                            }} 
                            placeholder={`選択肢A\n選択肢B`} 
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none resize-y min-h-[38px]" 
                         />
                      </div>
                   ) : (
                      <div className="h-full flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                           <input 
                             type="checkbox" 
                             checked={field.required} 
                             onChange={(e) => {
                                const newFields = [...surveyFields];
                                newFields[index].required = e.target.checked;
                                setSurveyFields(newFields);
                             }} 
                             className="rounded bg-slate-800 border-slate-600 text-purple-500 focus:ring-purple-500" 
                           />
                           <span className="text-xs text-slate-400">必須にする</span>
                        </label>
                      </div>
                   )}
                </div>
                
                {/* ★ここがポイント: 右端のボタンエリア (↑ ↓ 削除) */}
                <div className="md:col-span-1 flex flex-col justify-center items-center gap-1 mt-auto">
                   {/* ▲ 上へボタン */}
                   <button 
                     type="button" 
                     onClick={() => moveSurveyField(index, 'up')}
                     disabled={index === 0}
                     className="p-1.5 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <ArrowUp size={14}/>
                   </button>
                   
                   {/* ▼ 下へボタン */}
                   <button 
                     type="button" 
                     onClick={() => moveSurveyField(index, 'down')}
                     disabled={index === surveyFields.length - 1}
                     className="p-1.5 text-slate-500 hover:text-white bg-slate-900 hover:bg-slate-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                   >
                     <ArrowDown size={14}/>
                   </button>

                   {/* 🗑️ 削除ボタン */}
                   <button 
                     type="button" 
                     onClick={() => {
                        const newFields = [...surveyFields];
                        newFields.splice(index, 1);
                        setSurveyFields(newFields);
                     }} 
                     className="p-1.5 mt-1 text-slate-600 hover:text-red-400 bg-slate-900 hover:bg-slate-800 rounded transition-colors"
                   >
                     <Trash2 size={16}/>
                   </button>
                </div>
              </div>
            </div>
          ))}

          <button type="button" onClick={() => setSurveyFields([...surveyFields, { id: Math.random().toString(36), label: "", type: "text", options: [], optionsString: "", required: false }])} className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-400 hover:text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all flex items-center justify-center gap-2 text-sm font-bold">
             <Plus size={16}/> アンケート質問を追加
          </button>
        </div>
      </div>

      {/* 5. Zoom設定 */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><Video size={20} className="text-cyan-400"/> 参加形式・Zoom</h3>
        <div className="flex gap-8 mb-6 p-4 bg-slate-950 rounded-lg border border-slate-800">
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="hasOffline" checked={formData.hasOffline} onChange={handleCheckbox} className="w-5 h-5 rounded accent-indigo-500" /><span className="font-bold">会場参加あり</span></label>
          <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" name="hasOnline" checked={formData.hasOnline} onChange={handleCheckbox} className="w-5 h-5 rounded accent-indigo-500" /><span className="font-bold">オンライン参加あり</span></label>
        </div>
        {formData.hasOnline && (
          <div className="bg-cyan-950/20 p-5 rounded-xl border border-cyan-900/30 space-y-4 animate-in fade-in">
             <div className="text-xs text-cyan-400 font-bold mb-2 flex items-center gap-2"><Mail size={14}/> 返信メール用（非公開）</div>
             {/* ★ここに追加！: クリック一発便利ボタンエリア */}
             <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-cyan-900/30">
                {/* Google Meetを一発作成 */}
                <a 
                  href="https://meet.google.com/new" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs bg-white text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 transition-colors font-bold shadow-sm"
                  title="クリックすると新しい会議室が即座に作られます"
                >
                  <img src="https://www.gstatic.com/meet/icons/logo_24px_v2_2x.png" alt="Meet" className="w-4 h-4"/>
                  Meetを新規作成
                </a>

                {/* Zoomのスケジュール画面へ */}
                <a 
                  href="https://zoom.us/meeting/schedule" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs bg-[#2D8CFF] text-white px-3 py-2 rounded-lg hover:bg-[#1E74E3] flex items-center gap-2 transition-colors font-bold shadow-sm"
                >
                  <Video size={16} fill="currentColor" className="text-white"/>
                  Zoom設定画面へ
                </a>
                
                <span className="text-[10px] text-slate-500 flex items-center pt-1">
                   ※ここから作成して、URLを下にコピペしてください
                </span>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><label className="block text-xs text-slate-500 mb-2">Zoom URL</label><input type="text" name="zoomUrl" value={formData.zoomUrl} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm" /></div>
                <div><label className="block text-xs text-slate-500 mb-2">手順URL</label><input type="text" name="zoomGuideUrl" value={formData.zoomGuideUrl} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm" /></div>
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div><label className="block text-xs text-slate-500 mb-2">ID</label><input type="text" name="meetingId" value={formData.meetingId} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono" /></div>
                <div><label className="block text-xs text-slate-500 mb-2">パスコード</label><input type="text" name="zoomPasscode" value={formData.zoomPasscode} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono" /></div>
             </div>
          </div>
        )}
      </div>

      {/* 6. SNS・OGP設定 */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><ImageIcon size={20} className="text-emerald-400"/> SNS・チラシ設定</h3>
        <div className="bg-slate-950 border border-slate-700 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
           {formData.ogpImage ? (
             <div className="relative group w-full max-w-md">
               <img src={formData.ogpImage} alt="OGP Preview" className="w-full rounded-lg border border-slate-700 shadow-lg" />
               <button type="button" onClick={() => handleRemoveImage('ogpImage')} className="absolute top-2 right-2 bg-black/70 hover:bg-red-600 text-white p-2 rounded-full transition-colors"><X size={16} /></button>
               <p className="mt-2 text-xs text-emerald-400">✓ 設定済み</p>
             </div>
           ) : (
             <div className="space-y-4">
               <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-600">
                 {uploadingOgp ? <div className="animate-spin w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full"/> : <ImageIcon size={32}/>}
               </div>
               <div><p className="text-sm text-slate-300 font-bold mb-1">SNSでシェアした時に表示される画像</p><p className="text-xs text-slate-500">イベントのチラシ画像などを登録してください (推奨比率 1.91:1)</p></div>
               <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 font-bold rounded-lg transition-all"><Upload size={16} /> 画像をアップロード<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'ogpImage')} /></label>
             </div>
           )}
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6 border-t border-slate-800 sticky bottom-0 bg-[#0f111a]/95 p-4 backdrop-blur z-20 -mx-6 -mb-6">
        <button type="button" onClick={onSuccess} className="px-6 py-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium">キャンセル</button>
        <button type="submit" disabled={loading || uploadingLecturer || uploadingOgp} className="px-10 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold hover:shadow-xl transition-all flex items-center gap-2">{loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"/> : <Save size={20} />} 保存する</button>
      </div>
    </form>
  );
}