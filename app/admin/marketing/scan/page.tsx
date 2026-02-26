// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UploadCloud, UserPlus } from "lucide-react";
import Link from "next/link";

export default function BusinessCardScanner() {
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 📷 カメラを起動
  const startCamera = async () => {
    setImgData(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      alert("カメラが開けねぇっぺ。ブラウザの権限設定を見てくんちぇ！");
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

  // 📸 シャッターを切る（超・力技版）
  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas) {
      const context = canvas.getContext("2d");
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;

      // 1. キャンバスに今の映像を書き込む
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 2. 画像データとして取り出す
      const data = canvas.toDataURL("image/jpeg", 0.7);
      
      // 3. データをセットする（これで画面が切り替わるはず！）
      setImgData(data);

      // 4. 【重要】カメラのストップ（これをやらないと映像が残り続けるっぺ！）
      if (video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    }
  };

  // ... analyzeImage などの関数は前のままでOK ...
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
    } catch (err) { alert("AI解析に失敗したっぺ..."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Camera className="text-indigo-500" /> 名刺スキャン
        </h1>

        {/* プレビューエリア：ここを z-index で確実に切り替えるべ！ */}
        <div className="relative aspect-[3/2] bg-slate-900 rounded-2xl border-2 border-slate-700 overflow-hidden">
          {/* 画像がない時だけビデオを出す */}
          {!imgData ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img src={imgData} className="w-full h-full object-contain animate-in fade-in duration-500" />
          )}
        </div>

        {/* 操作ボタン */}
        <div className="flex flex-col gap-3">
          {!imgData ? (
            <button 
              onClick={capture} 
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all"
            >
              シャッターを切る
            </button>
          ) : (
            <div className="space-y-3">
              <button 
                onClick={analyzeImage} 
                disabled={loading}
                className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl shadow-xl"
              >
                {loading ? "AI解析中だっぺ..." : "この名刺を解析する"}
              </button>
              <button onClick={startCamera} className="w-full py-3 bg-slate-800 text-slate-400 rounded-xl">撮り直す</button>
            </div>
          )}
        </div>

        {/* 解析結果はここから下に出るっぺ */}
        {result && (
          <div className="p-6 bg-slate-800 rounded-2xl border border-emerald-500/50 space-y-3">
            <h2 className="text-emerald-400 font-bold">解析完了だっぺ！</h2>
            <p className="text-white">名前：{result.name}</p>
            <p className="text-white">会社：{result.company}</p>
            {/* ここに「source: scan」で保存するボタンを足すべ！ */}
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}