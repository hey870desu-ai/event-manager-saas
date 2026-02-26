// 📂 app/api/admin/ocr/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // .env.localにキーを入れておくっぺ！
});

export async function POST(request: Request) {
  try {
    const { image } = await request.json(); // base64データを受け取る

    if (!image) {
      return NextResponse.json({ error: "画像データがないっぺ！" }, { status: 400 });
    }

    // 🧠 AI（GPT-4o）に「この画像から情報を抜いて！」と頼むっぺ
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "あなたは名刺解析のエキスパートです。画像から情報を抽出し、JSON形式で返してください。キーは name, company, email の3つです。見つからない場合はnullにしてください。"
        },
        {
          role: "user",
          content: [
            { type: "text", text: "この名刺から名前、会社名、メールアドレスを抽出してくんちぇ。" },
            {
              type: "image_url",
              image_url: { url: image } // ここにスマホで撮ったbase64が入るぞい
            },
          ],
        },
      ],
      response_format: { type: "json_object" }, // JSONで返してもらう設定
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");

    // 解析結果をフロントエンドに返す
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json({ error: "AIが名刺を読めなかったっぺ..." }, { status: 500 });
  }
}