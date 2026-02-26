"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UserPlus, Sparkles, Phone, Building2, UserCircle, Mail, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfessionalScanner() {
  const router = useRouter();
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    setImgData(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      alert("カメラ起動に失敗だっぺ。設定を確認してな！");
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

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // クロップ処理（中央 80%）
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const cropWidth = vWidth * 0.8;
    const cropHeight = cropWidth / 1.6;
    const startX = (vWidth - cropWidth) / 2;
    const startY = (vHeight - cropHeight) / 2;

    canvas.width = 1280; // 高解像度化
    canvas.height = 800;
    ctx.filter = "contrast(1.1) brightness(1.05)";
    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, 1280, 800);
    
    setImgData(canvas.toDataURL("image/jpeg", 0.9));
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

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
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      alert("AI解析に失敗だっぺ。もう一度撮ってみてな！");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
      {/* ヘッダー */}
      <div className="p-4 flex items-center justify-between z-10 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <Link href="/admin/marketing" className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft size={24}/></Link>
        <h1 className="text-xs font-black tracking-[0.4em] uppercase text-indigo-400">AI Contact Scanner Pro</h1>
        <div className="w-10"></div>
      </div>

      {/* スキャンエリア */}
      <div className="relative flex-1 flex items-center justify-center bg-[#0a0a0a]">
        {!imgData ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] aspect-[1.6/1] border border-white/20 rounded-2xl relative shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                {/* コーナーガイド */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950">
            <img src={imgData} className={`w-full max-w-sm rounded-lg shadow-2xl transition-all duration-700 ${loading ? 'brightness-50' : 'brightness-100'}`} alt="captured" />
            
            {/* 💡 スキャン中のラインアニメーション */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-sm h-1 bg-indigo-400 shadow-[0_0_20px_#818cf8] animate-[scan_2s_ease-in-out_infinite] absolute z-20"></div>
                <p className="mt-48 text-indigo-400 font-bold tracking-widest animate-pulse">AI ANALYZING...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 操作パネル */}
      <div className="p-8 bg-black/90 border-t border-white/10">
        {!imgData ? (
          <button onClick={capture} className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <div className="w-[88%] h-[88%] border-2 border-black rounded-full"></div>
          </button>
        ) : !result ? (
          <div className="flex flex-col gap-4">
            <button onClick={analyzeImage} disabled={loading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={24}/>}
              {loading ? "解析中だっぺ..." : "AIで名刺をスキャンする"}
            </button>
            <button onClick={startCamera} className="text-slate-500 font-bold py-2">撮り直す</button>
          </div>
        ) : (
          /* 解析結果の表示（項目増量だっぺ！） */
          <div className="bg-slate-900/50 p-6 rounded-3xl border border-indigo-500/30 space-y-4 animate-in slide-in-from-bottom-6">
            <h3 className="text-indigo-400 font-black flex items-center gap-2 mb-4"><CheckCircle2 size={18}/> 抽出成功だっぺ！</h3>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <UserCircle size={18} className="text-slate-400"/>
                <input value={result.name} onChange={e=>setResult({...result, name:e.target.value})} className="bg-transparent font-bold text-white outline-none w-full" placeholder="名前"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <Building2 size={18} className="text-slate-400"/>
                <input value={result.company} onChange={e=>setResult({...result, company:e.target.value})} className="bg-transparent text-white outline-none w-full" placeholder="会社名"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <Tag size={18} className="text-slate-400"/>
                <input value={result.title} onChange={e=>setResult({...result, title:e.target.value})} className="bg-transparent text-white outline-none w-full" placeholder="役職"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <Mail size={18} className="text-slate-400"/>
                <input value={result.email} onChange={e=>setResult({...result, email:e.target.value})} className="bg-transparent text-white outline-none w-full" placeholder="メール"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                <Phone size={18} className="text-slate-400"/>
                <input value={result.phone} onChange={e=>setResult({...result, phone:e.target.value})} className="bg-transparent text-white outline-none w-full" placeholder="電話番号"/>
              </div>
            </div>
            <button className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
              この内容で「絆」を登録
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}