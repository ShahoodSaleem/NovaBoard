import React, { useState, useRef } from 'react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { storageService } from '../../services/storageService';
import { Download, Upload, X, CheckCircle2, AlertTriangle, AlertCircle, FileJson, Info } from 'lucide-react';

export const ImportExportModal = ({ isOpen, onClose }) => {
  const { workspaces, activeWorkspaceId, initialize } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import'
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', message: '' }); // type: 'success' | 'error' | ''
  const [dragOver, setDragOver] = useState(false);
  const [parsedBackup, setParsedBackup] = useState(null);
  
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || workspaces[0];

  // Calculate statistics for export
  const totalWorkspaces = workspaces.length;
  let totalColumns = 0;
  let totalBookmarks = 0;
  
  workspaces.forEach(w => {
    totalColumns += w.columns?.length || 0;
    w.columns?.forEach(c => {
      totalBookmarks += c.bookmarks?.length || 0;
    });
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await storageService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowmarks-dashboard-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setImportStatus({
        type: 'success',
        message: 'Backup file exported and downloaded successfully!'
      });
    } catch (error) {
      console.error('Export failed:', error);
      setImportStatus({
        type: 'error',
        message: 'Export failed. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const validateBackupData = (data) => {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      if (!parsed || typeof parsed !== 'object') return null;

      // In FlowMarks data schema, workspaces should be a valid array
      const workspacesList = parsed.workspaces;

      if (!workspacesList || !Array.isArray(workspacesList)) {
        return null;
      }

      // Calculate parsed stats
      let parsedCols = 0;
      let parsedBms = 0;
      workspacesList.forEach(w => {
        parsedCols += w.columns?.length || 0;
        w.columns?.forEach(c => {
          parsedBms += c.bookmarks?.length || 0;
        });
      });

      return {
        originalData: parsed,
        stats: {
          workspaces: workspacesList.length,
          columns: parsedCols,
          bookmarks: parsedBms
        }
      };
    } catch (e) {
      return null;
    }
  };

  const processFile = async (file) => {
    if (!file) return;
    setImportStatus({ type: '', message: '' });
    setParsedBackup(null);

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportStatus({
        type: 'error',
        message: 'Only JSON files (.json) are supported.'
      });
      return;
    }

    try {
      const text = await file.text();
      const validation = validateBackupData(text);
      
      if (validation) {
        setParsedBackup(validation);
      } else {
        setImportStatus({
          type: 'error',
          message: 'Invalid backup file format. Missing core dashboard workspaces.'
        });
      }
    } catch (error) {
      console.error('Read file failed:', error);
      setImportStatus({
        type: 'error',
        message: 'Could not read backup file.'
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmImport = async () => {
    if (!parsedBackup) return;
    setIsImporting(true);
    setImportStatus({ type: '', message: '' });

    try {
      const rawDataString = JSON.stringify(parsedBackup.originalData);
      const success = await storageService.importData(rawDataString);
      
      if (success) {
        // Re-initialize the Zustand store to refresh the layout and dashboard UI immediately
        await initialize();
        
        setImportStatus({
          type: 'success',
          message: `Successfully imported layout! Loaded ${parsedBackup.stats.workspaces} workspaces, ${parsedBackup.stats.columns} boards, and ${parsedBackup.stats.bookmarks} bookmarks.`
        });
        setParsedBackup(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setImportStatus({
          type: 'error',
          message: 'Failed to write backup data to extension storage.'
        });
      }
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus({
        type: 'error',
        message: 'Import failed due to an unexpected error.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const accentColor = activeWorkspace?.theme?.accentColor || '#f59e0b'; // fall back to amber-500

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 animate-in fade-in duration-200">
      <div 
        className="bg-neutral-900/90 backdrop-blur-2xl rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Upload size={22} className="text-amber-400" style={{ color: accentColor }} />
              Dashboard Backup & Sharing
            </h2>
            <p className="text-xs text-neutral-400 mt-1">Export your visual layout and links or import from another user</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/[0.04] p-1 mx-6 mt-5 rounded-xl border border-white/5">
          <button
            onClick={() => {
              setActiveTab('export');
              setImportStatus({ type: '', message: '' });
              setParsedBackup(null);
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'export'
                ? 'text-black shadow-lg bg-amber-400'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
            }`}
            style={activeTab === 'export' ? { backgroundColor: accentColor } : {}}
          >
            Export Layout File
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setImportStatus({ type: '', message: '' });
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'import'
                ? 'text-black shadow-lg bg-amber-400'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.02]'
            }`}
            style={activeTab === 'import' ? { backgroundColor: accentColor } : {}}
          >
            Import Layout File
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          
          {/* Action Messages */}
          {importStatus.message && (
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              importStatus.type === 'success' 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25' 
                : 'bg-rose-500/10 text-rose-300 border-rose-500/25'
            }`}>
              {importStatus.type === 'success' ? (
                <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-rose-400" />
              )}
              <span className="text-xs font-medium leading-relaxed">{importStatus.message}</span>
            </div>
          )}

          {/* Export Panel */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="text-xs text-neutral-300 leading-relaxed">
                  Exporting packages your custom boards, workspaces, bookmarks, positions, and accent themes into a single layout backup file. Send this JSON file to someone else so they can copy your layout structure and links!
                </div>
                
                {/* Visual Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <span className="block text-xl font-extrabold text-white">{totalWorkspaces}</span>
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Workspaces</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <span className="block text-xl font-extrabold text-white">{totalColumns}</span>
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Boards</span>
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                    <span className="block text-xl font-extrabold text-white">{totalBookmarks}</span>
                    <span className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">Bookmarks</span>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-400 leading-normal flex items-start gap-2 pt-1">
                  <Info size={14} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                  <span>This export configuration contains no personal browsing history or account sessions. It is safe to share publicly.</span>
                </div>
              </div>

              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full py-3.5 px-4 font-bold text-black rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 hover:brightness-110"
                style={{
                  backgroundColor: accentColor,
                  boxShadow: `0 4px 20px -6px ${accentColor}80`
                }}
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Packaging Dashboard Layout...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download Layout JSON</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Import Panel */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3.5 ${
                  dragOver 
                    ? 'bg-white/5 border-amber-400 shadow-inner' 
                    : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/20'
                }`}
                style={dragOver ? { borderColor: accentColor } : {}}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
                
                <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-neutral-400 group-hover:text-white transition-colors">
                  <FileJson size={28} />
                </div>
                
                <div>
                  <p className="text-sm font-semibold text-neutral-200">Drag & Drop layout file here</p>
                  <p className="text-xs text-neutral-500 mt-1">or click to browse your computer (JSON format)</p>
                </div>
              </div>

              {/* Import Preview */}
              {parsedBackup && (
                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    Valid Backup Discovered! Ready to import.
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                      <span className="block text-lg font-bold text-white">{parsedBackup.stats.workspaces}</span>
                      <span className="text-[9px] text-neutral-400 uppercase">Workspaces</span>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                      <span className="block text-lg font-bold text-white">{parsedBackup.stats.columns}</span>
                      <span className="text-[9px] text-neutral-400 uppercase">Boards</span>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                      <span className="block text-lg font-bold text-white">{parsedBackup.stats.bookmarks}</span>
                      <span className="text-[9px] text-neutral-400 uppercase">Bookmarks</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Warning:</strong> Restoring this backup will completely overwrite your existing dashboard columns, positions, and bookmark lists. Make sure you have exported your current setup first if you want to keep it.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleConfirmImport}
                      disabled={isImporting}
                      className="flex-1 py-3 px-4 font-bold text-black rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none hover:brightness-110 flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: accentColor,
                        boxShadow: `0 4px 16px -6px ${accentColor}80`
                      }}
                    >
                      {isImporting ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Importing layout...</span>
                        </>
                      ) : (
                        <span>Overwrite & Import Layout</span>
                      )}
                    </button>
                    <button
                      onClick={() => setParsedBackup(null)}
                      disabled={isImporting}
                      className="py-3 px-4 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white rounded-xl transition-all border border-white/10 font-bold"
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
