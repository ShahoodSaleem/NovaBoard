import React, { useState, useEffect, useCallback, useRef } from 'react';

const USAGE_KEY = 'novaboard_usage';

const getLocal = (key) =>
  new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([key], (r) => resolve(r[key]));
    } else {
      try { resolve(JSON.parse(localStorage.getItem(key))); } catch { resolve(null); }
    }
  });

const fmtTime = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const today = () => new Date().toISOString().slice(0, 10);

// Color palette for bars — cycles per domain
const BAR_COLORS = [
  '#818cf8', '#34d399', '#f472b6', '#fb923c',
  '#38bdf8', '#a78bfa', '#4ade80', '#facc15',
  '#e879f9', '#f87171',
];

export const UsageWidget = ({ size }) => {
  const [usageData, setUsageData] = useState({});
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const load = useCallback(async () => {
    const raw = await getLocal(USAGE_KEY);
    const todayKey = today();
    if (raw && raw.date === todayKey && raw.domains) {
      setUsageData(raw.domains);
    } else {
      setUsageData({});
    }
    setLastRefresh(Date.now());
  }, []);

  // Load on mount + poll every 5s
  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  // Build sorted entries
  const entries = Object.entries(usageData)
    .map(([domain, ms]) => ({ domain, ms }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 12);

  const maxMs = entries[0]?.ms || 1;
  const totalMs = entries.reduce((s, e) => s + e.ms, 0);

  const compact = size && size.w < 300;

  return (
    <div className="usage-widget">
      {/* Header */}
      <div className="usage-header">
        <div className="usage-header-left">
          <span className="usage-today-label">Today</span>
          <span className="usage-total-time">{totalMs > 0 ? fmtTime(totalMs) : '—'}</span>
        </div>
        <button className="usage-refresh-btn" onClick={load} title="Refresh">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="usage-list custom-scrollbar">
        {entries.length === 0 ? (
          <div className="usage-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="usage-empty-icon">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 8v4l3 3"/>
            </svg>
            <p>No usage data yet</p>
            <p className="usage-empty-sub">Browse some sites — data appears here automatically</p>
          </div>
        ) : (
          entries.map(({ domain, ms }, i) => {
            const pct = (ms / maxMs) * 100;
            const color = BAR_COLORS[i % BAR_COLORS.length];
            const sharePct = totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

            return (
              <div key={domain} className="usage-item">
                <div className="usage-item-top">
                  <div className="usage-item-left">
                    <img
                      src={faviconUrl}
                      className="usage-favicon"
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span className="usage-domain" title={domain}>
                      {compact ? domain.replace(/^www\./, '') : domain}
                    </span>
                  </div>
                  <div className="usage-item-right">
                    <span className="usage-share">{sharePct}%</span>
                    <span className="usage-time">{fmtTime(ms)}</span>
                  </div>
                </div>
                <div className="usage-bar-track">
                  <div
                    className="usage-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: color,
                      boxShadow: `0 0 8px ${color}55`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="usage-footer">
        <span className="usage-footer-hint">
          Tracked across all tabs today
        </span>
        {entries.length > 0 && (
          <span className="usage-refresh-ts">
            Updated {new Date(lastRefresh).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
};
