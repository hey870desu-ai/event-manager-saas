// 一隅を照らし統合の診断エンドポイント（一時的なデバッグ用）
// GET /api/admin/diagnose-ichigu?secret=manual-trigger
// env が設定されているか、Notion がデータを返すかだけを確認する。
// 値は返さない（boolean と件数だけ）。
import { NextResponse } from "next/server";
import { fetchPagesByStatus } from "@/lib/notion-bridge";
import { getKintaiDb } from "@/lib/kintai-line-bridge";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("secret") !== "manual-trigger") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ichiguDbId = process.env.ICHIGU_NOTION_DATABASE_ID;
  const ichiguNotionToken = process.env.NOTION_API_KEY;
  const ichiguCompanyId = process.env.ICHIGU_KINTAI_COMPANY_ID;
  const ichiguDeliveryTime = process.env.ICHIGU_DELIVERY_TIME_JST;
  const ichiguTestLineId = process.env.ICHIGU_TEST_LINE_USER_ID;
  const kintaiSA = process.env.KINTAI_FIREBASE_SERVICE_ACCOUNT;

  const envCheck = {
    NOTION_API_KEY: {
      set: Boolean(ichiguNotionToken),
      length: ichiguNotionToken?.length ?? 0,
    },
    ICHIGU_NOTION_DATABASE_ID: {
      set: Boolean(ichiguDbId),
      value: ichiguDbId ? ichiguDbId.slice(0, 8) + "..." : null,
    },
    ICHIGU_KINTAI_COMPANY_ID: {
      set: Boolean(ichiguCompanyId),
      length: ichiguCompanyId?.length ?? 0,
    },
    ICHIGU_DELIVERY_TIME_JST: {
      set: Boolean(ichiguDeliveryTime),
      value: ichiguDeliveryTime || null,
    },
    ICHIGU_TEST_LINE_USER_ID: {
      set: Boolean(ichiguTestLineId),
      length: ichiguTestLineId?.length ?? 0,
    },
    KINTAI_FIREBASE_SERVICE_ACCOUNT: {
      set: Boolean(kintaiSA),
      length: kintaiSA?.length ?? 0,
      looksLikeJson: kintaiSA?.trim().startsWith("{") ?? false,
    },
  };

  let notionCheck: any = { tried: false };
  if (ichiguDbId && ichiguNotionToken) {
    try {
      const pages = await fetchPagesByStatus(
        ichiguNotionToken,
        ichiguDbId,
        "配信予定",
      );
      notionCheck = {
        tried: true,
        ok: true,
        pageCount: pages.length,
        titles: pages.slice(0, 5).map((p: any) => {
          const t = p.properties?.["タイトル"]?.title?.[0]?.plain_text;
          const date = p.properties?.["日付"]?.date?.start;
          return { title: t?.slice(0, 30) || "(no title)", date: date || null };
        }),
      };
    } catch (e: any) {
      notionCheck = {
        tried: true,
        ok: false,
        error: e?.message || String(e),
      };
    }
  }

  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateKey = `${nowJst.getUTCFullYear()}-${String(nowJst.getUTCMonth() + 1).padStart(2, "0")}-${String(nowJst.getUTCDate()).padStart(2, "0")}`;

  // 勤怠SaaS 側を直接覗く（重要）
  let kintaiCheck: any = { tried: false };
  if (ichiguCompanyId && kintaiSA) {
    try {
      const kdb = getKintaiDb();
      // 最新の scheduled_messages（source=ichigu-daily）
      const schedSnap = await kdb
        .collection("companies")
        .doc(ichiguCompanyId)
        .collection("scheduled_messages")
        .where("source", "==", "ichigu-daily")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();
      const latest = schedSnap.docs.map((d) => {
        const data: any = d.data();
        return {
          id: d.id,
          status: data.status,
          sentCount: data.sentCount ?? null,
          dateKey: data.dateKey,
          targetCount: (data.targetLineUserIds || []).length,
          targetFirst: data.targetLineUserIds?.[0]
            ? data.targetLineUserIds[0].slice(0, 6) + "..." + data.targetLineUserIds[0].slice(-4)
            : null,
        };
      });
      // ICHIGU_TEST_LINE_USER_ID と users.lineUserId が一致するユーザーがいるか
      const testId = ichiguTestLineId;
      let matchedUserCount = 0;
      let userCount = 0;
      let testIdMaskedForCompare: string | null = null;
      if (testId) {
        const userSnap = await kdb
          .collection("users")
          .where("companyId", "==", ichiguCompanyId)
          .get();
        userCount = userSnap.size;
        userSnap.forEach((doc) => {
          const u: any = doc.data();
          if (u.lineUserId === testId) matchedUserCount++;
        });
        testIdMaskedForCompare = testId.slice(0, 6) + "..." + testId.slice(-4);
      }
      // 全ユーザーの lineUserId プレフィックス一覧（先頭6文字＋末尾4文字）
      const userLineIdsSample: string[] = [];
      const userSnap2 = await kdb
        .collection("users")
        .where("companyId", "==", ichiguCompanyId)
        .get();
      userSnap2.forEach((doc) => {
        const u: any = doc.data();
        if (u.lineUserId) {
          userLineIdsSample.push(
            u.lineUserId.slice(0, 6) + "..." + u.lineUserId.slice(-4) + " (" + u.lineUserId.length + ")",
          );
        }
      });
      kintaiCheck = {
        tried: true,
        ok: true,
        latestScheduled: latest,
        usersWithCompanyId: userCount,
        usersWithLineUserId: userLineIdsSample.length,
        userLineIdsMasked: userLineIdsSample.slice(0, 10),
        testIdMaskedForCompare,
        matchedUserCount,
      };
    } catch (e: any) {
      kintaiCheck = {
        tried: true,
        ok: false,
        error: e?.message || String(e),
      };
    }
  }

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    jstDateKey: dateKey,
    env: envCheck,
    notion: notionCheck,
    kintai: kintaiCheck,
  });
}
