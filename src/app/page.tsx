"use client";

import { useAppState } from "@/hooks/useAppState";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { InterviewChat } from "@/components/InterviewChat";
import { ZundamonChat } from "@/components/ZundamonChat";

export default function Home() {
  const { appState, hasStarted, startNewGame, loadGame, transitionToZundamon, resetApp, zundamonPrompt, zundamonTitle, zundamonMessages, gameId, metanHistory, isMuted, toggleMute } = useAppState();

  return (
    <main className="h-[100dvh] w-full bg-gray-200 sm:p-4 md:p-8 flex items-center justify-center relative">
      {!hasStarted && <WelcomeScreen onNewGame={startNewGame} onLoadGame={loadGame} />}
      
      {hasStarted && (
        <div className="h-full max-h-[850px] w-full max-w-md mx-auto sm:rounded-3xl overflow-hidden shadow-2xl relative bg-white">
          {appState === "interview" && (
            <InterviewChat 
              onTransitionToZundamon={transitionToZundamon} 
              isMuted={isMuted}
              toggleMute={toggleMute}
            />
          )}
          
          {appState === "zundamon" && (
            <ZundamonChat 
              key={`zundamon-${gameId}`}
              zundamonPrompt={zundamonPrompt} 
              zundamonTitle={zundamonTitle} 
              isMuted={isMuted} 
              toggleMute={toggleMute}
              metanHistory={metanHistory} 
              initialMessages={zundamonMessages}
              onLoadGame={loadGame}
              onResetApp={resetApp}
            />
          )}
        </div>
      )}
    </main>
  );
}
