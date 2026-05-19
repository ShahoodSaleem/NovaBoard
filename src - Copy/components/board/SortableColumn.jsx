import React, { useState } from 'react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableBookmark } from '../bookmark/SortableBookmark';
import { Plus, Link2, MoreHorizontal } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function SortableColumn({ column, workspaceId, onEditBookmark, onDeleteBookmark, onAddBookmark, onDeleteColumn, onAddGroupToLane }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const updateColumnName = useWorkspaceStore(state => state.updateColumnName);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: column.id,
    data: { type: 'Column', column },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleRename = () => {
    if (newName.trim() && newName !== column.name) {
      updateColumnName(workspaceId, column.id, newName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col w-[280px] shrink-0 group/col"
    >
      {/* Board Card */}
      <div className="flex flex-col bg-black/35 backdrop-blur-2xl border border-white/[0.07] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="4" cy="4" r="1.5"/><circle cx="10" cy="4" r="1.5"/>
                <circle cx="4" cy="10" r="1.5"/><circle cx="10" cy="10" r="1.5"/>
              </svg>
            </div>

            {isEditingName ? (
              <input
                autoFocus
                className="bg-white/10 border-none outline-none rounded px-2 py-0.5 text-[13px] font-bold text-white w-full"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
              />
            ) : (
              <h2
                onClick={() => setIsEditingName(true)}
                className="text-[13px] font-bold text-white/90 truncate cursor-text hover:text-white transition-colors tracking-wide"
              >
                {column.name}
              </h2>
            )}
          </div>

          {/* Action buttons - visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover/col:opacity-100 transition-opacity">
            <button
              onClick={() => onAddBookmark(column.id)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/80 transition-all"
              title="Add Bookmark"
            >
              <Link2 size={13} />
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/80 transition-all"
                title="More options"
              >
                <MoreHorizontal size={13} />
              </button>
              {showMenu && (
                <div className="absolute top-full right-0 mt-1 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 min-w-[130px] z-50">
                  <button
                    onClick={() => { setIsEditingName(true); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Rename group
                  </button>
                  <button
                    onClick={() => { onDeleteColumn(column.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    Delete group
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thin separator line exactly like the image */}
        <div className="mx-4 h-px bg-white/10" />

        {/* Bookmarks List */}
        <div className="px-3 py-3 space-y-0.5 overflow-y-auto max-h-[360px] min-h-[40px]">
          <SortableContext
            items={column.bookmarks.map(bm => bm.id)}
            strategy={verticalListSortingStrategy}
          >
            {column.bookmarks.map((bm) => (
              <SortableBookmark
                key={bm.id}
                bookmark={bm}
                columnId={column.id}
                workspaceId={workspaceId}
                onEdit={onEditBookmark}
                onDelete={onDeleteBookmark}
              />
            ))}
            {column.bookmarks.length === 0 && (
              <div className="h-10 flex items-center justify-center text-white/10 text-xs italic">
                Drop here
              </div>
            )}
          </SortableContext>
        </div>
      </div>

      {/* ADD BOARD below — fades in when hovering over this group area */}
      <button
        onClick={onAddGroupToLane}
        className="mt-3 w-full h-[44px] border-2 border-dashed border-amber-500/0 hover:border-amber-500/55 rounded-xl flex items-center justify-center cursor-pointer gap-2 text-amber-500/0 hover:text-amber-400 hover:bg-amber-500/5 text-[11px] font-bold tracking-widest uppercase opacity-0 group-hover/col:opacity-100 transition-all duration-300"
        title="Add group below in this column"
      >
        <Plus size={13} strokeWidth={2.5} />
        ADD BOARD
      </button>
    </div>
  );
}
