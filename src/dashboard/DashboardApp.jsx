import React, { useEffect, useState, useRef } from 'react'
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import { useWidgetStore } from '../store/useWidgetStore'
import SearchOverlay from '../components/ui/SearchOverlay'
import AddWorkspaceModal from '../components/workspace/AddWorkspaceModal'
import { SortableColumn } from '../components/board/SortableColumn'
import { PinnedBar } from '../components/board/PinnedBar'
import { EmptyLaneDropZone } from '../components/board/EmptyLaneDropZone'
import { EditBookmarkModal } from '../components/bookmark/EditBookmarkModal'
import { AddBookmarkToGroupModal } from '../components/bookmark/AddBookmarkToGroupModal'
import { UtilityRail } from '../components/ui/UtilityRail'
import { AppearanceModal } from '../components/ui/AppearanceModal'
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal'
import { TrashModal } from '../components/ui/TrashModal'
import { DuplicatesModal } from '../components/ui/DuplicatesModal'
import { ImportExportModal } from '../components/dashboard/ImportExportModal'
import { WidgetsLayer } from '../components/widgets/WidgetsLayer'
import { WidgetGallery } from '../components/widgets/WidgetGallery'
import { Plus, X } from 'lucide-react'

// Groups flat columns array into vertical lanes by laneId
function buildLanes(columns) {
  const laneMap = new Map();
  const laneOrder = [];
  columns.forEach(col => {
    const laneId = col.laneId || col.id;
    if (!laneMap.has(laneId)) { laneMap.set(laneId, []); laneOrder.push(laneId); }
    laneMap.get(laneId).push(col);
  });
  return laneOrder.map(id => ({ id, groups: laneMap.get(id) }));
}

function DashboardApp() {
  const {
    workspaces,
    activeWorkspaceId,
    initialize,
    isInitialized,
    currentWallpaper,
    wallpaperType,
    setIsAddWorkspaceModalOpen,
    searchQuery,
    setIsSearchOpen,
    reorderColumns,
    reorderBookmarks,
    updateBookmark,
    removeBookmark,
    addBookmarkToColumn,
    addColumn,
    addGroupToLane,
    moveGroupToNewLane,
    deleteColumn,
    deleteWorkspace,
    bgBlur,
    bgBrightness,
    videoFps
  } = useWorkspaceStore()

  const isLocked = useWidgetStore(state => state.isWidgetsLocked);

  const [editingBookmark, setEditingBookmark] = useState(null);
  const [addingToColumn, setAddingToColumn] = useState(null);
  const [deletingColumn, setDeletingColumn] = useState(null);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isDuplicatesOpen, setIsDuplicatesOpen] = useState(false);

  // ── Drag-and-drop state ─────────────────────────────────────────────────────
  // dragPayload is a ref (no re-render on change) — holds what is being dragged
  const dragPayload = useRef(null);
  // { type: 'column', colId } | { type: 'bookmark', bmId, sourceColId }

  // dragKind triggers re-renders so conditional UI (lane zones, ADD BOARD) reacts
  const [dragKind, setDragKind] = useState(null); // 'column' | 'bookmark' | null

  // dropTarget drives all visual feedback (borders, lines, highlights)
  const [dropTarget, setDropTarget] = useState(null);
  // { kind: 'col',   colId, side: 'before'|'after' }
  // { kind: 'bm',    bmId, colId, half: 'top'|'bottom' }
  // { kind: 'body',  colId }
  // { kind: 'lane',  idx: number }

  useEffect(() => { initialize() }, [initialize])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); setIsSearchOpen(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setIsSearchOpen]);

  if (!isInitialized) return <div className="bg-black min-h-screen" />;

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  if (!activeWorkspace) return null;

  const filteredColumns = activeWorkspace.columns.map(col => ({
    ...col,
    bookmarks: col.bookmarks.filter(bm =>
      bm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.url.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }));
  const lanes = buildLanes(filteredColumns);

  // ── DnD helpers ─────────────────────────────────────────────────────────────

  const clearDrag = () => {
    dragPayload.current = null;
    setDragKind(null);
    setDropTarget(null);
  };

  // Deduplicated setDropTarget — avoids pointless re-renders when nothing changed
  const updateDropTarget = (next) => {
    setDropTarget(prev => {
      if (!next && !prev) return prev;
      if (next && prev &&
          next.kind === prev.kind &&
          next.colId === prev.colId &&
          next.bmId === prev.bmId &&
          next.side === prev.side &&
          next.half === prev.half &&
          next.idx === prev.idx) return prev;
      return next;
    });
  };

  // ── Column drag ──────────────────────────────────────────────────────────────

  const onColumnDragStart = (colId) => {
    dragPayload.current = { type: 'column', colId };
    setDragKind('column');
  };

  const onColumnDragOver = (colId, side) => {
    if (dragPayload.current?.type !== 'column') return;
    if (dragPayload.current.colId === colId) { updateDropTarget(null); return; }
    updateDropTarget({ kind: 'col', colId, side });
  };

  const onColumnDrop = (targetColId, side) => {
    const p = dragPayload.current;
    if (!p || p.type !== 'column' || p.colId === targetColId) return clearDrag();

    if (side === 'before') {
      reorderColumns(activeWorkspaceId, p.colId, targetColId);
    } else {
      // Insert after targetColId: find the next column (skipping the dragged one)
      const cols = activeWorkspace.columns;
      const targetIdx = cols.findIndex(c => c.id === targetColId);
      const nextCol = cols.slice(targetIdx + 1).find(c => c.id !== p.colId);
      reorderColumns(activeWorkspaceId, p.colId, nextCol?.id ?? null);
    }
    clearDrag();
  };

  // ── Bookmark drag ─────────────────────────────────────────────────────────────

  const onBookmarkDragStart = (bmId, sourceColId) => {
    dragPayload.current = { type: 'bookmark', bmId, sourceColId };
    setDragKind('bookmark');
  };

  const onBookmarkDragOver = (bmId, colId, half) => {
    if (dragPayload.current?.type !== 'bookmark') return;
    updateDropTarget({ kind: 'bm', bmId, colId, half });
  };

  const onColBodyDragOver = (colId) => {
    if (dragPayload.current?.type !== 'bookmark') return;
    updateDropTarget({ kind: 'body', colId });
  };

  const onBookmarkDrop = (targetBmId, targetColId, half) => {
    const p = dragPayload.current;
    if (!p || p.type !== 'bookmark') return clearDrag();

    const col = activeWorkspace.columns.find(c => c.id === targetColId);
    let overId;
    if (half === 'top') {
      overId = targetBmId;
    } else {
      const idx = col?.bookmarks.findIndex(b => b.id === targetBmId) ?? -1;
      overId = (idx !== -1 && idx < (col?.bookmarks.length ?? 0) - 1)
        ? col.bookmarks[idx + 1].id
        : null;
    }

    reorderBookmarks(activeWorkspaceId, p.bmId, overId, p.sourceColId, targetColId);
    clearDrag();
  };

  const onColBodyDrop = (colId) => {
    const p = dragPayload.current;
    if (!p || p.type !== 'bookmark') return clearDrag();
    reorderBookmarks(activeWorkspaceId, p.bmId, null, p.sourceColId, colId);
    clearDrag();
  };

  // ── Lane-gap drag ─────────────────────────────────────────────────────────────

  const onLaneGapDragOver = (laneIdx) => {
    if (dragPayload.current?.type !== 'column') return;
    updateDropTarget({ kind: 'lane', idx: laneIdx });
  };

  const onLaneGapDrop = (laneIdx) => {
    const p = dragPayload.current;
    if (!p || p.type !== 'column') return clearDrag();
    moveGroupToNewLane(activeWorkspaceId, p.colId, laneIdx);
    clearDrag();
  };

  const onDragEnd = () => clearDrag();

  // ── Per-column DnD snapshot (computed inline, no memo needed) ────────────────
  const getColDnd = (colId) => ({
    isBeingDragged: dragKind === 'column' && dragPayload.current?.colId === colId,
    dropSide: dropTarget?.kind === 'col' && dropTarget.colId === colId ? dropTarget.side : null,
    isBodyOver: dropTarget?.kind === 'body' && dropTarget.colId === colId,
    bmDropInfo: dropTarget?.kind === 'bm' && dropTarget.colId === colId
      ? { bmId: dropTarget.bmId, half: dropTarget.half }
      : null,
    bmBeingDraggedId: dragKind === 'bookmark' ? dragPayload.current?.bmId : null,
  });

  const accentColor = activeWorkspace?.theme?.accentColor || '#ef4444';

  return (
    <div
      className="relative min-h-screen text-white overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", '--accent-color': accentColor }}
    >
      {/* SVG filter powering the liquid-glass refraction effect on bookmark groups */}
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
        <filter id="liquid-glass-distortion" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="2" result="softNoise" />
          <feDisplacementMap in="SourceGraphic" in2="softNoise" scale="45" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Background */}
      {wallpaperType?.startsWith('video/') ? (
        <video
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
          style={{ filter: `brightness(${bgBrightness / 100}) blur(${bgBlur}px)`, transition: 'filter 0.6s ease' }}
          src={currentWallpaper}
          ref={(el) => { if (el) el.playbackRate = (videoFps || 60) / 60; }}
        />
      ) : (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{
            backgroundImage: currentWallpaper ? `url(${currentWallpaper})` : 'none',
            backgroundColor: '#050505',
            filter: `brightness(${bgBrightness / 100}) blur(${bgBlur}px)`,
            transition: 'filter 0.6s ease'
          }}
        />
      )}
      <div className="absolute inset-0 bg-black/10" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">

        {/* Workspace tabs */}
        <header className="flex items-center gap-2 px-8 pt-6 pb-0">
          {workspaces.map(ws => (
            <div key={ws.id} className="relative group/tab">
              <button
                onClick={() => useWorkspaceStore.getState().setActiveWorkspace(ws.id)}
                className={`flex items-center gap-1.5 pl-5 ${workspaces.length > 1 ? 'pr-8' : 'pr-5'} py-[7px] rounded-xl text-[13px] transition-all font-semibold ${
                  ws.id === activeWorkspaceId
                    ? 'bg-amber-400 text-black shadow-lg'
                    : 'bg-white/[0.07] text-white/50 hover:text-white/80 hover:bg-white/[0.1]'
                }`}
              >
                {ws.name}
              </button>
              {workspaces.length > 1 && !isLocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete workspace "${ws.name}"?`)) deleteWorkspace(ws.id);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md opacity-0 group-hover/tab:opacity-100 transition-opacity ${
                    ws.id === activeWorkspaceId
                      ? 'hover:bg-black/10 text-black/60 hover:text-black'
                      : 'hover:bg-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setIsAddWorkspaceModalOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.07] text-white/40 hover:bg-white/[0.12] hover:text-white transition-all"
          >
            <Plus size={16} />
          </button>
        </header>

        <div className="mx-8 mt-4 mb-6 h-px bg-white/[0.12]" />

        <PinnedBar workspaceId={activeWorkspaceId} columns={activeWorkspace.columns} />

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <div className="flex items-start justify-center gap-4 px-10 pb-8 min-h-full min-w-max mx-auto">

              {/* Lane gap BEFORE first lane (only during column drag) */}
              {dragKind === 'column' && lanes.length < 6 && (
                <EmptyLaneDropZone
                  isOver={dropTarget?.kind === 'lane' && dropTarget.idx === 0}
                  onDragOver={() => onLaneGapDragOver(0)}
                  onDrop={() => onLaneGapDrop(0)}
                />
              )}

              {lanes.map((lane, laneIdx) => (
                <React.Fragment key={lane.id}>
                  <div className="flex flex-col gap-0 w-[280px] shrink-0">
                    {lane.groups.map(group => (
                      <SortableColumn
                        key={group.id}
                        column={group}
                        workspaceId={activeWorkspaceId}
                        isLocked={isLocked}
                        onEditBookmark={setEditingBookmark}
                        onDeleteBookmark={(bmId) => removeBookmark(activeWorkspaceId, group.id, bmId)}
                        onAddBookmark={() => setAddingToColumn(group)}
                        onDeleteColumn={() => setDeletingColumn(group)}
                        onAddGroupToLane={() => addGroupToLane(activeWorkspaceId, group.id)}
                        // DnD — dragRef is the mutable ref (always current, no stale-state issues)
                        dragRef={dragPayload}
                        dragKind={dragKind}
                        dnd={getColDnd(group.id)}
                        onDragStart={() => onColumnDragStart(group.id)}
                        onDragEnd={onDragEnd}
                        onColDragOver={(side) => onColumnDragOver(group.id, side)}
                        onColDrop={(side) => onColumnDrop(group.id, side)}
                        onBodyDragOver={() => onColBodyDragOver(group.id)}
                        onBodyDrop={() => onColBodyDrop(group.id)}
                        onBmDragStart={onBookmarkDragStart}
                        onBmDragEnd={onDragEnd}
                        onBmDragOver={onBookmarkDragOver}
                        onBmDrop={onBookmarkDrop}
                      />
                    ))}
                  </div>

                  {/* Lane gap AFTER each lane (only during column drag) */}
                  {dragKind === 'column' && lanes.length < 6 && (
                    <EmptyLaneDropZone
                      isOver={dropTarget?.kind === 'lane' && dropTarget.idx === laneIdx + 1}
                      onDragOver={() => onLaneGapDragOver(laneIdx + 1)}
                      onDrop={() => onLaneGapDrop(laneIdx + 1)}
                    />
                  )}
                </React.Fragment>
              ))}

              {/* ADD BOARD — only visible when not dragging a column */}
              {dragKind !== 'column' && lanes.length < 6 && (
                <div
                  onClick={() => addColumn(activeWorkspaceId)}
                  className="w-[280px] shrink-0 h-[52px] border-2 border-dashed border-amber-500/0 hover:border-amber-500/55 rounded-2xl flex items-center justify-center cursor-pointer gap-2 text-amber-500/0 hover:text-amber-400 hover:bg-amber-500/5 text-[11px] font-bold tracking-widest uppercase self-start opacity-0 hover:opacity-100 transition-all duration-300"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  ADD BOARD
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UtilityRail
        onOpenAppearance={() => setIsAppearanceOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        onOpenDuplicates={() => setIsDuplicatesOpen(true)}
      />

      <WidgetsLayer />
      <WidgetGallery />

      <AddWorkspaceModal />
      <SearchOverlay />
      <AppearanceModal isOpen={isAppearanceOpen} onClose={() => setIsAppearanceOpen(false)} />
      <ImportExportModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      <TrashModal isOpen={isTrashOpen} onClose={() => setIsTrashOpen(false)} />
      <DuplicatesModal isOpen={isDuplicatesOpen} onClose={() => setIsDuplicatesOpen(false)} />

      <EditBookmarkModal
        isOpen={!!editingBookmark}
        bookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
        onSave={(updates) => {
          const colId = activeWorkspace.columns.find(c => c.bookmarks.some(b => b.id === editingBookmark.id))?.id;
          updateBookmark(activeWorkspaceId, colId, editingBookmark.id, updates);
        }}
      />

      <AddBookmarkToGroupModal
        isOpen={!!addingToColumn}
        groupName={addingToColumn?.name}
        onClose={() => setAddingToColumn(null)}
        onAdd={(bookmark) => addBookmarkToColumn(activeWorkspaceId, addingToColumn.id, bookmark)}
      />

      <ConfirmDeleteModal
        isOpen={!!deletingColumn}
        title={`Delete "${deletingColumn?.name}"?`}
        message={
          deletingColumn?.bookmarks?.length
            ? `This group and its ${deletingColumn.bookmarks.length} bookmark${deletingColumn.bookmarks.length === 1 ? '' : 's'} will be moved to Trash. You can restore it within 30 days.`
            : 'This group will be moved to Trash. You can restore it within 30 days.'
        }
        onCancel={() => setDeletingColumn(null)}
        onConfirm={() => {
          deleteColumn(activeWorkspaceId, deletingColumn.id);
          setDeletingColumn(null);
        }}
      />
    </div>
  );
}

export default DashboardApp
