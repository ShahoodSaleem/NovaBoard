import React, { useState } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { X } from 'lucide-react';

function AddWorkspaceModal() {
  const [name, setName] = useState('');
  const { isAddWorkspaceModalOpen, setIsAddWorkspaceModalOpen, addWorkspace } = useWorkspaceStore();

  if (!isAddWorkspaceModalOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      addWorkspace(name.trim());
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md glass-dark p-8 rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">New Workspace</h2>
          <button 
            onClick={() => setIsAddWorkspaceModalOpen(false)}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X size={20} className="text-white/40" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-white/30 mb-2 block">
              Workspace Name
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Entertainment, Gaming..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="btn-primary w-full py-4 text-sm tracking-widest uppercase font-bold"
          >
            Create Workspace
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddWorkspaceModal;
