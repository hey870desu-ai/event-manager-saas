"""月次レポート用データ集計スクリプト.

使い方:
    python3 collect.py --tenant caredesignworks --month 2026-05

出力:
    output/{tenant}-{month}.json  各種KPIをまとめたJSON
    （NOTION_REPORT_DATABASE_ID指定時はNotionにもプリ入力）

データソース:
    - Resend API: メルマガKPI（配信回数・開封率・クリック率）
    - Notion: ブログ・メルマガ投稿本数
    - Firebase/Firestore: 配信先数・問い合わせ件数
    - GA4 Data API: ブログPV・滞在時間・直帰率
    - Search Console API: 検索流入キーワード
    - LINE Messaging API: ブロードキャスト統計
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

JST = timezone(timedelta(hours=9))


def load_env() -> None:
    """Load .env from current directory."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        print("⚠ python-dotenv が未インストール。pip install -r requirements.txt", file=sys.stderr)
        return
    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        print(f"⚠ .env が見つかりません: {env_path}", file=sys.stderr)


# ---------------- データ構造 ----------------

@dataclass
class MonthRange:
    year: int
    month: int

    @property
    def start_jst(self) -> datetime:
        return datetime(self.year, self.month, 1, 0, 0, 0, tzinfo=JST)

    @property
    def end_jst(self) -> datetime:
        if self.month == 12:
            return datetime(self.year + 1, 1, 1, 0, 0, 0, tzinfo=JST) - timedelta(seconds=1)
        return datetime(self.year, self.month + 1, 1, 0, 0, 0, tzinfo=JST) - timedelta(seconds=1)

    @property
    def label(self) -> str:
        return f"{self.year}-{self.month:02d}"

    @property
    def prev(self) -> "MonthRange":
        if self.month == 1:
            return MonthRange(self.year - 1, 12)
        return MonthRange(self.year, self.month - 1)

    def isoformat_dates(self) -> tuple[str, str]:
        """Returns (start_date, end_date) in YYYY-MM-DD format."""
        return (
            self.start_jst.strftime("%Y-%m-%d"),
            self.end_jst.strftime("%Y-%m-%d"),
        )


@dataclass
class MailerMetrics:
    sent_count: int = 0
    delivered_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0
    bounced_count: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0
    note: str = ""


@dataclass
class BlogMetrics:
    posted_count: int = 0
    page_views: int = 0
    avg_engagement_time_sec: float = 0.0
    bounce_rate: float = 0.0
    sessions: int = 0
    top_articles: list[dict] = field(default_factory=list)
    top_search_queries: list[dict] = field(default_factory=list)
    note: str = ""


@dataclass
class LineMetrics:
    broadcast_count: int = 0
    target_followers: int = 0
    note: str = ""


@dataclass
class FirestoreMetrics:
    subscriber_count: int = 0
    inquiry_count: int = 0
    inquiries_by_type: dict[str, int] = field(default_factory=dict)
    note: str = ""


@dataclass
class SystemHealth:
    cron_runs: int = 0
    cron_failures: int = 0
    note: str = ""


@dataclass
class MonthlyReport:
    tenant_id: str
    month: str
    generated_at: str
    mailer: MailerMetrics = field(default_factory=MailerMetrics)
    blog: BlogMetrics = field(default_factory=BlogMetrics)
    line: LineMetrics = field(default_factory=LineMetrics)
    firestore: FirestoreMetrics = field(default_factory=FirestoreMetrics)
    system: SystemHealth = field(default_factory=SystemHealth)
    errors: list[str] = field(default_factory=list)


# ---------------- 集計ロジック ----------------

def collect_resend_metrics(month: MonthRange) -> MailerMetrics:
    """Resend API から月次メルマガKPIを取得。"""
    api_key = os.getenv("RESEND_API_KEY", "")
    m = MailerMetrics()
    if not api_key:
        m.note = "RESEND_API_KEYが未設定"
        return m
    import requests
    start, end = month.isoformat_dates()
    # Resend has /emails endpoint with date filter (limited to 100 per page)
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        # Note: Resend API current spec requires pagination; this is simplified
        r = requests.get(
            "https://api.resend.com/emails",
            headers=headers,
            params={"limit": 100},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json().get("data", [])
        sent = delivered = opened = clicked = bounced = 0
        for email in data:
            created = email.get("created_at", "")
            if not (start <= created[:10] <= end):
                continue
            sent += 1
            last_event = email.get("last_event", "")
            if last_event == "delivered":
                delivered += 1
            if email.get("opened_at"):
                opened += 1
            if email.get("clicked_at"):
                clicked += 1
            if last_event == "bounced":
                bounced += 1
        m.sent_count = sent
        m.delivered_count = delivered
        m.opened_count = opened
        m.clicked_count = clicked
        m.bounced_count = bounced
        if delivered > 0:
            m.open_rate = round(opened / delivered * 100, 1)
            m.click_rate = round(clicked / delivered * 100, 1)
        m.note = f"Resend最新100件のうち{sent}件が当月分（要追加ページネーション）"
    except Exception as e:
        m.note = f"取得エラー: {e}"
    return m


def collect_notion_post_count(month: MonthRange) -> dict[str, int]:
    """Notion DBから当月のステータス=🟢公開済み記事数を集計。"""
    token = os.getenv("NOTION_API_KEY", "")
    blog_db = os.getenv("NOTION_BLOG_DATABASE_ID", "")
    newsletter_db = os.getenv("NOTION_NEWSLETTER_DATABASE_ID", "")
    result = {"blog": 0, "newsletter": 0, "note": ""}
    if not token:
        result["note"] = "NOTION_API_KEYが未設定"
        return result
    import requests
    start_iso = month.start_jst.strftime("%Y-%m-%d")
    end_iso = month.end_jst.strftime("%Y-%m-%d")
    headers = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }
    notes = []
    for label, db_id in [("blog", blog_db), ("newsletter", newsletter_db)]:
        if not db_id:
            notes.append(f"{label}: DB未設定")
            continue
        try:
            r = requests.post(
                f"https://api.notion.com/v1/databases/{db_id}/query",
                headers=headers,
                json={
                    "filter": {
                        "and": [
                            {"property": "日付", "date": {"on_or_after": start_iso}},
                            {"property": "日付", "date": {"on_or_before": end_iso}},
                        ]
                    },
                    "page_size": 100,
                },
                timeout=30,
            )
            r.raise_for_status()
            pages = r.json().get("results", [])
            published = sum(
                1 for p in pages
                if p.get("properties", {}).get("ステータス", {}).get("select", {}).get("name", "").startswith("🟢")
            )
            result[label] = published
        except Exception as e:
            notes.append(f"{label}: {e}")
    result["note"] = " / ".join(notes) if notes else "OK"
    return result


def collect_ga4_metrics(month: MonthRange) -> BlogMetrics:
    """GA4 Data API からブログKPIを取得。"""
    creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "")
    property_id = os.getenv("GA4_PROPERTY_ID", "")
    m = BlogMetrics()
    if not creds_path or not property_id or not Path(creds_path).exists():
        m.note = "GOOGLE_CREDENTIALS_PATH or GA4_PROPERTY_ID が未設定/未配置"
        return m
    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange, Dimension, Metric, RunReportRequest,
        )
        from google.oauth2 import service_account
        creds = service_account.Credentials.from_service_account_file(creds_path)
        client = BetaAnalyticsDataClient(credentials=creds)
        start, end = month.isoformat_dates()
        # 全体メトリクス
        req = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start, end_date=end)],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="userEngagementDuration"),
                Metric(name="bounceRate"),
                Metric(name="sessions"),
            ],
        )
        resp = client.run_report(req)
        if resp.rows:
            row = resp.rows[0]
            m.page_views = int(row.metric_values[0].value)
            engagement_total = float(row.metric_values[1].value)
            m.sessions = int(row.metric_values[3].value)
            m.avg_engagement_time_sec = round(engagement_total / max(m.sessions, 1), 1)
            m.bounce_rate = round(float(row.metric_values[2].value) * 100, 1)
        # 人気記事TOP5
        req_top = RunReportRequest(
            property=f"properties/{property_id}",
            date_ranges=[DateRange(start_date=start, end_date=end)],
            dimensions=[Dimension(name="pagePath"), Dimension(name="pageTitle")],
            metrics=[Metric(name="screenPageViews")],
            limit=5,
            order_bys=[{"metric": {"metric_name": "screenPageViews"}, "desc": True}],
        )
        resp_top = client.run_report(req_top)
        m.top_articles = [
            {
                "path": r.dimension_values[0].value,
                "title": r.dimension_values[1].value,
                "views": int(r.metric_values[0].value),
            }
            for r in resp_top.rows
        ]
        m.note = "OK"
    except Exception as e:
        m.note = f"GA4取得エラー: {e}"
    return m


def collect_search_console(month: MonthRange) -> list[dict]:
    """Search Consoleから上位検索クエリTOP5を取得。"""
    creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "")
    site_url = os.getenv("SEARCH_CONSOLE_SITE_URL", "")
    if not creds_path or not site_url or not Path(creds_path).exists():
        return [{"note": "Search Console未設定"}]
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        creds = service_account.Credentials.from_service_account_file(
            creds_path,
            scopes=["https://www.googleapis.com/auth/webmasters.readonly"],
        )
        service = build("searchconsole", "v1", credentials=creds)
        start, end = month.isoformat_dates()
        body = {
            "startDate": start,
            "endDate": end,
            "dimensions": ["query"],
            "rowLimit": 5,
        }
        resp = service.searchanalytics().query(siteUrl=site_url, body=body).execute()
        return [
            {
                "query": r["keys"][0],
                "clicks": r.get("clicks", 0),
                "impressions": r.get("impressions", 0),
                "ctr": round(r.get("ctr", 0) * 100, 1),
                "position": round(r.get("position", 0), 1),
            }
            for r in resp.get("rows", [])
        ]
    except Exception as e:
        return [{"error": str(e)}]


def collect_firestore_metrics(month: MonthRange, tenant_id: str) -> FirestoreMetrics:
    """Firestoreから配信先数・問い合わせ件数を取得。"""
    creds_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    m = FirestoreMetrics()
    if not creds_path or not Path(creds_path).exists():
        m.note = "FIREBASE_CREDENTIALS_PATHが未設定/未配置"
        return m
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        if not firebase_admin._apps:
            cred = credentials.Certificate(creds_path)
            firebase_admin.initialize_app(cred)
        db = firestore.client()
        # 配信先数 (manual_contacts)
        contacts = db.collection("tenants").document(tenant_id).collection("manual_contacts").stream()
        m.subscriber_count = sum(1 for _ in contacts)
        # 問い合わせ件数 (hanahiro_contacts)
        start_dt = month.start_jst
        end_dt = month.end_jst
        inq_query = (
            db.collection("hanahiro_contacts")
            .where("createdAt", ">=", start_dt)
            .where("createdAt", "<=", end_dt)
        )
        inq_count = 0
        by_type: dict[str, int] = {}
        for doc in inq_query.stream():
            data = doc.to_dict()
            inq_count += 1
            t = data.get("type", "未分類")
            by_type[t] = by_type.get(t, 0) + 1
        m.inquiry_count = inq_count
        m.inquiries_by_type = by_type
        m.note = "OK"
    except Exception as e:
        m.note = f"Firestore取得エラー: {e}"
    return m


def collect_line_metrics(month: MonthRange) -> LineMetrics:
    """LINE Messaging APIからブロードキャスト統計を取得。"""
    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
    m = LineMetrics()
    if not token:
        m.note = "LINE_CHANNEL_ACCESS_TOKENが未設定"
        return m
    import requests
    headers = {"Authorization": f"Bearer {token}"}
    try:
        # 友達数
        r = requests.get(
            "https://api.line.me/v2/bot/insight/followers",
            headers=headers,
            timeout=30,
        )
        if r.status_code == 200:
            m.target_followers = r.json().get("followers", 0)
        # 月次配信数（Insight API: 当月日次集計の合計）
        # 注: Insightは前日までしか取れない。当月途中なら月初〜前日の合計。
        end_dt = month.end_jst.date()
        today = datetime.now(JST).date()
        target_date = min(end_dt, today - timedelta(days=1))
        r2 = requests.get(
            "https://api.line.me/v2/bot/insight/message/delivery",
            headers=headers,
            params={"date": target_date.strftime("%Y%m%d")},
            timeout=30,
        )
        if r2.status_code == 200:
            data = r2.json()
            m.broadcast_count = data.get("broadcast", 0)
            m.note = f"Insight: {target_date} のbroadcast値（当日のみ）"
        else:
            m.note = f"Insight取得失敗 status={r2.status_code}"
    except Exception as e:
        m.note = f"取得エラー: {e}"
    return m


# ---------------- メイン ----------------

def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description="月次レポート用データ集計")
    parser.add_argument("--tenant", default=os.getenv("TENANT_ID", "caredesignworks"))
    parser.add_argument("--month", required=False, help="YYYY-MM 形式。省略時は前月")
    args = parser.parse_args()

    if args.month:
        y, mo = map(int, args.month.split("-"))
    else:
        now = datetime.now(JST)
        prev = (now.replace(day=1) - timedelta(days=1))
        y, mo = prev.year, prev.month
    month = MonthRange(y, mo)

    print(f"📊 集計開始: tenant={args.tenant}, month={month.label}")

    report = MonthlyReport(
        tenant_id=args.tenant,
        month=month.label,
        generated_at=datetime.now(JST).isoformat(),
    )

    # 各データソース集計
    print("  → Resend (メルマガ)...")
    report.mailer = collect_resend_metrics(month)

    print("  → Notion (投稿本数)...")
    notion_counts = collect_notion_post_count(month)
    report.blog.posted_count = notion_counts["blog"]
    if notion_counts["note"] != "OK":
        report.errors.append(f"Notion: {notion_counts['note']}")

    print("  → GA4 (ブログKPI)...")
    ga4 = collect_ga4_metrics(month)
    # postedはNotionから、その他はGA4から
    posted = report.blog.posted_count
    report.blog = ga4
    report.blog.posted_count = posted

    print("  → Search Console (検索流入)...")
    report.blog.top_search_queries = collect_search_console(month)

    print("  → Firestore...")
    report.firestore = collect_firestore_metrics(month, args.tenant)

    print("  → LINE...")
    report.line = collect_line_metrics(month)

    # 出力
    out_dir = Path(__file__).parent / os.getenv("OUTPUT_DIR", "output")
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"{args.tenant}-{month.label}.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(asdict(report), f, ensure_ascii=False, indent=2, default=str)

    print(f"✅ 出力完了: {out_path}")
    print()
    print("=" * 50)
    print(f"  メルマガ送信: {report.mailer.sent_count}件 (開封率 {report.mailer.open_rate}%)")
    print(f"  ブログ投稿:   {report.blog.posted_count}本 / PV {report.blog.page_views:,}")
    print(f"  配信先:       {report.firestore.subscriber_count}名")
    print(f"  問い合わせ:   {report.firestore.inquiry_count}件")
    print(f"  LINE友達:     {report.line.target_followers}名")
    print("=" * 50)
    if report.errors:
        print()
        print("⚠ 警告:")
        for e in report.errors:
            print(f"  - {e}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
