// 📂 ページ: インフォメーション広場 (SaaS版)
"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { collection, query, onSnapshot, doc, getDoc, orderBy, where, limit, addDoc, startAfter, getDocs, deleteDoc } from "firebase/firestore";
import { LogOut, ArrowLeft, Megaphone, Calendar, MapPin, ExternalLink, Tag, Plus, Clock, Trash2, ChevronDown, Building2 } from "lucide-react";

// ★スーパー管理者のメールアドレス
const SUPER_ADMIN_EMAIL = "hey870desu@gmail.com"; 

type EventData = { id: string; title: string; date: string; venueName?: string; tenantId?: string; branchTag?: string; status?: string; createdAt?: any; };
type NewsItem = { id: string; content: string; createdAt: any; createdBy: string; };

export default function InfoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // テナント情報
  const [myTenantId, setMyTenantId] = useState<string>("");
  const [myTenantName, setMyTenantName] = useState<string>("");

  // イベント用
  const [events, setEvents] = useState<EventData[]>([]);
  
  // ニュース用
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newPostContent, setNewPostContent] = useState(""); 
  const [lastDoc, setLastDoc] = useState<any>(null); 
  const [hasMore, setHasMore] = useState(false); 
  const [isPosting, setIsPosting] = useState(false);

  const router = useRouter();

  // 1. 初期データロード
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) { router.push("/admin/login"); return; }
      setUser(currentUser);

      try {
        // (A) ユーザーのテナントIDを取得
        let tid = "demo";
        const userDoc = await getDoc(doc(db, "admin_users", currentUser.email!));
        
        if (userDoc.exists()) {
          tid = userDoc.data().tenantId || "demo";
        } else if (currentUser.email === SUPER_ADMIN_EMAIL) {
          tid = "super_admin"; // 特権
        }
        setMyTenantId(tid);

        // (B) テナント名取得
        if (tid !== "super_admin" && tid !== "demo") {
           try {
             const tSnap = await getDoc(doc(db, "tenants", tid));
             if (tSnap.exists()) {
               setMyTenantName(tSnap.data().name || tid);
             } else {
               setMyTenantName(tid);
             }
           } catch(e) { console.log("Tenant fetch error", e); }
        } else if (tid === "super_admin") {
           setMyTenantName("システム管理者");
        } else {
           setMyTenantName("デモ環境");
        }

        // (C) ニュースの初回取得（エラーでも止まらないようにする）
        try {
           await fetchFirstBatchNews();
        } catch (e) { console.log("News fetch error", e); }

      } catch (e) {
        console.error("初期化エラー:", e);
      } finally {
        // ★★★ これが修正の肝です！何があっても必ずローディングを終わらせる ★★★
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // 2. イベント取得（テナントIDが確定してから）
  useEffect(() => {
    if (!myTenantId) return;

    // ★SaaS化: 自分のテナントの公開イベントだけを取得
    // スーパー管理者は全イベントが見れるようにしても良いが、今回は「自分の会社のイベント」にフォーカス
    let qEvents;
    
    if (myTenantId === "super_admin") {
       // 管理者は全部見る
       qEvents = query(collection(db, "events"), where("status", "==", "published"), orderBy("date", "desc"));
    } else {
       // 一般ユーザーは自社のイベントのみ
       qEvents = query(
         collection(db, "events"), 
         where("tenantId", "==", myTenantId), 
         where("status", "==", "published"), 
         orderBy("date", "desc")
       );
    }

    const unsub = onSnapshot(qEvents, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as EventData[];
      setEvents(data);
      setLoading(false);
    });

    return () => unsub();
  }, [myTenantId]);


  // --- ニュース機能（以下変更なし） ---

  const fetchFirstBatchNews = async () => {
    try {
      // コレクションがない場合や権限エラーでも止まらないようにする
      const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(10));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NewsItem[];
      setNewsList(data);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]); 
      setHasMore(snapshot.docs.length === 10); 
    } catch (e) {
      console.log("News fetch error (ignore):", e);
      setNewsList([]); // エラーなら空でOK
    }
  };

  const fetchMoreNews = async () => {
    if (!lastDoc) return;
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(10));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NewsItem[];
    setNewsList(prev => [...prev, ...data]); 
    setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    setHasMore(snapshot.docs.length === 10);
  };

  const handlePostNews = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    try {
      await addDoc(collection(db, "announcements"), {
        content: newPostContent,
        createdAt: new Date(),
        createdBy: user?.email
      });
      setNewPostContent("");
      fetchFirstBatchNews(); 
      alert("投稿しました！");
    } catch (e) { alert("投稿に失敗しました"); } finally { setIsPosting(false); }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("この記事を削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
      setNewsList(prev => prev.filter(item => item.id !== id)); 
    } catch(e) { alert("削除失敗"); }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "";
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isNewEvent = (createdAt: any) => {
    if (!createdAt) return false;
    const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) <= 3; 
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <button onClick={() => router.push("/admin")} className="hover:bg-slate-800 p-2 rounded-full transition-colors">
               <ArrowLeft />
             </button>
             <h1 className="text-xl font-bold text-white flex items-center gap-2"><Megaphone className="text-orange-500"/> Information</h1>
          </div>
          <button onClick={() => signOut(auth)}><LogOut/></button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        
        {/* セクション1: システム運営からのお知らせ */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-4">
             <div className="p-2 bg-indigo-500/20 rounded-lg"><Megaphone className="text-indigo-400" size={24}/></div>
             <h2 className="text-xl font-bold text-white">Event Manager SaaS からのお知らせ</h2>
          </div>

          {/* スーパー管理者のみ投稿フォーム表示 */}
          {user?.email === SUPER_ADMIN_EMAIL && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8 shadow-lg">
              <div className="text-xs text-orange-400 font-bold mb-2 flex items-center gap-1">※ ここに書くと全テナントユーザーに表示されます</div>
              <textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="システムメンテナンスや新機能のお知らせ..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 min-h-[80px]"
              />
              <div className="flex justify-end mt-2">
                <button 
                  onClick={handlePostNews} 
                  disabled={isPosting || !newPostContent.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus size={16}/> 全体配信
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {newsList.length === 0 ? (
              <div className="text-center py-10 text-slate-500 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
                まだお知らせはありません
              </div>
            ) : (
              newsList.map((item) => (
                <div key={item.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/30 transition-all relative group">
                  <div className="flex justify-between items-start mb-2">
                    <span className="flex items-center gap-2 text-xs text-indigo-300 font-mono bg-indigo-950/50 px-2 py-1 rounded border border-indigo-500/20">
                      <Clock size={12}/> {formatDate(item.createdAt)}
                    </span>
                    {user?.email === SUPER_ADMIN_EMAIL && (
                      <button onClick={() => handleDeleteNews(item.id)} className="text-slate-600 hover:text-red-400 p-1">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
                  <div className="text-slate-200 whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                    {item.content}
                  </div>
                </div>
              ))
            )}
            {hasMore && (
               <div className="flex justify-center mt-6">
                <button onClick={fetchMoreNews} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-6 py-2 rounded-full border border-slate-800 transition-all">
                  <ChevronDown size={16}/> もっと見る
                </button>
              </div>
            )}
          </div>
        </section>

        <div className="border-t border-slate-800 my-10"></div>

        {/* セクション2: 自社のイベント一覧 */}
        <section>
          <div className="flex items-center gap-3 mb-6">
             <div className="p-2 bg-emerald-500/20 rounded-lg"><Tag className="text-emerald-400" size={24}/></div>
             <h2 className="text-xl font-bold text-white">
                {myTenantName || "自社"}の公開イベント
             </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.length === 0 ? (
              <p className="text-slate-500">現在公開されているイベントはありません。</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-emerald-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2 items-center">
                      <span className="text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 font-bold flex items-center gap-1">
                        <Building2 size={10}/>
                        {ev.branchTag || "本部"}
                      </span>
                      {isNewEvent(ev.createdAt) && (
                        <span className="animate-pulse bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-red-500/50 shadow-sm">
                          NEW
                        </span>
                      )}
                    </div>
                    <a href={`/t/${ev.tenantId || "default"}/e/${ev.id}`} target="_blank" className="text-slate-500 hover:text-white">
                      <ExternalLink size={16}/>
                    </a>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {ev.title}
                  </h3>
                  <div className="text-sm text-slate-400 flex flex-col gap-1">
                    <span className="flex gap-2 items-center"><Calendar size={14}/> {ev.date}</span>
                    <span className="flex gap-2 items-center"><MapPin size={14}/> {ev.venueName || "場所未定"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}