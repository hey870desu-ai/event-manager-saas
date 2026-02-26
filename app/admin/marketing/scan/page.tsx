// 📂 app/admin/marketing/scan/page.tsx
"use client";

import { useState, useRef, useEffect } from "react"; // useEffectを足してな！
import { Camera, RefreshCw, CheckCircle2, ArrowLeft, UploadCloud, UserPlus, Building2, Mail,Link } from "lucide-react"; // アイコン追加
import { db } from "@/lib/firebase"; // ここは塙さんの環境に合わせてな！
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation"; // 移動用の道具

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
      // 💡 Pixel対応：videoWidthが取れない場合の予備サイズ
      const width = video.videoWidth || video.clientWidth;
      const height = video.videoHeight || video.clientHeight;

      const context = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;

      try {
        // 画像を描画
        context?.drawImage(video, 0, 0, width, height);
        
        // 💡 Androidのメモリ負荷を減らすために画質を0.5まで落としてみるべ
        const data = canvas.toDataURL("image/jpeg", 0.5);
        
        if (data === "data:,") { // 撮れてない時のサインだっぺ
          throw new Error("Empty image");
        }

        setImgData(data);
        
        // カメラ停止
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(t => t.stop());
        }
      } catch (err) {
        alert("写真が撮れなかったっぺ。もう一度ボタンを押してみてな！");
      }
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

  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // 💾 データベースへ保存（ここでソースを指定するっぺ！）
  const saveToKizunaList = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      // 💡 保存先を共通の「kizuna_contacts」にするのがおすすめだっぺ
      await addDoc(collection(db, "kizuna_contacts"), {
        name: result.name || "",
        company: result.company || "",
        email: result.email || "",
        source: "scan",        // ✨ これが「名刺スキャン」の看板！
        category: "sales",      // ✨ 営業ツール用のカテゴリ
        createdAt: serverTimestamp(),
        // tenantId: "塙さんのテナントID", // ログイン情報から取れるなら入れるべ！
      });

      alert("営業用の「絆」として登録したっぺ！");
      router.push("/admin/marketing"); // 終わったらリストへ戻る
    } catch (err) {
      console.error(err);
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
          <h1 className="text-xl font-bold text-white">名刺スキャン実験機</h1>
        </div>

        {/* プレビューエリア */}
        <div className="relative aspect-[3/2] bg-slate-900 rounded-2xl border-2 border-dashed border-slate-700 overflow-hidden flex items-center justify-center">
          {!imgData ? (
            <video 
  ref={videoRef} 
  autoPlay 
  playsInline 
  muted // Androidではmutedがないと自動再生されないことがあるっぺ
  onLoadedMetadata={() => console.log("カメラ準備完了だっぺ！")}
  className="w-full h-full object-cover" 
/>
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
        {/* 解析結果表示 ＆ 保存ボタン */}
        {result && (
          <div className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl animate-in zoom-in">
            <h2 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><CheckCircle2 size={18}/> 解析完了！</h2>
            
            <div className="space-y-3 mb-6">
              {/* 入力欄にしておけば、AIが間違えてもその場で直せるっぺ！ */}
              <div>
                <label className="text-[10px] text-slate-500 uppercase">お名前</label>
                <input value={result.name} onChange={(e)=>setResult({...result, name: e.target.value})} className="bg-slate-800 w-full p-2 rounded text-white outline-none focus:ring-1 ring-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase">会社名</label>
                <input value={result.company} onChange={(e)=>setResult({...result, company: e.target.value})} className="bg-slate-800 w-full p-2 rounded text-white outline-none focus:ring-1 ring-indigo-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase">メールアドレス</label>
                <input value={result.email} onChange={(e)=>setResult({...result, email: e.target.value})} className="bg-slate-800 w-full p-2 rounded text-white outline-none focus:ring-1 ring-indigo-500" />
              </div>
            </div>

            {/* ✨ 保存ボタン登場！ */}
            <button 
              onClick={saveToKizunaList} 
              disabled={isSaving}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="animate-spin" /> : <UserPlus size={20}/>}
              {isSaving ? "保存中だっぺ..." : "この内容で絆リストに登録"}
            </button>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}