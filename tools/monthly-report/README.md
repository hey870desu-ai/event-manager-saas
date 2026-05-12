# 月次レポート用データ集計スクリプト

DX変革パッケージ（A+案）契約テナント向けの月次レポートを生成するためのデータ集計ツール。

## 概要

各種データソース（Resend / Notion / GA4 / Search Console / Firestore / LINE）から月次KPIを取得し、JSONで出力する。

## ディレクトリ構成

```
tools/monthly-report/
├── README.md                # このファイル
├── requirements.txt         # Python依存
├── .env.example             # 環境変数テンプレ
├── .env                     # 実値（gitignore済）
├── credentials/             # 認証ファイル（gitignore済）
│   ├── firebase.json
│   └── google-cloud.json
├── collect.py               # メインスクリプト
└── output/                  # JSON出力先（gitignore済）
```

## セットアップ手順（初回のみ・約30〜60分）

### 1. Python仮想環境を作る

```bash
cd /Users/hanawahiroyuki/Downloads/event-manager-saas/tools/monthly-report
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. .env を作る

```bash
cp .env.example .env
# エディタで .env を開いて値を記入
```

各環境変数の取得元：

| 変数 | 取得方法 |
|---|---|
| `RESEND_API_KEY` | Vercel環境変数の同名値、または resend.com → API Keys |
| `NOTION_API_KEY` | Vercel環境変数の同名値 |
| `NOTION_BLOG_DATABASE_ID` | デフォルト `891ea871-415a-4614-be8f-cdb6f17079e4` |
| `NOTION_NEWSLETTER_DATABASE_ID` | デフォルト `5b51d786-c1bb-42f0-b8c9-a917008eae2d` |
| `GA4_PROPERTY_ID` | GA4管理画面 → プロパティ設定 → プロパティID |
| `SEARCH_CONSOLE_SITE_URL` | `sc-domain:hana-hiro.com` または `https://www.hana-hiro.com/` |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console → Messaging API → Channel access token |

### 3. Firebase サービスアカウント

1. https://console.firebase.google.com → プロジェクト → 設定 → サービスアカウント
2. 「新しい秘密鍵の生成」→ JSONダウンロード
3. `credentials/firebase.json` に保存

### 4. Google Cloud サービスアカウント（GA4 / Search Console共通）

#### A. サービスアカウント作成

1. https://console.cloud.google.com → プロジェクト選択（or 新規作成）
2. APIとサービス → 認証情報 → 「認証情報を作成」→ サービスアカウント
3. 名前: `monthly-report-collector` など
4. 権限は付与不要（あとでGA4/Search Console側で個別に付与）
5. 完成後、サービスアカウントを開いて「キー」タブ → 「鍵を追加」→ JSON
6. `credentials/google-cloud.json` に保存

#### B. APIを有効化

1. APIとサービス → ライブラリ
2. 以下を検索して有効化：
   - **Google Analytics Data API**
   - **Google Search Console API**

#### C. GA4側にサービスアカウントを招待

1. GA4管理画面 → 管理 → プロパティ → アクセス管理
2. サービスアカウントのメールアドレス（`xxx@yyy.iam.gserviceaccount.com`）を「閲覧者」で招待

#### D. Search Console側にサービスアカウントを招待

1. https://search.google.com/search-console → プロパティ選択
2. 設定 → ユーザーと権限 → ユーザー追加
3. サービスアカウントのメールアドレスを「制限付き」で追加

## 使い方

```bash
source .venv/bin/activate

# 前月分（デフォルト）を集計
python3 collect.py

# 特定の月を指定
python3 collect.py --month 2026-05

# 別テナントを指定
python3 collect.py --tenant some-tenant --month 2026-05
```

出力例：

```
📊 集計開始: tenant=caredesignworks, month=2026-05
  → Resend (メルマガ)...
  → Notion (投稿本数)...
  → GA4 (ブログKPI)...
  → Search Console (検索流入)...
  → Firestore...
  → LINE...
✅ 出力完了: output/caredesignworks-2026-05.json

==================================================
  メルマガ送信: 12件 (開封率 42.5%)
  ブログ投稿:   22本 / PV 1,234
  配信先:       145名
  問い合わせ:   8件
  LINE友達:     32名
==================================================
```

## 月次レポート作成フロー

1. **月初2-3日に実行**：`python3 collect.py --month <前月>`
2. **JSON出力を確認**：`output/{tenant}-{month}.json`
3. **Notion月次レポートテンプレを複製**：📊 月次レポートテンプレ
4. **JSONの数字をテンプレにコピー**（手動 or 将来自動化）
5. **手書きセクションを記入**：
   - エグゼクティブサマリー
   - 経営者の哲学アップデート
   - 来月の運用提案
   - スタッフ反応エピソード
6. **PDFエクスポート → 顧客に提出**

## 既知の制限・今後の改善

- **LINE開封率は取得不可**（Messaging API仕様）
  - 代替: スタッフのスタンプ・返信を能動シグナルとして手動カウント
- **Resend API のページネーション**: 現在最新100件まで。テナント別タグでフィルター推奨
- **Phase 3で AI下書き生成を実装予定**: JSON → Claude → Notionに直接プリ入力

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `RESEND_API_KEYが未設定` | .envに値がない | 値を記入 |
| `GA4取得エラー: 403` | サービスアカウント未招待 | GA4管理画面で閲覧者として招待 |
| `Search Console: 403` | プロパティ権限なし | Search Consoleでユーザー追加 |
| `Firestore: permission denied` | サービスアカウントの権限不足 | プロジェクト編集者または Firestore閲覧権限を付与 |

## ファイル所在の関連メモ

- 商品全体: project_dx_henkaku_saas.md
- 月次レポートテンプレ: https://www.notion.so/35c9fa5fa78b81e8b6d1e2ad7e855be5
