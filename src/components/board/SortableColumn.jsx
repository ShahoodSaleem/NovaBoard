import React, { useState, useRef } from 'react';
import { SortableBookmark } from '../bookmark/SortableBookmark';
import { Plus, Link2, MoreHorizontal, ChevronDown, Palette, LayoutGrid, List } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { LiquidGlassCard } from '../ui/LiquidGlassCard';

// Preset icons shown next to the group name. `null` = no icon.
const ICON_PRESETS = [null, '📌', '💼', '🎮', '📚', '🎨', '🛒', '🎵', '💻', '✈️', '❤️', '🔥'];

// Preset glare tints for the cursor-tracked specular highlight. `null` = default white glare.
const GLARE_PRESETS = [
  { name: 'Default', value: null },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
];

const hexToRgba = (hex, alpha) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function SortableColumn({
  column, workspaceId, isLocked = false,
  onEditBookmark, onDeleteBookmark, onAddBookmark, onDeleteColumn, onAddGroupToLane,
  // Bookmark DnD
  dragRef,
  dragKind,
  dnd,
  onDragStart, onDragEnd,
  onColDragOver, onColDrop,
  onBodyDragOver, onBodyDrop,
  onBmDragStart, onBmDragEnd, onBmDragOver, onBmDrop,
  // Remade Pointer-based Card Moving
  onStartCardDrag,
  isCardDragging = false,
  isPreviewPlaceholder = false,
}) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(column.name);
  const [showMenu, setShowMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef(null);
  const updateColumnName = useWorkspaceStore(state => state.updateColumnName);
  const updateColumnIcon = useWorkspaceStore(state => state.updateColumnIcon);
  const updateColumnGlareColor = useWorkspaceStore(state => state.updateColumnGlareColor);
  const updateColumnViewMode = useWorkspaceStore(state => state.updateColumnViewMode);
  const viewMode = column.viewMode || 'list';

  const handleRename = () => {
    if (newName.trim() && newName !== column.name) updateColumnName(workspaceId, column.id, newName.trim());
    setIsEditingName(false);
  };

  // Use dragRef.current (ref, always current) instead of dragKind prop (state, may lag 1 frame)
  /* =========================================================================
   * [COMMENTED OUT PREVIOUS HTML5 COLUMN DRAG LOGIC AS REQUESTED]
   *
  // Calculate 2D drop target region (above/below in same lane, or left-lane/right-lane for new column)
  const calculatePosition = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 'below';
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < rect.width * 0.22) return 'left-lane';
    if (x > rect.width * 0.78) return 'right-lane';
    if (y < rect.height * 0.5) return 'above';
    return 'below';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const type = getDragType();
    if (type === 'column') {
      const pos = calculatePosition(e);
      onColDragOver(pos);
    } else if (type === 'bookmark') {
      onBodyDragOver();
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = getDragType();
    if (type === 'column') {
      const pos = calculatePosition(e);
      onColDrop(pos);
    } else if (type === 'bookmark') {
      onBodyDrop();
    }
  };
   * ========================================================================= */

  // Bookmark DnD over the column body
  const handleBookmarkDragOver = (e) => {
    if (dragRef?.current?.type === 'bookmark') {
      e.preventDefault();
      onBodyDragOver?.();
    }
  };

  const handleBookmarkDrop = (e) => {
    if (dragRef?.current?.type === 'bookmark') {
      e.preventDefault();
      onBodyDrop?.();
    }
  };

  return (
    <div
      ref={containerRef}
      data-col-id={column.id}
      className={`flex flex-col w-[280px] shrink-0 group/col transition-all duration-200 ease-out ${
        isPreviewPlaceholder ? 'scale-[0.98] ring-2 ring-amber-400/80 rounded-2xl shadow-[0_0_25px_rgba(245,158,11,0.25)]' : ''
      }`}
      style={{
        opacity: isCardDragging ? 0.35 : (dnd?.isBeingDragged ? 0.3 : 1),
        transform: isCardDragging ? 'scale(0.96)' : (dnd?.isBeingDragged ? 'scale(0.96)' : 'scale(1)'),
        filter: isCardDragging ? 'blur(1px)' : 'none',
      }}
      onDragOver={handleBookmarkDragOver}
      onDrop={handleBookmarkDrop}
    >
      {/* Board card: Apple-Style Liquid Glass Container with Slot-Based Architecture */}
      <LiquidGlassCard
        className="flex flex-col"
        filterId={`liquid-filter-${column.id}`}
        isDropActive={dnd?.isBodyOver}
        glareColor={column.glareColor ? hexToRgba(column.glareColor, 0.35) : null}
      >

        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">

            {/* Drag handle — initiates column moving via pointer events */}
            <div
              onPointerDown={(e) => {
                if (e.button !== 0 || isLocked) return;
                onStartCardDrag?.(column.id, e);
              }}
              className={`cursor-grab active:cursor-grabbing text-white/40 hover:text-white/80 transition-colors flex-shrink-0 p-1 rounded-md hover:bg-white/10 ${
                isLocked ? 'pointer-events-none opacity-20' : ''
              }`}
              title="Drag to move group"
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
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setIsEditingName(false); }}
              />
            ) : (
              <h2
                onPointerDown={(e) => {
                  if (e.button !== 0 || isLocked) return;
                  onStartCardDrag?.(column.id, e);
                }}
                onDoubleClick={() => setIsEditingName(true)}
                className={`text-[13px] font-bold text-white/90 truncate tracking-wide flex items-center gap-1.5 min-w-0 select-none ${
                  isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:text-white'
                }`}
                title="Drag to move group, double-click to rename"
              >
                {column.icon && <span className="text-sm flex-shrink-0">{column.icon}</span>}
                <span className="truncate">{column.name}</span>
              </h2>
            )}
          </div>

          {/* View mode toggle */}
          <button
            onClick={() => updateColumnViewMode(workspaceId, column.id, viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/80 transition-all flex-shrink-0 opacity-0 group-hover/col:opacity-100"
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List size={13} /> : <LayoutGrid size={13} />}
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/80 transition-all flex-shrink-0"
            title={isCollapsed ? 'Expand group' : 'Collapse group'}
          >
            <ChevronDown size={13} className={`transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`} />
          </button>

          {/* Header actions */}
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
              >
                <MoreHorizontal size={13} />
              </button>
              {showMenu && (
                <div className="absolute top-full right-0 mt-1 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-1 min-w-[170px] z-50">
                  <button
                    onClick={() => { setIsEditingName(true); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    Rename group
                  </button>
                  {!isLocked && (
                    <button
                      onClick={() => { onDeleteColumn(column.id); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                      Delete group
                    </button>
                  )}

                  <div className="mt-1 pt-2 px-3 pb-2 border-t border-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Group Icon</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {ICON_PRESETS.map((icon, i) => (
                        <button
                          key={i}
                          onClick={() => updateColumnIcon(workspaceId, column.id, icon)}
                          title={icon || 'No icon'}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-110 ${
                            (column.icon || null) === icon ? 'bg-white/15 ring-1 ring-white/30' : 'hover:bg-white/5'
                          }`}
                        >
                          {icon || <span className="text-white/25 text-[10px]">✕</span>}
                        </button>
                      ))}
                      <input
                        type="text"
                        value={column.icon && !ICON_PRESETS.includes(column.icon) ? column.icon : ''}
                        onChange={(e) => updateColumnIcon(workspaceId, column.id, e.target.value.slice(0, 4) || null)}
                        placeholder="✏️"
                        title="Custom icon/emoji"
                        className="w-9 h-6 rounded-lg bg-white/5 border border-white/10 text-center text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                      />
                    </div>
                  </div>

                  <div className="pt-2 px-3 pb-2 border-t border-white/5">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Glare Color</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {GLARE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          onClick={() => updateColumnGlareColor(workspaceId, column.id, preset.value)}
                          title={preset.name}
                          className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                            (column.glareColor || null) === preset.value
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-zinc-900'
                              : 'border border-white/15'
                          }`}
                          style={{
                            background: preset.value || 'linear-gradient(135deg, #ffffff, #9ca3af)',
                          }}
                        />
                      ))}
                      <label
                        title="Custom color"
                        className="relative w-5 h-5 rounded-full border border-white/15 cursor-pointer flex items-center justify-center text-white/40 hover:text-white/80 transition-colors overflow-hidden"
                      >
                        <Palette size={10} />
                        <input
                          type="color"
                          value={column.glareColor || '#ffffff'}
                          onChange={(e) => updateColumnGlareColor(workspaceId, column.id, e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}>
          <div className="overflow-hidden">
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* Bookmarks list */}
            <div className={
              viewMode === 'grid'
                ? 'px-3 py-3 grid grid-cols-4 gap-1.5 overflow-y-auto max-h-[360px] min-h-[40px]'
                : 'px-3 py-3 space-y-0 overflow-y-auto max-h-[360px] min-h-[40px]'
            }>
              {column.bookmarks.map((bm) => (
                <SortableBookmark
                  key={bm.id}
                  bookmark={bm}
                  columnId={column.id}
                  workspaceId={workspaceId}
                  viewMode={viewMode}
                  isLocked={isLocked}
                  onEdit={onEditBookmark}
                  onDelete={onDeleteBookmark}
                  isBeingDragged={dnd.bmBeingDraggedId === bm.id}
                  dropIndicator={dnd.bmDropInfo?.bmId === bm.id ? dnd.bmDropInfo.half : null}
                  dragRef={dragRef}
                  onDragStart={onBmDragStart}
                  onDragEnd={onBmDragEnd}
                  onDragOver={onBmDragOver}
                  onDrop={onBmDrop}
                />
              ))}
              {column.bookmarks.length === 0 && (
                <div className={`h-10 flex items-center justify-center text-white/10 text-xs italic select-none ${viewMode === 'grid' ? 'col-span-4' : ''}`}>
                  Drop here
                </div>
              )}
            </div>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Add group below in same lane */}
      <button
        onClick={onAddGroupToLane}
        className="mt-3 w-full h-[44px] border-2 border-dashed border-amber-500/0 hover:border-amber-500/55 rounded-xl flex items-center justify-center cursor-pointer gap-2 text-amber-500/0 hover:text-amber-400 hover:bg-amber-500/5 text-[11px] font-bold tracking-widest uppercase opacity-0 group-hover/col:opacity-100 transition-all duration-300"
      >
        <Plus size={13} strokeWidth={2.5} />
        ADD BOARD
      </button>
    </div>
  );
}
