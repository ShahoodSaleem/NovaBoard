/**
 * faviconUtil.js
 * Generates official Chrome Favicon URLs for Manifest V3.
 */

export const getFaviconUrl = (pageUrl, size = 32) => {
  if (!pageUrl) return '';
  
  // Use the official Chrome V3 Favicon API
  // Format: chrome-extension://<ID>/_favicon/?pageUrl=<URL>&size=<SIZE>
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', pageUrl);
    url.searchParams.set('size', size.toString());
    return url.toString();
  } catch (e) {
    // Fallback if chrome.runtime is not available (dev mode)
    return `https://www.google.com/s2/favicons?domain=${new URL(pageUrl).hostname}&sz=${size}`;
  }
};
