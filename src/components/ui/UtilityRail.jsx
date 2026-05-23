import React from 'react';
import { 
  Eye, 
  EyeOff, 
  Ghost, 
  Settings2, 
  Download,
  LayoutGrid,
  Sliders,
  Lock,
  Unlock
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useWidgetStore } from '../../store/useWidgetStore';
import { BackupButton } from './BackupButton';
import SearchButton from './SearchButton';
import WallpaperButton from './WallpaperButton';

export function UtilityRail({ onOpenAppearance, onOpenBackup }) {
  const [isCollapsed, setIsCollapsed] = React.useState(true);
  const { 
    isPrivacyMode, 
    togglePrivacyMode, 
    isIncognitoMode, 
    toggleIncognitoMode,
    importChromeBookmarks,
    activeWorkspaceId
  } = useWorkspaceStore();

  const {
    toggleGallery,
    isGalleryOpen,
    activeWidgets,
    isWidgetsLocked,
    toggleWidgetsLock
  } = useWidgetStore();

  const handleImport = async () => {
    importChromeBookmarks(activeWorkspaceId);
  };

  return (
    <div className="fixed bottom-8 left-8 z-[100] flex items-center gap-3">
      {/* Permanent Core Tools */}
      <WallpaperButton />
      <SearchButton />
      
      {/* Vertical divider separating core tools from configuration settings */}
      <div className="w-px h-8 bg-white/15 mx-1" />

      {/* Expandable settings group, growing to the right anchor, meaning buttons reveal from right to left inside */}
      <div className="flex items-center rounded-2xl bg-black/25 backdrop-blur-3xl border border-white/10 p-1.5 shadow-2xl transition-all duration-300 hover:bg-black/35">
        
        {/* Settings items wrapper on the left of toggle button, expanding to the left */}
        <div 
          className="flex items-center gap-2 overflow-hidden"
          style={{
            maxWidth: isCollapsed ? '0px' : '450px',
            opacity: isCollapsed ? 0 : 1,
            transform: isCollapsed ? 'translateX(20px)' : 'translateX(0)',
            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            marginRight: isCollapsed ? '0px' : '6px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {/* Privacy Mode */}
          <div className="relative group/btn">
            <button
              onClick={togglePrivacyMode}
              className={`p-3 rounded-xl transition-all duration-300 relative ${
                isPrivacyMode 
                  ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <span className="absolute bottom-15 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
              {isPrivacyMode ? "Disable Privacy Blur" : "Enable Privacy Blur"}
            </span>
          </div>

          {/* Incognito Mode */}
          <div className="relative group/btn">
            <button
              onClick={toggleIncognitoMode}
              className={`p-3 rounded-xl transition-all duration-300 relative ${
                isIncognitoMode 
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              <Ghost size={20} />
            </button>
            <span className="absolute bottom-15 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
              {isIncognitoMode ? "Disable Incognito Routing" : "Enable Incognito Routing"}
            </span>
          </div>

          {/* Import Button */}
          <div className="relative group/btn">
            <button
              onClick={handleImport}
              className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
            >
              <Download size={20} />
            </button>
            <span className="absolute bottom-15 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
              Import Bookmarks
            </span>
          </div>

          {/* Backup Button */}
          <BackupButton onClick={onOpenBackup} />

          {/* Appearance Settings */}
          <div className="relative group/btn">
            <button
              onClick={onOpenAppearance}
              className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-emerald-500/20 hover:text-emerald-400 transition-all duration-500 active:scale-95"
            >
              <Sliders size={20} className="group-hover/btn:rotate-90 transition-transform duration-500" />
            </button>
            <span className="absolute bottom-15 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
              Appearance
            </span>
          </div>

          {/* Widget Gallery Toggle */}
          <div className="relative group/btn">
            <button
              onClick={toggleGallery}
              className={`p-3 rounded-xl transition-all duration-300 relative group active:scale-95 ${
                isGalleryOpen 
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutGrid size={20} />
            </button>
            <span className="absolute bottom-15 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase tracking-tighter pointer-events-none border border-white/10">
              Widgets ({activeWidgets.length})
            </span>
          </div>

          {/* Global Widgets Lock Toggle */}
          <div className="relative group/btn">
            <button
              onClick={toggleWidgetsLock}
              className={`p-3 rounded-xl transition-all duration-300 relative group active:scale-95 ${
                isWidgetsLocked 
                  ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:bg-amber-400 hover:text-black' 
                  : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              {isWidgetsLocked ? <Lock size={20} /> : <Unlock size={20} />}
            </button>
            <span className="absolute bottom-15 left-1/2 -translate-x-1/2 opacity-0 group-hover/btn:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase tracking-tighter pointer-events-none border border-white/10">
              {isWidgetsLocked ? "Unlock Widgets" : "Lock Widgets"}
            </span>
          </div>
        </div>

        {/* Collapse Toggle settings button always on the right */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand settings" : "Collapse settings"}
          className={`p-3 rounded-xl text-white/40 hover:text-white transition-all active:scale-95 duration-500 flex items-center justify-center hover:bg-white/10 ${
            !isCollapsed ? 'rotate-90 text-white' : ''
          }`}
        >
          <Settings2 size={20} />
        </button>
      </div>
    </div>
  );
}
