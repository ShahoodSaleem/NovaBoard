import React from 'react';
import { Search } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

function SearchButton() {
  const setIsSearchOpen = useWorkspaceStore(state => state.setIsSearchOpen);

  return (
    <div className="relative">
      <button
        onClick={() => setIsSearchOpen(true)}
        className="w-12 h-12 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all hover:scale-110 active:scale-95 group relative"
        title="Search Bookmarks"
      >
        <Search size={20} className="text-white/70 group-hover:text-white transition-colors" />
        
        {/* Tooltip */}
        <span className="absolute bottom-14 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
          Search (Ctrl+F)
        </span>
      </button>
    </div>
  );
}

export default SearchButton;
