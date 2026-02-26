// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UserPlus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfessionalScanner() {
  const router = useRouter();
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 📷 カメラ起動
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
      alert("カメラの起動に失敗だっぺ。設定を確認してな！");
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

  // 📸 枠の中だけを切り取ってシャッターを切る（クロップ機能）
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 名刺の黄金比（約1.6:1）に合わせて切り抜く計算
    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    
    // 画面中央の 80% の幅をターゲットにする
    const cropWidth = vWidth * 0.8;
    const cropHeight = cropWidth / 1.6;
    const startX = (vWidth - cropWidth) / 2;
    const startY = (vHeight - cropHeight) / 2;

    canvas.width = 640; // 解析用にサイズを最適化
    canvas.height = 400;

    // 💡 ここで「枠の中だけ」をキャンバスに写し取る！
    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
    
    const data = canvas.toDataURL("image/jpeg", 0.8);
    setImgData(data);

    // カメラ停止
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
      
      {/* 上部ヘッダー */}
      <div className="p-4 flex items-center justify-between z-10 bg-black/50 backdrop-blur-md">
        <Link href="/admin/marketing" className="text-white"><ArrowLeft size={24}/></Link>
        <h1 className="text-sm font-black tracking-widest uppercase flex items-center gap-2">
          <Sparkles className="text-indigo-500" size={16}/> Business Card AI Scanner
        </h1>
        <div className="w-6"></div>
      </div>

      {/* スキャナー本体エリア */}
      <div className="relative flex-1 flex items-center justify-center bg-slate-900">
        {!imgData ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
            
            {/* 💡 枠のデザイン（ここがレベル高い演出だっぺ！） */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* 半透明のマスク */}
              <div className="absolute inset-0 bg-black/60" style={{ clipPath: 'polygon(0% 0%, 0% 100%, 10% 100%, 10% 30%, 90% 30%, 90% 70%, 10% 70%, 10% 100%, 100% 100%, 100% 0%)' }}></div>
              
              {/* 名刺の枠線 */}
              <div className="w-[85%] aspect-[1.6/1] border-2 border-indigo-400 rounded-xl relative shadow-[0_0_20px_rgba(79,70,229,0.5)]">
                {/* 四隅のコーナーガイド */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.3em] animate-pulse">Scanning...</p>
                </div>
              </div>
            </div>
            
            <p className="absolute bottom-10 text-xs text-indigo-300 font-bold bg-black/40 px-4 py-2 rounded-full">
              枠の中に名刺を合わせてくんちぇ
            </p>
          </>
        ) : (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <img src={imgData} className="w-full max-w-sm rounded-lg shadow-2xl border border-white/20" alt="captured" />
            <p className="mt-4 text-xs text-slate-500">切り抜き完了だっぺ！</p>
          </div>
        )}
      </div>

      {/* 下部操作エリア */}
      <div className="p-8 bg-black flex flex-col items-center gap-6">
        {!imgData ? (
          <button 
            onClick={capture}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-90 transition-transform"
          >
            <div className="w-full h-full bg-white rounded-full"></div>
          </button>
        ) : (
          <div className="w-full space-y-3">
            {!result ? (
              <>
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await fetch("/api/admin/ocr", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ image: imgData }),
                      });
                      const data = await res.json();
                      setResult(data);
                    } catch (err) { alert("AI解析に失敗だっぺ..."); } finally { setLoading(false); }
                  }}
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" /> : "AIでクリーンアップ解析"}
                </button>
                <button onClick={startCamera} className="w-full py-3 text-slate-500 font-bold">撮り直す</button>
              </>
            ) : (
              <div className="bg-slate-900 p-6 rounded-[2rem] border border-emerald-500/30 animate-in slide-in-from-bottom-4">
                <h3 className="text-emerald-400 font-black mb-4 flex items-center gap-2">
                   <CheckCircle2 size={18}/> 絆リストへ登録準備完了！
                </h3>
                <div className="space-y-2 text-sm mb-6">
                  <p><span className="text-slate-500">氏名:</span> {result.name}</p>
                  <p><span className="text-slate-500">会社:</span> {result.company}</p>
                </div>
                <button className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl">
                  絆リストに保存する
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}