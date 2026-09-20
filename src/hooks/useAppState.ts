"use client";

import { useState } from "react";

export type AppState = "interview" | "transition" | "zundamon";

export type ChatLogEntry = {
  sender: string;
  text: string;
};

export function useAppState() {
  const [appState, setAppState] = useState<AppState>("interview");
  const [hasStarted, setHasStarted] = useState(false);
  const [zundamonPrompt, setZundamonPrompt] = useState("");
  const [zundamonTitle, setZundamonTitle] = useState("");
  const [zundamonMessages, setZundamonMessages] = useState<any[] | null>(null);
  const [gameId, setGameId] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [metanHistory, setMetanHistory] = useState<ChatLogEntry[]>([]);

  const toggleMute = () => setIsMuted(prev => !prev);

  const initAudio = async () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    await ctx.resume();
    setHasStarted(true);
  };

  const startNewGame = async () => {
    await initAudio();
    setAppState("interview");
  };

  const loadGame = async (prompt: string, title: string, messages?: any[]) => {
    await initAudio();
    setZundamonPrompt(prompt);
    setZundamonTitle(title);
    setZundamonMessages(messages || null);
    setGameId(prev => prev + 1);
    setAppState("zundamon");
  };

  const forceTransition = (prompt: string = "", title: string = "", history: ChatLogEntry[] = []) => {
    setZundamonPrompt(prompt);
    setZundamonTitle(title);
    setMetanHistory(history);
    setZundamonMessages(null);
    setGameId(prev => prev + 1);
    setAppState("transition");
    setTimeout(() => {
      setAppState("zundamon");
    }, 5000); // 5 seconds of glitch/black screen
  };

  return {
    appState,
    hasStarted,
    zundamonPrompt,
    zundamonTitle,
    zundamonMessages,
    gameId,
    metanHistory,
    isMuted,
    startNewGame,
    loadGame,
    forceTransition,
    toggleMute,
  };
}
