import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

export function SortableBookmark({ bookmark, columnId, workspaceId, onEdit, onDelete }) {
  const { isPrivacyMode, isIncognitoMode } = useWorkspaceStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: bookmark.id,
    data: { type: 'Bookmark', bookmark, columnId },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/bm flex items-center gap-2.5 px-1 py-[5px] rounded-md cursor-default transition-all ${
        isPrivacyMode ? 'blur-sm hover:blur-none duration-300' : ''
      }`}
    >
      {/* Drag handle + favicon + title — this whole left section is draggable */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center gap-2.5 flex-1 min-w-0 cursor-grab active:cursor-grabbing group-hover/bm:bg-white/[0.06] rounded-md px-0.5 py-0.5 transition-colors"
      >
        {/* Favicon */}
        {faviconUrl ? (
          <img
            src={faviconUrl}
            alt=""
            width={16}
            height={16}
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

        {/* Title — clickable link */}
        <a
          href={bookmark.url}
          rel="noopener noreferrer"
          onClick={handleLinkClick}
          className="text-[13px] text-white/75 hover:text-white truncate transition-colors leading-none"
          title={bookmark.title}
        >
          {bookmark.title}
        </a>
      </div>

      {/* Action buttons — hidden until hover */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover/bm:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(bookmark); }}
          className="p-1 rounded hover:bg-white/10 text-white/25 hover:text-white/70 transition-all"
          title="Edit"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(bookmark.id); }}
          className="p-1 rounded hover:bg-red-500/15 text-white/25 hover:text-red-400 transition-all"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
