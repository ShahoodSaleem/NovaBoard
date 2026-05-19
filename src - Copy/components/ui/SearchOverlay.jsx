import React, { useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { Search, X } from 'lucide-react';

function SearchOverlay() {
  const { isSearchOpen, setIsSearchOpen, searchQuery, setSearchQuery } = useWorkspaceStore();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      // In a real scenario, we might open the first bookmark result
      // But user specifically asked for "Google Search Engine" behavior
      window.open(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`, '_blank');
      setIsSearchOpen(false);
    }
    if (e.key === 'Escape') setIsSearchOpen(false);
  };

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-2xl bg-[#1a1a1a]/90 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center p-6">
          <Search size={24} className="absolute left-10 text-white/20" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your bookmarks..."
            className="w-full bg-transparent pl-16 pr-12 py-4 text-2xl font-medium outline-none placeholder:text-white/10"
          />
          <button 
            onClick={() => setIsSearchOpen(false)}
            className="absolute right-10 p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} className="text-white/20" />
          </button>
        </div>

        {searchQuery && (
          <div className="border-t border-white/5 p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {/* Search results would normally go here, but logic is handled in DashboardApp filtering for now */}
            <p className="text-[10px] uppercase tracking-widest text-white/20 text-center py-4">
              Press Esc to close
            </p>
          </div>
        )}
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={() => setIsSearchOpen(false)} />
    </div>
  );
}

export default SearchOverlay;
