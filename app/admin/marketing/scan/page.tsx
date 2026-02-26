// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UserPlus, Building2, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function BusinessCardScanner() {
  const router = useRouter();
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  // 📸 スマホの標準カメラを起動して画像を受け取る
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImgData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 🧪 AI解析を呼び出す（画質が良いので解析精度も上がるっぺ！）
  const analyzeImage = async () => {
    if (!imgData) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imgData }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      alert("AI解析に失敗したっぺ...。");
    } finally {
      setLoading(false);
    }
  };

  // 💾 営業用「絆リスト」に保存
  const saveToKizunaList = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "kizuna_contacts"), {
        ...result,
        source: "scan", // ✨ これでセミナーとは別の「営業先」として管理！
        createdAt: serverTimestamp(),
      });
      alert("営業用の「絆」として登録したっぺ！");
      router.push("/admin/marketing");
    } catch (err) {
      alert("保存に失敗したっぺ...");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 flex flex-col items-center font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* ヘッダー */}
        <div className="flex items-center justify-between">
          <Link href="/admin/marketing" className="p-3 bg-slate-800/50 rounded-2xl text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20}/>
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="text-indigo-500" size={20} /> 名刺AIスキャナー
          </h1>
          <div className="w-10"></div>
        </div>

        {/* 写真表示エリア */}
        <div className="relative aspect-[3/2] bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center shadow-2xl">
          {!imgData ? (
            <div className="text-center p-6">
              <Camera size={48} className="mx-auto mb-4 text-slate-600 opacity-50" />
              <p className="text-sm text-slate-500 font-bold">名刺を撮影するか<br/>写真を選んでくんちぇ</p>
            </div>
          ) : (
            <img src={imgData} className="w-full h-full object-contain animate-in fade-in" alt="preview" />
          )}
        </div>

        {/* 操作ボタン：ここが魔法の入り口だっぺ！ */}
        <div className="flex flex-col gap-4">
          {!imgData ? (
            <label className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all">
              <Camera size={24} strokeWidth={3}/> 
              名刺を撮る / 選択
              {/* 💡 capture="environment" がスマホの背面カメラを直撃するっぺ！ */}
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
          ) : !result ? (
            <div className="space-y-3">
              <button onClick={analyzeImage} disabled={loading} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3">
                {loading ? <RefreshCw className="animate-spin" /> : <RefreshCw size={24}/>}
                {loading ? "AI解析中だっぺ..." : "AIで名刺を読み取る"}
              </button>
              <button onClick={() => setImgData(null)} className="w-full py-3 text-slate-500 font-bold">撮り直す</button>
            </div>
          ) : null}
        </div>

        {/* 解析結果 & 保存 */}
        {result && (
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-[2rem] shadow-2xl animate-in zoom-in">
             <h2 className="text-emerald-400 font-black mb-6 flex items-center gap-2">
               <CheckCircle2 size={20}/> 解析に成功したっぺ！
             </h2>
             
             <div className="space-y-4 mb-8 text-sm">
                <div className="border-b border-slate-800 pb-2">
                  <label className="text-[10px] text-slate-500 font-black uppercase">Name</label>
                  <input value={result.name} onChange={e=>setResult({...result, name:e.target.value})} className="w-full bg-transparent text-white font-bold outline-none" />
                </div>
                <div className="border-b border-slate-800 pb-2">
                  <label className="text-[10px] text-slate-500 uppercase">Company</label>
                  <input value={result.company} onChange={e=>setResult({...result, company:e.target.value})} className="w-full bg-transparent text-white outline-none" />
                </div>
                <div className="border-b border-slate-800 pb-2">
                  <label className="text-[10px] text-slate-500 uppercase">Email</label>
                  <input value={result.email} onChange={e=>setResult({...result, email:e.target.value})} className="w-full bg-transparent text-white outline-none" />
                </div>
             </div>

             <button onClick={saveToKizunaList} disabled={isSaving} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2">
               {isSaving ? <RefreshCw className="animate-spin" /> : <UserPlus size={20}/>}
               営業用リストに保存する
             </button>
          </div>
        )}
      </div>
    </div>
  );
}