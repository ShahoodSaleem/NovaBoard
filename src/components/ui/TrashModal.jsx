import React, { useState } from 'react';
import { X, Trash2, RotateCcw, Layers, Inbox } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

function timeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function TrashModal({ isOpen, onClose }) {
  const { trash, activeWorkspaceId, restoreFromTrash, permanentlyDeleteTrashItem, emptyTrash } = useWorkspaceStore();
  const isLocked = useWidgetStore(state => state.isWidgetsLocked);
  const [confirmingEmpty, setConfirmingEmpty] = useState(false);

  if (!isOpen) return null;

  const items = trash
    .filter(t => t.workspaceId === activeWorkspaceId)
    .sort((a, b) => b.deletedAt - a.deletedAt);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-group rounded-2xl shadow-2xl overflow-hidden scale-in duration-200 flex flex-col max-h-[80vh]">
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Trash2 size={18} className="text-white/70" />
            <h3 className="text-lg font-semibold text-white">Recently Deleted</h3>
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && !isLocked && (
              <button
                onClick={() => setConfirmingEmpty(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              >
                Empty Trash
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-white/30">
              <Inbox size={28} />
              <p className="text-sm">Trash is empty</p>
            </div>
          ) : (
            <div className="p-2">
              {items.map((item) => {
                const isGroup = item.type === 'group';
                const faviconUrl = !isGroup ? getFaviconUrl(item.bookmark.url) : null;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    {/* Icon */}
                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      {isGroup ? (
                        <Layers size={14} className="text-white/50" />
                      ) : faviconUrl ? (
                        <img src={faviconUrl} alt="" width={16} height={16} className="w-4 h-4 rounded-sm" />
                      ) : (
                        <span className="text-[10px]">🌐</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/85 truncate font-medium">
                        {isGroup ? item.column.name : item.bookmark.title}
                      </p>
                      <p className="text-[11px] text-white/30 truncate">
                        {isGroup
                          ? `Group · ${item.column.bookmarks.length} bookmark${item.column.bookmarks.length === 1 ? '' : 's'}`
                          : `From "${item.columnName}"`}
                        {' · '}{timeAgo(item.deletedAt)}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => restoreFromTrash(item.id)}
                        title="Restore"
                        className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-white/30 hover:text-emerald-400 transition-all"
                      >
                        <RotateCcw size={13} />
                      </button>
                      {!isLocked && (
                        <button
                          onClick={() => permanentlyDeleteTrashItem(item.id)}
                          title="Delete forever"
                          className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/5 text-center text-[11px] text-white/25">
            Items are permanently deleted after 30 days
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        isOpen={confirmingEmpty}
        title="Empty Trash?"
        message={`This will permanently delete ${items.length} item${items.length === 1 ? '' : 's'}. This cannot be undone.`}
        onCancel={() => setConfirmingEmpty(false)}
        onConfirm={() => {
          emptyTrash();
          setConfirmingEmpty(false);
        }}
      />
    </div>
  );
}
