import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    // APIキーチェック
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY が未設定です" }, { status: 500 });
    }

    const body = await request.text();
    const bodySize = new Blob([body]).size;
    console.log(`📸 OCR受信: ${(bodySize / 1024).toFixed(0)}KB`);

    const { image } = JSON.parse(body);
    if (!image) return NextResponse.json({ error: "画像データなし" }, { status: 400 });

    // base64サイズチェック（4MB超は拒否）
    if (image.length > 4 * 1024 * 1024) {
      return NextResponse.json({ error: `画像が大きすぎます (${(image.length / 1024 / 1024).toFixed(1)}MB)。もう少し離して撮影してください。` }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `あなたは名刺解析AIです。画像から以下をJSON形式で抽出してください。
- name: 名前（フルネーム）
- company: 会社名
- title: 役職
- email: メールアドレス
- phone: 電話番号
読み取れない項目は空文字""にしてください。JSON以外は出力しないでください。`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "この名刺を解析してください。" },
            { type: "image_url", image_url: { url: image, detail: "auto" } }
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    console.log("✅ OCR結果:", JSON.stringify(parsed));
    return NextResponse.json(parsed);
  } catch (error: any) {
    console.error("🔥 OCR Error:", error?.status, error?.message || error);
    const msg = error?.status === 401 ? "OpenAI APIキーが無効です"
      : error?.status === 429 ? "OpenAI APIの利用制限に達しました"
      : error?.status === 413 ? "画像データが大きすぎます"
      : error?.message || "解析失敗";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
