import React, { useEffect, useState } from 'react'
import { 
  DndContext, 
  DragOverlay, 
  closestCenter,
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useWorkspaceStore } from '../store/useWorkspaceStore'
import WallpaperButton from '../components/ui/WallpaperButton'
import SearchButton from '../components/ui/SearchButton'
import SearchOverlay from '../components/ui/SearchOverlay'
import AddWorkspaceModal from '../components/workspace/AddWorkspaceModal'
import { SortableColumn } from '../components/board/SortableColumn'
import { EmptyLaneDropZone } from '../components/board/EmptyLaneDropZone'
import { EditBookmarkModal } from '../components/bookmark/EditBookmarkModal'
import { AddBookmarkToGroupModal } from '../components/bookmark/AddBookmarkToGroupModal'
import { UtilityRail } from '../components/ui/UtilityRail'
import { AppearanceModal } from '../components/ui/AppearanceModal'
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
    if (!laneMap.has(laneId)) {
      laneMap.set(laneId, []);
      laneOrder.push(laneId);
    }
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

  const [activeId, setActiveId] = useState(null);
  const [activeType, setActiveType] = useState(null);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [addingToColumn, setAddingToColumn] = useState(null);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { initialize() }, [initialize])

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setIsSearchOpen]);

  if (!isInitialized) return <div className="bg-black min-h-screen" />

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0]
  if (!activeWorkspace) return null;

  const filteredColumns = activeWorkspace.columns.map(col => ({
    ...col,
    bookmarks: col.bookmarks.filter(bm =>
      bm.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bm.url.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }))

  const lanes = buildLanes(filteredColumns);
  const isDraggingColumn = activeType === 'Column';

  const findContainer = (id) => {
    if (activeWorkspace.columns.find(c => c.id === id)) return id;
    const col = activeWorkspace.columns.find(col => col.bookmarks.some(bm => bm.id === id));
    return col ? col.id : null;
  };

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    setActiveType(active.data.current?.type);
  };

  const handleDragOver = ({ active, over }) => {
    if (activeType !== 'Bookmark' || !over) return;
    const activeContainer = findContainer(active.id);
    const overContainer = over.data.current?.type === 'Column' ? over.id : over.data.current?.columnId;
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;
    reorderBookmarks(activeWorkspaceId, active.id, over.id, activeContainer, overContainer);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null);
    setActiveType(null);
    if (!over) return;

    const overId = over.id.toString();

    // Dropped on an empty lane drop zone
    if (overId.startsWith('empty-lane-')) {
      const laneIndex = parseInt(overId.replace('empty-lane-', ''), 10);
      moveGroupToNewLane(activeWorkspaceId, active.id, laneIndex);
      return;
    }

    if (activeType === 'Column') {
      if (active.id !== over.id) reorderColumns(activeWorkspaceId, active.id, over.id);
    } else if (activeType === 'Bookmark') {
      const activeContainer = findContainer(active.id);
      const overContainer = over.data.current?.type === 'Column' ? over.id : over.data.current?.columnId;
      if (activeContainer === overContainer) {
        reorderBookmarks(activeWorkspaceId, active.id, over.id, activeContainer, overContainer);
      }
    }
  };

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
  };

  const accentColor = activeWorkspace?.theme?.accentColor || '#ef4444';

  return (
    <div 
      className="relative min-h-screen text-white overflow-hidden" 
      style={{ 
        fontFamily: "'Inter', system-ui, sans-serif",
        '--accent-color': accentColor
      }}
    >
      {/* Background */}
      {wallpaperType?.startsWith('video/') ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
          style={{
            filter: `brightness(${bgBrightness / 100}) blur(${bgBlur}px)`,
            transition: 'filter 0.6s ease'
          }}
          src={currentWallpaper}
          ref={(el) => {
            if (el) el.playbackRate = (videoFps || 60) / 60;
          }}
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
              
              {/* Delete Workspace Button */}
              {workspaces.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete the "${ws.name}" workspace?`)) {
                      deleteWorkspace(ws.id);
                    }
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-md opacity-0 group-hover/tab:opacity-100 transition-opacity ${
                    ws.id === activeWorkspaceId
                      ? 'hover:bg-black/10 text-black/60 hover:text-black'
                      : 'hover:bg-white/10 text-white/40 hover:text-white'
                  }`}
                  title="Delete workspace"
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

        {/* Thin separator */}
        <div className="mx-8 mt-4 mb-6 h-px bg-white/[0.12]" />

        {/* Kanban board */}
        <div className="flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="h-full overflow-x-auto overflow-y-auto">
              <div className="flex items-start justify-center gap-4 px-10 pb-8 min-h-full min-w-max mx-auto">
                <SortableContext
                  items={filteredColumns.map(col => col.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {/* Drop zone BEFORE the first lane */}
                  {isDraggingColumn && lanes.length < 6 && (
                    <EmptyLaneDropZone id="empty-lane-0" />
                  )}

                  {lanes.map((lane, laneIdx) => (
                    <React.Fragment key={lane.id}>
                      {/* Vertical lane stack */}
                      <div className="flex flex-col gap-0 w-[280px] shrink-0">
                        {lane.groups.map(group => (
                          <SortableColumn
                            key={group.id}
                            column={group}
                            workspaceId={activeWorkspaceId}
                            onEditBookmark={setEditingBookmark}
                            onDeleteBookmark={(bmId) => removeBookmark(activeWorkspaceId, group.id, bmId)}
                            onAddBookmark={() => setAddingToColumn(group)}
                            onDeleteColumn={(colId) => deleteColumn(activeWorkspaceId, colId)}
                            onAddGroupToLane={() => addGroupToLane(activeWorkspaceId, group.id)}
                          />
                        ))}
                      </div>

                      {/* Drop zone AFTER each lane */}
                      {isDraggingColumn && lanes.length < 6 && (
                        <EmptyLaneDropZone id={`empty-lane-${laneIdx + 1}`} />
                      )}
                    </React.Fragment>
                  ))}
                </SortableContext>

                {/* ADD BOARD — new lane — hover to reveal */}
                {!isDraggingColumn && lanes.length < 6 && (
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

            <DragOverlay dropAnimation={dropAnimation}>
              {activeId ? (
                activeType === 'Column' ? (
                  <div className="w-[280px] h-40 bg-black/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl opacity-80 cursor-grabbing flex items-center justify-center">
                    <div className="w-12 h-1 bg-white/20 rounded-full" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 px-2 py-[5px] rounded-md bg-white/10 border border-white/10 shadow-xl w-64 opacity-80">
                    <div className="w-4 h-4 rounded-sm bg-white/20 flex-shrink-0" />
                    <div className="h-3 w-28 bg-white/20 rounded" />
                  </div>
                )
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {/* Floating bottom-left */}
      <div className="fixed bottom-8 left-8 z-[100] flex items-center gap-3">
        <WallpaperButton />
        <SearchButton />
      </div>

      <UtilityRail 
        onOpenAppearance={() => setIsAppearanceOpen(true)} 
        onOpenBackup={() => setIsBackupOpen(true)} 
      />

      <WidgetsLayer />
      <WidgetGallery />

      <AddWorkspaceModal />
      <SearchOverlay />
      <AppearanceModal isOpen={isAppearanceOpen} onClose={() => setIsAppearanceOpen(false)} />
      <ImportExportModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />

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
        onAdd={(bookmark) => {
          addBookmarkToColumn(activeWorkspaceId, addingToColumn.id, bookmark);
        }}
      />
    </div>
  )
}

export default DashboardApp
