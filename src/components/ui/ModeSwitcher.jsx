import React from 'react';
import { Layout, BarChart3 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export const ModeSwitcher = ({ className = '' }) => {
  const currentMode = useWorkspaceStore((s) => s.currentMode || 'bookmarks');
  const setMode = useWorkspaceStore((s) => s.setMode);

  return (
    <div
      className={`relative inline-flex items-center p-1 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl transition-all duration-300 ${className}`}
      role="tablist"
      aria-label="View Mode Switcher"
    >
      {/* Bookmarks Mode Button */}
      <button
        onClick={() => setMode('bookmarks')}
        role="tab"
        aria-selected={currentMode === 'bookmarks'}
        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 active:scale-95 ${
          currentMode === 'bookmarks'
            ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] border border-white/20'
            : 'text-white/45 hover:text-white/80 hover:bg-white/5 border border-transparent'
        }`}
      >
        <Layout size={14} className={currentMode === 'bookmarks' ? 'text-amber-400' : 'text-white/40'} />
        <span>Bookmarks</span>
      </button>

      {/* Analytics Mode Button */}
      <button
        onClick={() => setMode('analytics')}
        role="tab"
        aria-selected={currentMode === 'analytics'}
        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 active:scale-95 ${
          currentMode === 'analytics'
            ? 'bg-gradient-to-r from-cyan-500/30 to-indigo-500/30 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)] border border-cyan-400/40'
            : 'text-white/45 hover:text-white/80 hover:bg-white/5 border border-transparent'
        }`}
      >
        <BarChart3 size={14} className={currentMode === 'analytics' ? 'text-cyan-400' : 'text-white/40'} />
        <span>Analytics</span>
        <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-white/10 text-white/50 border border-white/5 tracking-normal">
          Alt+A
        </span>
      </button>
    </div>
  );
};

export default ModeSwitcher;
