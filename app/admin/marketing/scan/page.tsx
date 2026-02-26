"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, Sparkles, Smartphone, Mail, Building2, UserCircle } from "lucide-react";
import Link from "next/link";
import { createWorker } from "tesseract.js";

export default function RealTimeOCRScanner() {
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [textBlocks, setTextBlocks] = useState<{x: number, y: number, w: number, h: number}[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 📷 リアルタイムで文字を探す「眼」のループ
  useEffect(() => {
    let isRunning = true;
    const detectText = async () => {
      if (!videoRef.current || imgData) return;
      
      const worker = await createWorker('jpn+eng');
      while (isRunning && !imgData) {
        if (videoRef.current && videoRef.current.readyState === 4) {
          // ビデオの今の瞬間を解析
          const { data: { blocks } } = await worker.recognize(videoRef.current);
          const boxes = blocks?.map(b => ({
            x: b.bbox.x0, y: b.bbox.y0, w: b.bbox.x1 - b.bbox.x0, h: b.bbox.y1 - b.bbox.y0
          })) || [];
          setTextBlocks(boxes);
        }
        await new Promise(r => setTimeout(r, 800)); // 負荷軽減のため少し間隔を空ける
      }
      await worker.terminate();
    };

    startCamera();
    detectText();
    return () => { isRunning = false; };
  }, [imgData]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: 1280, height: 720 } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("カメラ起動失敗だっぺ"); }
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    setImgData(canvas.toDataURL("image/jpeg", 0.9));
    (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* 🚀 ヘッダー：プロの計測器感 */}
      <div className="p-4 flex items-center justify-between bg-zinc-900/90 border-b border-indigo-500/30">
        <Link href="/admin/marketing"><ArrowLeft size={24}/></Link>
        <div className="text-center">
          <p className="text-[10px] text-indigo-400 font-black tracking-widest uppercase">Deep Vision Engine v2.0</p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
            <p className="text-[8px] text-slate-400 uppercase">Live Detection Active</p>
          </div>
        </div>
        <div className="w-8"></div>
      </div>

      {/* 📸 メインスキャンビュー */}
      <div className="relative flex-1 bg-[#050505] flex items-center justify-center">
        {!imgData ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
            
            {/* 💡 文字の場所をピリピリと縁取るオーバーレイ */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {textBlocks.map((box, i) => (
                <rect 
                  key={i}
                  x={`${(box.x / (videoRef.current?.videoWidth || 1)) * 100}%`}
                  y={`${(box.y / (videoRef.current?.videoHeight || 1)) * 100}%`}
                  width={`${(box.w / (videoRef.current?.videoWidth || 1)) * 100}%`}
                  height={`${(box.h / (videoRef.current?.videoHeight || 1)) * 100}%`}
                  className="fill-none stroke-cyan-400 stroke-[1.5] animate-[pripri_0.3s_infinite]"
                  style={{ filter: 'drop-shadow(0 0 5px #22d3ee)' }}
                />
              ))}
            </svg>

            {/* ターゲットフレーム */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[85%] aspect-[1.6/1] border border-white/10 rounded-xl relative">
                <div className="absolute inset-0 border-2 border-indigo-500/20 rounded-xl animate-pulse"></div>
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
              </div>
            </div>
          </>
        ) : (
          <img src={imgData} className="max-w-full max-h-full object-contain" />
        )}
      </div>

      {/* 🕹️ 操作パネル */}
      <div className="p-8 bg-zinc-900 border-t border-white/5">
        {!imgData ? (
          <button onClick={capture} className="w-20 h-20 mx-auto bg-white rounded-full p-1 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
            <div className="w-full h-full border-4 border-black rounded-full flex items-center justify-center">
               <Camera size={32} className="text-black" />
            </div>
          </button>
        ) : (
          <div className="space-y-4">
             <button 
               onClick={async () => {
                 setLoading(true);
                 try {
                   const res = await fetch("/api/admin/ocr", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ image: imgData }),
                   });
                   setResult(await res.json());
                 } catch (e) { alert("解析失敗だっぺ"); }
                 setLoading(false);
               }}
               className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2 shadow-xl"
             >
               {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={20} />}
               {loading ? "極精密スキャン中..." : "抽出を開始する"}
             </button>
             <button onClick={() => {setImgData(null); startCamera();}} className="w-full text-slate-500 text-sm font-bold">撮り直す</button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes pripri {
          0%, 100% { opacity: 0.8; stroke-width: 1.5; }
          50% { opacity: 1; stroke-width: 2.5; }
        }
      `}</style>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}