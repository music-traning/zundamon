import React, { useEffect, useRef } from "react";

export function TransitionEffect({ isMuted }: { isMuted: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("/bgm.mp3");
    audio.loop = true;
    audio.volume = 0.5;
    audio.muted = isMuted;
    audioRef.current = audio;
    
    let isUnmounted = false;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.warn("Audio play interrupted:", error);
      });
    }
    
    return () => {
      isUnmounted = true;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []); // Run once on mount

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black w-screen h-screen flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes noise {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(-10%, 5%); }
          30% { transform: translate(5%, -10%); }
          40% { transform: translate(-5%, 15%); }
          50% { transform: translate(-10%, 5%); }
          60% { transform: translate(15%, 0); }
          70% { transform: translate(0, 10%); }
          80% { transform: translate(-15%, 0); }
          90% { transform: translate(10%, 5%); }
        }
        @keyframes glitch-anim {
          0% { clip-path: polygon(0 2%, 100% 2%, 100% 5%, 0 5%); transform: translate(2px); }
          20% { clip-path: polygon(0 15%, 100% 15%, 100% 15%, 0 15%); transform: translate(-2px); }
          40% { clip-path: polygon(0 10%, 100% 10%, 100% 20%, 0 20%); transform: translate(2px); }
          60% { clip-path: polygon(0 1%, 100% 1%, 100% 2%, 0 2%); transform: translate(-2px); }
          80% { clip-path: polygon(0 33%, 100% 33%, 100% 33%, 0 33%); transform: translate(2px); }
          100% { clip-path: polygon(0 44%, 100% 44%, 100% 44%, 0 44%); transform: translate(-2px); }
        }
        .noise-bg {
          position: absolute;
          top: -50%; left: -50%; right: -50%; bottom: -50%;
          width: 200%; height: 200%;
          background: transparent url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E');
          opacity: 0.4;
          animation: noise 0.2s infinite;
          mix-blend-mode: overlay;
        }
        .glitch-text {
          position: relative;
          color: white;
          font-size: 3rem;
          font-weight: bold;
          text-shadow: 3px 3px #ff0000, -3px -3px #0000ff;
          animation: glitch-anim 0.2s infinite;
          z-index: 10;
        }
      `}</style>
      <div className="noise-bg"></div>
      <div className="absolute inset-0 bg-red-900/30 mix-blend-color-burn animate-pulse"></div>
      <div className="glitch-text">SYSTEM ERROR</div>
      <div className="glitch-text absolute opacity-50 translate-x-1 translate-y-1">SYSTEM ERROR</div>
    </div>
  );
}
