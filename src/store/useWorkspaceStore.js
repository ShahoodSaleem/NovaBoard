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

  // UI States
  isSearchOpen: false,
  searchQuery: '',
  isAddWorkspaceModalOpen: false,
  isPrivacyMode: false,
  isIncognitoMode: false,
  bgBlur: 0,
  bgBrightness: 100,
  videoFps: 60,

  initialize: async () => {
    const data = await storageService.loadData();
    const wallpaperBlob = await wallpaperService.getWallpaper();
    const wallpaperUrl = wallpaperBlob ? URL.createObjectURL(wallpaperBlob) : null;
    const wallpaperType = wallpaperBlob?.type || null;

    if (data && data.workspaces) {
      const migratedWorkspaces = data.workspaces.map(ws => ({
        ...ws,
        columns: ws.columns.map(col => ({
          ...col,
          laneId: col.laneId || col.id
        }))
      }));
      const freshTrash = (data.trash || []).filter(item => Date.now() - item.deletedAt <= THIRTY_DAYS_MS);

      set({
        workspaces: migratedWorkspaces,
        activeWorkspaceId: data.activeWorkspaceId || migratedWorkspaces[0].id,
        trash: freshTrash,
        currentWallpaper: wallpaperUrl,
        wallpaperType,
        isPrivacyMode: data.isPrivacyMode || false,
        isIncognitoMode: data.isIncognitoMode || false,
        bgBlur: data.bgBlur ?? 0,
        bgBrightness: data.bgBrightness ?? 100,
        videoFps: data.videoFps ?? (data.videoPlaybackRate ? data.videoPlaybackRate * 60 : 60),
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
        isPrivacyMode: false,
        isIncognitoMode: false,
        bgBlur: 0,
        bgBrightness: 100,
        videoFps: 60,
        isInitialized: true
      };
      set(defaultState);
      await storageService.saveData(defaultState);
    }
  },

  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id });
    const state = get();
    storageService.saveData({
      workspaces: state.workspaces,
      activeWorkspaceId: id,
      isPrivacyMode: state.isPrivacyMode,
      isIncognitoMode: state.isIncognitoMode,
      bgBlur: state.bgBlur,
      bgBrightness: state.bgBrightness,
      videoFps: state.videoFps
    });
  },

  setWallpaper: async (file) => {
    await wallpaperService.saveWallpaper(file);
    const oldUrl = get().currentWallpaper;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    const newWallpaperUrl = URL.createObjectURL(file);
    set({ currentWallpaper: newWallpaperUrl, wallpaperType: file.type });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSearchOpen: (isOpen) => set({ isSearchOpen: isOpen, searchQuery: isOpen ? get().searchQuery : '' }),
  setIsAddWorkspaceModalOpen: (isOpen) => set({ isAddWorkspaceModalOpen: isOpen }),

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
    await storageService.saveData({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      trash: state.trash,
      isPrivacyMode: state.isPrivacyMode,
      isIncognitoMode: state.isIncognitoMode,
      bgBlur: state.bgBlur,
      bgBrightness: state.bgBrightness,
      videoFps: state.videoFps
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
