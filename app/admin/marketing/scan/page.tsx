// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UploadCloud, UserPlus, Building2, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function BusinessCardScanner() {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // 📷 カメラ起動（iPhone/Android共通の最適化設定）
  const startCamera = async () => {
    setImgData(null);
    setResult(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // iOS/Android向けに確実に再生を開始させる
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      alert("カメラの起動に失敗したっぺ！ブラウザの設定でカメラを許可してくんちぇ。");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 📸 シャッターを切る（iPhone/Pixel 両対応版）
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && cameraReady) {
      const context = canvas.getContext("2d");
      // ビデオの実際の解像度を優先、取れなければ表示サイズを使う
      const w = video.videoWidth || video.clientWidth;
      const h = video.videoHeight || video.clientHeight;
      
      canvas.width = w;
      canvas.height = h;

      try {
        // 描画（一瞬待つ必要なし！）
        context?.drawImage(video, 0, 0, w, h);
        
        // JPEG形式で引っこ抜く（画質0.6で負荷軽減）
        const data = canvas.toDataURL("image/jpeg", 0.6);
        
        if (!data || data === "data:,") {
          throw new Error("Capture failed");
        }

        setImgData(data);
        
        // 撮影したらカメラを止める（iPhoneの負担を減らす）
        if (video.srcObject) {
          (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        alert("うまく撮れなかったっぺ。もう一度シャッターを押してみてな！");
      }
    }
  };

  // 🧪 AI解析を呼び出す
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
      alert("AI解析に失敗したっぺ...");
    } finally {
      setLoading(false);
    }
  };

  // 💾 絆リスト（営業用ソース付き）に保存
  const saveToKizunaList = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "kizuna_contacts"), {
        ...result,
        source: "scan", // ✨ これが営業用ツールの印！
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
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/marketing" className="p-2 bg-slate-800 rounded-lg"><ArrowLeft size={20}/></Link>
          <h1 className="text-xl font-bold text-white">名刺スキャン</h1>
        </div>

        {/* プレビューエリア */}
        <div className="relative aspect-[3/2] bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center">
          {!imgData ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover" 
            />
          ) : (
            <img src={imgData} className="w-full h-full object-contain" />
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex flex-col gap-3">
          {!imgData ? (
            <button 
              onClick={capture}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <Camera size={24}/> シャッターを切る
            </button>
          ) : !result ? (
            <>
              <button onClick={analyzeImage} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                {loading ? <RefreshCw className="animate-spin" /> : <UploadCloud size={24}/>}
                {loading ? "AI解析中..." : "この名刺を解析する"}
              </button>
              <button onClick={startCamera} className="w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-xl">撮り直す</button>
            </>
          ) : (
            /* 解析結果が出た後の保存ボタン */
            <button 
              onClick={saveToKizunaList} 
              disabled={isSaving}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              {isSaving ? <RefreshCw className="animate-spin" /> : <UserPlus size={20}/>}
              絆リスト（営業用）に保存
            </button>
          )}
        </div>

        {/* 結果表示（編集可能） */}
        {result && (
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl space-y-3">
             <h2 className="text-emerald-400 font-bold flex items-center gap-2"><CheckCircle2 size={18}/> 内容を確認してくんちぇ</h2>
             <div><label className="text-[10px] text-slate-500 uppercase">お名前</label><input value={result.name} onChange={e=>setResult({...result, name:e.target.value})} className="w-full bg-slate-800 p-2 rounded text-white" /></div>
             <div><label className="text-[10px] text-slate-500 uppercase">会社名</label><input value={result.company} onChange={e=>setResult({...result, company:e.target.value})} className="w-full bg-slate-800 p-2 rounded text-white" /></div>
             <div><label className="text-[10px] text-slate-500 uppercase">メールアドレス</label><input value={result.email} onChange={e=>setResult({...result, email:e.target.value})} className="w-full bg-slate-800 p-2 rounded text-white" /></div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}