import { create } from 'zustand';
import { storageService } from '../services/storageService';
import { wallpaperService } from '../services/wallpaperService';

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
          { 
            id: 'sample-1', 
            title: 'Google', 
            url: 'https://google.com', 
            addedAt: new Date().toISOString() 
          },
          { 
            id: 'sample-2', 
            title: 'GitHub', 
            url: 'https://github.com', 
            addedAt: new Date().toISOString() 
          }
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

  // Initialize store by loading from storage
  initialize: async () => {
    // 1. Load workspace data
    const data = await storageService.loadData();
    
    // 2. Load wallpaper from IndexedDB
    const wallpaperBlob = await wallpaperService.getWallpaper();
    const wallpaperUrl = wallpaperBlob ? URL.createObjectURL(wallpaperBlob) : null;
    const wallpaperType = wallpaperBlob?.type || null;

    if (data && data.workspaces) {
      // Migrate: ensure every column has a laneId
      const migratedWorkspaces = data.workspaces.map(ws => ({
        ...ws,
        columns: ws.columns.map(col => ({
          ...col,
          laneId: col.laneId || col.id // each col gets its own lane by default
        }))
      }));
      set({ 
        workspaces: migratedWorkspaces, 
        activeWorkspaceId: data.activeWorkspaceId || migratedWorkspaces[0].id,
        currentWallpaper: wallpaperUrl,
        wallpaperType: wallpaperType,
        isPrivacyMode: data.isPrivacyMode || false,
        isIncognitoMode: data.isIncognitoMode || false,
        bgBlur: data.bgBlur ?? 0,
        bgBrightness: data.bgBrightness ?? 100,
        videoFps: data.videoFps ?? (data.videoPlaybackRate ? data.videoPlaybackRate * 60 : 60),
        isInitialized: true 
      });
    } else {
      // Set defaults if no data exists
      const defaultState = {
        workspaces: DEFAULT_WORKSPACES,
        activeWorkspaceId: DEFAULT_WORKSPACES[0].id,
        currentWallpaper: wallpaperUrl,
        wallpaperType: wallpaperType,
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

  // Actions
  setActiveWorkspace: (id) => {
    set({ activeWorkspaceId: id });
    const state = get();
    storageService.saveData({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      isPrivacyMode: state.isPrivacyMode,
      isIncognitoMode: state.isIncognitoMode,
      bgBlur: state.bgBlur,
      bgBrightness: state.bgBrightness,
      videoFps: state.videoFps
    });
  },

  setWallpaper: async (file) => {
    // 1. Save to IndexedDB (this overwrites the 'current_wallpaper' key)
    await wallpaperService.saveWallpaper(file);
    
    // 2. Clear the old blob URL from memory
    const oldUrl = get().currentWallpaper;
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }
    
    // 3. Create a new URL and update state
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
      theme: {
        backgroundUrl: '',
        overlayOpacity: 0,
        accentColor: '#3b82f6'
      },
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
    await storageService.saveData({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId
    });
  },

  deleteWorkspace: async (id) => {
    set((state) => {
      // Don't delete if it's the only workspace left
      if (state.workspaces.length <= 1) return state;
      
      const newWorkspaces = state.workspaces.filter(ws => ws.id !== id);
      
      // If we are deleting the active workspace, switch to the first available one
      const newActiveId = state.activeWorkspaceId === id 
        ? newWorkspaces[0].id 
        : state.activeWorkspaceId;
        
      return {
        workspaces: newWorkspaces,
        activeWorkspaceId: newActiveId
      };
    });
    
    await get()._save();
  },

  updateBookmark: async (wsId, colId, bmId, updates) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return {
              ...col,
              bookmarks: col.bookmarks.map(bm => {
                if (bm.id !== bmId) return bm;
                return { ...bm, ...updates };
              })
            };
          })
        };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  removeBookmark: async (wsId, colId, bmId) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return {
              ...col,
              bookmarks: col.bookmarks.filter(bm => bm.id !== bmId)
            };
          })
        };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  updateColumnName: async (wsId, colId, newName) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return { ...col, name: newName };
          })
        };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  deleteColumn: async (wsId, colId) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.filter(col => col.id !== colId)
        };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  addColumn: async (wsId, name = 'New Group') => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const newId = `col-${Date.now()}`;
        const newColumn = {
          id: newId,
          name,
          bookmarks: [],
          laneId: newId  // Each new board from the end button = its own lane
        };
        return { ...ws, columns: [...ws.columns, newColumn] };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  // Adds a new group stacked below an existing group in the same lane
  addGroupToLane: async (wsId, belowGroupId) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const sourceGroup = ws.columns.find(c => c.id === belowGroupId);
        const laneId = sourceGroup?.laneId || belowGroupId;
        const newGroup = {
          id: `col-${Date.now()}`,
          name: 'New Group',
          bookmarks: [],
          laneId
        };
        // Insert right after the belowGroupId
        const cols = [...ws.columns];
        const idx = cols.findIndex(c => c.id === belowGroupId);
        cols.splice(idx + 1, 0, newGroup);
        return { ...ws, columns: cols };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  // Moves a group into its own new lane inserted at laneIndex position
  moveGroupToNewLane: async (wsId, groupId, laneIndex) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;

        // 1. Build current lane order from flat columns
        const laneMap = new Map();
        const laneOrder = [];
        ws.columns.forEach(col => {
          const lid = col.laneId || col.id;
          if (!laneMap.has(lid)) { laneMap.set(lid, []); laneOrder.push(lid); }
          laneMap.get(lid).push(col);
        });

        // 2. Assign a new laneId to the dragged group
        const newLaneId = `lane-moved-${Date.now()}`;
        const updatedCols = ws.columns.map(col =>
          col.id === groupId ? { ...col, laneId: newLaneId } : col
        );

        // 3. Rebuild lane map with updated laneId
        const newLaneMap = new Map();
        const newLaneOrder = [];
        updatedCols.forEach(col => {
          const lid = col.laneId || col.id;
          if (!newLaneMap.has(lid)) { newLaneMap.set(lid, []); newLaneOrder.push(lid); }
          newLaneMap.get(lid).push(col);
        });

        // 4. Remove the new lane from wherever it ended up, insert at laneIndex
        const currentPos = newLaneOrder.indexOf(newLaneId);
        if (currentPos !== -1) newLaneOrder.splice(currentPos, 1);
        const clampedIndex = Math.max(0, Math.min(laneIndex, newLaneOrder.length));
        newLaneOrder.splice(clampedIndex, 0, newLaneId);

        // 5. Flatten back to columns array in new order
        const reordered = newLaneOrder.flatMap(id => newLaneMap.get(id) || []);
        return { ...ws, columns: reordered };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  addBookmarkToColumn: async (wsId, colId, bookmark) => {
    const newBookmark = {
      ...bookmark,
      id: bookmark.id || `bm-${Date.now()}`,
      addedAt: new Date().toISOString()
    };
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        return {
          ...ws,
          columns: ws.columns.map(col => {
            if (col.id !== colId) return col;
            return {
              ...col,
              bookmarks: [...col.bookmarks, newBookmark]
            };
          })
        };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  reorderColumns: async (wsId, activeId, overId) => {
    if (activeId === overId) return;
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        const oldIndex = ws.columns.findIndex(c => c.id === activeId);
        const newIndex = ws.columns.findIndex(c => c.id === overId);
        const newColumns = [...ws.columns];
        const [removed] = newColumns.splice(oldIndex, 1);
        newColumns.splice(newIndex, 0, removed);
        return { ...ws, columns: newColumns };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },

  reorderBookmarks: async (wsId, activeId, overId, sourceColId, targetColId) => {
    set((state) => {
      const newWorkspaces = state.workspaces.map(ws => {
        if (ws.id !== wsId) return ws;
        
        const newColumns = [...ws.columns];
        const sourceColIndex = newColumns.findIndex(c => c.id === sourceColId);
        const targetColIndex = newColumns.findIndex(c => c.id === targetColId);
        
        if (sourceColIndex === -1 || targetColIndex === -1) return ws;
        
        // Handle same-column reordering
        if (sourceColIndex === targetColIndex) {
          const col = { ...newColumns[sourceColIndex], bookmarks: [...newColumns[sourceColIndex].bookmarks] };
          const oldIndex = col.bookmarks.findIndex(bm => bm.id === activeId);
          const newIndex = col.bookmarks.findIndex(bm => bm.id === overId);
          
          if (oldIndex !== -1 && newIndex !== -1) {
            const [moved] = col.bookmarks.splice(oldIndex, 1);
            col.bookmarks.splice(newIndex, 0, moved);
            newColumns[sourceColIndex] = col;
          }
          return { ...ws, columns: newColumns };
        }
        
        // Handle cross-column moving
        const sourceCol = { ...newColumns[sourceColIndex], bookmarks: [...newColumns[sourceColIndex].bookmarks] };
        const targetCol = { ...newColumns[targetColIndex], bookmarks: [...newColumns[targetColIndex].bookmarks] };
        
        const activeIndex = sourceCol.bookmarks.findIndex(bm => bm.id === activeId);
        if (activeIndex === -1) return ws;
        
        const [movedBookmark] = sourceCol.bookmarks.splice(activeIndex, 1);
        
        let overIndex = targetCol.bookmarks.findIndex(bm => bm.id === overId);
        if (overIndex === -1) {
          targetCol.bookmarks.push(movedBookmark);
        } else {
          targetCol.bookmarks.splice(overIndex, 0, movedBookmark);
        }
        
        newColumns[sourceColIndex] = sourceCol;
        newColumns[targetColIndex] = targetCol;
        
        return { ...ws, columns: newColumns };
      });
      return { workspaces: newWorkspaces };
    });
    await get()._save();
  },


  importChromeBookmarks: async (wsId) => {
    if (typeof chrome === "undefined" || !chrome.bookmarks) {
      alert("Bookmarks API not available in this environment.");
      return;
    }

    try {
      chrome.bookmarks.getTree(async (tree) => {
        const bookmarks = [];
        const traverse = (node) => {
          if (node.url) {
            bookmarks.push({
              id: `bm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: node.title || "Untitled",
              url: node.url,
              addedAt: new Date().toISOString(),
            });
          }
          if (node.children) node.children.forEach(traverse);
        };
        tree.forEach(traverse);

        if (bookmarks.length > 0) {
          set((state) => {
            const newWorkspaces = state.workspaces.map((ws) => {
              if (ws.id !== wsId) return ws;
              const importColumn = {
                id: `col-import-${Date.now()}`,
                name: "Imported 📥",
                bookmarks: bookmarks.slice(0, 20), // Limit to first 20 for now
              };
              return {
                ...ws,
                columns: [...ws.columns, importColumn],
              };
            });
            return { workspaces: newWorkspaces };
          });
          await get()._save();
        }
      });
    } catch (error) {
      console.error("Failed to import bookmarks:", error);
    }
  },

  _save: async () => {
    const state = get();
    await storageService.saveData({
      workspaces: state.workspaces,
      activeWorkspaceId: state.activeWorkspaceId,
      isPrivacyMode: state.isPrivacyMode,
      isIncognitoMode: state.isIncognitoMode,
      bgBlur: state.bgBlur,
      bgBrightness: state.bgBrightness,
      videoFps: state.videoFps
    });
  }

}));

// Listen to external storage changes (e.g. background quick-save via keyboard shortcut)
// We watch 'local' because we use chrome.storage.local (not sync) to avoid the 8KB quota limit.
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes['flowmarks_data']) {
      // Re-initialize the store to pick up the new bookmark immediately
      useWorkspaceStore.getState().initialize();
    }
  });
}

