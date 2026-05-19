/**
 * FlowMarks Background Service Worker
 * Handles keyboard shortcuts and global extension events.
 */

const STORAGE_KEY = 'flowmarks_data';

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
        bookmarks: [] 
      },
      { id: 'col-progress', name: 'In Progress', bookmarks: [] },
      { id: 'col-ready', name: 'Ready', bookmarks: [] },
      { id: 'col-archive', name: 'Archive', bookmarks: [] }
    ]
  }
];

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'quick-save') {
    await handleQuickSave();
  }
});

async function loadData() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([STORAGE_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[FlowMarks BG] Load error:', chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(result[STORAGE_KEY] || null);
        }
      });
    } else {
      resolve(null);
    }
  });
}

async function saveData(data) {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          console.error('[FlowMarks BG] Save error:', chrome.runtime.lastError.message);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

async function handleQuickSave() {
  try {
    // 1. Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    // 2. Load current data
    let data = await loadData();
    
    // If no data exists, initialize with default state
    if (!data || !data.workspaces || data.workspaces.length === 0) {
      data = {
        workspaces: DEFAULT_WORKSPACES,
        activeWorkspaceId: DEFAULT_WORKSPACES[0].id,
        isPrivacyMode: false,
        isIncognitoMode: false,
        bgBlur: 0,
        bgBrightness: 100,
        videoFps: 60
      };
    }

    // 3. Find active workspace or default to first
    const activeWs = data.workspaces.find(w => w.id === data.activeWorkspaceId) || data.workspaces[0];
    if (!activeWs) return;
    
    // Ensure activeWs has columns
    if (!activeWs.columns) activeWs.columns = [];
    if (activeWs.columns.length === 0) {
      activeWs.columns.push({
        id: `col-inbox-${Date.now()}`,
        name: 'Inbox',
        bookmarks: []
      });
    }

    // 4. Find Inbox column or first column
    let inbox = activeWs.columns.find(c => c.name.toLowerCase() === 'inbox');
    if (!inbox) {
      inbox = activeWs.columns[0];
    }

    // Ensure bookmarks array exists
    if (!inbox.bookmarks) inbox.bookmarks = [];

    // 5. Create new bookmark
    const newBookmark = {
      id: `bm-${Date.now()}`,
      title: tab.title || 'New Bookmark',
      url: tab.url,
      favicon: tab.favIconUrl || '',
      addedAt: new Date().toISOString()
    };

    // 6. Update data
    inbox.bookmarks.unshift(newBookmark);

    // 7. Save back to storage
    await saveData(data);

    // 8. Show notification badge
    if (typeof chrome.action !== 'undefined' && chrome.action.setBadgeText) {
      chrome.action.setBadgeText({ text: '✓' });
      if (chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ color: '#10b981' }); // Green badge
      }
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
    }

    // 9. Inject visual toast in active tab
    // We wrapped this in a try-catch because scripting is disallowed on system chrome:// pages
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (title, favicon) => {
          let existing = document.getElementById('flowmarks-toast');
          if (existing) existing.remove();

          const toast = document.createElement('div');
          toast.id = 'flowmarks-toast';
          toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: -400px;
            background: rgba(15, 15, 15, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 16px 20px;
            border-radius: 16px;
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 2147483647;
            transition: right 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          `;

          const iconHTML = favicon 
            ? `<img src="${favicon}" style="width: 24px; height: 24px; border-radius: 6px;" />` 
            : `<div style="width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">📌</div>`;

          toast.innerHTML = `
            ${iconHTML}
            <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; text-align: left;">
              <strong style="font-weight: 600; font-size: 14px; color: #34d399; margin: 0; line-height: 1;">Bookmark Saved</strong>
              <span style="font-size: 13px; color: rgba(255, 255, 255, 0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px; line-height: 1;">${title}</span>
            </div>
          `;

          document.body.appendChild(toast);

          requestAnimationFrame(() => {
            toast.style.right = '24px';
          });

          setTimeout(() => {
            toast.style.right = '-400px';
            setTimeout(() => toast.remove(), 500);
          }, 3500);
        },
        args: [newBookmark.title, newBookmark.favicon]
      });
    } catch (scriptError) {
      console.log('Script injection skipped (e.g. system page or activeTab permission not granted):', scriptError.message);
    }

    console.log('Quick Save successful:', newBookmark.title);
  } catch (error) {
    console.error('Quick Save failed:', error);
  }
}
