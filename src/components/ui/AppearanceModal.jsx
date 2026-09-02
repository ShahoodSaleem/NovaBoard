import React, { useState, useEffect } from 'react';
import { X, Sliders, Sun, Droplets, FastForward, Command, Sparkles, Play } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

export function AppearanceModal({ isOpen, onClose, onPreviewStartupAnimation }) {
  const {
    bgBlur,
    bgBrightness,
    videoFps,
    wallpaperType,
    updateBgStyles,
    startupAnimationEnabled,
    setStartupAnimationEnabled
  } = useWorkspaceStore();
  const [shortcut, setShortcut] = useState('Ctrl+Shift+W');

  useEffect(() => {
    if (isOpen && typeof chrome !== 'undefined' && chrome.commands) {
      chrome.commands.getAll((commands) => {
        const quickSave = commands.find(c => c.name === 'quick-save');
        if (quickSave && quickSave.shortcut) {
          setShortcut(quickSave.shortcut);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm glass-group rounded-2xl shadow-2xl overflow-hidden scale-in duration-200">
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-white/70" />
            <h3 className="text-lg font-semibold text-white">Appearance</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Startup Animation Toggle */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-sm font-medium">Startup Intro Animation</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={startupAnimationEnabled}
                onClick={() => setStartupAnimationEnabled(!startupAnimationEnabled)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer ${
                  startupAnimationEnabled ? 'bg-amber-400' : 'bg-white/15'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    startupAnimationEnabled ? 'translate-x-5 bg-black' : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between pt-1 text-xs text-white/40">
              <span>Plays once per browser session</span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPreviewStartupAnimation?.();
                }}
                className="text-xs text-white/60 hover:text-amber-400 font-medium px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-all flex items-center gap-1 active:scale-95"
              >
                <Play size={11} className="fill-current" />
                Preview
              </button>
            </div>
          </div>

          {/* Blur Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/60">
                <Droplets size={16} />
                <span className="text-sm font-medium">Background Blur</span>
              </div>
              <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-white/40">{bgBlur}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              value={bgBlur}
              onChange={(e) => updateBgStyles({ bgBlur: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-emerald-400 transition-all"
            />
          </div>

          {/* Brightness Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/60">
                <Sun size={16} />
                <span className="text-sm font-medium">Brightness</span>
              </div>
              <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-white/40">{bgBrightness}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={bgBrightness}
              onChange={(e) => updateBgStyles({ bgBrightness: parseInt(e.target.value) })}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-emerald-400 transition-all"
            />
          </div>

          {/* Video FPS / Speed Slider (only for video wallpapers — not YouTube iframes) */}
          {(wallpaperType?.startsWith('video/') || wallpaperType === 'video/url') && wallpaperType !== 'youtube-embed' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white/60">
                  <FastForward size={16} />
                  <span className="text-sm font-medium">Video FPS</span>
                </div>
                <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-white/40">
                  {videoFps} FPS
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={videoFps || 60}
                onChange={(e) => updateBgStyles({ videoFps: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-emerald-400 transition-all"
              />
            </div>
          )}

          <div className="pt-2 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-white/60">
                <Command size={16} />
                <span className="text-sm font-medium">Quick Save Shortcut</span>
              </div>
              <button
                onClick={() => {
                  if (typeof chrome !== 'undefined' && chrome.tabs) {
                    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-medium text-sm transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-2"
              >
                Customize ({shortcut})
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all shadow-lg active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>

  );
}
