"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, Sparkles, Phone, Building2, UserCircle, Mail, Tag, Smartphone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfessionalScanner() {
  const router = useRouter();
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // カメラ起動（Google Pixel/iPhoneの解像度を最大限活かすっぺ）
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
      alert("カメラが見つかんねぇぞい。ブラウザの権限を確認してな！");
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

  // シャッター ＆ 自動クロップ（枠の中だけを「クリーンアップ」して抽出！）
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vWidth = video.videoWidth;
    const vHeight = video.videoHeight;
    const cropWidth = vWidth * 0.85;
    const cropHeight = cropWidth / 1.6;
    const startX = (vWidth - cropWidth) / 2;
    const startY = (vHeight - cropHeight) / 2;

    // AIが読みやすいサイズ（1280px）でくっきり描画
    canvas.width = 1280;
    canvas.height = 800;
    ctx.filter = "contrast(1.2) brightness(1.1) saturate(0)"; // 💡白黒強調でOCR精度UP！
    ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, 1280, 800);
    
    setImgData(canvas.toDataURL("image/jpeg", 0.95));
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
      alert("AI解析に失敗だっぺ。明るい場所でもう一度試してな！");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans overflow-hidden">
      {/* ヘッダー：営業ツールとしての高級感 */}
      <div className="p-4 flex items-center justify-between z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <Link href="/admin/marketing" className="p-2 hover:bg-white/10 rounded-full transition-all"><ArrowLeft size={24}/></Link>
        <div className="text-center">
          <h1 className="text-[10px] font-black tracking-[0.4em] uppercase text-indigo-500">Kizuna AI OCR Engine</h1>
          <p className="text-[8px] text-slate-500 tracking-widest">Powered by Google & OpenAI</p>
        </div>
        <div className="w-10"></div>
      </div>

      {/* メインビュー */}
      <div className="relative flex-1 flex items-center justify-center bg-[#0a0a0a]">
        {!imgData ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-70" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* 枠のデザイン */}
              <div className="w-[90%] aspect-[1.6/1] border border-white/10 rounded-2xl relative shadow-[0_0_100px_rgba(0,0,0,0.9)]">
                <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-indigo-500 rounded-tl-2xl"></div>
                <div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-indigo-500 rounded-tr-2xl"></div>
                <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-indigo-500 rounded-bl-2xl"></div>
                <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-indigo-500 rounded-br-2xl"></div>
                
                {/* 補助メッセージ */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <p className="text-[10px] text-indigo-400 font-bold tracking-[0.2em] animate-pulse">名刺を枠内に静止させてくんちぇ</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-slate-950">
            <img src={imgData} className={`w-full max-w-sm rounded-lg shadow-2xl transition-all duration-1000 ${loading ? 'brightness-50 grayscale' : ''}`} alt="captured" />
            
            {/* 💡 スキャンアニメーション：青いレーザーが上下するっぺ！ */}
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="w-full max-w-sm h-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee] absolute z-20 animate-[scanLine_2.5s_infinite]"></div>
                <div className="mt-56 flex flex-col items-center gap-2">
                   <RefreshCw className="animate-spin text-cyan-400" size={24} />
                   <p className="text-cyan-400 text-[10px] font-black tracking-[0.5em]">DIGITIZING...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ボタンパネル */}
      <div className="p-8 bg-black/95 border-t border-white/5">
        {!imgData ? (
          <button onClick={capture} className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]">
            <div className="w-[85%] h-[85%] border-2 border-black rounded-full"></div>
          </button>
        ) : !result ? (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
            <button onClick={analyzeImage} disabled={loading} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-indigo-500/20">
              {loading ? <RefreshCw className="animate-spin" /> : <Sparkles size={20}/>}
              {loading ? "Google AIが解析中だっぺ" : "AIスキャンを開始する"}
            </button>
            <button onClick={startCamera} className="text-slate-500 text-xs font-bold py-2">撮り直す</button>
          </div>
        ) : (
          /* 抽出結果：役職も電話も全部出すべ！ */
          <div className="bg-slate-900/80 p-6 rounded-3xl border border-indigo-500/30 space-y-4 animate-in zoom-in duration-500">
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <UserCircle size={16} className="text-indigo-400"/>
                <input value={result.name} onChange={e=>setResult({...result, name:e.target.value})} className="bg-transparent font-bold text-white text-sm outline-none w-full" placeholder="名前"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <Building2 size={16} className="text-indigo-400"/>
                <input value={result.company} onChange={e=>setResult({...result, company:e.target.value})} className="bg-transparent text-white text-sm outline-none w-full" placeholder="会社名"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <Tag size={16} className="text-indigo-400"/>
                <input value={result.title} onChange={e=>setResult({...result, title:e.target.value})} className="bg-transparent text-white text-sm outline-none w-full" placeholder="役職"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <Mail size={16} className="text-indigo-400"/>
                <input value={result.email} onChange={e=>setResult({...result, email:e.target.value})} className="bg-transparent text-white text-sm outline-none w-full" placeholder="メール"/>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                <Smartphone size={16} className="text-indigo-400"/>
                <input value={result.phone} onChange={e=>setResult({...result, phone:e.target.value})} className="bg-transparent text-white text-sm outline-none w-full" placeholder="電話番号"/>
              </div>
            </div>
            <button className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-black rounded-xl shadow-xl active:scale-95 transition-all">
              「絆リスト」に営業データ登録
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0% { top: 20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
      `}</style>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}