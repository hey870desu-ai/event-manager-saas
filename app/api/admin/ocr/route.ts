import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY が未設定です" }, { status: 500 });
    }

    const body = await request.text();
    const { image } = JSON.parse(body);
    if (!image) return NextResponse.json({ error: "画像データなし" }, { status: 400 });

    // data:image/jpeg;base64,xxxxx → base64部分だけ取り出す
    const base64Match = image.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json({ error: "画像形式が不正です" }, { status: 400 });
    }
    const base64Data = base64Match[1];
    const mimeType = image.match(/^data:(image\/\w+);/)?.[1] || "image/jpeg";

    console.log(`📸 OCR受信: ${(base64Data.length / 1024).toFixed(0)}KB`);

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: `この名刺画像から以下の情報を読み取り、JSON形式で返してください。
読み取れない項目は空文字""にしてください。JSON以外は出力しないでください。

{
  "name": "名前（フルネーム）",
  "company": "会社名",
  "title": "役職",
  "email": "メールアドレス",
  "phone": "電話番号"
}`,
      },
    ]);

    const text = result.response.text().trim();
    // ```json ... ``` のマークダウンブロックを除去
    const jsonStr = text.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    const parsed = JSON.parse(jsonStr);

    console.log("✅ OCR結果:", JSON.stringify(parsed));
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("🔥 OCR Error:", error?.status, error?.message || error);
    return NextResponse.json({ error: error?.message || "解析失敗" }, { status: 500 });
  }
}
