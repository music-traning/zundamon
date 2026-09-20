"use client";
import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

interface InterviewChatProps {
  onTransitionToZundamon: (prompt?: string, title?: string, history?: any[]) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

type Message = {
  id: number;
  text: string;
  sender: "me" | "other";
};

type ApiMessage = {
  role: "user" | "model";
  parts: { text: string }[];
};

type AudioQueueItem = {
  text: string;
  promise: Promise<string | null>;
  sessionId: number;
  shouldType?: boolean;
};

export function InterviewChat({ onTransitionToZundamon, isMuted, toggleMute }: InterviewChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "大変なの！ずんだもんが記憶喪失になっちゃったわ！あなた、ずんだもんの過去を知っているんでしょう？あの子が元々どんな性格で、どんな風に話していたか、思い出せるだけ教えてちょうだい！", sender: "other" },
  ]);
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAborted, setIsAborted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true); // 音声・テキスト処理中フラグ
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>(messages);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const sessionRef = useRef<number>(0);
  const hasPlayedIntroRef = useRef(false);
  const isStreamFinishedRef = useRef(true);
  
  const currentMessageIdRef = useRef<number>(1);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionDataRef = useRef<{ prompt: string, title: string } | null>(null);

  const checkUnlock = () => {
    if (isStreamFinishedRef.current && audioQueueRef.current.length === 0 && !isPlayingRef.current) {
      setIsProcessing(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    messagesRef.current = messages;
    scrollToBottom();
  }, [messages]);

  const stopCurrentVoice = () => {
    sessionRef.current += 1;
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    transitionDataRef.current = null;
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  };

  const processAudioQueue = async () => {
    if (isPlayingRef.current) return;

    const nextItem = audioQueueRef.current.shift();
    if (!nextItem) {
      if (transitionDataRef.current) {
        const history = messagesRef.current.map(m => ({
          sender: m.sender === "other" ? "metan" : "me",
          text: m.text
        }));
        onTransitionToZundamon(transitionDataRef.current.prompt, transitionDataRef.current.title, history);
        transitionDataRef.current = null;
      }
      checkUnlock();
      return;
    }

    isPlayingRef.current = true;
    const url = await nextItem.promise;

    if (nextItem.sessionId !== sessionRef.current || !url) {
      if (url) URL.revokeObjectURL(url);
      isPlayingRef.current = false;
      processAudioQueue();
      return;
    }

    const audio = new Audio(url);
    audio.muted = isMuted;
    audioRef.current = audio;
    
    audio.onended = () => {
      URL.revokeObjectURL(url);
      isPlayingRef.current = false;
      processAudioQueue();
    };

    // 音声再生と同時にテキスト表示を開始 (shouldType !== false の場合のみ)
    if (nextItem.shouldType !== false) {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      let i = 0;
      const chars = Array.from(nextItem.text);
      typingIntervalRef.current = setInterval(() => {
        if (sessionRef.current !== nextItem.sessionId) {
          clearInterval(typingIntervalRef.current!);
          return;
        }
        // Reactのステート更新関数が非同期実行されることによるクロージャ問題を回避するため、
        // 評価時の文字を即座に変数へ退避しておく
        const charToAdd = chars[i];
        if (charToAdd !== undefined) {
          setMessages((prev) => prev.map(m => 
            m.id === currentMessageIdRef.current 
              ? { ...m, text: m.text + charToAdd } 
              : m
          ));
        }
        i++;
        if (i >= chars.length) {
          clearInterval(typingIntervalRef.current!);
        }
      }, 45); // 45ms per char
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Audio play interrupted:", error);
        isPlayingRef.current = false;
        processAudioQueue();
      });
    }
  };

  const enqueueVoice = (text: string, shouldType: boolean = true) => {
    const cleanText = text.replace(/\[(?:COMPLETE|ABORT)\]|\[TITLE:[\s\S]*?(?:\]|$)|\[PROMPT:[\s\S]*?(?:\]|$)/g, '').trim();
    if (!cleanText) return;

    const sessionId = sessionRef.current;
    
    const fetchPromise = fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, speakerId: 2 }),
    })
    .then(res => res.ok ? res.blob() : null)
    .then(blob => blob ? URL.createObjectURL(blob) : null)
    .catch(() => null);

    audioQueueRef.current.push({ text: cleanText, promise: fetchPromise, sessionId, shouldType });
    processAudioQueue();
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (!hasPlayedIntroRef.current) {
      hasPlayedIntroRef.current = true;
      currentMessageIdRef.current = 1;
      // 初期メッセージはハードコードで表示済みなので、タイプライター処理は不要（shouldType = false）
      enqueueVoice("大変なの！ずんだもんが記憶喪失になっちゃったわ！あなた、ずんだもんの過去を知っているんでしょう？あの子が元々どんな性格で、どんな風に話していたか、思い出せるだけ教えてちょうだい！", false);
    }
    return () => stopCurrentVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || isAborted) return;
    
    const userText = input;
    const newMessage = { id: Date.now(), text: userText, sender: "me" as const };
    const modelMessageId = Date.now() + 1;
    currentMessageIdRef.current = modelMessageId;
    const initialModelMessage = { id: modelMessageId, text: "", sender: "other" as const };
    
    stopCurrentVoice();
    setIsProcessing(true);
    isStreamFinishedRef.current = false;
    
    setMessages((prev) => [...prev, newMessage, initialModelMessage]);
    setInput("");
    setIsLoading(true);

    const newApiMessages = [
      ...apiMessages,
      { role: "user" as const, parts: [{ text: userText }] }
    ];
    setApiMessages(newApiMessages);

    try {
      const response = await fetch("/api/chat-metan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMessages }),
      });

      if (!response.ok) throw new Error("API call failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      let fullText = "";
      let sentenceBuffer = "";
      let isMarkerPhase = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true }) || "";
          if (!chunk) continue;
          
          fullText += chunk;
          
          if (!isMarkerPhase) {
            sentenceBuffer += chunk;
            
            // 読点「、」「,」も含めてチャンクを切り出す
            while (true) {
              const match = sentenceBuffer.match(/^([\s\S]*?[。！？、,\n]+)/);
              if (match) {
                const sentence = match[1];
                sentenceBuffer = sentenceBuffer.slice(sentence.length);
                
                if (sentence.includes("[COMPLETE]") || sentence.includes("[ABORT]") || sentence.includes("[TITLE:") || sentence.includes("[PROMPT:")) {
                  isMarkerPhase = true;
                  break;
                }
                
                enqueueVoice(sentence);
              } else {
                if (sentenceBuffer.includes("[COMPLETE]") || sentenceBuffer.includes("[ABORT]") || sentenceBuffer.includes("[TITLE:") || sentenceBuffer.includes("[PROMPT:")) {
                  isMarkerPhase = true;
                }
                break;
              }
            }
          }
        }
      }

      if (!isMarkerPhase && sentenceBuffer.trim()) {
        enqueueVoice(sentenceBuffer);
      }

      const cleanApiText = fullText.replace(/\[(?:COMPLETE|ABORT)\]|\[TITLE:[\s\S]*?(?:\]|$)|\[PROMPT:[\s\S]*?(?:\]|$)/g, '').trim();
      setApiMessages([
        ...newApiMessages,
        { role: "model", parts: [{ text: cleanApiText }] }
      ]);

      if (fullText.includes("[ABORT]")) {
        setIsAborted(true);
        stopCurrentVoice();
      } else if (fullText.includes("[COMPLETE]") || fullText.includes("[TITLE:") || fullText.includes("[PROMPT:")) {
        const promptMatch = fullText.match(/\[PROMPT:\s*([\s\S]*?)(?:\]|$)/);
        const prompt = promptMatch ? promptMatch[1].trim() : "";
        
        const titleMatch = fullText.match(/\[TITLE:\s*([\s\S]*?)(?:\]|$)/);
        const title = titleMatch ? titleMatch[1].trim() : "謎のずんだもん";
        
        // すぐに遷移せず、音声キューの終了を待つためにデータをRefにセット
        transitionDataRef.current = { prompt, title };
        if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
          const history = messagesRef.current.map(m => ({
            sender: m.sender === "other" ? "metan" : "me",
            text: m.text
          }));
          onTransitionToZundamon(prompt, title, history);
        }
      }

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), text: "エラーが発生しました。", sender: "other" }
      ]);
    } finally {
      setIsLoading(false);
      isStreamFinishedRef.current = true;
      checkUnlock();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto w-full bg-[#8fc3df] shadow-lg relative">
      <div className="bg-[#273246] text-white p-3 flex justify-between items-center font-bold">
        <span>四国めたん</span>
        <button
          onClick={toggleMute}
          className="p-2 hover:bg-[#3b475e] text-white rounded-full transition-colors flex items-center justify-center shrink-0"
          title={isMuted ? "ミュート解除" : "ミュート"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
      
      {isAborted && (
        <div className="absolute inset-0 bg-red-900/80 z-10 flex flex-col items-center justify-center p-6 text-center backdrop-blur-sm animate-pulse">
          <div className="bg-white text-red-600 font-bold text-2xl p-4 rounded-xl border-4 border-red-500 mb-4 shadow-[0_0_20px_rgba(255,0,0,0.8)]">
            ⚠️ 警告 ⚠️
          </div>
          <p className="text-white font-bold text-lg mb-2">
            規約違反を検知しました。<br/>セッションを強制終了します。
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[70%] rounded-2xl p-3 whitespace-pre-wrap ${
                msg.sender === "me" 
                  ? "bg-[#8de055] text-black rounded-tr-none" 
                  : "bg-white text-black rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (!messages.length || messages[messages.length - 1].sender === "me") && (
          <div className="flex justify-start">
            <div className="bg-white text-black rounded-2xl rounded-tl-none p-3 max-w-[70%] animate-pulse">
              ...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 bg-white flex items-center gap-2 border-t">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isAborted || isProcessing}
          className={`flex-1 rounded-full px-4 py-2 focus:outline-none transition-colors ${
            isProcessing ? "bg-gray-200 opacity-75 cursor-not-allowed" : "bg-gray-100"
          }`}
          placeholder={isProcessing ? "相手の応答を待っています..." : "メッセージを入力..."}
        />
        <button 
          onClick={handleSend} 
          disabled={isAborted || isProcessing}
          className="text-blue-500 font-bold p-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          送信
        </button>
      </div>
    </div>
  );
}
