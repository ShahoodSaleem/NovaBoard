/**
 * storageService.js
 * Encapsulates all chrome.storage.sync interactions.
 */

const STORAGE_KEY = 'flowmarks_data';

export const storageService = {
  /**
   * Loads all extension data from chrome.storage.sync
   */
  async loadData() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
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
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [STORAGE_KEY]: data }, () => {
          resolve();
        });
      } else {
        // Fallback for development
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        resolve();
      }
    });
  }
};
