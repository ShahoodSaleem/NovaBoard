/**
 * sessionService.js
 * Handles browser-session detection using Manifest V3 chrome.storage.session.
 * chrome.storage.session persists only in memory while the browser is running
 * and is cleared completely when the browser is closed/quit.
 */

const SESSION_STORAGE_KEY = 'novaboard_session_started';

export const sessionService = {
  /**
   * Checks if this is the first new tab opened in the current browser session.
   * If not started yet, marks the session as started and returns true.
   * Otherwise returns false.
   */
  async isFirstSessionTab() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
        return new Promise((resolve) => {
          chrome.storage.session.get([SESSION_STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
              console.warn('[SessionService] Session check error:', chrome.runtime.lastError);
              resolve(false);
              return;
            }

            if (!result[SESSION_STORAGE_KEY]) {
              // Mark session as started for subsequent tabs
              chrome.storage.session.set({ [SESSION_STORAGE_KEY]: true }, () => {
                resolve(true);
              });
            } else {
              resolve(false);
            }
          });
        });
      }

      // Fallback for development environments outside extension context
      const sessionStarted = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!sessionStarted) {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[SessionService] Fallback check error:', err);
      return false;
    }
  },

  /**
   * Resets the session flag (useful for testing/previewing in dev)
   */
  async resetSession() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
        await chrome.storage.session.remove(SESSION_STORAGE_KEY);
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (_) {}
  }
};
