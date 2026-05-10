"use client";

import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ArrowLeft, Save, Send, Link2, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

type Settings = {
  configured: boolean;
  enabled: boolean;
  notionApiKeyMasked: string;
  notionDatabaseId: string;
  scheduledTime: string;
  status: string;
};

const TIMES: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

export default function DxNewsletterSettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [dbId, setDbId] = useState("");
  const [time, setTime] = useState("08:00");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadSettings();
      else setLoading(false);
    });
    return () => unsub();
  }, []);

  async function getIdToken(): Promise<string | null> {
    const u = auth.currentUser;
    if (!u) return null;
    return await u.getIdToken();
  }

  async function loadSettings() {
    try {
      const idToken = await getIdToken();
      if (!idToken) return;
      const res = await fetch("/api/admin/dx-newsletter/integration", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "load error");
      setSettings(data);
      setEnabled(!!data.enabled);
      setDbId(data.notionDatabaseId || "");
      setTime(data.scheduledTime || "08:00");
    } catch (e: any) {
      setMsg({ type: "error", text: `読み込み失敗: ${e?.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setBusy("save");
    setMsg(null);
    try {
      const idToken = await getIdToken();
      const body: any = { enabled, notionDatabaseId: dbId, scheduledTime: time };
      if (token.trim()) body.notionApiKey = token.trim();
      const res = await fetch("/api/admin/dx-newsletter/integration", {
        method: "PUT",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "save error");
      setMsg({ type: "success", text: "保存しました" });
      setToken("");
      await loadSettings();
    } catch (e: any) {
      setMsg({ type: "error", text: `保存失敗: ${e?.message}` });
    } finally {
      setBusy(null);
    }
  }

  async function handleTestConnection() {
    setBusy("test-connection");
    setMsg(null);
    try {
      const idToken = await getIdToken();
      const body: any = {};
      if (token.trim()) body.notionApiKey = token.trim();
      if (dbId.trim()) body.notionDatabaseId = dbId.trim();
      const res = await fetch("/api/admin/dx-newsletter/test-connection", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data?.error || "connection failed");
      setMsg({ type: "success", text: `接続OK: 「${data.databaseTitle}」が取得できました` });
    } catch (e: any) {
      setMsg({ type: "error", text: `接続エラー: ${e?.message}` });
    } finally {
      setBusy(null);
    }
  }

  async function handleTestSend() {
    setBusy("test-send");
    setMsg(null);
    try {
      const idToken = await getIdToken();
      const res = await fetch("/api/admin/dx-newsletter/test-send", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "send error");
      setMsg({ type: "success", text: `テストメール送信: ${data.sentTo}` });
    } catch (e: any) {
      setMsg({ type: "error", text: `送信失敗: ${e?.message}` });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f111a] flex items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mr-2" /> Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-300 p-6 md:p-10 space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
        <Link href="/admin" className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white">DXメルマガ自動配信</h1>
          <p className="text-slate-400 text-sm font-medium">Notion → 絆太郎 自動連携の設定</p>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl border ${
            msg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : msg.type === "error"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-300"
          }`}
        >
          {msg.type === "success" ? <CheckCircle2 className="inline mr-2" size={16} /> : <AlertTriangle className="inline mr-2" size={16} />}
          {msg.text}
        </div>
      )}

      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl space-y-6">
        {/* 有効化トグル */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold">自動配信</div>
            <div className="text-xs text-slate-500">ONにすると、Notion DBで「🟠 配信準備完了」になった記事を自動で絆リストに配信します</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        {/* Notion API Token */}
        <div>
          <label className="block text-xs text-slate-400 font-bold mb-2">Notion APIトークン</label>
          {settings?.notionApiKeyMasked && (
            <div className="text-xs text-slate-500 mb-2 font-mono">現在: {settings.notionApiKeyMasked}</div>
          )}
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={settings?.configured ? "（変更する場合のみ入力）" : "secret_xxx..."}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pr-10 text-white outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Notion → 設定 → 内部コネクト で発行（
            <a href="https://www.notion.so/profile/integrations/internal" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
              開く
            </a>
            ）
          </div>
        </div>

        {/* Notion Database ID */}
        <div>
          <label className="block text-xs text-slate-400 font-bold mb-2">Notion Database ID</label>
          <input
            type="text"
            value={dbId}
            onChange={(e) => setDbId(e.target.value)}
            placeholder="5b51d786-c1bb-42f0-b8c9-a917008eae2d"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500 font-mono text-sm"
          />
          <div className="text-xs text-slate-500 mt-1">DBページのURL <code>https://www.notion.so/&lt;DB_ID&gt;</code> に含まれる32桁のID</div>
        </div>

        {/* 配信時刻 */}
        <div>
          <label className="block text-xs text-slate-400 font-bold mb-2">配信時刻（JST）</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500"
          >
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div className="text-xs text-slate-500 mt-1">指定時刻に絆リスト全員へ自動送信されます</div>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={handleTestConnection}
            disabled={!!busy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg font-bold flex items-center gap-2 border border-slate-700 disabled:opacity-50"
          >
            {busy === "test-connection" ? <Loader2 className="animate-spin" size={16} /> : <Link2 size={16} />}
            接続テスト
          </button>
          <button
            onClick={handleTestSend}
            disabled={!!busy}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-bold flex items-center gap-2 border border-slate-700 disabled:opacity-50"
          >
            {busy === "test-send" ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            テスト送信（自分宛）
          </button>
          <button
            onClick={handleSave}
            disabled={!!busy}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black flex items-center gap-2 ml-auto disabled:opacity-50"
          >
            {busy === "save" ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            保存
          </button>
        </div>
      </div>

      {/* セットアップガイド */}
      <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-white font-bold mb-3">セットアップガイド</h2>
        <ol className="text-sm text-slate-400 space-y-2 list-decimal pl-5">
          <li>
            Notionで <strong>記事を入れるDB</strong> を作成（プロパティ：タイトル / ステータス[Select：🟠配信準備完了, 🔵配信予約済み, 🟢配信済み, 🔴配信失敗]）
          </li>
          <li>
            <a href="https://www.notion.so/profile/integrations/internal" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
              Notion内部コネクト
            </a>
            で<strong>Internal Integration</strong>を作成 → シークレットトークンをコピー
          </li>
          <li>作成したDBの右上「⋯」→「接続」→ 上記Integrationを追加</li>
          <li>このページにトークンとDB IDを入力 → 接続テスト → テスト送信 → 保存 → 自動配信ON</li>
          <li>
            あとはNotionに記事を書いて、ステータスを <strong>🟠配信準備完了</strong> にすれば、指定時刻に絆リスト全員へ自動配信
          </li>
        </ol>
      </div>
    </div>
  );
}
