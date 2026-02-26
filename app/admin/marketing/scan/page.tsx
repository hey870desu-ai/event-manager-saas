// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UploadCloud } from "lucide-react";
import Link from "next/link";

export default function OcrScannerTest() {
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 📷 カメラを起動する
  const startCamera = async () => {
    setImgData(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" }, // 背面カメラ優先
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("カメラの起動に失敗したっぺ！ブラウザの権限を確認してくんちぇ。");
    }
  };

  // 📸 シャッターを切る（強化版だっぺ！）
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      // 1. 動画の実際のサイズが取れているか確認
      const width = video.videoWidth;
      const height = video.videoHeight;

      if (width === 0 || height === 0) {
        alert("まだカメラの準備ができてねぇっぺ！もう一回押してみてな。");
        return;
      }

      const context = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;

      try {
        // 2. キャンバスに描画
        context?.drawImage(video, 0, 0, width, height);
        
        // 3. 画像データとして抽出（画質を少し下げてAIが読みやすくするっぺ）
        const data = canvas.toDataURL("image/jpeg", 0.7);
        setImgData(data);
        
        console.log("パシャリ！撮れたぞい！");

        // 4. カメラを止める（省エネだっぺ）
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Capture error:", err);
        alert("写真が撮れなかったっぺ...ブラウザを更新してみてな！");
      }
    } else {
      alert("カメラの準備が整ってねぇぞい！");
    }
  };

  // 🧪 OCR解析に飛ばす（APIは次のステップで作るべ！）
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
      alert("解析に失敗したっぺ...");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/marketing" className="p-2 bg-slate-800 rounded-lg"><ArrowLeft size={20}/></Link>
          <h1 className="text-xl font-bold text-white">名刺スキャン実験機</h1>
        </div>

        {/* プレビューエリア */}
        <div className="relative aspect-[3/2] bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center">
          {!imgData ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={imgData} className="w-full h-full object-contain" />
          )}
          
          {/* 補助枠 */}
          {!imgData && (
            <div className="absolute inset-10 border-2 border-indigo-500/30 rounded-lg pointer-events-none flex items-center justify-center">
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">名刺をここに合わせる</p>
            </div>
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex flex-col gap-3">
          {!imgData ? (
            <button onClick={videoRef.current?.srcObject ? capture : startCamera} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
              <Camera size={24}/> {videoRef.current?.srcObject ? "シャッターを切る" : "カメラを起動"}
            </button>
          ) : (
            <>
              <button onClick={analyzeImage} disabled={loading} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? <RefreshCw className="animate-spin" /> : <UploadCloud size={24}/>}
                {loading ? "AIが解析中だっぺ..." : "この名刺を解析する"}
              </button>
              <button onClick={startCamera} className="w-full py-3 bg-slate-800 text-slate-400 font-bold rounded-xl">撮り直す</button>
            </>
          )}
        </div>

        {/* 解析結果表示 */}
        {result && (
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl animate-in zoom-in">
            <h2 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><CheckCircle2 size={18}/> 解析完了！</h2>
            <div className="space-y-3">
              <div><label className="text-[10px] text-slate-500 uppercase">お名前</label><p className="text-white font-bold">{result.name || "不明"}</p></div>
              <div><label className="text-[10px] text-slate-500 uppercase">会社名</label><p className="text-white">{result.company || "不明"}</p></div>
              <div><label className="text-[10px] text-slate-500 uppercase">メールアドレス</label><p className="text-white">{result.email || "不明"}</p></div>
            </div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}