import React, { useState, useRef } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { storageService } from '../../services/storageService';
import { Download, Upload, X, CheckCircle2, AlertTriangle, AlertCircle, FileJson, Info, PlusCircle, RefreshCw } from 'lucide-react';

export const ImportExportModal = ({ isOpen, onClose }) => {
  const { workspaces, activeWorkspaceId, initialize, overwriteCurrentWorkspace, importAsNewWorkspaces } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState('export');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', message: '' });
  const [dragOver, setDragOver] = useState(false);
  const [parsedBackup, setParsedBackup] = useState(null);
  // 'overwrite' = replace current workspace columns, 'new' = add as new workspace(s)
  const [importMode, setImportMode] = useState('new');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];
  const accentColor = activeWorkspace?.theme?.accentColor || '#f59e0b';

  let totalColumns = 0;
  let totalBookmarks = 0;
  workspaces.forEach(w => {
    totalColumns += w.columns?.length || 0;
    w.columns?.forEach(c => { totalBookmarks += c.bookmarks?.length || 0; });
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await storageService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novaboard-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: 'Backup exported successfully!' });
    } catch {
      setImportStatus({ type: 'error', message: 'Export failed. Please try again.' });
    } finally {
      setIsExporting(false);
    }
  };

  const validateBackupData = (data) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!parsed || typeof parsed !== 'object') return null;
      const workspacesList = parsed.workspaces;
      if (!workspacesList || !Array.isArray(workspacesList)) return null;
      let parsedCols = 0;
      let parsedBms = 0;
      workspacesList.forEach(w => {
        parsedCols += w.columns?.length || 0;
        w.columns?.forEach(c => { parsedBms += c.bookmarks?.length || 0; });
      });
      return { originalData: parsed, stats: { workspaces: workspacesList.length, columns: parsedCols, bookmarks: parsedBms } };
    } catch {
      return null;
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setImportStatus({ type: '', message: '' });
    setParsedBackup(null);
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportStatus({ type: 'error', message: 'Only JSON files (.json) are supported.' });
      return;
    }
    try {
      const text = await file.text();
      const validation = validateBackupData(text);
      if (validation) {
        setParsedBackup(validation);
      } else {
        setImportStatus({ type: 'error', message: 'Invalid backup file format. Missing core dashboard workspaces.' });
      }
    } catch {
      setImportStatus({ type: 'error', message: 'Could not read backup file.' });
    }
  };

  const handleFileChange = (e) => processFile(e.target.files[0]);
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); };
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleConfirmImport = async () => {
    if (!parsedBackup) return;
    setIsImporting(true);
    setImportStatus({ type: '', message: '' });

    try {
      if (importMode === 'overwrite') {
        // Replace active workspace columns with first workspace from import
        const firstImportedWorkspace = parsedBackup.originalData.workspaces[0];
        if (!firstImportedWorkspace) throw new Error('No workspace found in import');
        await overwriteCurrentWorkspace(firstImportedWorkspace);
        setImportStatus({
          type: 'success',
          message: `Replaced "${activeWorkspace?.name}" with ${parsedBackup.stats.columns} boards and ${parsedBackup.stats.bookmarks} bookmarks.`
        });
      } else {
        // Add all imported workspaces as new ones
        await importAsNewWorkspaces(parsedBackup.originalData.workspaces);
        const count = parsedBackup.originalData.workspaces.length;
        setImportStatus({
          type: 'success',
          message: `Added ${count} new workspace${count !== 1 ? 's' : ''} with ${parsedBackup.stats.columns} boards and ${parsedBackup.stats.bookmarks} bookmarks.`
        });
      }
      setParsedBackup(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus({ type: 'error', message: 'Import failed due to an unexpected error.' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div
        className="glass-group rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Upload size={22} style={{ color: accentColor }} />
              Dashboard Backup & Sharing
            </h2>
            <p className="text-xs text-neutral-400 mt-1">Export your layout or import from a backup file</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/[0.04] p-1 mx-6 mt-5 rounded-xl border border-white/5">
          {['export', 'import'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setImportStatus({ type: '', message: '' }); setParsedBackup(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab ? 'text-black shadow-lg' : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
              }`}
              style={activeTab === tab ? { backgroundColor: accentColor } : {}}
            >
              {tab === 'export' ? 'Export Layout File' : 'Import Layout File'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">

          {/* Status message */}
          {importStatus.message && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              importStatus.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
            }`}>
              {importStatus.type === 'success'
                ? <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-emerald-400" />
                : <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-rose-400" />}
              <span className="text-xs font-medium leading-relaxed">{importStatus.message}</span>
            </div>
          )}

          {/* ── Export Panel ── */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Exports all your workspaces, boards, bookmarks, and themes into a single JSON file you can share or restore later.
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Workspaces', value: workspaces.length },
                    { label: 'Boards', value: totalColumns },
                    { label: 'Bookmarks', value: totalBookmarks },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                      <span className="block text-xl font-extrabold text-white">{value}</span>
                      <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">{label}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-neutral-400 leading-normal flex items-start gap-2 pt-1">
                  <Info size={14} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                  <span>No personal browsing history or account sessions are included. Safe to share.</span>
                </div>
              </div>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3.5 px-4 font-bold text-black rounded-xl transition-all shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: accentColor, boxShadow: `0 4px 20px -6px ${accentColor}80` }}
              >
                {isExporting ? (
                  <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg><span>Packaging…</span></>
                ) : (
                  <><Download size={18} /><span>Download Layout JSON</span></>
                )}
              </button>
            </div>
          )}

          {/* ── Import Panel ── */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                  dragOver ? 'bg-white/5 border-amber-400 shadow-inner' : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/20'
                }`}
                style={dragOver ? { borderColor: accentColor } : {}}
              >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-neutral-400">
                  <FileJson size={28} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Drag & Drop layout file here</p>
                  <p className="text-xs text-neutral-500 mt-1">or click to browse (JSON format)</p>
                </div>
              </div>

              {/* Import preview + mode selection */}
              {parsedBackup && (
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Valid backup — {parsedBackup.stats.workspaces} workspace{parsedBackup.stats.workspaces !== 1 ? 's' : ''}, {parsedBackup.stats.columns} boards, {parsedBackup.stats.bookmarks} bookmarks
                  </h4>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Workspaces', value: parsedBackup.stats.workspaces },
                      { label: 'Boards', value: parsedBackup.stats.columns },
                      { label: 'Bookmarks', value: parsedBackup.stats.bookmarks },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                        <span className="block text-lg font-bold text-white">{value}</span>
                        <span className="text-[9px] text-neutral-400 uppercase">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Import mode toggle */}
                  <div className="space-y-2">
                    <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">How to import?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Option: Add new workspace(s) */}
                      <button
                        onClick={() => setImportMode('new')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          importMode === 'new'
                            ? 'border-emerald-500/60 bg-emerald-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <PlusCircle size={13} className={importMode === 'new' ? 'text-emerald-400' : 'text-white/40'} />
                          <span className={`text-[12px] font-bold ${importMode === 'new' ? 'text-emerald-300' : 'text-white/60'}`}>
                            Add as new
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-snug">
                          Adds {parsedBackup.stats.workspaces} workspace{parsedBackup.stats.workspaces !== 1 ? 's' : ''} alongside your existing ones. Nothing is overwritten.
                        </p>
                      </button>

                      {/* Option: Overwrite current workspace */}
                      <button
                        onClick={() => setImportMode('overwrite')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          importMode === 'overwrite'
                            ? 'border-amber-500/60 bg-amber-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <RefreshCw size={13} className={importMode === 'overwrite' ? 'text-amber-400' : 'text-white/40'} />
                          <span className={`text-[12px] font-bold ${importMode === 'overwrite' ? 'text-amber-300' : 'text-white/60'}`}>
                            Replace current
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 leading-snug">
                          Overwrites "{activeWorkspace?.name}" boards with the first imported workspace. Cannot be undone.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Warning for overwrite mode */}
                  {importMode === 'overwrite' && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-2.5">
                      <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        This will replace all boards in <strong>"{activeWorkspace?.name}"</strong>. Export your current data first if you want to keep it.
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="flex-1 py-3 px-4 font-bold text-black rounded-xl transition-all shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: importMode === 'overwrite' ? '#f59e0b' : '#10b981',
                        boxShadow: `0 4px 16px -6px ${importMode === 'overwrite' ? '#f59e0b' : '#10b981'}80`
                      }}
                    >
                      {isImporting ? (
                        <><svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg><span>Importing…</span></>
                      ) : (
                        <span>{importMode === 'overwrite' ? 'Replace Current Workspace' : 'Add as New Workspace'}</span>
                      )}
                    </button>
                    <button
                      onClick={() => setParsedBackup(null)}
                      disabled={isImporting}
                      className="py-3 px-4 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-xl border border-white/10 font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-black/20 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold border border-white/10 transition-all hover:scale-105 active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
