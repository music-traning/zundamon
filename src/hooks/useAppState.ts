"use client";

import { useState } from "react";

export type AppState = "interview" | "zundamon";

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
    if (typeof window === 'undefined') return;
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
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

  const resetApp = () => {
    setHasStarted(false);
    setAppState("interview");
    setZundamonPrompt("");
    setZundamonTitle("");
    setZundamonMessages(null);
    setMetanHistory([]);
    setGameId(prev => prev + 1);
  };

  const transitionToZundamon = (prompt: string = "", title: string = "", history: ChatLogEntry[] = []) => {
    setZundamonPrompt(prompt);
    setZundamonTitle(title);
    setMetanHistory(history);
    setZundamonMessages(null);
    setGameId(prev => prev + 1);
    setAppState("zundamon");
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
    transitionToZundamon,
    resetApp,
    toggleMute,
  };
}
