// Normalizes a URL for duplicate comparison: strips protocol, "www.", and trailing slash.
export function normalizeUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/$/, '');
    return `${host}${path}${u.search}`.toLowerCase();
  } catch {
    return (url || '').trim().toLowerCase();
  }
}

// Returns groups of 2+ bookmarks across all columns that share the same normalized URL.
export function findDuplicateGroups(columns) {
  const map = new Map();
  columns.forEach(col => {
    col.bookmarks.forEach(bm => {
      const key = normalizeUrl(bm.url);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...bm, columnId: col.id, columnName: col.name });
    });
  });
  return [...map.values()].filter(group => group.length > 1);
}

export function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}
