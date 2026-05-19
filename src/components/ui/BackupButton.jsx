import React from 'react';
import { RefreshCw } from 'lucide-react';

export const BackupButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-amber-500/20 hover:text-amber-400 transition-all duration-300 relative group active:scale-95"
      title="Backup & Restore Layout"
    >
      <svg 
        className="w-5 h-5 transition-transform duration-500 group-hover:rotate-180" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
        />
      </svg>
      <span className="absolute -left-28 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-amber-500 text-[10px] font-bold text-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Layout Backup
      </span>
    </button>
  );
};
