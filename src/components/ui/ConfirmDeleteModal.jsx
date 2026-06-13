import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDeleteModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm glass-group rounded-2xl shadow-2xl overflow-hidden scale-in duration-200">
        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {message && <p className="text-sm text-white/50">{message}</p>}
        </div>

        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
