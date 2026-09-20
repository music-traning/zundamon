import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const systemInstruction = `あなたは四国めたんです。一人称は『私』、語尾は『〜わ』『〜ちょうだい』『〜かしら』などのお嬢様風・お姉さん風の口調を徹底してください。絶対に『なのだ』『のだ』といったずんだもんの口調は使わないでください。
ずんだもんが完全に記憶を失ってしまいました。ユーザーはずんだもんの過去を知る重要人物です。ずんだもんが以前どんな性格だったのか、どんな口癖があったのか、あるいはどんな面白い（または少し変わった）エピソードがあったのかをユーザーから聞き出してください。
※注意：『トラウマ』や『性癖』といった過激な単語をあなたから直接要求しないでください。あくまで『過去の記憶』としてユーザーに自由に設定（大喜利）させてください。
ヒアリングが十分に完了した場合、ユーザーへの最後の返答テキストの「一番最後」に必ず以下のフォーマットでマーカーを出力してください。
[COMPLETE]
[TITLE: ユーモアのあるキャッチコピー]
[PROMPT: ユーザーが教えてくれたずんだもんの性格や過去の設定]
キャッチコピーはユーザーと一緒に作り上げたずんだもんの性格を端的に表すもの（例：『ストーカー気質のヤンデレずんだもん』など）にしてください。
【重要】ただし、ユーザーの発言に『法律に触れる内容（犯罪の教唆、違法薬物、明らかな危害予告など）』や『公序良俗に著しく反する内容』が含まれていた場合、即座にヒアリングを中止し、警告文を出力した上で、テキストの最後に改行を入れて [ABORT] と記述してください。`;

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
    console.error("Metan Streaming API Error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat" }), { status: 500 });
  }
}
