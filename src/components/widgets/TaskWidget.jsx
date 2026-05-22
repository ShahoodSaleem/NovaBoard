import React, { useState, useRef } from 'react';
import { useWidgetStore } from '../../store/useWidgetStore';

export const TaskWidget = () => {
  const { tasks, addTask, toggleTask, deleteTask, clearCompletedTasks } = useWidgetStore();
  const [input, setInput] = useState('');
  const inputRef = useRef(null);

  const handleAdd = () => {
    const text = input.trim();
    if (!text) return;
    addTask(text);
    setInput('');
    inputRef.current?.focus();
  };

  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="task-widget">
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
            <span className="task-text">{task.text}</span>
            <button
              className="task-delete-btn"
              onClick={() => deleteTask(task.id)}
              aria-label="Delete task"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
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
