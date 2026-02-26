import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { image } = await request.json();
    if (!image) return NextResponse.json({ error: "No image" }, { status: 400 });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `あなたはGoogle Cloud Vision以上の精度を持つ【名刺解析AI】です。
送られた画像から、以下の項目を物理的に検出し、意味を解釈してJSONで返してください。

【必須抽出項目】
- name: 名前（フルネーム）
- company: 会社名（正式名称、ロゴの文字も含む）
- title: 役職（代表取締役、部長、等）
- email: メールアドレス（正確に）
- phone: 電話番号（あれば）

【動作要件】
1. 画像が多少荒くても、周辺のドメイン名やロゴから推測して補完せよ。
2. 住所やURLは無視して、上記の5項目に集中せよ。
3. 日本語と英語の混在を正しく処理せよ。
JSON以外の文字は一切出力するな。`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "この名刺を精査し、営業用データとして完璧に構造化してくんちぇ。" },
            { type: "image_url", image_url: { url: image, detail: "high" } } // 💡最強解像度指定！
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    return NextResponse.json(JSON.parse(response.choices[0].message.content || "{}"));
  } catch (error: any) {
    return NextResponse.json({ error: "解析失敗" }, { status: 500 });
  }
}