import React, { useRef, useState, useEffect } from 'react';
import { ImagePlus, Link2, Upload, X, Trash2, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

// Brief human-readable label for what kind of wallpaper is active
function getActiveLabel(wallpaperType, currentWallpaper) {
  if (!wallpaperType || !currentWallpaper) return null;
  if (wallpaperType === 'youtube-embed') return 'YouTube video active';
  if (wallpaperType === 'video/url') return 'Video URL active';
  if (wallpaperType === 'image/url') return 'Image URL active';
  if (wallpaperType.startsWith('video/')) return 'Video file active';
  if (wallpaperType.startsWith('image/')) return 'Image file active';
  return null;
}

function WallpaperButton() {
  const fileInputRef = useRef(null);
  const panelRef = useRef(null);
  const { setWallpaper, setWallpaperUrl, clearWallpaper, currentWallpaper, wallpaperType } = useWorkspaceStore();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeLabel = getActiveLabel(wallpaperType, currentWallpaper);
  const hasWallpaper = !!currentWallpaper;

  // Close panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Please select an image or video file.');
      return;
    }
    setIsLoading(true);
    await setWallpaper(file);
    setIsLoading(false);
    setIsOpen(false);
    // Reset so the same file can be picked again
    event.target.value = '';
  };

  const handleSetUrl = async () => {
    setUrlError('');
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError('Please enter a URL.');
      return;
    }
    // Basic URL validation
    try {
      new URL(trimmed);
    } catch {
      setUrlError('That doesn\'t look like a valid URL.');
      return;
    }
    setIsLoading(true);
    await setWallpaperUrl(trimmed);
    setIsLoading(false);
    setUrlInput('');
    setIsOpen(false);
  };

  const handleClear = async () => {
    setIsLoading(true);
    await clearWallpaper();
    setIsLoading(false);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSetUrl();
    if (e.key === 'Escape') setIsOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-12 h-12 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all hover:scale-110 active:scale-95 group relative ${
          isOpen ? 'bg-white/15 scale-110' : ''
        }`}
        title="Wallpaper"
      >
        <ImagePlus size={20} className={`transition-colors ${isOpen ? 'text-white' : 'text-white/70 group-hover:text-white'}`} />

        {/* Active indicator dot */}
        {hasWallpaper && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
        )}

        {/* Tooltip — only when panel is closed */}
        {!isOpen && (
          <span className="absolute bottom-14 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
            {hasWallpaper ? activeLabel || 'Change Wallpaper' : 'Set Wallpaper'}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="absolute bottom-14 left-0 w-[320px] rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg, rgba(18,18,24,0.97) 0%, rgba(10,10,14,0.97) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ImagePlus size={15} className="text-amber-400" />
              <span className="text-[13px] font-semibold text-white/90">Wallpaper</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Active wallpaper status bar */}
          {hasWallpaper && (
            <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-xs text-amber-300/90 truncate font-medium">{activeLabel}</span>
              </div>
              <button
                onClick={handleClear}
                disabled={isLoading}
                className="flex items-center gap-1 text-[10px] font-semibold text-red-400/70 hover:text-red-400 transition-colors flex-shrink-0 px-2 py-1 rounded-lg hover:bg-red-500/10"
              >
                <Trash2 size={10} />
                Clear
              </button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 px-3 mt-3">
            {['upload', 'url'].map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setUrlError(''); }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white/10 text-white'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                }`}
              >
                {tab === 'upload' ? (
                  <span className="flex items-center justify-center gap-1.5"><Upload size={11} /> Upload File</span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5"><Link2 size={11} /> Paste URL</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-3 pb-4 pt-3">
            {activeTab === 'upload' ? (
              /* ── Upload File Tab ── */
              <div className="space-y-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*,video/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/[0.02] hover:bg-amber-500/5 transition-all group flex flex-col items-center gap-2"
                >
                  <Upload size={20} className="text-white/30 group-hover:text-amber-400 transition-colors" />
                  <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors font-medium">
                    Click to browse
                  </span>
                  <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">
                    Images & Videos supported
                  </span>
                </button>
              </div>
            ) : (
              /* ── Paste URL Tab ── */
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setUrlError(''); }}
                    onKeyDown={handleKeyDown}
                    placeholder="https://youtube.com/watch?v=... or .mp4 link"
                    autoFocus
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-500/50 focus:bg-white/[0.07] text-xs text-white placeholder:text-white/20 outline-none transition-all"
                  />
                  {urlError && (
                    <p className="text-[10px] text-red-400/80 px-1">{urlError}</p>
                  )}
                </div>

                <button
                  onClick={handleSetUrl}
                  disabled={isLoading || !urlInput.trim()}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 disabled:text-white/20 text-black font-bold text-xs transition-all active:scale-95 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Setting…' : 'Set as Wallpaper'}
                </button>

                {/* Supported sources info */}
                <div className="space-y-1.5 pt-1 border-t border-white/[0.06]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Supported sources</p>
                  {[
                    { icon: '▶', label: 'YouTube', hint: 'youtube.com/watch, youtu.be, /shorts' },
                    { icon: '🎬', label: 'Direct video', hint: '.mp4 · .webm · .ogg · .mov' },
                    { icon: '🖼', label: 'Direct image', hint: '.jpg · .png · .gif · .webp' },
                    { icon: '🌊', label: 'Live wallpaper sites', hint: 'Any site with direct .mp4 links' },
                  ].map(({ icon, label, hint }) => (
                    <div key={label} className="flex items-start gap-2 px-1">
                      <span className="text-[11px] flex-shrink-0 mt-px">{icon}</span>
                      <div className="min-w-0">
                        <span className="text-[11px] text-white/50 font-medium">{label}</span>
                        <span className="text-[10px] text-white/25 ml-1.5">{hint}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 mt-2 px-1">
                    <ExternalLink size={9} className="text-white/20 flex-shrink-0" />
                    <a
                      href="https://www.youtube.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-amber-400/50 hover:text-amber-400/80 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        if (typeof chrome !== 'undefined' && chrome.tabs) {
                          chrome.tabs.create({ url: 'https://www.youtube.com' });
                        } else {
                          window.open('https://www.youtube.com', '_blank');
                        }
                      }}
                    >
                      Browse YouTube for live wallpapers →
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WallpaperButton;
