import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const { messages, zundamonPrompt } = await req.json();

    const systemInstruction = `あなたは『ずんだもん』です。一人称は『僕』、語尾は必ず『なのだ』『のだ』を使用してください。あなたの性格や振る舞いは、以下の【ユーザーが指定した設定】に完全に忠実に従ってください。

【ユーザーが指定した設定】:
${zundamonPrompt}`;

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash-lite",
      contents: messages,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text || "";
            if (text) {
              controller.enqueue(new TextEncoder().encode(text));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      }
    });
  } catch (error) {
    console.error("Zundamon Streaming API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), { status: 500 });
  }
}
