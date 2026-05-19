import React, { useEffect, useState } from 'react'
import { useWorkspaceStore } from '../store/useWorkspaceStore'

function PopupApp() {
  const { workspaces, activeWorkspaceId, initialize, isInitialized, addBookmark } = useWorkspaceStore()
  const [targetWorkspaceId, setTargetWorkspaceId] = React.useState('')
  const [saveStatus, setSaveStatus] = React.useState('idle') // idle, saving, success

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (isInitialized) {
      setTargetWorkspaceId(activeWorkspaceId || workspaces[0]?.id)
    }
  }, [isInitialized, activeWorkspaceId, workspaces])

  const handleSaveTab = async () => {
    setSaveStatus('saving')
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab) {
        // Find the Inbox column of the target workspace
        const workspace = workspaces.find(w => w.id === targetWorkspaceId)
        if (workspace) {
          const inbox = workspace.columns.find(c => c.name.toLowerCase() === 'inbox') || workspace.columns[0]
          
          await addBookmark(targetWorkspaceId, inbox.id, {
            title: tab.title || 'New Bookmark',
            url: tab.url,
            favicon: tab.favIconUrl || ''
          })
          
          setSaveStatus('success')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      }
    } catch (err) {
      console.error(err)
      setSaveStatus('idle')
    }
  }

  if (!isInitialized) return <div className="w-80 h-40 bg-zinc-950 flex items-center justify-center font-inter italic text-white/10">Loading...</div>

  return (
    <div className="w-80 p-5 bg-zinc-950 text-white shadow-2xl font-inter border border-white/5">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white/90">FlowMarks</h1>
        {saveStatus === 'success' && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-1 rounded-full animate-in zoom-in duration-300">Saved!</span>}
      </div>

      <button 
        onClick={handleSaveTab}
        disabled={saveStatus === 'saving'}
        className={`w-full py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg border border-white/10 mb-6 ${
          saveStatus === 'saving' ? 'bg-white/5 text-white/20' : 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white'
        }`}
      >
        {saveStatus === 'saving' ? 'Saving...' : 'Save Current Tab'}
      </button>
      
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div>
          <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3 block">
            Target Workspace
          </label>
          <select 
            value={targetWorkspaceId}
            onChange={(e) => setTargetWorkspaceId(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none hover:bg-white/10 transition-colors cursor-pointer"
          >
            {workspaces.map(ws => (
              <option key={ws.id} value={ws.id} className="bg-zinc-900">{ws.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default PopupApp
