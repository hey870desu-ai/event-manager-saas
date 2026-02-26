// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, Sparkles, UserPlus, Building2, Mail, Tag, Smartphone,UserCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ReliableScanner() {
  const router = useRouter();
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 1. カメラを確実に起動（iPhone/Android共通）
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
      alert("カメラが開けねぇっぺ。設定で許可してくんちぇ！");
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

  // 2. シャッター：押した瞬間に「今の映像」を止めて画像にする
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 画面の「枠」に合わせて切り抜き（高解像度）
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const cropWidth = vWidth * 0.85;
    const cropHeight = cropWidth / 1.6;
    const startX = (vWidth - cropWidth) / 2;
    const startY = (vHeight - cropHeight) / 2;

    canvas.width = 1280;
    canvas.height = 800;
    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, 1280, 800);
    
    // 画像データをセットしてビデオを止める
    const data = canvas.toDataURL("image/jpeg", 0.9);
    setImgData(data);

    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
    
    // 💡 撮影したらそのままAI解析をスタートさせるべ！
    handleAnalyze(data);
  };

  // 3. AI解析（Google & OpenAI）
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
    } catch (err) {
      alert("AI解析に失敗だっぺ。明るい場所でもう一度撮ってな！");
      startCamera(); // 失敗したらカメラに戻す
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      
      {/* ヘッダー */}
      <div className="p-4 flex items-center justify-between z-10 bg-black/80 border-b border-white/10">
        <Link href="/admin/marketing" className="p-2"><ArrowLeft size={24}/></Link>
        <h1 className="text-[10px] font-black tracking-widest text-indigo-400">KIZUNA AI SCANNER</h1>
        <div className="w-10"></div>
      </div>

      {/* スキャンエリア */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {!imgData ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            {/* フレーム */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-[85%] aspect-[1.6/1] border-2 border-indigo-500 rounded-2xl shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-xl"></div>
              </div>
            </div>
          </>
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

      {/* 操作パネル */}
      <div className="p-10 bg-black border-t border-white/10 text-center">
        {!imgData ? (
          <button 
            onClick={capture} 
            className="w-20 h-20 bg-white rounded-full border-8 border-slate-800 flex items-center justify-center active:scale-90 transition-all shadow-xl"
          >
            <Camera size={32} className="text-black" />
          </button>
        ) : result ? (
          /* 解析結果の確認 */
          <div className="bg-slate-900 p-6 rounded-3xl border border-indigo-500/30 text-left space-y-4 animate-in zoom-in">
             <div className="flex items-center gap-3 border-b border-white/5 pb-2">
               <UserCircle size={18} className="text-indigo-400"/>
               <input value={result.name} onChange={e=>setResult({...result, name:e.target.value})} className="bg-transparent text-white font-bold w-full outline-none" />
             </div>
             <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-sm text-slate-300">
               <Building2 size={16}/>
               <input value={result.company} onChange={e=>setResult({...result, company:e.target.value})} className="bg-transparent w-full outline-none" />
             </div>
             <div className="flex items-center gap-3 border-b border-white/5 pb-2 text-xs text-slate-400">
               <Mail size={16}/>
               <input value={result.email} onChange={e=>setResult({...result, email:e.target.value})} className="bg-transparent w-full outline-none" />
             </div>
             <div className="flex gap-2">
               <button onClick={startCamera} className="flex-1 py-3 bg-slate-800 rounded-xl font-bold">撮り直す</button>
               <button className="flex-[2] py-3 bg-indigo-600 rounded-xl font-black shadow-lg">絆リストに保存</button>
             </div>
          </div>
        ) : (
          <p className="text-slate-500 animate-pulse">解析を待ってるっぺ...</p>
        )}
      </div>

      <style jsx>{`
        @keyframes scan { 0%, 100% { top: 25%; } 50% { top: 70%; } }
      `}</style>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}