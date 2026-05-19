/**
 * storageService.js
 * Encapsulates all chrome.storage.local interactions.
 * We use .local (not .sync) because bookmark data easily exceeds
 * the 8,192-byte per-item limit on sync storage.
 * The manifest already declares the unlimitedStorage permission.
 */

const STORAGE_KEY = 'flowmarks_data';

export const storageService = {
  /**
   * Loads all extension data from chrome.storage.sync
   */
  async loadData() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([STORAGE_KEY], (result) => {
          resolve(result[STORAGE_KEY] || null);
        });
      } else {
        // Fallback for development outside of chrome extension context
        const localData = localStorage.getItem(STORAGE_KEY);
        resolve(localData ? JSON.parse(localData) : null);
      }
    });
  },

  /**
   * Saves data to chrome.storage.sync
   * @param {Object} data - The full state to persist
   */
  async saveData(data) {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [STORAGE_KEY]: data }, () => {
          if (chrome.runtime.lastError) {
            console.error('[FlowMarks] Storage save error:', chrome.runtime.lastError.message);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } else {
        // Fallback for development
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve();
      }
    });
  },

  /**
   * Exports all extension data as a JSON string
   */
  async exportData() {
    const data = await this.loadData();
    return JSON.stringify(data, null, 2);
  },

  /**
   * Imports extension data from a JSON string
   * @param {string} jsonData - The JSON string representing the backup
   */
  async importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);
      // Validate that it has workspaces
      if (!data || !Array.isArray(data.workspaces)) {
        return false;
      }
      await this.saveData(data);
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }
};
