import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, speakerId } = await req.json();
    
    const voicevoxUrl = process.env.VOICEVOX_URL;
    if (!voicevoxUrl) {
      throw new Error("Environment variable VOICEVOX_URL is not set. Please set it to the VOICEVOX API endpoint (e.g., http://127.0.0.1:50021).");
    }

    const speaker = speakerId ?? 3; // デフォルトをずんだもんに設定

    // 1段目: audio_query
    const queryUrl = `${voicevoxUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
    const queryRes = await fetch(queryUrl, {
      method: "POST",
    });
    
    if (!queryRes.ok) {
      const errorText = await queryRes.text().catch(() => "No error body");
      throw new Error(`VOICEVOX audio_query failed with status ${queryRes.status}: ${errorText}`);
    }
    
    const queryJson = await queryRes.json();

    // 2段目: synthesis
    const synthUrl = `${voicevoxUrl}/synthesis?speaker=${speaker}`;
    const synthRes = await fetch(synthUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "audio/wav"
      },
      body: JSON.stringify(queryJson),
    });
    
    if (!synthRes.ok) {
      const errorText = await synthRes.text().catch(() => "No error body");
      throw new Error(`VOICEVOX synthesis failed with status ${synthRes.status}: ${errorText}`);
    }
    
    const arrayBuffer = await synthRes.arrayBuffer();
    
    // 正しいレスポンス返却 (Web標準の Response API を使用)
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
      },
    });
    
  } catch (error) {
    // ターミナル側に詳細なエラーログとスタックトレースを出力
    console.error("Voice API Backend Error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to synthesize voice", 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 500 }
    );
  }
}
