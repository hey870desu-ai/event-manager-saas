// 📂 app/t/[tenant]/e/[event]/survey/page.tsx
// 📝 役割: イベント終了後のアンケート回答画面

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, Star, Send, CheckCircle, AlertTriangle } from "lucide-react";

export default function SurveyPage() {
  const params = useParams();
  // 配列か文字列かを判定して安全に取り出す
  const tenantId = (Array.isArray(params?.tenant) ? params.tenant[0] : params?.tenant) || "";
  const eventId = (Array.isArray(params?.event) ? params.event[0] : params?.event) || "";

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 回答データ
  const [answers, setAnswers] = useState<{[key: string]: any}>({});
  const [rating, setRating] = useState(0); // 星評価 (1-5)

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        const docRef = doc(db, "events", eventId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setEvent(snap.data());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleAnswerChange = (label: string, value: any) => {
    setAnswers(prev => ({ ...prev, [label]: value }));
  };

  const handleCheckboxChange = (label: string, value: string, checked: boolean) => {
    setAnswers(prev => {
      const currentList = prev[label] || [];
      if (checked) {
        return { ...prev, [label]: [...currentList, value] };
      } else {
        return { ...prev, [label]: currentList.filter((v: string) => v !== value) };
      }
    });
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    // 必須チェックボックス（同意など）は素のHTMLでは強制できないため、ここで検証する。
    // ※テキスト・選択・記述式は input/select の required 属性でブラウザが先に検証する
    const requiredCheckMissing = (event?.surveyFields || []).find((f: any) => {
      if (f.type !== "checkbox" || !f.required) return false;
      const v = answers[f.label];
      return !v || (Array.isArray(v) && v.length === 0);
    });
    if (requiredCheckMissing) {
      alert(`「${String(requiredCheckMissing.label).slice(0, 40)}…」は必須です。チェックを入れてください。`);
      return;
    }
    setSubmitting(true);

    try {
      // 質問ラベルを「キー」にするとFirestoreのフィールド名1500バイト制限を超えて
      // 「invalid nested entity」エラーになる（長文の同意質問等）。
      // 申込フォーム(customAnswers)と同様に配列形式 [{label, value}] で保存する。
      const answersArray = Object.entries(answers).map(([label, value]) => ({ label, value }));
      // iPhone対策: undefined を null に変換して掃除
      const cleanAnswers = JSON.parse(JSON.stringify(answersArray, (key, value) => {
        if (value === undefined) return null;
        return value;
      }));

      // フィードバック保存
      await addDoc(collection(db, "events", eventId, "feedbacks"), {
        rating,
        answers: cleanAnswers, // 配列形式 [{label, value}]
        createdAt: serverTimestamp(),
        tenantId,
        eventId,
        eventTitle: event.title || "不明なイベント"
      });
      
      setCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      console.error("Error:", error);
      // エラーの詳細をアラートに出して確認しやすくする
      alert(`送信に失敗しました。\nエラー内容: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">読み込み中...</div>;
  if (!event) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">イベントが見つかりません</div>;

  // --- 完了画面 ---
  if (completed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md w-full animate-in zoom-in-95">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center">
               <CheckCircle size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">回答完了</h2>
          <p className="text-slate-400 mb-8">貴重なご意見ありがとうございました。<br/>今後の運営の参考にさせていただきます。</p>
          <button onClick={() => window.close()} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold transition-colors">
            画面を閉じる
          </button>
        </div>
      </div>
    );
  }

  // 設定されたアンケート項目（なければデフォルトを表示）
  const surveyFields = event.surveyFields || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      <header className="bg-slate-900/50 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
           <MessageSquare className="text-emerald-400" size={20}/>
           <h1 className="font-bold text-white truncate">アンケート: {event.title}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-200 flex gap-3">
           <AlertTriangle size={20} className="shrink-0 mt-0.5"/>
           <div>
             <p className="font-bold mb-1">ご協力のお願い</p>
             <p className="opacity-80">本日はご参加ありがとうございました。より良いイベント運営のため、アンケートへのご協力をお願いいたします。（所要時間：約1分）</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. 全体的な満足度 (固定) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <label className="block text-sm font-bold text-slate-300 mb-4 text-center">
              本日のイベントはいかがでしたか？
              <span className="ml-2 text-xs text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded align-middle">任意</span>
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`transition-all transform hover:scale-110 ${rating >= star ? "text-yellow-400" : "text-slate-700"}`}
                >
                  <Star size={40} fill={rating >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            <div className="flex justify-between px-4 mt-2 text-xs text-slate-500 font-bold">
               <span>不満</span>
               <span>満足</span>
            </div>
          </div>

          {/* 2. カスタム質問エリア */}
          {surveyFields.map((field: any, index: number) => (
            <div key={index} className="space-y-3">
               {field.type !== 'link' && (
                 <label className="block text-sm font-bold text-slate-300">
                   <span className="text-emerald-400 mr-2">Q{index + 1}.</span>
                   <span className="whitespace-pre-wrap">{field.label}</span>
                   {field.required && <span className="ml-2 text-xs text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">必須</span>}
                 </label>
               )}

               {field.type === 'text' && (
                 <input
                   type="text"
                   required={field.required}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                   onChange={(e) => handleAnswerChange(field.label, e.target.value)}
                 />
               )}

               {field.type === 'textarea' && (
                 <textarea
                   rows={3}
                   required={field.required}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                   onChange={(e) => handleAnswerChange(field.label, e.target.value)}
                 />
               )}

               {field.type === 'select' && (
                 <select
                   required={field.required}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                   onChange={(e) => handleAnswerChange(field.label, e.target.value)}
                 >
                   <option value="">選択してください</option>
                   {field.options?.map((opt: string) => (
                     <option key={opt} value={opt}>{opt}</option>
                   ))}
                 </select>
               )}

               {field.type === 'checkbox' && (
                 <div className="space-y-2">
                    {field.options?.map((opt: string) => (
                      <label key={opt} className="flex items-center gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                          onChange={(e) => handleCheckboxChange(field.label, opt, e.target.checked)}
                        />
                        <span className="text-sm text-slate-300">{opt}</span>
                      </label>
                    ))}
                 </div>
               )}

               {field.type === 'link' && field.optionsString && (
                 <a
                   href={field.optionsString}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors text-sm"
                 >
                   {field.label || 'リンクを開く'} →
                 </a>
               )}
            </div>
          ))}

          {/* 3. 送信ボタン */}
          <div className="pt-4">
             <button
               type="submit"
               disabled={submitting}
               className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {submitting ? "送信中..." : <><Send size={20}/> アンケートを送信する</>}
             </button>
          </div>
        </form>
      </main>
    </div>
  );
}