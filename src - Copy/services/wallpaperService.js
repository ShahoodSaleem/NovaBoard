/**
 * wallpaperService.js
 * Handles binary storage of wallpaper images using IndexedDB.
 */

const DB_NAME = 'FlowMarksDB';
const STORE_NAME = 'wallpapers';
const DB_VERSION = 1;

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

export const wallpaperService = {
  /**
   * Saves an image blob to IndexedDB
   * @param {Blob|File} file 
   */
  async saveWallpaper(file) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(file, 'current_wallpaper');

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  },

  /**
   * Retrieves the wallpaper as a data URL or Blob
   * @returns {Promise<Blob|null>}
   */
  async getWallpaper() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current_wallpaper');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (event) => reject(event.target.error);
    });
  },

  /**
   * Deletes the current wallpaper
   */
  async deleteWallpaper() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete('current_wallpaper');

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject(event.target.error);
    });
  }
};
