import React from 'react';
import { 
  Eye, 
  EyeOff, 
  Ghost, 
  Settings2, 
  Download,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { BackupButton } from './BackupButton';

export function UtilityRail({ onOpenAppearance, onOpenBackup }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const { 
    isPrivacyMode, 
    togglePrivacyMode, 
    isIncognitoMode, 
    toggleIncognitoMode,
    importChromeBookmarks,
    activeWorkspaceId
  } = useWorkspaceStore();

  const handleImport = async () => {
    importChromeBookmarks(activeWorkspaceId);
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 z-[100] flex flex-col gap-4 p-2 rounded-2xl bg-black/20 backdrop-blur-3xl border border-white/10 shadow-2xl group transition-all duration-300 hover:bg-black/40 hover:scale-105">
      
      {!isCollapsed && (
        <>
          {/* Privacy Mode */}
          <button
            onClick={togglePrivacyMode}
            title={isPrivacyMode ? "Disable Privacy Blur" : "Enable Privacy Blur"}
            className={`p-3 rounded-xl transition-all duration-300 relative ${
              isPrivacyMode 
                ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' 
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            {isPrivacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            {isPrivacyMode && (
              <span className="absolute -left-20 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-red-500 text-[10px] font-bold text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
                Private
              </span>
            )}
          </button>

          {/* Incognito Mode */}
          <button
            onClick={toggleIncognitoMode}
            title={isIncognitoMode ? "Disable Incognito Routing" : "Enable Incognito Routing"}
            className={`p-3 rounded-xl transition-all duration-300 relative ${
              isIncognitoMode 
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' 
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <Ghost size={20} />
            {isIncognitoMode && (
              <span className="absolute -left-24 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-purple-600 text-[10px] font-bold text-white uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Incognito
              </span>
            )}
          </button>

          <div className="h-px bg-white/5 mx-2" />

          {/* Import Button */}
          <button
            onClick={handleImport}
            title="Import Chrome Bookmarks"
            className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
          >
            <Download size={20} />
          </button>

          {/* Backup & Restore Layout Button */}
          <BackupButton onClick={onOpenBackup} />

          {/* Appearance Settings */}
          <button
            onClick={onOpenAppearance}
            title="Customization Settings"
            className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-emerald-500/20 hover:text-emerald-400 transition-all active:rotate-180 duration-500"
          >
            <Settings2 size={20} />
          </button>

          <div className="h-px bg-white/5 mx-2" />
        </>
      )}

      {/* Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
        className="p-3 text-white/40 hover:text-white flex items-center justify-center hover:bg-white/10 rounded-xl transition-all"
      >
        {isCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </div>
  );
}
