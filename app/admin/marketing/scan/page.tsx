// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, ArrowLeft, UserCircle, Building2, Mail, Phone, Tag, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com";

export default function ReliableScanner() {
  const router = useRouter();
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 認証＆テナント取得
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/login"); return; }
      const userDoc = await getDoc(doc(db, "admin_users", user.email!));
      if (userDoc.exists()) {
        setTenantId(userDoc.data().tenantId);
      } else if (user.email === SUPER_ADMIN_EMAIL) {
        setTenantId("demo");
      }
    });
    return () => unsubscribe();
  }, []);

  // 撮影した画像を読み込み → 自動でAI解析
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    createImageBitmap(file).then((bitmap) => {
      const canvas = document.createElement("canvas");
      const maxW = 1024;
      const scale = Math.min(maxW / bitmap.width, maxW / bitmap.height, 1);
      canvas.width = bitmap.width * scale;
      canvas.height = bitmap.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const resized = canvas.toDataURL("image/jpeg", 0.7);
      setImgData(resized);
      handleAnalyze(resized);
    });

    e.target.value = "";
  };

  // AI解析（Gemini Vision）
  const handleAnalyze = async (base64Image: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      alert("AI解析に失敗だっぺ。\n\n" + (err?.message || "不明なエラー"));
      reset();
    } finally {
      setLoading(false);
    }
  };

  // 絆リストに保存
  const handleSave = async () => {
    if (!result || !tenantId) return;
    if (!result.email) {
      alert("メールアドレスがないと保存できないっぺ。入力してくんちぇ！");
      return;
    }

    setSaving(true);
    try {
      const contactRef = doc(db, "tenants", tenantId, "manual_contacts", result.email);
      await setDoc(contactRef, {
        email: result.email,
        name: result.name || "",
        company: result.company || "",
        phone: result.phone || "",
        role: result.title || "",
        source: "business_card_scan",
        updatedAt: new Date(),
      }, { merge: true });

      setSaved(true);
      // 1.5秒後にリセットして次の名刺へ
      setTimeout(() => {
        reset();
        setSaved(false);
      }, 1500);
    } catch (e: any) {
      alert("保存に失敗だっぺ。\n\n" + (e?.message || "不明なエラー"));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setImgData(null);
    setResult(null);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">

      {/* ヘッダー */}
      <div className="p-4 flex items-center justify-between z-10 bg-black/80 border-b border-white/10">
        <Link href="/admin/marketing" className="p-2"><ArrowLeft size={24}/></Link>
        <h1 className="text-[10px] font-black tracking-widest text-indigo-400">KIZUNA AI SCANNER</h1>
        <div className="w-10"></div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {!imgData ? (
          <div className="flex flex-col items-center gap-6 p-8">
            <div className="w-[280px] aspect-[1.6/1] border-2 border-dashed border-indigo-500/50 rounded-2xl flex items-center justify-center bg-slate-900/50">
              <div className="text-center">
                <Camera size={48} className="text-indigo-400 mx-auto mb-3" />
                <p className="text-sm text-slate-400">名刺を撮影してください</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 bg-white rounded-full border-8 border-slate-800 flex items-center justify-center active:scale-90 transition-all shadow-xl"
            >
              <Camera size={32} className="text-black" />
            </button>
            <p className="text-xs text-slate-500">タップでカメラ起動</p>
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-900 p-6">
            <img src={imgData} className={`w-full max-w-sm rounded-lg shadow-2xl transition-all ${loading ? 'opacity-50' : 'opacity-100'}`} alt="captured" />
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="w-full max-w-sm h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-[scan_1.5s_infinite] absolute"></div>
                <p className="mt-40 text-cyan-400 font-bold tracking-widest animate-pulse">AI ANALYZING...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 操作パネル（結果表示） */}
      {imgData && result && !saved && (
        <div className="p-6 bg-black border-t border-white/10">
          <div className="bg-slate-900 p-6 rounded-3xl border border-indigo-500/30 text-left space-y-4 animate-in zoom-in">
            <div className="flex items-center gap-3 border-b border-white/5 pb-2">
              <UserCircle size={18} className="text-indigo-400"/>
              <input value={result.name} onChange={e=>setResult({...result, name:e.target.value})} className="bg-transparent text-white font-bold w-full outline-none" placeholder="名前" />
            </div>
            <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-sm text-slate-300">
              <Building2 size={16}/>
              <input value={result.company} onChange={e=>setResult({...result, company:e.target.value})} className="bg-transparent w-full outline-none" placeholder="会社名" />
            </div>
            <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-sm text-slate-300">
              <Tag size={16}/>
              <input value={result.title || ""} onChange={e=>setResult({...result, title:e.target.value})} className="bg-transparent w-full outline-none" placeholder="役職" />
            </div>
            <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-xs text-slate-400">
              <Mail size={16}/>
              <input value={result.email} onChange={e=>setResult({...result, email:e.target.value})} className="bg-transparent w-full outline-none" placeholder="メールアドレス" />
            </div>
            <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-xs text-slate-400">
              <Phone size={16}/>
              <input value={result.phone || ""} onChange={e=>setResult({...result, phone:e.target.value})} className="bg-transparent w-full outline-none" placeholder="電話番号" />
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">撮り直す</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-black shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}
                {saving ? "保存中..." : "絆リストに保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 保存完了 */}
      {saved && (
        <div className="p-6 bg-black border-t border-white/10 text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 animate-in zoom-in">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3"/>
            <p className="text-emerald-400 font-black text-lg">保存完了！</p>
            <p className="text-slate-400 text-xs mt-2">次の名刺を準備してください...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scan { 0%, 100% { top: 25%; } 50% { top: 70%; } }
      `}</style>
    </div>
  );
}
