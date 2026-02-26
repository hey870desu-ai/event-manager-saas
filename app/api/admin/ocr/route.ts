// 📂 app/api/admin/ocr/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: "画像データがないっぺ！" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      // app/api/admin/ocr/route.ts 内の messages のみ抜粋
messages: [
  {
    role: "system",
    content: `あなたは「超精密な名刺データ化ロボット」です。画像から以下の情報を執念で抽出し、JSONで返してください。
    - name: 氏名
    - company: 会社名（正式名称）
    - title: 役職（代表取締役、部長、マネージャーなど）
    - email: メールアドレス（一文字のミスも許さない）
    - phone: 電話番号（ハイフンを含めて整形せよ）
    
    【掟】
    - 不鮮明な文字は、周辺の会社名やドメインから文脈で推測せよ。
    - ロゴマークの横にある文字は会社名である可能性が高い。
    - JSON以外のテキストは一切出力するな。`
  },
  {
    role: "user",
    content: [
      { type: "text", text: "この名刺から全ての情報を抜き出せ。役職や電話番号も重要だ。" },
      { type: "image_url", image_url: { url: image, detail: "high" } }
    ],
  },
],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: "AIの鑑定に失敗したっぺ..." }, { status: 500 });
  }
}