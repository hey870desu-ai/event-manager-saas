// 📂 components/EventForm.tsx
"use client";

import { useState, useEffect } from "react";
import { auth, db, storage } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Save, Calendar, MapPin, User, Video, Mail, Globe, AlignLeft, Layout, Image as ImageIcon, Upload, X, Lock, Plus, Trash2, ListChecks, GripVertical, Briefcase } from "lucide-react";
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
};

type TimeSlot = {
  start: string;
  end: string;
  label: string;
};

export default function EventForm({ event, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [uploadingLecturer, setUploadingLecturer] = useState(false);
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
    tenantId: "demo",
    branchTag: "本部",
    organizer: "主催者情報読み込み中...",

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
    
    replyTemplateId: "default",
    adminTemplateId: "default",
  });

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
        replyTemplateId: event.replyTemplateId || "default",
        adminTemplateId: event.adminTemplateId || "default",
      });

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

      // 編集モードの場合：保存されている質問があればそれを優先する
      if (event.customFields && Array.isArray(event.customFields) && event.customFields.length > 0) {
        setCustomFields(event.customFields.map((f: any) => ({
          ...f,
          optionsString: f.options ? f.options.join(",") : ""
        })));
      } else if (event.id) {
        // 編集モードだがカスタム質問がない場合は空にする（勝手にデフォルトを追加しない）
        setCustomFields([]);
      }
      // ※ eventがない（新規作成）場合は、useStateの初期値（会社名・部署）が使われる
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedTimeTable = timeSlots
        .filter(slot => slot.start && slot.label)
        .map(slot => `${slot.start} - ${slot.end || "未定"} : ${slot.label}`)
        .join("\n");

      const formattedCustomFields = customFields.map(f => {
        let options: string[] = [];
        if (f.type === "select" || f.type === "checkbox") {
           options = f.optionsString.split(",").map(s => s.trim()).filter(s => s !== "");
        }
        return {
           id: f.id,
           label: f.label,
           type: f.type,
           required: f.required,
           options: options
        };
      }).filter(f => f.label !== "");

      const savePayload = {
        ...formData,
        timeTable: formattedTimeTable,
        customFields: formattedCustomFields,
        time: `${formData.startTime} - ${formData.endTime}`,
        location: formData.venueName,
        updatedAt: new Date(),
        branchTag: formData.branchTag || "本部", 
      };

      if (event?.id) {
        await updateDoc(doc(db, "events", event.id), savePayload);
      } else {
        const newEvent = {
          ...savePayload,
          createdAt: new Date(),
          slug: Math.random().toString(36).substring(2, 8),
          views: 0
        };
        await addDoc(collection(db, "events"), newEvent);
      }
      onSuccess();
      alert("保存しました！");
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

      {/* 0. 支部設定・ステータス */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-slate-900/50 p-5 rounded-xl border border-indigo-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <label className="block text-xs text-indigo-400 font-bold mb-2 flex items-center gap-2">
            <Globe size={14}/> 主催支部 ({tenantData?.name || "Loading..."})
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
              <option value={tenantData?.name || "-"}>{tenantData?.name || "-"}</option>
              {safeBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800">
           <label className="block text-xs text-slate-400 font-bold mb-2">公開ステータス</label>
           <select name="status" value={formData.status} onChange={handleChange} className={`w-full border border-slate-700 rounded-lg p-3 font-bold outline-none cursor-pointer transition-colors ${formData.status === 'published' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-500/50' : 'bg-slate-950 text-slate-400'}`}>
             <option value="draft">下書き (準備中)</option>
             <option value="published">公開する</option>
           </select>
        </div>
      </div>

      {/* 1. 基本情報 */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><Calendar size={20} className="text-indigo-400"/> 基本情報</h3>
        <div className="space-y-6">
          <div><label className="block text-xs text-slate-500 mb-2">イベント名 <span className="text-red-500">*</span></label><input required type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-lg text-white focus:border-indigo-500 outline-none" placeholder="例: 定例セミナー"/></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div><label className="block text-xs text-slate-500 mb-2">開催日 <span className="text-red-500">*</span></label><input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" /></div>
            <div className="grid grid-cols-2 gap-2 md:col-span-2">
              <div><label className="block text-xs text-slate-500 mb-2">開始</label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
              <div><label className="block text-xs text-slate-500 mb-2">終了</label><input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
            </div>
            <div><label className="block text-xs text-slate-500 mb-2">受付開始</label><input type="time" name="openTime" value={formData.openTime} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="md:col-span-2"><label className="block text-xs text-slate-500 mb-2">定員</label><input type="text" name="capacity" value={formData.capacity} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
             <div className="md:col-span-2"><label className="block text-xs text-slate-500 mb-2">参加費</label><input type="text" name="price" value={formData.price} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
          </div>
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

      {/* 3. 講師・内容 */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><User size={20} className="text-pink-400"/> 講師・内容・タイムテーブル</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          <div className="space-y-4">
            <div><label className="block text-xs text-slate-500 mb-2">講師名</label><input type="text" name="lecturer" value={formData.lecturer} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
            <div><label className="block text-xs text-slate-500 mb-2">肩書</label><input type="text" name="lecturerTitle" value={formData.lecturerTitle} onChange={handleChange} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" /></div>
            <div className="bg-slate-950 border border-slate-700 border-dashed rounded-lg p-4">
              <label className="block text-xs text-slate-500 mb-3 flex items-center gap-2"><ImageIcon size={14}/> 講師写真</label>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-24 h-32 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden relative flex items-center justify-center">
                  {formData.lecturerImage ? <img src={formData.lecturerImage} alt="Preview" className="w-full h-full object-cover" /> : <User className="text-slate-700" size={32} />}
                  {uploadingLecturer && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/></div>}
                </div>
                <div className="flex-1 space-y-2">
                   {!formData.lecturerImage ? (
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors">
                        <Upload size={14} /> 写真を選ぶ
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'lecturerImage')} />
                      </label>
                   ) : (
                      <button type="button" onClick={() => handleRemoveImage('lecturerImage')} className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs rounded border border-red-500/30 transition-colors"><X size={14} /> 削除して変更</button>
                   )}
                </div>
              </div>
            </div>
          </div>
          <div><label className="block text-xs text-slate-500 mb-2">プロフィール</label><textarea name="lecturerProfile" value={formData.lecturerProfile} onChange={handleChange} rows={8} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white resize-none" /></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div><label className="block text-xs text-slate-500 mb-2 flex items-center gap-1"><AlignLeft size={14}/> 概要 (HTML可)</label><textarea name="content" value={formData.content} onChange={handleChange} rows={8} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white font-mono text-sm" /></div>
           <div className="bg-slate-950 rounded-lg border border-slate-800 p-4">
              <label className="block text-xs text-slate-500 mb-3 flex items-center gap-1"><Layout size={14}/> タイムテーブル構成</label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {timeSlots.map((slot, idx) => (
                  <div key={idx} className="flex gap-2 items-center group">
                    <input type="time" value={slot.start} onChange={(e) => handleTimeSlotChange(idx, "start", e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" />
                    <span className="text-slate-500 text-xs">-</span>
                    <input type="time" value={slot.end} onChange={(e) => handleTimeSlotChange(idx, "end", e.target.value)} className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white" />
                    <input type="text" placeholder="内容 (例: 基調講演)" value={slot.label} onChange={(e) => handleTimeSlotChange(idx, "label", e.target.value)} className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white" />
                    <button type="button" onClick={() => removeTimeSlot(idx)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTimeSlot} className="mt-3 w-full py-2 flex items-center justify-center gap-2 border border-dashed border-slate-700 rounded text-xs text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-900/10 transition-colors"><Plus size={14}/> 行を追加する</button>
           </div>
        </div>
      </div>

{/* 📂 components/EventForm.tsx の表示部分 */}

{/* ★★★ 4. アンケート設定 (固定項目表示 + 便利ボタン) ★★★ */}
      <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-800">
        <h3 className="text-white font-bold flex items-center gap-2 mb-6 text-lg"><ListChecks size={20} className="text-purple-400"/> アンケート・質問設定</h3>
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
                         <label className="text-[10px] text-slate-500 block mb-1">選択肢 (カンマ区切り)</label>
                         <input type="text" value={field.optionsString} onChange={(e) => updateCustomField(index, "optionsString", e.target.value)} placeholder="はい, いいえ" className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-purple-500 outline-none" />
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
                
                <div className="md:col-span-1 flex justify-end items-center mt-auto">
                   <button type="button" onClick={() => removeCustomField(index)} className="p-2 text-slate-600 hover:text-red-400 bg-slate-900 hover:bg-slate-800 rounded transition-colors"><Trash2 size={16}/></button>
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