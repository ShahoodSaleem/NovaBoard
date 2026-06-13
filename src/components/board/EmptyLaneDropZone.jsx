import React from 'react';

export function EmptyLaneDropZone({ isOver, onDragOver, onDrop }) {
  return (
    <div
      className={`w-[280px] shrink-0 self-stretch min-h-[120px] rounded-2xl border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
        isOver
          ? 'border-amber-400/80 bg-amber-400/10 scale-[1.02]'
          : 'border-white/5 bg-transparent'
      }`}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
    >
      {isOver && (
        <span className="text-amber-400/80 text-[11px] font-bold tracking-widest uppercase select-none">
          New Lane
        </span>
      )}
    </div>
  );
}
