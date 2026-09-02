import { create } from 'zustand';
import { storageService } from '../services/storageService';
import { wallpaperService } from '../services/wallpaperService';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const RECOVERED_COLUMN_ID = 'col-recovered';

const DEFAULT_WORKSPACES = [
  {
    id: 'default-work',
    name: 'Work',
    theme: {
      backgroundUrl: '',
      overlayOpacity: 0,
      accentColor: '#3b82f6'
    },
    columns: [
      {
        id: 'col-inbox',
        name: 'Inbox',
        bookmarks: [
          { id: 'sample-1', title: 'Google', url: 'https://google.com', addedAt: new Date().toISOString() },
          { id: 'sample-2', title: 'GitHub', url: 'https://github.com', addedAt: new Date().toISOString() }
        ]
      },
      { id: 'col-progress', name: 'In Progress', bookmarks: [] },
      { id: 'col-ready', name: 'Ready', bookmarks: [] },
      { id: 'col-archive', name: 'Archive', bookmarks: [] }
    ]
  }
];

export const useWorkspaceStore = create((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  trash: [],
  isInitialized: false,
  currentWallpaper: null,
  wallpaperType: null,
  // 'youtube-embed' | 'video/url' | 'image/url' | 'video/*' (blob) | 'image/*' (blob) | null

  // UI States
  currentMode: 'bookmarks', // 'bookmarks' | 'analytics'
  isSearchOpen: false,
  searchQuery: '',
  isAddWorkspaceModalOpen: false,
  isPrivacyMode: false,
  isIncognitoMode: false,
  bgBlur: 0,
  bgBrightness: 100,
  videoFps: 60,
  startupAnimationEnabled: true,

  initialize: async () => {
    try {
      let data = null;
      try {
        data = await storageService.loadData();
      } catch (err) {
        console.warn('Storage load warning:', err);
      }

      let wallpaperBlob = null;
      try {
        wallpaperBlob = await wallpaperService.getWallpaper();
      } catch (err) {
        console.warn('Wallpaper load warning:', err);
      }

      const wallpaperUrl = wallpaperBlob ? URL.createObjectURL(wallpaperBlob) : null;
      const wallpaperType = wallpaperBlob?.type || null;

      if (data && Array.isArray(data.workspaces) && data.workspaces.length > 0) {
        const migratedWorkspaces = data.workspaces.map(ws => ({
          ...ws,
          columns: (ws.columns || []).map(col => ({
            ...col,
            bookmarks: Array.isArray(col?.bookmarks) ? col.bookmarks : [],
            laneId: col?.laneId || col?.id
          }))
        }));
        const freshTrash = (data.trash || []).filter(item => item && item.deletedAt && (Date.now() - item.deletedAt <= THIRTY_DAYS_MS));

        const validActiveId = migratedWorkspaces.some(w => w.id === data.activeWorkspaceId)
          ? data.activeWorkspaceId
          : migratedWorkspaces[0].id;

        // URL-based wallpapers are stored in chrome.storage.local; blob wallpapers in IndexedDB
        const isUrlWallpaper = data.wallpaperType === 'youtube-embed' ||
          data.wallpaperType === 'video/url' ||
          data.wallpaperType === 'image/url';

        // ── Migrate old YouTube embed URLs ──────────────────────────────────────
        // Previous builds included controls=0/disablekb=1/showinfo=0 which cause
        // Error 513. Strip those params from any stored URL automatically.
        let storedWallpaperUrl = data.wallpaperUrl || null;
        if (data.wallpaperType === 'youtube-embed' && storedWallpaperUrl) {
          storedWallpaperUrl = storedWallpaperUrl
            .replace(/[&?]controls=0/g, '')
            .replace(/[&?]disablekb=1/g, '')
            .replace(/[&?]showinfo=0/g, '');
        }

        const resolvedWallpaper = isUrlWallpaper ? storedWallpaperUrl : wallpaperUrl;
        const resolvedWallpaperType = isUrlWallpaper ? data.wallpaperType : wallpaperType;

        set({
          workspaces: migratedWorkspaces,
          activeWorkspaceId: validActiveId,
          trash: freshTrash,
          currentWallpaper: resolvedWallpaper,
          wallpaperType: resolvedWallpaperType,
          currentMode: data.currentMode || 'bookmarks',
          isPrivacyMode: data.isPrivacyMode || false,
          isIncognitoMode: data.isIncognitoMode || false,
          bgBlur: data.bgBlur ?? 0,
          bgBrightness: data.bgBrightness ?? 100,
          videoFps: data.videoFps ?? (data.videoPlaybackRate ? data.videoPlaybackRate * 60 : 60),
          startupAnimationEnabled: data.startupAnimationEnabled ?? true,
          isInitialized: true
        });

        if (freshTrash.length !== (data.trash || []).length) {
          await storageService.saveData({ ...data, workspaces: migratedWorkspaces, trash: freshTrash });
        }
      } else {
        const defaultState = {
          workspaces: DEFAULT_WORKSPACES,
          activeWorkspaceId: DEFAULT_WORKSPACES[0].id,
          trash: [],
          currentWallpaper: wallpaperUrl,
          wallpaperType,
          currentMode: 'bookmarks',
          isPrivacyMode: false,
          isIncognitoMode: false,
          bgBlur: 0,
          bgBrightness: 100,
          videoFps: 60,
          startupAnimationEnabled: true,
          isInitialized: true
        };
        set(defaultState);
        await storageService.saveData(defaultState);
      }
    } catch (err) {
      console.error('Fatal initialization error:', err);
      set({
        workspaces: DEFAULT_WORKSPACES,
        activeWorkspaceId: DEFAULT_WORKSPACES[0].id,
        trash: [],
        isInitialized: true
      });
    }
  },

  setActiveWorkspace: async (id) => {
    set({ activeWorkspaceId: id });
    await get()._save();
  },

  setWallpaper: async (file) => {
    await wallpaperService.saveWallpaper(file);
    // Revoke previous blob URL only (URL-type wallpapers are plain strings, not blob: URLs)
    const oldUrl = get().currentWallpaper;
    if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
    const newWallpaperUrl = URL.createObjectURL(file);
    // Clear any stored URL wallpaper from storage since we're switching to a blob
    set({ currentWallpaper: newWallpaperUrl, wallpaperType: file.type });
    await get()._save();
  },

  // Sets a URL-based wallpaper (YouTube embed, direct video/image link).
  // Detects the URL type and stores everything in chrome.storage.local.
  setWallpaperUrl: async (rawUrl) => {
    const url = rawUrl.trim();
    if (!url) return;

    let processedUrl = url;
    let type;

    // ── Detect YouTube ──
    // Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/
    );
    if (ytMatch) {
      const videoId = ytMatch[1];
      // controls=0 / disablekb=1 / showinfo=0 cause Error 513 on many videos — removed.
      // The iframe has pointer-events:none and is covered by the board UI so controls are invisible.
      // iv_load_policy=3 hides video annotations; fs=0 disables the fullscreen button.
      processedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&modestbranding=1&rel=0&iv_load_policy=3&fs=0`;
      type = 'youtube-embed';
    } else {
      // ── Detect direct video URLs by extension ──
      const isVideo = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url);
      const isImage = /\.(jpg|jpeg|png|gif|webp|avif|svg)(\?.*)?$/i.test(url);
      type = isVideo ? 'video/url' : isImage ? 'image/url' : 'video/url'; // default to video/url for unknown

      // ── Auto-upgrade Mixkit URLs to 1080p ──────────────────────────────────
      // Mixkit serves the same video at multiple quality tiers via a suffix swap.
      // -small.mp4 / -preview.mp4 / -medium.mp4 → -1080p.mp4 (Full HD)
      if (processedUrl.includes('mixkit.co') && type === 'video/url') {
        processedUrl = processedUrl
          .replace(/(-small)(\.mp4)/gi, '-1080p$2')
          .replace(/(-preview)(\.mp4)/gi, '-1080p$2')
          .replace(/(-medium)(\.mp4)/gi, '-1080p$2');
      }
    }

    // Revoke any existing blob URL before switching to a URL wallpaper
    const oldUrl = get().currentWallpaper;
    if (oldUrl && oldUrl.startsWith('blob:')) {
      URL.revokeObjectURL(oldUrl);
      // Also clear the IndexedDB blob since we're switching away from it
      try { await wallpaperService.deleteWallpaper(); } catch (_) {}
    }

    set({ currentWallpaper: processedUrl, wallpaperType: type });
    await get()._save();
  },

  // Clears all wallpaper (both blob and URL types).
  clearWallpaper: async () => {
    const oldUrl = get().currentWallpaper;
    if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
    try { await wallpaperService.deleteWallpaper(); } catch (_) {}
    set({ currentWallpaper: null, wallpaperType: null });
    await get()._save();
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen, searchQuery: isOpen ? get().searchQuery : '' }),
  setIsAddWorkspaceModalOpen: (isOpen) => set({ isAddWorkspaceModalOpen: isOpen }),

  setMode: async (mode) => {
    set({ currentMode: mode });
    await get()._save();
  },

  toggleMode: async () => {
    const nextMode = get().currentMode === 'analytics' ? 'bookmarks' : 'analytics';
    set({ currentMode: nextMode });
    await get()._save();
  },

  togglePrivacyMode: async () => {
    set(state => ({ isPrivacyMode: !state.isPrivacyMode }));
    await get()._save();
  },

  toggleIncognitoMode: async () => {
    set(state => ({ isIncognitoMode: !state.isIncognitoMode }));
    await get()._save();
  },

  updateBgStyles: async (styles) => {
    set(state => ({ ...state, ...styles }));
    await get()._save();
  },

  setStartupAnimationEnabled: async (enabled) => {
    set({ startupAnimationEnabled: enabled });
    await get()._save();
  },

  addWorkspace: async (name) => {
    const newWorkspace = {
      id: `ws-${Date.now()}`,
      name,
      theme: { backgroundUrl: '', overlayOpacity: 0, accentColor: '#3b82f6' },
      columns: [
        { id: `col-essentials-${Date.now()}`, name: 'Essentials', bookmarks: [] },
        { id: `col-photos-${Date.now()}`, name: 'Photos', bookmarks: [] },
        { id: `col-dev-${Date.now()}`, name: 'Development', bookmarks: [] }
      ]
    };
    set((state) => ({
      workspaces: [...state.workspaces, newWorkspace],
      activeWorkspaceId: newWorkspace.id,
      isAddWorkspaceModalOpen: false
    }));
    const state = get();
    await storageService.saveData({ workspaces: state.workspaces, activeWorkspaceId: state.activeWorkspaceId });
  },

  deleteWorkspace: async (id) => {
    set((state) => {
      if (state.workspaces.length <= 1) return state;
      const newWorkspaces = state.workspaces.filter(ws => ws.id !== id);
      const newActiveId = state.activeWorkspaceId === id ? newWorkspaces[0].id : state.activeWorkspaceId;
      return { workspaces: newWorkspaces, activeWorkspaceId: newActiveId };
    });
    await get()._save();
  },

  // ── Import actions ──────────────────────────────────────────────────────────

  // Replaces the active workspace's columns with the first workspace from the import
  overwriteCurrentWorkspace: async (importedWorkspace) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws =>
        ws.id === state.activeWorkspaceId
          ? { ...ws, columns: importedWorkspace.columns }
          : ws
      )
    }));
    await get()._save();
  },

  // Appends all imported workspaces as new entries with fresh IDs
  importAsNewWorkspaces: async (importedWorkspaces) => {
    const t = Date.now();
    const newWorkspaces = importedWorkspaces.map((ws, wi) => ({
      ...ws,
      id: `ws-imp-${t}-${wi}`,
      columns: ws.columns.map((col, ci) => ({
        ...col,
        id: `col-imp-${t}-${wi}-${ci}`,
        bookmarks: col.bookmarks.map((bm, bi) => ({
          ...bm,
          id: `bm-imp-${t}-${wi}-${ci}-${bi}`
        }))
      }))
    }));
    set(state => ({
      workspaces: [...state.workspaces, ...newWorkspaces],
      activeWorkspaceId: newWorkspaces[0].id
    }));
    await get()._save();
  },

  // ── Bookmark actions ────────────────────────────────────────────────────────

  updateBookmark: async (wsId, colId, bmId, updates) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return { ...col, bookmarks: col.bookmarks.map(bm => bm.id !== bmId ? bm : { ...bm, ...updates }) };
          })
        };
      })
    }));
    await get()._save();
  },

  // Soft-delete: moves the bookmark to trash so it can be restored within 30 days.
  removeBookmark: async (wsId, colId, bmId) => {
    const ws = get().workspaces.find(w => w.id === wsId);
    const col = ws?.columns.find(c => c.id === colId);
    const index = col?.bookmarks.findIndex(b => b.id === bmId) ?? -1;
    if (index === -1) return;
    const bookmark = col.bookmarks[index];

    const trashEntry = {
      id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'bookmark',
      workspaceId: wsId,
      columnId: colId,
      columnName: col.name,
      index,
      deletedAt: Date.now(),
      bookmark
    };

    set((state) => ({
      workspaces: state.workspaces.map(w => {
        if (w.id !== wsId) return w;
        return {
          ...w,
          columns: w.columns.map(c => c.id !== colId ? c : { ...c, bookmarks: c.bookmarks.filter(b => b.id !== bmId) })
        };
      }),
      trash: [trashEntry, ...state.trash]
    }));
    await get()._save();
  },

  togglePinBookmark: async (wsId, colId, bmId) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return { ...col, bookmarks: col.bookmarks.map(bm => bm.id !== bmId ? bm : { ...bm, pinned: !bm.pinned }) };
          })
        };
      })
    }));
    await get()._save();
  },

  updateColumnName: async (wsId, colId, newName) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return { ...ws, columns: ws.columns.map(col => col.id !== colId ? col : { ...col, name: newName }) };
      })
    }));
    await get()._save();
  },

  updateColumnViewMode: async (wsId, colId, viewMode) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return { ...ws, columns: ws.columns.map(col => col.id !== colId ? col : { ...col, viewMode }) };
      })
    }));
    await get()._save();
  },

  updateColumnIcon: async (wsId, colId, icon) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return { ...ws, columns: ws.columns.map(col => col.id !== colId ? col : { ...col, icon }) };
      })
    }));
    await get()._save();
  },

  updateColumnGlareColor: async (wsId, colId, glareColor) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return { ...ws, columns: ws.columns.map(col => col.id !== colId ? col : { ...col, glareColor }) };
      })
    }));
    await get()._save();
  },

  // Soft-delete: moves the group (and its bookmarks) to trash so it can be restored within 30 days.
  deleteColumn: async (wsId, colId) => {
    const ws = get().workspaces.find(w => w.id === wsId);
    const index = ws?.columns.findIndex(c => c.id === colId) ?? -1;
    if (index === -1) return;
    const column = ws.columns[index];

    const trashEntry = {
      id: `trash-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'group',
      workspaceId: wsId,
      index,
      deletedAt: Date.now(),
      column
    };

    set((state) => ({
      workspaces: state.workspaces.map(w => {
        if (w.id !== wsId) return w;
        return { ...w, columns: w.columns.filter(col => col.id !== colId) };
      }),
      trash: [trashEntry, ...state.trash]
    }));
    await get()._save();
  },

  // Restores a trashed group or bookmark to its original position (or a "Recovered" group if the original was also deleted).
  restoreFromTrash: async (trashId) => {
    const entry = get().trash.find(t => t.id === trashId);
    if (!entry) return;

    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== entry.workspaceId) return ws;

        if (entry.type === 'group') {
          const cols = [...ws.columns];
          cols.splice(Math.min(entry.index, cols.length), 0, entry.column);
          return { ...ws, columns: cols };
        }

        // entry.type === 'bookmark'
        const targetExists = ws.columns.some(c => c.id === entry.columnId);
        let cols = ws.columns;
        if (!targetExists) {
          cols = [...cols, { id: RECOVERED_COLUMN_ID, name: 'Recovered Bookmarks', bookmarks: [] }];
        }
        const targetId = targetExists ? entry.columnId : RECOVERED_COLUMN_ID;
        return {
          ...ws,
          columns: cols.map(c => {
            if (c.id !== targetId) return c;
            const bms = [...c.bookmarks];
            bms.splice(targetExists ? Math.min(entry.index, bms.length) : bms.length, 0, entry.bookmark);
            return { ...c, bookmarks: bms };
          })
        };
      }),
      trash: state.trash.filter(t => t.id !== trashId)
    }));
    await get()._save();
  },

  // Permanently removes a single item from trash without restoring it.
  permanentlyDeleteTrashItem: async (trashId) => {
    set((state) => ({ trash: state.trash.filter(t => t.id !== trashId) }));
    await get()._save();
  },

  emptyTrash: async () => {
    set({ trash: [] });
    await get()._save();
  },

  addColumn: async (wsId, name = 'New Group') => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const newId = `col-${Date.now()}`;
        return { ...ws, columns: [...ws.columns, { id: newId, name, bookmarks: [], laneId: newId }] };
      })
    }));
    await get()._save();
  },

  addGroupToLane: async (wsId, belowGroupId) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const sourceGroup = ws.columns.find(c => c.id === belowGroupId);
        const laneId = sourceGroup?.laneId || belowGroupId;
        const newGroup = { id: `col-${Date.now()}`, name: 'New Group', bookmarks: [], laneId };
        const cols = [...ws.columns];
        const idx = cols.findIndex(c => c.id === belowGroupId);
        cols.splice(idx + 1, 0, newGroup);
        return { ...ws, columns: cols };
      })
    }));
    await get()._save();
  },

  moveGroupToNewLane: async (wsId, groupId, laneIndex) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;

        const newLaneId = `lane-moved-${Date.now()}`;
        const updatedCols = ws.columns.map(col =>
          col.id === groupId ? { ...col, laneId: newLaneId } : col
        );

        const laneMap = new Map();
        const laneOrder = [];
        updatedCols.forEach(col => {
          const lid = col.laneId || col.id;
          if (!laneMap.has(lid)) { laneMap.set(lid, []); laneOrder.push(lid); }
          laneMap.get(lid).push(col);
        });

        const currentPos = laneOrder.indexOf(newLaneId);
        if (currentPos !== -1) laneOrder.splice(currentPos, 1);
        const clampedIndex = Math.max(0, Math.min(laneIndex, laneOrder.length));
        laneOrder.splice(clampedIndex, 0, newLaneId);

        const reordered = laneOrder.flatMap(id => laneMap.get(id) || []);
        return { ...ws, columns: reordered };
      })
    }));
    await get()._save();
  },

  addBookmarkToColumn: async (wsId, colId, bookmark) => {
    const newBookmark = { ...bookmark, id: bookmark.id || `bm-${Date.now()}`, addedAt: new Date().toISOString() };
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return { ...col, bookmarks: [...col.bookmarks, newBookmark] };
          })
        };
      })
    }));
    await get()._save();
  },

  // Auto-balance cards (columns) across vertical lanes to equalize lane height
  // without moving individual bookmarks inside cards
  autoBalanceColumns: async (wsId) => {
    const ws = get().workspaces.find(w => w.id === wsId);
    if (!ws || ws.columns.length <= 1) return;

    const columns = [...ws.columns];

    // Find current lane structure
    const laneMap = new Map();
    const laneOrder = [];
    columns.forEach(col => {
      const lid = col.laneId || col.id;
      if (!laneMap.has(lid)) { laneMap.set(lid, []); laneOrder.push(lid); }
      laneMap.get(lid).push(col);
    });
    const currentLanes = laneOrder.length;
    const N = columns.length;

    // Maintain the user's existing horizontal lane count (columns across screen)
    // so the board preserves its horizontal layout width instead of squishing into fewer vertical columns
    const targetLanesCount = currentLanes > 0 ? currentLanes : Math.min(6, N);

    // Calculate card height weight (number of bookmarks + 3 for header & padding overhead)
    const getCardWeight = (col) => (col.bookmarks?.length || 0) + 3;

    // Sort cards by size descending (largest cards first)
    const sortedColumns = [...columns].sort((a, b) => getCardWeight(b) - getCardWeight(a));

    // Initialize target lanes
    const lanes = Array.from({ length: targetLanesCount }, (_, i) => ({
      id: `lane-bal-${Date.now()}-${i}`,
      weight: 0,
      columns: []
    }));

    // Bin-packing: assign each card to the lane with minimum total height/weight
    for (const col of sortedColumns) {
      let minLane = lanes[0];
      for (let i = 1; i < lanes.length; i++) {
        if (lanes[i].weight < minLane.weight) {
          minLane = lanes[i];
        }
      }
      minLane.columns.push(col);
      minLane.weight += getCardWeight(col);
    }

    // Reconstruct balanced columns array with updated laneId for each card
    const balancedColumns = [];
    lanes.forEach(lane => {
      const laneId = lane.columns[0]?.id || lane.id;
      lane.columns.forEach(col => {
        balancedColumns.push({
          ...col,
          laneId: laneId
        });
      });
    });

    set((state) => ({
      workspaces: state.workspaces.map(w =>
        w.id === wsId ? { ...w, columns: balancedColumns } : w
      )
    }));
    await get()._save();
  },

  // 2D Card movement: supports moving cards above/below another card in a lane,
  // or placing cards into new lanes to the left/right of target columns
  moveColumn: async (wsId, draggedId, targetId, position) => {
    if (!draggedId || !targetId || draggedId === targetId) return;

    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;

        const cols = ws.columns.map(c => ({
          ...c,
          laneId: c.laneId || c.id
        }));

        const draggedCol = cols.find(c => c.id === draggedId);
        const targetCol = cols.find(c => c.id === targetId);

        if (!draggedCol || !targetCol) return ws;

        // 1. Filter out draggedCol from current list
        const remainingCols = cols.filter(c => c.id !== draggedId);

        // 2. Map existing lanes in current remainingCols order
        const laneMap = new Map();
        const laneOrder = [];
        remainingCols.forEach(c => {
          const lid = c.laneId;
          if (!laneMap.has(lid)) {
            laneMap.set(lid, []);
            laneOrder.push(lid);
          }
          laneMap.get(lid).push(c);
        });

        const targetLaneId = targetCol.laneId;

        if (position === 'above' || position === 'below') {
          // Adopt targetCol's exact laneId
          draggedCol.laneId = targetLaneId;

          const targetIdx = remainingCols.findIndex(c => c.id === targetId);
          if (targetIdx !== -1) {
            const insertIdx = position === 'above' ? targetIdx : targetIdx + 1;
            remainingCols.splice(insertIdx, 0, draggedCol);
          } else {
            remainingCols.push(draggedCol);
          }
          return { ...ws, columns: remainingCols };
        }

        if (position === 'left-lane' || position === 'right-lane') {
          // Assign a fresh unique laneId to draggedCol
          const newLaneId = `lane-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          draggedCol.laneId = newLaneId;

          const targetLaneIdx = laneOrder.indexOf(targetLaneId);
          const insertLaneIdx = position === 'left-lane'
            ? Math.max(0, targetLaneIdx !== -1 ? targetLaneIdx : 0)
            : (targetLaneIdx !== -1 ? targetLaneIdx + 1 : laneOrder.length);

          laneOrder.splice(insertLaneIdx, 0, newLaneId);
          laneMap.set(newLaneId, [draggedCol]);

          const reorderedColumns = laneOrder.flatMap(lid => laneMap.get(lid) || []);
          return { ...ws, columns: reorderedColumns };
        }

        return ws;
      })
    }));
    await get()._save();
  },

  // Moves draggedId to just before targetId in the flat columns array.
  // Pass targetId=null to append to end.
  reorderColumns: async (wsId, draggedId, targetId) => {
    if (draggedId === targetId) return;
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const cols = [...ws.columns];
        const fromIdx = cols.findIndex(c => c.id === draggedId);
        if (fromIdx === -1) return ws;
        const [removed] = cols.splice(fromIdx, 1);
        if (!targetId) {
          cols.push(removed);
        } else {
          const toIdx = cols.findIndex(c => c.id === targetId);
          cols.splice(toIdx === -1 ? cols.length : toIdx, 0, removed);
        }
        return { ...ws, columns: cols };
      })
    }));
    await get()._save();
  },

  // Moves bmId to just before targetBmId in the target column.
  // Pass targetBmId=null to append to end of targetCol.
  reorderBookmarks: async (wsId, bmId, targetBmId, sourceColId, targetColId) => {
    set((state) => ({
      workspaces: state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const cols = ws.columns.map(c => ({ ...c, bookmarks: [...c.bookmarks] }));
        const srcCol = cols.find(c => c.id === sourceColId);
        const tgtCol = cols.find(c => c.id === targetColId);
        if (!srcCol || !tgtCol) return ws;

        const bmIdx = srcCol.bookmarks.findIndex(b => b.id === bmId);
        if (bmIdx === -1) return ws;
        const [bm] = srcCol.bookmarks.splice(bmIdx, 1);

        if (!targetBmId) {
          tgtCol.bookmarks.push(bm);
        } else {
          const tgtIdx = tgtCol.bookmarks.findIndex(b => b.id === targetBmId);
          tgtCol.bookmarks.splice(tgtIdx === -1 ? tgtCol.bookmarks.length : tgtIdx, 0, bm);
        }
        return { ...ws, columns: cols };
      })
    }));
    await get()._save();
  },

  importChromeBookmarks: async (wsId) => {
    if (typeof chrome === 'undefined' || !chrome.bookmarks) {
      alert('Bookmarks API not available in this environment.');
      return;
    }
    try {
      chrome.bookmarks.getTree(async (tree) => {
        const bookmarks = [];
        const traverse = (node) => {
          if (node.url) {
            bookmarks.push({
              id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: node.title || 'Untitled',
              url: node.url,
              addedAt: new Date().toISOString(),
            });
          }
          if (node.children) node.children.forEach(traverse);
        };
        tree.forEach(traverse);
        if (bookmarks.length > 0) {
          set((state) => ({
            workspaces: state.workspaces.map((ws) => {
              if (ws.id !== wsId) return ws;
              const importColumn = { id: `col-import-${Date.now()}`, name: 'Imported 📥', bookmarks: bookmarks.slice(0, 20) };
              return { ...ws, columns: [...ws.columns, importColumn] };
            })
          }));
          await get()._save();
        }
      });
    } catch (error) {
      console.error('Failed to import bookmarks:', error);
    }
  },

  _save: async () => {
    const state = get();
    const isUrlWallpaper = state.wallpaperType === 'youtube-embed' ||
      state.wallpaperType === 'video/url' ||
      state.wallpaperType === 'image/url';
    await storageService.saveData({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      trash: state.trash,
      isPrivacyMode: state.isPrivacyMode,
      isIncognitoMode: state.isIncognitoMode,
      bgBlur: state.bgBlur,
      bgBrightness: state.bgBrightness,
      videoFps: state.videoFps,
      startupAnimationEnabled: state.startupAnimationEnabled,
      currentMode: state.currentMode,
      // Persist URL-based wallpapers in storage so they survive reloads
      wallpaperUrl: isUrlWallpaper ? state.currentWallpaper : null,
      wallpaperType: isUrlWallpaper ? state.wallpaperType : null,
    });
  }
}));

if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['flowmarks_data']) {
      useWorkspaceStore.getState().initialize();
    }
  });
}
