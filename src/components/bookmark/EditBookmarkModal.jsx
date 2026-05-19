import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function EditBookmarkModal({ isOpen, onClose, onSave, bookmark }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setUrl(bookmark.url);
    }
  }, [bookmark]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (title.trim() && url.trim()) {
      onSave({ ...bookmark, title: title.trim(), url: url.trim() });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-900/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden scale-in duration-200">
        <div className="p-4 flex items-center justify-between border-b border-white/5 bg-white/5">
          <h3 className="text-lg font-semibold text-white">Edit Bookmark</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Title</label>
            <input
              autoFocus
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all placeholder:text-white/20"
              placeholder="e.g. Gmail"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">Link URL</label>
            <input
              required
              type="url"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all placeholder:text-white/20"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
