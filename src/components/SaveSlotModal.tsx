"use client";
import React, { useEffect, useState } from "react";
import { Play, Save, Trash2, X } from "lucide-react";

export type SaveSlot = { id: number; title: string; prompt: string; updatedAt: string; messages?: any[] };

interface SaveSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad?: (slot: SaveSlot) => void;
  onSave?: (slotId: number) => void;
}

export function SaveSlotModal({ isOpen, onClose, onLoad, onSave }: SaveSlotModalProps) {
  const [slots, setSlots] = useState<SaveSlot[]>([]);

  const loadSlots = () => {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('zundamon_saves');
      if (data) {
        setSlots(JSON.parse(data));
      } else {
        setSlots(Array.from({length: 10}, (_, i) => ({ id: i+1, title: "", prompt: "", updatedAt: "" })));
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSlots();
    }
  }, [isOpen]);

  const handleDelete = (slotId: number) => {
    if (!confirm("このデータを削除してもよろしいですか？")) return;
    const newSlots = slots.map(s => s.id === slotId ? { id: slotId, title: "", prompt: "", updatedAt: "" } : s);
    if (typeof window !== 'undefined') {
      localStorage.setItem('zundamon_saves', JSON.stringify(newSlots));
    }
    setSlots(newSlots);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-4 bg-green-600 text-white font-bold rounded-t-xl flex justify-between items-center">
          <span>データ管理</span>
          <button onClick={onClose} className="hover:text-green-200 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-green-50 rounded-b-xl">
          {slots.map(slot => {
             const hasData = !!slot.prompt;
             return (
               <div key={slot.id} className="w-full text-left p-3 rounded-lg border bg-white border-green-200 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center w-full font-bold">
                    <span className={hasData ? "text-green-700" : "text-gray-400"}>Slot {slot.id}</span>
                    {slot.updatedAt && <span className="text-xs font-normal text-gray-500">{new Date(slot.updatedAt).toLocaleString()}</span>}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">
                    {slot.title || "NO DATA"}
                  </div>
                  <div className="flex gap-2 justify-end mt-1">
                     {hasData && onLoad && (
                       <button onClick={() => onLoad(slot)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-bold transition-colors">
                         <Play size={14} /> ロード
                       </button>
                     )}
                     {onSave && (
                       <button onClick={() => onSave(slot.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-md text-xs font-bold transition-colors">
                         <Save size={14} /> {hasData ? "上書き" : "セーブ"}
                       </button>
                     )}
                     {hasData && (
                       <button onClick={() => handleDelete(slot.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-xs font-bold transition-colors">
                         <Trash2 size={14} /> 削除
                       </button>
                     )}
                  </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}
