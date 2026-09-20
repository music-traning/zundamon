import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, speakerId } = await req.json();
    
    const voicevoxUrl = process.env.VOICEVOX_URL;
    const speaker = speakerId ?? 3; // デフォルトをずんだもんに設定

    if (voicevoxUrl) {
      // ----------------------------------------------------
      // ローカル/指定サーバーのVOICEVOXを利用 (VOICEVOX_URLあり)
      // ----------------------------------------------------
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
      
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/wav",
        },
      });
    } else {
      // ----------------------------------------------------
      // 有志クラウドAPIを利用 (VOICEVOX_URLなし / Vercel等)
      // ----------------------------------------------------
      const ttsQuestUrl = `https://api.tts.quest/v3/voicevox/synthesis?text=${encodeURIComponent(text)}&speaker=${speaker}`;
      
      const initRes = await fetch(ttsQuestUrl, {
        // Vercelのタイムアウト（10秒）対策として初期リクエストにも制限をかける
        signal: AbortSignal.timeout(5000) 
      });
      
      if (!initRes.ok) {
        const errText = await initRes.text().catch(() => "");
        throw new Error(`TTS QUEST API failed with status ${initRes.status}. Details: ${errText}`);
      }
      
      const json = await initRes.json();
      const downloadUrl = json.wavDownloadUrl || json.mp3StreamingUrl;
      
      if (!downloadUrl) {
        throw new Error(`No download URL returned from TTS QUEST API. Response: ${JSON.stringify(json)}`);
      }

      // 音声データ生成完了までURLをフェッチして待機
      // Vercel Hobbyプランの10秒制限を超えないよう、最大待機時間を約7秒（7000ms）に制限
      const startTime = Date.now();
      const MAX_WAIT_MS = 7000;
      
      let audioRes = await fetch(downloadUrl);
      let attempts = 0;
      
      while (!audioRes.ok && (Date.now() - startTime) < MAX_WAIT_MS) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5秒ごとにポーリング
        audioRes = await fetch(downloadUrl);
        attempts++;
      }

      if (!audioRes.ok) {
        throw new Error(`TTS QUEST Audio not ready after ${attempts} retries (${Date.now() - startTime}ms). Status: ${audioRes.status}`);
      }

      const arrayBuffer = await audioRes.arrayBuffer();
      const isMp3 = downloadUrl.includes(".mp3") || downloadUrl === json.mp3StreamingUrl;
      
      return new Response(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": isMp3 ? "audio/mpeg" : "audio/wav",
        },
      });
    }
  } catch (error) {
    // Vercel ログに出力（スタックトレース含む）
    console.error("【Voice API Backend Error】", error);
    
    // Vercelがクラッシュして500を返す前に、明示的に502(Bad Gateway)を返す
    return NextResponse.json(
      { 
        error: "Failed to synthesize voice", 
        details: error instanceof Error ? error.message : String(error) 
      }, 
      { status: 502 }
    );
  }
}
