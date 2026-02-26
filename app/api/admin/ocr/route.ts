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
      messages: [
        {
          role: "system",
          content: `あなたは「日本一の名刺鑑定士」です。
送られた画像が少々不鮮明だったり、影があっても、プロとして以下の情報を死守して抽出してください。

【プロの抽出極意】
1. **氏名**: 漢字を最優先。苗字と名前の間の絶妙な空白も再現せよ。
2. **会社名**: 「株式会社」「（株）」「合同会社」などを省略せず、登記上の正式名称を特定せよ。
3. **メールアドレス**: 1文字のミスも許されない。ドメイン（.co.jpや.comなど）の文脈から、ボケた文字も執念で特定せよ。

【厳守事項】
- JSON形式（name, company, email）で返すこと。
- 背景の指や机の模様は、あなたの高い知能で完全に無視せよ。
- どんなに条件が悪くても「読めない」と諦めず、推測できる限界まで文字に起こせ。`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "この名刺をクリーンアップし、営業活動に不可欠な【名前】【会社名】【メールアドレス】を、プロの精度で抽出してくんちぇ。" 
            },
            {
              type: "image_url",
              image_url: { url: image }
            },
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