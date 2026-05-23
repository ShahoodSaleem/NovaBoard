import React, { useState, useRef } from 'react';
import { useWidgetStore } from '../../store/useWidgetStore';

export const TaskWidget = ({ size }) => {
  const { tasks, addTask, toggleTask, deleteTask, editTask, clearCompletedTasks } = useWidgetStore();
  const [input, setInput] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const inputRef = useRef(null);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    addTask(text);
    setInput('');
    inputRef.current?.focus();
  };

  const handleSaveEdit = (taskId) => {
    const trimmed = editingText.trim();
    if (trimmed) {
      editTask(taskId, trimmed);
    }
    setEditingTaskId(null);
  };

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Dynamic scaling based on container size
  const baseFontSize = size ? Math.min(18, Math.max(12, size.w / 24)) : 12;
  const padding = size ? Math.min(20, Math.max(8, size.w / 26)) : 14;

  return (
    <div 
      className="task-widget" 
      style={{ 
        fontSize: `${baseFontSize}px`, 
        padding: `${padding}px`,
        gap: `${baseFontSize * 0.8}px` 
      }}
    >
      {/* Header stats */}
      <div className="task-stats">
        <div className="task-stat-text">
          <span className="task-stat-done">{completed}</span>
          <span className="task-stat-sep"> / </span>
          <span className="task-stat-total">{total}</span>
          <span className="task-stat-label"> tasks</span>
        </div>
        <span className="task-stat-pct">{pct}%</span>
      </div>

      {/* Progress bar */}
      <div className="task-progress-track">
        <div
          className="task-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Input */}
      <div className="task-input-row">
        <input
          ref={inputRef}
          type="text"
          className="task-input"
          placeholder="Add a new task…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          className="task-add-btn"
          onClick={handleAdd}
          disabled={!input.trim()}
          title="Add task"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* List */}
      <div className="task-list custom-scrollbar">
        {total === 0 && (
          <div className="task-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="task-empty-icon">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
            <p>No tasks yet</p>
            <p className="task-empty-sub">Add your first task above</p>
          </div>
        )}

        {tasks.map((task) => (
          <div
            key={task.id}
            className={`task-item ${task.completed ? 'task-done' : ''}`}
          >
            <button
              className={`task-checkbox ${task.completed ? 'checked' : ''}`}
              onClick={() => toggleTask(task.id)}
              aria-label="Toggle task"
            >
              {task.completed && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            
            {editingTaskId === task.id ? (
              <div className="task-edit-row" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="text"
                  className="task-edit-input"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(task.id);
                    if (e.key === 'Escape') setEditingTaskId(null);
                  }}
                  autoFocus
                  style={{
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '1em',
                    color: 'white',
                    outline: 'none',
                  }}
                />
                <button
                  className="task-save-btn"
                  onClick={() => handleSaveEdit(task.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#10b981',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title="Save"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '13px', height: '13px' }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <button
                  className="task-cancel-btn"
                  onClick={() => setEditingTaskId(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title="Cancel"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ width: '13px', height: '13px' }}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <span className="task-text">{task.text}</span>
                <button
                  className="task-edit-btn"
                  onClick={() => {
                    setEditingTaskId(task.id);
                    setEditingText(task.text);
                  }}
                  aria-label="Edit task"
                  title="Edit task"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button
                  className="task-delete-btn"
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                  title="Delete task"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {completed > 0 && (
        <button className="task-clear-btn" onClick={clearCompletedTasks}>
          Clear {completed} completed
        </button>
      )}
    </div>
  );
};
