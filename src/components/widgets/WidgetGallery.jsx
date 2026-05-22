import React from 'react';
import { useWidgetStore, WIDGET_DEFS } from '../../store/useWidgetStore';

const PREVIEW_ICONS = {
  clock: (
    <svg viewBox="0 0 48 48" fill="none" className="gallery-preview-svg">
      <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
      <circle cx="24" cy="24" r="18" fill="rgba(255,255,255,0.05)"/>
      <line x1="24" y1="24" x2="24" y2="10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="24" y1="24" x2="33" y2="30" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="24" y1="24" x2="16" y2="30" stroke="#ef4444" strokeWidth="1" strokeLinecap="round"/>
      <circle cx="24" cy="24" r="2" fill="white"/>
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 48 48" fill="none" className="gallery-preview-svg">
      <rect x="8" y="8" width="32" height="32" rx="5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="rgba(255,255,255,0.05)"/>
      <polyline points="16,20 19,24 26,16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="30" y1="20" x2="38" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="28" r="2" fill="rgba(255,255,255,0.3)"/>
      <line x1="20" y1="28" x2="38" y2="28" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="35" r="2" fill="rgba(255,255,255,0.3)"/>
      <line x1="20" y1="35" x2="32" y2="35" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  music: (
    <svg viewBox="0 0 48 48" fill="none" className="gallery-preview-svg">
      <rect x="4" y="8" width="28" height="22" rx="4" fill="rgba(29,185,84,0.2)" stroke="#1DB954" strokeWidth="1.5"/>
      <circle cx="14" cy="32" r="5" fill="#1DB954" opacity="0.8"/>
      <circle cx="14" cy="32" r="2" fill="white" opacity="0.9"/>
      <line x1="19" y1="32" x2="19" y2="16" stroke="#1DB954" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="27" y1="16" x2="27" y2="24" stroke="rgba(255,255,255,0.4)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="33" y1="19" x2="33" y2="29" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round"/>
      <line x1="39" y1="22" x2="39" y2="34" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
};

export const WidgetGallery = () => {
  const { isGalleryOpen, closeGallery, activeWidgets, addWidget, removeWidget } = useWidgetStore();

  const isActive = (type) => activeWidgets.some((w) => w.type === type);
  const activeWidget = (type) => activeWidgets.find((w) => w.type === type);

  return (
    <>
      {/* Overlay backdrop */}
      {isGalleryOpen && (
        <div className="gallery-backdrop" onClick={closeGallery} />
      )}

      {/* Slide-in panel */}
      <aside className={`widget-gallery ${isGalleryOpen ? 'gallery-open' : ''}`}>
        {/* Header */}
        <div className="gallery-header">
          <div className="gallery-header-left">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="gallery-header-icon">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
            <div>
              <h2 className="gallery-title">Widget Gallery</h2>
              <p className="gallery-sub">Add widgets to your dashboard</p>
            </div>
          </div>
          <button className="gallery-close-btn" onClick={closeGallery} title="Close gallery">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Active count badge */}
        <div className="gallery-active-bar">
          <span className="gallery-active-badge">{activeWidgets.length} active</span>
          <span className="gallery-active-hint">Drag widgets to reposition them</span>
        </div>

        {/* Widget cards */}
        <div className="gallery-list custom-scrollbar">
          {WIDGET_DEFS.map((def) => {
            const active = isActive(def.type);
            const aw = activeWidget(def.type);
            return (
              <div key={def.type} className={`gallery-card ${active ? 'gallery-card-active' : ''}`}>
                {/* Preview area */}
                <div className="gallery-preview">
                  {PREVIEW_ICONS[def.type]}
                  {active && <div className="gallery-active-dot" />}
                </div>

                {/* Info */}
                <div className="gallery-card-info">
                  <div className="gallery-card-name">{def.name}</div>
                  <div className="gallery-card-desc">{def.description}</div>
                  {active && <div className="gallery-card-status">● Active on dashboard</div>}
                </div>

                {/* Action */}
                <button
                  className={`gallery-action-btn ${active ? 'btn-remove' : 'btn-add'}`}
                  onClick={() => active ? removeWidget(aw.id) : addWidget(def.type)}
                >
                  {active ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                      Remove
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="gallery-footer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="gallery-footer-icon">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Widgets float freely over the dashboard
        </div>
      </aside>
    </>
  );
};
