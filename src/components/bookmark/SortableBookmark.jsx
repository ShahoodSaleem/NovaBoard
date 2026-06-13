import React, { useRef } from 'react';
import { Pencil, Trash2, Star } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

export function SortableBookmark({
  bookmark, columnId, workspaceId, viewMode = 'list', isLocked = false, onEdit, onDelete,
  // DnD
  isBeingDragged,
  dropIndicator,  // 'top' | 'bottom' | null
  dragRef,        // shared mutable ref from DashboardApp — tells us what's being dragged
  onDragStart, onDragEnd, onDragOver, onDrop,
}) {
  const { isPrivacyMode, isIncognitoMode, togglePinBookmark } = useWorkspaceStore();
  const bmRef = useRef(null);

  const getHalf = (e) => {
    const rect = bmRef.current?.getBoundingClientRect();
    if (!rect) return 'top';
    if (viewMode === 'grid') {
      return e.clientX < rect.left + rect.width / 2 ? 'top' : 'bottom';
    }
    return e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    // Only handle (and block propagation) when a bookmark is being dragged.
    // For column drag we must let the event bubble to SortableColumn so the
    // column drop indicator can fire — if we stopPropagation here the column
    // never sees the dragover and no indicator is shown.
    if (dragRef?.current?.type !== 'bookmark') return;
    e.stopPropagation();
    onDragOver(bookmark.id, columnId, getHalf(e));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dragRef?.current?.type !== 'bookmark') return; // let column handler take it
    e.stopPropagation();
    onDrop(bookmark.id, columnId, getHalf(e));
  };

  const handleLinkClick = (e) => {
    if (isIncognitoMode) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof chrome !== 'undefined' && chrome.windows?.create) {
        chrome.windows.create({ url: bookmark.url, incognito: true });
      } else {
        window.open(bookmark.url, '_blank');
      }
    }
  };

  const faviconUrl = getFaviconUrl(bookmark.url);

  if (viewMode === 'grid') {
    return (
      <div
        ref={bmRef}
        className={`relative group/bm rounded-xl ${isPrivacyMode ? 'blur-sm hover:blur-none duration-300' : ''}`}
        style={{ opacity: isBeingDragged ? 0.3 : 1, transition: 'opacity 0.15s' }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Insert-before bar (left edge) */}
        {dropIndicator === 'top' && (
          <div className="absolute -left-[3px] top-1 bottom-1 w-0.5 rounded-full bg-amber-400 z-10" />
        )}
        {/* Insert-after bar (right edge) */}
        {dropIndicator === 'bottom' && (
          <div className="absolute -right-[3px] top-1 bottom-1 w-0.5 rounded-full bg-amber-400 z-10" />
        )}

        {/* Draggable tile: favicon + title */}
        <div
          draggable={!isLocked}
          onDragStart={isLocked ? undefined : (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', bookmark.id);
            onDragStart(bookmark.id, columnId);
          }}
          onDragEnd={isLocked ? undefined : onDragEnd}
          className={`flex flex-col items-center gap-1.5 py-2.5 px-1.5 rounded-xl transition-colors duration-150 hover:bg-white/[0.08] ${
            isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          {/* Favicon */}
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              width={28}
              height={28}
              draggable={false}
              className="w-7 h-7 rounded-md flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="w-7 h-7 rounded-md bg-white/10 flex-shrink-0 items-center justify-center text-sm text-white/30"
            style={{ display: faviconUrl ? 'none' : 'flex' }}
          >
            🌐
          </span>

          {/* Title */}
          <a
            href={bookmark.url}
            rel="noopener noreferrer"
            draggable={false}
            onClick={handleLinkClick}
            className="text-[10.5px] text-white/70 hover:text-white truncate transition-colors leading-tight w-full text-center"
            title={bookmark.title}
          >
            {bookmark.title}
          </a>
        </div>

        {/* Pinned indicator */}
        {bookmark.pinned && (
          <Star size={9} fill="currentColor" className="absolute top-1 left-1 text-amber-400 pointer-events-none" />
        )}

        {/* Pin / edit / delete buttons */}
        <div className={`absolute top-0.5 right-0.5 flex items-center gap-0.5 rounded-lg bg-black/40 backdrop-blur-sm transition-opacity ${
          bookmark.pinned ? 'opacity-100' : 'opacity-0 group-hover/bm:opacity-100'
        }`}>
          <button
            draggable={false}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinBookmark(workspaceId, columnId, bookmark.id); }}
            className={`p-1 rounded hover:bg-amber-500/15 transition-all ${
              bookmark.pinned ? 'text-amber-400' : 'text-white/25 hover:text-amber-400'
            }`}
            title={bookmark.pinned ? 'Unpin' : 'Pin to top bar'}
          >
            <Star size={10} fill={bookmark.pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            draggable={false}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark); }}
            className="p-1 rounded hover:bg-white/10 text-white/25 hover:text-white/70 transition-all"
            title="Edit"
          >
            <Pencil size={10} />
          </button>
          {!isLocked && (
            <button
              draggable={false}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id); }}
              className="p-1 rounded hover:bg-red-500/15 text-white/25 hover:text-red-400 transition-all"
              title="Delete"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={bmRef}
      className={`flex flex-col ${isPrivacyMode ? 'blur-sm hover:blur-none duration-300' : ''}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Insert-before line */}
      {dropIndicator === 'top' && (
        <div className="h-0.5 rounded-full bg-amber-400 mx-1 mb-0.5" />
      )}

      {/* Bookmark row — only the draggable inner section to avoid button interference */}
      <div
        className="group/bm flex items-center gap-2.5 px-1 py-[5px] rounded-md cursor-default"
        style={{ opacity: isBeingDragged ? 0.3 : 1, transition: 'opacity 0.15s' }}
      >
        {/* Draggable left section: favicon + title */}
        <div
          draggable={!isLocked}
          onDragStart={isLocked ? undefined : (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', bookmark.id);
            onDragStart(bookmark.id, columnId);
          }}
          onDragEnd={isLocked ? undefined : onDragEnd}
          className={`flex items-center gap-2.5 flex-1 min-w-0 rounded-full px-0.5 py-0.5 transition-all duration-200 group-hover/bm:glass-pill ${
            isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          }`}
        >
          {/* Favicon */}
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              width={16}
              height={16}
              draggable={false}
              className="w-4 h-4 rounded-sm flex-shrink-0"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <span
            className="w-4 h-4 rounded-sm bg-white/10 flex-shrink-0 items-center justify-center text-[8px] text-white/30"
            style={{ display: 'none' }}
          >
            🌐
          </span>

          {/* Title */}
          <a
            href={bookmark.url}
            rel="noopener noreferrer"
            draggable={false}
            onClick={handleLinkClick}
            className="text-[13px] text-white/75 hover:text-white truncate transition-colors leading-none"
            title={bookmark.title}
          >
            {bookmark.title}
          </a>
        </div>

        {/* Pin / edit / delete buttons */}
        <div className={`flex items-center gap-0.5 transition-opacity flex-shrink-0 ${
          bookmark.pinned ? 'opacity-100' : 'opacity-0 group-hover/bm:opacity-100'
        }`}>
          <button
            draggable={false}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePinBookmark(workspaceId, columnId, bookmark.id); }}
            className={`p-1 rounded hover:bg-amber-500/15 transition-all ${
              bookmark.pinned ? 'text-amber-400' : 'text-white/25 hover:text-amber-400'
            }`}
            title={bookmark.pinned ? 'Unpin' : 'Pin to top bar'}
          >
            <Star size={11} fill={bookmark.pinned ? 'currentColor' : 'none'} />
          </button>
          <button
            draggable={false}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark); }}
            className="p-1 rounded hover:bg-white/10 text-white/25 hover:text-white/70 transition-all"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
          {!isLocked && (
            <button
              draggable={false}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id); }}
              className="p-1 rounded hover:bg-red-500/15 text-white/25 hover:text-red-400 transition-all"
              title="Delete"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Insert-after line */}
      {dropIndicator === 'bottom' && (
        <div className="h-0.5 rounded-full bg-amber-400 mx-1 mt-0.5" />
      )}
    </div>
  );
}
