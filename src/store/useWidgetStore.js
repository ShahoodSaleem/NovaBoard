const WIDGET_KEY = 'flowmarks_widgets';
const TASKS_KEY  = 'flowmarks_tasks';
const SPOTIFY_CLIENT_KEY = 'flowmarks_spotify_client_id';

/* ── chrome.storage.local helpers ── */
const getLocal = (key) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([key], (r) => resolve(r[key]));
    } else {
      try { resolve(JSON.parse(localStorage.getItem(key))); } catch { resolve(null); }
    }
  });

const setLocal = (key, value) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [key]: value }, resolve);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
      resolve();
    }
  });

/* ── Widget definitions (exported so Gallery can use them) ── */
export const WIDGET_DEFS = [
  {
    type: 'clock',
    name: 'Clock',
    description: 'Live digital + analog clock with date',
    icon: '🕐',
    defaultSize: { w: 280, h: 150 },
  },
  {
    type: 'tasks',
    name: 'Task Writer',
    description: 'Quick to-do list to track your tasks',
    icon: '✅',
    defaultSize: { w: 310, h: 400 },
  },
  {
    type: 'music',
    name: 'Music Player',
    description: 'Control Spotify playback or open YouTube Music',
    icon: '🎵',
    defaultSize: { w: 380, h: 200 },
  },
];

import { create } from 'zustand';

export const useWidgetStore = create((set, get) => ({
  activeWidgets: [],
  tasks: [],
  isGalleryOpen: false,
  spotifyClientId: '',

  loadWidgets: async () => {
    const [widgets, tasks, clientId] = await Promise.all([
      getLocal(WIDGET_KEY),
      getLocal(TASKS_KEY),
      getLocal(SPOTIFY_CLIENT_KEY),
    ]);
    set({
      activeWidgets: widgets || [],
      tasks: tasks || [],
      spotifyClientId: clientId || '',
    });
  },

  addWidget: async (type) => {
    const { activeWidgets } = get();
    if (activeWidgets.find((w) => w.type === type)) return; // one instance only
    const def = WIDGET_DEFS.find((d) => d.type === type);
    const newWidget = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: 80 + activeWidgets.length * 24, y: 80 + activeWidgets.length * 24 },
      minimized: false,
      size: def?.defaultSize || { w: 300, h: 200 },
    };
    const updated = [...activeWidgets, newWidget];
    await setLocal(WIDGET_KEY, updated);
    set({ activeWidgets: updated });
  },

  removeWidget: async (widgetId) => {
    const { activeWidgets } = get();
    const updated = activeWidgets.filter((w) => w.id !== widgetId);
    await setLocal(WIDGET_KEY, updated);
    set({ activeWidgets: updated });
  },

  updateWidgetPosition: async (widgetId, position) => {
    const { activeWidgets } = get();
    const updated = activeWidgets.map((w) => (w.id === widgetId ? { ...w, position } : w));
    await setLocal(WIDGET_KEY, updated);
    set({ activeWidgets: updated });
  },

  updateWidgetSize: async (widgetId, size) => {
    const { activeWidgets } = get();
    const updated = activeWidgets.map((w) => (w.id === widgetId ? { ...w, size } : w));
    await setLocal(WIDGET_KEY, updated);
    set({ activeWidgets: updated });
  },

  toggleMinimize: async (widgetId) => {
    const { activeWidgets } = get();
    const updated = activeWidgets.map((w) =>
      w.id === widgetId ? { ...w, minimized: !w.minimized } : w
    );
    await setLocal(WIDGET_KEY, updated);
    set({ activeWidgets: updated });
  },

  toggleGallery: () => set((s) => ({ isGalleryOpen: !s.isGalleryOpen })),
  closeGallery: () => set({ isGalleryOpen: false }),

  saveSpotifyClientId: async (id) => {
    await setLocal(SPOTIFY_CLIENT_KEY, id);
    set({ spotifyClientId: id });
  },

  /* ── Tasks ── */
  addTask: async (text) => {
    const { tasks } = get();
    const task = { id: `task_${Date.now()}`, text, completed: false, createdAt: Date.now() };
    const updated = [task, ...tasks];
    await setLocal(TASKS_KEY, updated);
    set({ tasks: updated });
  },

  toggleTask: async (taskId) => {
    const { tasks } = get();
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    await setLocal(TASKS_KEY, updated);
    set({ tasks: updated });
  },

  deleteTask: async (taskId) => {
    const { tasks } = get();
    const updated = tasks.filter((t) => t.id !== taskId);
    await setLocal(TASKS_KEY, updated);
    set({ tasks: updated });
  },

  clearCompletedTasks: async () => {
    const { tasks } = get();
    const updated = tasks.filter((t) => !t.completed);
    await setLocal(TASKS_KEY, updated);
    set({ tasks: updated });
  },
}));
