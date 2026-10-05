import React, { useEffect, useState, useRef, useMemo } from 'react'
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
import { StartupAnimation } from '../components/ui/StartupAnimation'
import { sessionService } from '../services/sessionService'
import { ModeSwitcher } from '../components/ui/ModeSwitcher'
import { AnalyticsView } from '../components/analytics/AnalyticsView'
import { Plus, X } from 'lucide-react'
import { computeReorderedColumns } from '../utils/columnLayout'

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
    currentMode,
    toggleMode,
    initialize,
    isInitialized,
    currentWallpaper,
    wallpaperType,
    setIsAddWorkspaceModalOpen,
    searchQuery,
    setIsSearchOpen,
    updateWorkspaceColumns,
    reorderColumns,
    moveColumn,
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
  const [showStartupAnimation, setShowStartupAnimation] = useState(false);
  // Tracks whether the YouTube iframe failed to load / returned an error
  const [wallpaperFailed, setWallpaperFailed] = useState(false);
  // Native video resolution warning — shown when source is below 1920×1080
  const [videoQualityWarning, setVideoQualityWarning] = useState(null);
  // { w, h } | null

  // Check if this tab is the start of a new browser session
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      const isFirst = await sessionService.isFirstSessionTab();
      if (active && isFirst) {
        const enabled = useWorkspaceStore.getState().startupAnimationEnabled ?? true;
        if (enabled) {
          setShowStartupAnimation(true);
        }
      }
    };
    checkSession();
    return () => { active = false; };
  }, []);

  // Reset failure state whenever the wallpaper URL changes
  useEffect(() => { setWallpaperFailed(false); }, [currentWallpaper]);

  // Listen for YouTube player error events sent via postMessage
  useEffect(() => {
    const handleMessage = (e) => {
      if (!currentWallpaper || wallpaperType !== 'youtube-embed') return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // YouTube player sends {event:'error', info: errorCode} via postMessage
        if (data?.event === 'error') setWallpaperFailed(true);
        // Also catch infoDelivery with playerError field
        if (data?.event === 'infoDelivery' && data?.info?.playerError) setWallpaperFailed(true);
      } catch (_) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [currentWallpaper, wallpaperType]);

  // ── Drag-and-drop state ─────────────────────────────────────────────────────
  // dragPayload is a ref (no re-render on change) — holds what is being dragged
  const dragPayload = useRef(null);
  // { type: 'column', colId } | { type: 'bookmark', bmId, sourceColId }

  // dragKind triggers re-renders so conditional UI (lane zones, ADD BOARD) reacts
  const [dragKind, setDragKind] = useState(null); // 'column' | 'bookmark' | null

  // dropTarget drives all visual feedback (borders, lines, highlights)
  const [dropTarget, setDropTarget] = useState(null);

  // ── Remade Pointer-based Card Drag Coordinator with Live Layout Preview ──────
  const [activeDragColId, setActiveDragColId] = useState(null);
  const [previewMove, setPreviewMove] = useState(null); // { draggedId, targetId, position: 'above'|'below'|'left'|'right' }
  const [floatingPos, setFloatingPos] = useState(null); // { x, y }

  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const previewMoveRef = useRef(null);
  previewMoveRef.current = previewMove;

  // ── DnD helpers ─────────────────────────────────────────────────────────────
  // IMPORTANT: clearDrag must be declared BEFORE the useEffect that references it
  // to avoid a Temporal Dead Zone (TDZ) ReferenceError in the minified build.
  const clearDrag = () => {
    dragPayload.current = null;
    setDragKind(null);
    setDropTarget(null);
  };

  useEffect(() => { initialize() }, [initialize]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        toggleMode();
      }
    };
    const handleGlobalEnd = () => clearDrag();
    window.addEventListener('keydown', onKey);
    window.addEventListener('dragend', handleGlobalEnd);
    window.addEventListener('drop', handleGlobalEnd);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('dragend', handleGlobalEnd);
      window.removeEventListener('drop', handleGlobalEnd);
    };
  }, [setIsSearchOpen, toggleMode]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  const filteredColumns = useMemo(() => {
    if (!activeWorkspace) return [];
    return (activeWorkspace.columns || []).map(col => ({
      ...col,
      bookmarks: (col.bookmarks || []).filter(bm =>
        (bm?.title || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (bm?.url || '').toLowerCase().includes((searchQuery || '').toLowerCase())
      )
    }));
  }, [activeWorkspace, searchQuery]);

  // Live temporary layout preview while card is brought near drop position
  const displayedColumns = useMemo(() => {
    if (!previewMove) return filteredColumns;
    return computeReorderedColumns(
      filteredColumns,
      previewMove.draggedId,
      previewMove.targetId,
      previewMove.position
    );
  }, [filteredColumns, previewMove]);

  const lanes = useMemo(() => buildLanes(displayedColumns), [displayedColumns]);

  const onStartCardDrag = (colId, e) => {
    dragStartRef.current = { colId, x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
    setActiveDragColId(colId);

    const onPointerMove = (moveEvent) => {
      if (!dragStartRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;

      if (!isDraggingRef.current) {
        if (Math.hypot(dx, dy) < 4) return;
        isDraggingRef.current = true;
      }

      setFloatingPos({ x: moveEvent.clientX, y: moveEvent.clientY });

      // Hit test target columns using [data-col-id]
      const colEls = Array.from(document.querySelectorAll('[data-col-id]'));
      let bestHit = null;

      for (const el of colEls) {
        const targetId = el.getAttribute('data-col-id');
        if (targetId === dragStartRef.current.colId) continue;

        const rect = el.getBoundingClientRect();
        // Generous margin around cards to catch gaps smoothly
        if (
          moveEvent.clientX >= rect.left - 18 &&
          moveEvent.clientX <= rect.right + 18 &&
          moveEvent.clientY >= rect.top - 18 &&
          moveEvent.clientY <= rect.bottom + 18
        ) {
          const relX = moveEvent.clientX - rect.left;
          const relY = moveEvent.clientY - rect.top;
          const w = rect.width;
          const h = rect.height;

          let pos = 'below';
          if (relY < h * 0.25) {
            pos = 'above';
          } else if (relY > h * 0.75) {
            pos = 'below';
          } else if (relX < w * 0.5) {
            pos = 'left';
          } else {
            pos = 'right';
          }

          bestHit = { targetId, position: pos };
          break;
        }
      }

      if (bestHit) {
        setPreviewMove(prev => {
          if (
            prev &&
            prev.draggedId === dragStartRef.current.colId &&
            prev.targetId === bestHit.targetId &&
            prev.position === bestHit.position
          ) {
            return prev;
          }
          return {
            draggedId: dragStartRef.current.colId,
            targetId: bestHit.targetId,
            position: bestHit.position,
          };
        });
      } else {
        // If moved outside any column card, clear preview so layout reverts to prior state
        setPreviewMove(null);
      }
    };

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);

      if (isDraggingRef.current && previewMoveRef.current) {
        const pm = previewMoveRef.current;
        const finalColumns = computeReorderedColumns(
          filteredColumns,
          pm.draggedId,
          pm.targetId,
          pm.position
        );
        updateWorkspaceColumns(activeWorkspaceId, finalColumns);
      }

      isDraggingRef.current = false;
      dragStartRef.current = null;
      setActiveDragColId(null);
      setPreviewMove(null);
      setFloatingPos(null);
    };

    const onKeyDown = (keyEvent) => {
      if (keyEvent.key === 'Escape') {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('keydown', onKeyDown);
        isDraggingRef.current = false;
        dragStartRef.current = null;
        setActiveDragColId(null);
        setPreviewMove(null);
        setFloatingPos(null);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
  };

  // Deduplicated setDropTarget for bookmark drag
  const updateDropTarget = (next) => {
    setDropTarget(prev => {
      if (!next && !prev) return prev;
      if (next && prev &&
          next.kind === prev.kind &&
          next.colId === prev.colId &&
          next.bmId === prev.bmId &&
          next.position === prev.position &&
          next.side === prev.side &&
          next.half === prev.half &&
          next.idx === prev.idx) return prev;
      return next;
    });
  };

  /* =========================================================================
   * [COMMENTED OUT PREVIOUS HTML5 COLUMN DRAG HANDLERS AS REQUESTED]
   *
  const onColumnDragStart = (colId) => {
    dragPayload.current = { type: 'column', colId };
    setDragKind('column');
  };

  const onColumnDragOver = (colId, position) => {
    if (dragPayload.current?.type !== 'column') return;
    if (dragPayload.current.colId === colId) { updateDropTarget(null); return; }
    updateDropTarget({ kind: 'col', colId, position });
  };

  const onColumnDrop = (targetColId, position) => {
    const p = dragPayload.current;
    if (!p || p.type !== 'column' || p.colId === targetColId) return clearDrag();
    moveColumn(activeWorkspaceId, p.colId, targetColId, position);
    clearDrag();
  };

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
   * ========================================================================= */

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

  const onDragEnd = () => clearDrag();

  // ── Per-column DnD snapshot (computed inline, no memo needed) ────────────────
  const getColDnd = (colId) => ({
    isBeingDragged: dragKind === 'column' && dragPayload.current?.colId === colId,
    dropPosition: dropTarget?.kind === 'col' && dropTarget.colId === colId ? dropTarget.position : null,
    isBodyOver: dropTarget?.kind === 'body' && dropTarget.colId === colId,
    bmDropInfo: dropTarget?.kind === 'bm' && dropTarget.colId === colId
      ? { bmId: dropTarget.bmId, half: dropTarget.half }
      : null,
    bmBeingDraggedId: dragKind === 'bookmark' ? dragPayload.current?.bmId : null,
  });

  if (!isInitialized) return <div className="bg-black min-h-screen" />;
  if (!activeWorkspace) return null;

  const accentColor = activeWorkspace?.theme?.accentColor || '#ef4444';

  return (
    <div
      className="relative min-h-screen text-white overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", '--accent-color': accentColor }}
    >
      {/* SVG filter powering the Apple-style liquid-glass distortion on bookmark groups */}
      <svg
        style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none', zIndex: -1 }}
        aria-hidden="true"
      >
        <filter id="liquid-glass-distortion" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.018 0.024" numOctaves="2" result="warpNoise" />
          <feDisplacementMap in="SourceGraphic" in2="warpNoise" scale="36" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      {/* Background — three branches: YouTube iframe | local/URL video | image/none */}
      {wallpaperType === 'youtube-embed' ? (
        <>
          <iframe
            key={currentWallpaper}
            src={currentWallpaper}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              border: 'none',
              transform: 'scale(1.08)',
              transformOrigin: 'center center',
              filter: `brightness(${bgBrightness / 100}) blur(${bgBlur}px)`,
              transition: 'filter 0.6s ease',
              opacity: wallpaperFailed ? 0 : 1,
            }}
            title="Live wallpaper"
          />
          {/* Error overlay — shown when YouTube blocks the embed */}
          {wallpaperFailed && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950" style={{ zIndex: 1 }}>
              <div className="text-center space-y-3 max-w-xs px-6">
                <div className="text-3xl">📺</div>
                <p className="text-white/60 text-sm font-medium">YouTube blocked this embed</p>
                <p className="text-white/30 text-xs leading-relaxed">
                  YouTube restricts embedding in browser extensions.<br />
                  Try a direct <span className="text-amber-400/80">.mp4</span> link from Pexels, Pixabay, or Mixkit instead.
                </p>
                <button
                  onClick={() => useWorkspaceStore.getState().clearWallpaper()}
                  className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white/60 hover:text-white text-xs font-semibold transition-all"
                >
                  Clear Wallpaper
                </button>
              </div>
            </div>
          )}
        </>
      ) : (wallpaperType?.startsWith('video/') || wallpaperType === 'video/url') ? (
        <>
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              // Only apply filter when non-default — blur(0px) / brightness(1) still
              // triggers a compositor rasterization pass that reduces perceived quality.
              // Skipping it entirely lets the browser render the video natively.
              filter: (bgBlur > 0 || bgBrightness < 100)
                ? `brightness(${bgBrightness / 100}) blur(${bgBlur}px)`
                : 'none',
              transition: 'filter 0.6s ease',
            }}
            src={currentWallpaper}
            ref={(el) => { if (el) el.playbackRate = (videoFps || 60) / 60; }}
            onLoadedMetadata={(e) => {
              const { videoWidth: w, videoHeight: h } = e.target;
              // Warn if native resolution is below Full HD (1920×1080)
              if (w > 0 && h > 0 && (w < 1920 || h < 1080)) {
                setVideoQualityWarning({ w, h });
              } else {
                setVideoQualityWarning(null);
              }
            }}
          />
          {/* Low-quality warning toast */}
          {videoQualityWarning && (
            <div
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl border border-amber-500/20 bg-black/70 backdrop-blur-xl text-xs text-white/70 shadow-2xl"
              style={{ zIndex: 50, whiteSpace: 'nowrap' }}
            >
              <span className="text-amber-400">⚠</span>
              <span>
                Source is <span className="text-white font-semibold">{videoQualityWarning.w}&times;{videoQualityWarning.h}</span>
                {' '}— below 1920&times;1080.
                {currentWallpaper?.includes('mixkit.co') && (
                  <> Try replacing <code className="text-amber-400/80 bg-white/5 px-1 rounded">-small.mp4</code> with <code className="text-amber-400/80 bg-white/5 px-1 rounded">-1080p.mp4</code> in the URL.</>  
                )}
              </span>
              <button
                onClick={() => setVideoQualityWarning(null)}
                className="ml-1 text-white/30 hover:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}
        </>
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

        {/* Workspace tabs + Mode Switcher */}
        <header className="flex items-center justify-between px-8 pt-6 pb-0">
          <div className="flex items-center gap-2">
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
          </div>

          <ModeSwitcher />
        </header>

        <div className="mx-8 mt-4 mb-6 h-px bg-white/[0.12]" />

        {currentMode === 'analytics' ? (
          <AnalyticsView />
        ) : (
          <>
            <PinnedBar workspaceId={activeWorkspaceId} columns={activeWorkspace.columns} />

            {/* Kanban board */}
            <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-x-auto overflow-y-auto">
            <div className="flex items-start justify-center gap-4 px-10 pb-8 min-h-full min-w-max mx-auto">

              {/* =========================================================================
               * [COMMENTED OUT PREVIOUS EmptyLaneDropZone AS REQUESTED]
               *
              {dragKind === 'column' && lanes.length < 6 && (
                <EmptyLaneDropZone
                  isOver={dropTarget?.kind === 'lane' && dropTarget.idx === 0}
                  onDragOver={() => onLaneGapDragOver(0)}
                  onDrop={() => onLaneGapDrop(0)}
                />
              )}
               * ========================================================================= */}

              {lanes.map((lane) => (
                <div key={lane.id} className="flex flex-col gap-0 w-[280px] shrink-0 transition-all duration-200">
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
                      // Bookmark DnD
                      dragRef={dragPayload}
                      dragKind={dragKind}
                      dnd={getColDnd(group.id)}
                      onDragEnd={onDragEnd}
                      onBodyDragOver={() => onColBodyDragOver(group.id)}
                      onBodyDrop={() => onColBodyDrop(group.id)}
                      onBmDragStart={onBookmarkDragStart}
                      onBmDragEnd={onDragEnd}
                      onBmDragOver={onBookmarkDragOver}
                      onBmDrop={onBookmarkDrop}
                      // Remade Pointer Card Moving
                      onStartCardDrag={onStartCardDrag}
                      isCardDragging={activeDragColId === group.id}
                      isPreviewPlaceholder={previewMove?.draggedId === group.id}
                    />
                  ))}
                </div>
              ))}

              {/* ADD BOARD */}
              {lanes.length < 6 && (
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
        </>
      )}
      </div>

      {/* Floating Drag Preview Following Pointer */}
      {activeDragColId && floatingPos && isDraggingRef.current && (
        <div
          className="fixed pointer-events-none z-[9999] px-4 py-2 rounded-xl border border-amber-400/60 bg-black/90 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.7),0_0_25px_rgba(245,158,11,0.35)] flex items-center gap-2.5 text-white text-[13px] font-semibold tracking-wide"
          style={{
            left: floatingPos.x + 14,
            top: floatingPos.y + 14,
          }}
        >
          <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-ping" />
          <span>{filteredColumns.find(c => c.id === activeDragColId)?.name || 'Moving Group'}</span>
          {previewMove && (
            <span className="text-amber-400 text-[11px] uppercase tracking-wider font-bold bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
              {previewMove.position}
            </span>
          )}
        </div>
      )}

      <UtilityRail
        onOpenAppearance={() => setIsAppearanceOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenTrash={() => setIsTrashOpen(true)}
        onOpenDuplicates={() => setIsDuplicatesOpen(true)}
      />

      {currentMode !== 'analytics' && (
        <>
          <WidgetsLayer />
          <WidgetGallery />
        </>
      )}

      <AddWorkspaceModal />
      <SearchOverlay />
      <AppearanceModal
        isOpen={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
        onPreviewStartupAnimation={() => setShowStartupAnimation(true)}
      />
      <ImportExportModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
      <TrashModal isOpen={isTrashOpen} onClose={() => setIsTrashOpen(false)} />
      <DuplicatesModal isOpen={isDuplicatesOpen} onClose={() => setIsDuplicatesOpen(false)} />

      {showStartupAnimation && (
        <StartupAnimation
          accentColor={accentColor}
          onComplete={() => setShowStartupAnimation(false)}
        />
      )}

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
