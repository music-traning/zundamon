"use client";
import React, { useState, useRef, useEffect } from "react";
import { SaveSlotModal, SaveSlot } from "./SaveSlotModal";
import type { ChatLogEntry } from "@/hooks/useAppState";
import { Save, Volume2, VolumeX } from "lucide-react";

interface ZundamonChatProps {
  zundamonPrompt: string;
  zundamonTitle: string;
  isMuted: boolean;
  toggleMute: () => void;
  metanHistory: ChatLogEntry[];
  initialMessages?: Message[] | null;
  onLoadGame: (prompt: string, title: string, messages?: Message[]) => void;
}

export type Message = {
  id: number;
  text: string;
  sender: "me" | "zundamon";
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

export function ZundamonChat({ zundamonPrompt, zundamonTitle, isMuted, toggleMute, metanHistory, initialMessages, onLoadGame }: ZundamonChatProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages && initialMessages.length > 0 
      ? initialMessages 
      : [{ id: 1, text: "やっほー！ずんだもんなのだ！よろしくなのだ！", sender: "zundamon" }]
  );
  const [apiMessages, setApiMessages] = useState<ApiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(true); // 音声・テキスト処理中フラグ
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<AudioQueueItem[]>([]);
  const isPlayingRef = useRef(false);
  const sessionRef = useRef<number>(0);
  const hasPlayedIntroRef = useRef(false);
  const isStreamFinishedRef = useRef(true);
  
  const currentMessageIdRef = useRef<number>(1);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const bgm = new Audio("/bgm.mp3");
    bgm.loop = true;
    bgm.volume = 0.2;
    bgm.muted = isMuted;
    bgmRef.current = bgm;

    const playPromise = bgm.play();
    if (playPromise !== undefined) {
      playPromise.catch(err => console.warn("BGM autoplay prevented:", err));
    }

    return () => {
      bgm.pause();
      bgm.currentTime = 0;
      bgmRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUnlock = () => {
    if (isStreamFinishedRef.current && audioQueueRef.current.length === 0 && !isPlayingRef.current) {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const stopCurrentVoice = () => {
    sessionRef.current += 1;
    isPlayingRef.current = false;
    audioQueueRef.current = [];
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
        // クロージャ問題を回避するため、現在の文字を事前に取得しておく
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
      }, 45);
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
    const cleanText = text.trim();
    if (!cleanText) return;

    const sessionId = sessionRef.current;
    
    const fetchPromise = fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, speakerId: 3 }),
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
    if (bgmRef.current) {
      bgmRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (!hasPlayedIntroRef.current) {
      hasPlayedIntroRef.current = true;
      currentMessageIdRef.current = 1;
      // 初期メッセージはハードコードで表示済みのためタイプライター不要
      enqueueVoice("やっほー！ずんだもんなのだ！よろしくなのだ！", false);
    }
    return () => stopCurrentVoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userText = input;
    const newMessage = { id: Date.now(), text: userText, sender: "me" as const };
    const modelMessageId = Date.now() + 1;
    currentMessageIdRef.current = modelMessageId;
    const initialModelMessage = { id: modelMessageId, text: "", sender: "zundamon" as const };
    
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
      const response = await fetch("/api/chat-zundamon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMessages, zundamonPrompt }),
      });

      if (!response.ok) throw new Error("Chat fetch failed");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let done = false;
      let fullText = "";
      let sentenceBuffer = "";

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true }) || "";
          if (!chunk) continue;
          
          fullText += chunk;
          sentenceBuffer += chunk;
            
          while (true) {
            const match = sentenceBuffer.match(/^([\s\S]*?[。！？、,\n]+)/);
            if (match) {
              const sentence = match[1];
              sentenceBuffer = sentenceBuffer.slice(sentence.length);
              enqueueVoice(sentence);
            } else {
              break;
            }
          }
        }
      }

      if (sentenceBuffer.trim()) {
        enqueueVoice(sentenceBuffer);
      }

      setApiMessages([
        ...newApiMessages,
        { role: "model", parts: [{ text: fullText.trim() }] }
      ]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => prev.map(m => 
        m.id === modelMessageId ? { ...m, text: "エラーなのだ..." } : m
      ));
    } finally {
      setIsLoading(false);
      isStreamFinishedRef.current = true;
      checkUnlock();
    }
  };

  const handleSave = (slotId: number) => {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem('zundamon_saves');
    const slots: SaveSlot[] = data ? JSON.parse(data) : Array.from({length: 10}, (_, i) => ({ id: i+1, title: "", prompt: "", updatedAt: "" }));
    
    const newSlots = slots.map(s => s.id === slotId ? { 
      id: slotId, 
      title: zundamonTitle || "ずんだもん", 
      prompt: zundamonPrompt, 
      messages: messages,
      updatedAt: new Date().toISOString() 
    } : s);
    
    localStorage.setItem('zundamon_saves', JSON.stringify(newSlots));
    setIsModalOpen(false);
    alert(`スロット${slotId}にセーブしました！`);
  };

  const handleLoad = (slot: SaveSlot) => {
    setIsModalOpen(false);
    onLoadGame(slot.prompt, slot.title, slot.messages);
  };

  return (
    <div className="flex flex-col h-full max-w-md mx-auto w-full bg-green-50 shadow-xl relative">
      <div className="bg-green-600 text-white p-3 flex justify-between items-center font-bold">
        <div className="flex items-center flex-1 min-w-0 mr-4">
           <span className="truncate" title={zundamonTitle || "ずんだもん"}>
             {zundamonTitle || "ずんだもん"}
           </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleMute}
            className="p-2 bg-green-500 hover:bg-green-400 text-white rounded-full transition-colors shadow-sm flex items-center justify-center"
            title={isMuted ? "ミュート解除" : "ミュート"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="p-2 bg-green-500 hover:bg-green-400 text-white rounded-full transition-colors shadow-sm flex items-center justify-center"
            title="セーブ / ロード"
          >
            <Save size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[75%] rounded-2xl p-3 shadow-sm whitespace-pre-wrap ${
                msg.sender === "me" 
                  ? "bg-green-500 text-white rounded-br-none" 
                  : "bg-white text-green-900 border border-green-200 rounded-bl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (!messages.length || messages[messages.length - 1].sender === "me") && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl rounded-bl-none p-3 shadow-sm bg-white text-green-900 border border-green-200 animate-pulse">
              <span className="opacity-50">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white flex items-center gap-2 border-t border-green-200">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={isProcessing}
          className={`flex-1 text-green-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-400 rounded-full px-4 py-2 transition-colors ${
            isProcessing ? "bg-gray-200 opacity-75 cursor-not-allowed" : "bg-green-50"
          }`}
          placeholder={isProcessing ? "相手の応答を待っています..." : "メッセージを入力なのだ..."}
        />
        <button 
          onClick={handleSend} 
          disabled={isProcessing}
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          送信
        </button>
      </div>
      
      <SaveSlotModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onLoad={handleLoad}
        onSave={handleSave}
      />
    </div>
  );
}
