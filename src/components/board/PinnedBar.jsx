import React from 'react';
import { Star, X } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

export function PinnedBar({ workspaceId, columns }) {
  const { togglePinBookmark, isIncognitoMode } = useWorkspaceStore();

  const pinned = columns.flatMap(col =>
    col.bookmarks.filter(bm => bm.pinned).map(bm => ({ ...bm, columnId: col.id }))
  );

  if (pinned.length === 0) return null;

  const handleLinkClick = (e, url) => {
    if (isIncognitoMode) {
      e.preventDefault();
      if (typeof chrome !== 'undefined' && chrome.windows?.create) {
        chrome.windows.create({ url, incognito: true });
      } else {
        window.open(url, '_blank');
      }
    }
  };

  return (
    <div className="mx-8 mb-4 flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-white/30 text-[11px] font-bold uppercase tracking-widest mr-1 flex-shrink-0">
        <Star size={12} fill="currentColor" />
        Pinned
      </div>
      {pinned.map((bm) => {
        const faviconUrl = getFaviconUrl(bm.url);
        return (
          <a
            key={bm.id}
            href={bm.url}
            rel="noopener noreferrer"
            onClick={(e) => handleLinkClick(e, bm.url)}
            className="group/pin flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full glass-pill text-[12px] text-white/75 hover:text-white transition-colors"
            title={bm.title}
          >
            {faviconUrl ? (
              <img src={faviconUrl} alt="" width={14} height={14} draggable={false} className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
            ) : (
              <span className="w-3.5 h-3.5 flex items-center justify-center text-[8px] flex-shrink-0">🌐</span>
            )}
            <span className="truncate max-w-[120px]">{bm.title}</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinBookmark(workspaceId, bm.columnId, bm.id); }}
              className="p-0.5 rounded-full opacity-0 group-hover/pin:opacity-100 hover:bg-white/10 text-white/40 hover:text-red-400 transition-all flex-shrink-0"
              title="Unpin"
            >
              <X size={10} />
            </button>
          </a>
        );
      })}
    </div>
  );
}
