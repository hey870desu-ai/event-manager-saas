"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { doc, getDoc, addDoc, collection, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ClipboardList, Send, CheckCircle, AlertTriangle } from "lucide-react";
import { Suspense } from "react";

function PreSurveyContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = (Array.isArray(params?.tenant) ? params.tenant[0] : params?.tenant) || "";
  const eventId = (Array.isArray(params?.event) ? params.event[0] : params?.event) || "";
  const reservationId = searchParams.get("rid") || "";

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [answers, setAnswers] = useState<{[key: string]: any}>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        const docRef = doc(db, "events", eventId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setEvent(snap.data());
        }

        // 既に回答済みかチェック
        if (reservationId) {
          const q = query(
            collection(db, "events", eventId, "pre_feedbacks"),
            where("reservationId", "==", reservationId)
          );
          const existing = await getDocs(q);
          if (!existing.empty) {
            setAlreadyAnswered(true);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, reservationId]);

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
    setSubmitting(true);

    try {
      // 保存形式: 連番キーのマップ {"0":{label,value}, ...}
      //  - マップ型なので「answersはマップ」を要求するFirestoreルールを通る
      //  - ラベルは"値"側なので、長文質問でもフィールド名1500バイト制限に当たらない
      const answersMap: { [k: string]: { label: string; value: any } } = {};
      Object.entries(answers).forEach(([label, value], i) => {
        answersMap[String(i)] = { label, value };
      });
      const cleanAnswers = JSON.parse(JSON.stringify(answersMap, (_key, value) => {
        if (value === undefined) return null;
        return value;
      }));

      await addDoc(collection(db, "events", eventId, "pre_feedbacks"), {
        answers: cleanAnswers,
        reservationId: reservationId || null,
        createdAt: serverTimestamp(),
        tenantId,
        eventId,
        eventTitle: event.title || ""
      });

      setCompleted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error: any) {
      console.error("Error:", error);
      alert(`送信に失敗しました。\n${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">読み込み中...</div>;
  if (!event) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">イベントが見つかりません</div>;

  const preSurveyFields = event.preSurveyFields || [];

  if (preSurveyFields.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 p-6">
        <div className="text-center">
          <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
          <p>事前アンケートは設定されていません。</p>
        </div>
      </div>
    );
  }

  if (completed || alreadyAnswered) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-md w-full animate-in zoom-in-95">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-purple-500/20 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-20 h-20 bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center">
               <CheckCircle size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {alreadyAnswered && !completed ? "回答済みです" : "回答完了"}
          </h2>
          <p className="text-slate-400 mb-8">
            {alreadyAnswered && !completed
              ? "事前アンケートは既にご回答いただいております。ありがとうございました。"
              : "ご回答ありがとうございました。イベント当日をお楽しみに！"
            }
          </p>
          <button onClick={() => window.close()} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-6 py-3 rounded-xl font-bold transition-colors">
            画面を閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      <header className="bg-slate-900/50 backdrop-blur border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center gap-3">
           <ClipboardList className="text-purple-400" size={20}/>
           <h1 className="font-bold text-white truncate">事前アンケート: {event.title}</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 space-y-8">
        <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-4 text-sm text-purple-200 flex gap-3">
           <AlertTriangle size={20} className="shrink-0 mt-0.5"/>
           <div>
             <p className="font-bold mb-1">事前アンケートのお願い</p>
             <p className="opacity-80">イベントをより充実した内容にするため、事前アンケートへのご協力をお願いいたします。（所要時間：約1分）</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {preSurveyFields.map((field: any, index: number) => (
            <div key={index} className="space-y-3">
               {field.type !== 'link' && (
                 <label className="block text-sm font-bold text-slate-300">
                   <span className="text-purple-400 mr-2">Q{index + 1}.</span>
                   <span className="whitespace-pre-wrap">{field.label}</span>
                   {field.required && <span className="ml-2 text-xs text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">必須</span>}
                 </label>
               )}

               {field.type === 'text' && (
                 <input
                   type="text"
                   required={field.required}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                   onChange={(e) => handleAnswerChange(field.label, e.target.value)}
                 />
               )}

               {field.type === 'textarea' && (
                 <textarea
                   rows={3}
                   required={field.required}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                   onChange={(e) => handleAnswerChange(field.label, e.target.value)}
                 />
               )}

               {field.type === 'select' && (
                 <select
                   required={field.required}
                   className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
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
                          className="w-5 h-5 rounded border-slate-600 bg-slate-800 accent-purple-500"
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
                   className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition-colors text-sm"
                 >
                   {field.label || 'リンクを開く'} →
                 </a>
               )}
            </div>
          ))}

          <div className="pt-4">
             <button
               type="submit"
               disabled={submitting}
               className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             >
               {submitting ? "送信中..." : <><Send size={20}/> 回答を送信する</>}
             </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function PreSurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <PreSurveyContent />
    </Suspense>
  );
}
