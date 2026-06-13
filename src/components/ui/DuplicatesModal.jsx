import React from 'react';
import { X, Copy, Trash2, CheckCircle2 } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { findDuplicateGroups, getFaviconUrl } from '../../utils/bookmarkUtils';

export function DuplicatesModal({ isOpen, onClose }) {
  const { workspaces, activeWorkspaceId, removeBookmark } = useWorkspaceStore();
  const isLocked = useWidgetStore(state => state.isWidgetsLocked);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  if (!isOpen || !activeWorkspace) return null;

  const duplicateGroups = findDuplicateGroups(activeWorkspace.columns);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg glass-group rounded-2xl shadow-2xl overflow-hidden scale-in duration-200 flex flex-col max-h-[80vh]">
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Copy size={18} className="text-white/70" />
            <h3 className="text-lg font-semibold text-white">Duplicate Bookmarks</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {duplicateGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-14 text-white/30">
              <CheckCircle2 size={28} />
              <p className="text-sm">No duplicates found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {duplicateGroups.map((group, gi) => {
                const faviconUrl = getFaviconUrl(group[0].url);
                return (
                  <div key={gi} className="rounded-xl bg-white/[0.03] p-2">
                    <div className="flex items-center gap-2 px-1.5 pb-1.5 text-[11px] text-white/35">
                      {faviconUrl ? (
                        <img src={faviconUrl} alt="" width={14} height={14} className="w-3.5 h-3.5 rounded-sm" />
                      ) : (
                        <span className="text-[10px]">🌐</span>
                      )}
                      <span className="truncate">{group[0].url}</span>
                      <span className="ml-auto flex-shrink-0 font-bold uppercase tracking-wider text-amber-400/70">
                        {group.length} copies
                      </span>
                    </div>
                    {group.map((bm) => (
                      <div
                        key={bm.id}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white/85 truncate font-medium">{bm.title}</p>
                          <p className="text-[11px] text-white/30 truncate">In "{bm.columnName}"</p>
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => removeBookmark(activeWorkspaceId, bm.columnId, bm.id)}
                            title="Move to Trash"
                            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {duplicateGroups.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/5 text-center text-[11px] text-white/25">
            Removed bookmarks go to Trash and can be restored within 30 days
          </div>
        )}
      </div>
    </div>
  );
}
