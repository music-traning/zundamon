import React, { useState } from "react";
import { SaveSlotModal, SaveSlot } from "./SaveSlotModal";

interface WelcomeScreenProps {
  onNewGame: () => void;
  onLoadGame: (prompt: string, title: string) => void;
}

export function WelcomeScreen({ onNewGame, onLoadGame }: WelcomeScreenProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLoad = (slot: SaveSlot) => {
    setIsModalOpen(false);
    onLoadGame(slot.prompt, slot.title, slot.messages);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-green-50 text-green-900 z-50">
      <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-sm w-full">
        <h1 className="text-3xl font-bold mb-6 text-green-600">ずんだもんメーカー</h1>
        <div className="space-y-4 flex flex-col">
          <button
            onClick={onNewGame}
            className="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-bold transition-colors shadow-sm"
          >
            新しく記憶を探る
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full px-6 py-3 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 rounded-full font-bold transition-colors shadow-sm"
          >
            セーブデータから呼び出す
          </button>
        </div>
      </div>
      <SaveSlotModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onLoad={handleLoad} 
      />
    </div>
  );
}
