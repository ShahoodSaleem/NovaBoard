import React, { useRef } from 'react';
import { ImagePlus } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

function WallpaperButton() {
  const fileInputRef = useRef(null);
  const { setWallpaper } = useWorkspaceStore();

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Please select an image or video file.');
        return;
      }
      await setWallpaper(file);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />
      <button
        onClick={handleButtonClick}
        className="w-12 h-12 flex items-center justify-center rounded-2xl glass hover:bg-white/10 transition-all hover:scale-110 active:scale-95 group relative"
        title="Change Wallpaper"
      >
        <ImagePlus size={20} className="text-white/70 group-hover:text-white transition-colors" />
        
        {/* Tooltip */}
        <span className="absolute bottom-14 left-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none border border-white/10">
          Upload Custom Wallpaper
        </span>
      </button>
    </div>
  );
}

export default WallpaperButton;
