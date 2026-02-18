"use client";

import { useEffect, useState } from "react";
import { 
  collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Mail, CheckCircle2, AlertCircle, Search, Clock, 
  MessageSquare, User, Building, X 
} from "lucide-react";

// 型定義
type Contact = {
  id: string;
  name: string;
  email: string;
  company?: string;
  message: string;
  status: "unread" | "in_progress" | "done"; // ステータス
  responseNote?: string; // 対応メモ
  createdAt: any;
};

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [noteInput, setNoteInput] = useState(""); // メモ入力用

  // データ取得
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "contacts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Contact[];
      setContacts(data);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  // 詳細を開く
  const handleOpenDetail = (contact: Contact) => {
    setSelectedContact(contact);
    setNoteInput(contact.responseNote || ""); // 既存のメモがあればセット
  };

  // ステータス更新 & メモ保存
  const handleUpdateStatus = async (newStatus: Contact["status"]) => {
    if (!selectedContact) return;
    
    try {
      const docRef = doc(db, "contacts", selectedContact.id);
      await updateDoc(docRef, {
        status: newStatus,
        responseNote: noteInput,
        updatedAt: serverTimestamp(),
      });

      // 画面上のデータを更新
      setContacts((prev) =>
        prev.map((c) =>
          c.id === selectedContact.id
            ? { ...c, status: newStatus, responseNote: noteInput }
            : c
        )
      );
      setSelectedContact(null); // 閉じる
      alert("更新しました");
    } catch (error) {
      console.error("Update failed:", error);
      alert("更新に失敗しました");
    }
  };

  // 日付フォーマット関数
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    const date = timestamp.toDate();
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
          <Mail className="text-indigo-600" /> お問い合わせ管理
        </h1>

        {/* リスト表示エリア */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
              <tr>
                <th className="p-4 w-24">ステータス</th>
                <th className="p-4 w-40">受信日時</th>
                <th className="p-4 w-48">お名前 / 会社</th>
                <th className="p-4">内容</th>
                <th className="p-4 w-20">詳細</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">読み込み中...</td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">お問い合わせはまだありません</td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr 
                    key={contact.id} 
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => handleOpenDetail(contact)}
                  >
                    <td className="p-4">
                      {contact.status === "done" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                          <CheckCircle2 size={12}/> 対応済
                        </span>
                      ) : contact.status === "in_progress" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-600 text-xs font-bold border border-blue-200">
                          <Clock size={12}/> 対応中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold border border-red-200 animate-pulse">
                          <AlertCircle size={12}/> 未対応
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500 font-medium whitespace-nowrap">
                      {formatDate(contact.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800">{contact.name}</div>
                      <div className="text-xs text-slate-500">{contact.company || "-"}</div>
                    </td>
                    <td className="p-4 text-slate-600 truncate max-w-xs">
                      {contact.message}
                    </td>
                    <td className="p-4 text-center">
                      <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full">
                        <Search size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            
            {/* モーダルヘッダー */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <MessageSquare className="text-indigo-600"/> お問い合わせ詳細
                </h2>
                <div className="text-sm text-slate-500 mt-1">ID: {selectedContact.id}</div>
              </div>
              <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-slate-700 p-1">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* 送信者情報 */}
              <div className="grid md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><User size={12}/> お名前</label>
                  <p className="font-bold text-lg">{selectedContact.name}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Building size={12}/> 会社名</label>
                  <p className="font-bold text-slate-700">{selectedContact.company || "なし"}</p>
                </div>
                <div className="md:col-span-2">
                   <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Mail size={12}/> メールアドレス</label>
                   <a href={`mailto:${selectedContact.email}`} className="text-indigo-600 underline font-medium hover:text-indigo-800">
                     {selectedContact.email}
                   </a>
                   <p className="text-xs text-slate-400 mt-1">※クリックでメーラーが起動します</p>
                </div>
              </div>

              {/* メッセージ本文 */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">お問い合わせ内容</label>
                <div className="bg-white border border-slate-200 p-4 rounded-xl text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedContact.message}
                </div>
              </div>

              {/* 社内対応メモエリア */}
              <div className="border-t border-slate-100 pt-6">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                   <CheckCircle2 size={16} className="text-emerald-500"/> 対応記録 / 社内メモ
                </label>
                <textarea
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  rows={4}
                  placeholder="例: 〇〇様に対応メール送信済み。返信待ち。"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                ></textarea>
                <p className="text-xs text-slate-400 mt-2">※ここに入力した内容はユーザーには見えません。</p>
              </div>
            </div>

            {/* モーダルアクション */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
               {/* 対応中ボタン */}
               <button 
                onClick={() => handleUpdateStatus("in_progress")}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100"
              >
                対応中にする
              </button>
              
              {/* 完了ボタン */}
              <button 
                onClick={() => handleUpdateStatus("done")}
                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
              >
                記録して完了にする
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}