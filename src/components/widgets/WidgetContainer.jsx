import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useWidgetStore } from '../../store/useWidgetStore';

const TITLES = {
  clock: '🕐  Clock',
  tasks: '✅  Tasks',
  music: '🎵  Music',
};

export const WidgetContainer = ({ widget, children }) => {
  const { removeWidget, toggleMinimize, updateWidgetPosition, updateWidgetSize, isWidgetsLocked } = useWidgetStore();

  const [pos, setPos] = useState(widget.position || { x: 80, y: 80 });
  const [size, setSize] = useState(widget.size || { w: 300, h: 200 });

  const posRef       = useRef(pos);
  const sizeRef      = useRef(size);
  const dragging     = useRef(false);
  const resizing     = useRef(false);
  const startOffset  = useRef({ x: 0, y: 0 });
  const startSize    = useRef({ w: 300, h: 200 });
  const startMouse   = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);

  // Sync state if position changes externally
  useEffect(() => {
    setPos(widget.position || { x: 80, y: 80 });
    posRef.current = widget.position || { x: 80, y: 80 };
  }, [widget.position]);

  // Sync state if size changes externally
  useEffect(() => {
    setSize(widget.size || { w: 300, h: 200 });
    sizeRef.current = widget.size || { w: 300, h: 200 };
  }, [widget.size]);

  const onHeaderMouseDown = useCallback((e) => {
    if (isWidgetsLocked) return;
    if (e.target.closest('.wc-controls')) return;
    dragging.current = true;
    startOffset.current = {
      x: e.clientX - posRef.current.x,
      y: e.clientY - posRef.current.y,
    };
    e.preventDefault();
  }, [isWidgetsLocked]);

  const onResizeMouseDown = useCallback((e) => {
    if (isWidgetsLocked) return;
    resizing.current = true;
    startSize.current = { ...sizeRef.current };
    startMouse.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();
  }, [isWidgetsLocked]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (isWidgetsLocked) return;
      if (resizing.current) {
        const deltaX = e.clientX - startMouse.current.x;
        const deltaY = e.clientY - startMouse.current.y;
        
        // Boundaries based on widget type
        let minW = 260;
        let minH = 180;
        if (widget.type === 'clock') {
          minW = 100;
          minH = 200;
        } else if (widget.type === 'music') {
          minW = 300;
          minH = 160;
        }
        const maxW = 900;
        const maxH = 900;

        const newSize = {
          w: Math.max(minW, Math.min(maxW, startSize.current.w + deltaX)),
          h: Math.max(minH, Math.min(maxH, startSize.current.h + deltaY)),
        };

        sizeRef.current = newSize;
        setSize(newSize);
      } else if (dragging.current) {
        const newPos = {
          x: Math.max(0, e.clientX - startOffset.current.x),
          y: Math.max(0, e.clientY - startOffset.current.y),
        };
        posRef.current = newPos;
        setPos(newPos);
      }
    };

    const onMouseUp = () => {
      if (resizing.current) {
        resizing.current = false;
        updateWidgetSize(widget.id, sizeRef.current);
      } else if (dragging.current) {
        dragging.current = false;
        updateWidgetPosition(widget.id, posRef.current);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [widget.id, widget.type, updateWidgetPosition, updateWidgetSize, isWidgetsLocked]);

  const isClock = widget.type === 'clock';

  return (
    <div
      ref={containerRef}
      className={`widget-container widget-container-${widget.type} ${widget.minimized ? 'wc-minimized' : ''} ${isWidgetsLocked ? 'wc-locked' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: widget.minimized ? 'auto' : size.h,
        cursor: isWidgetsLocked ? 'default' : (isClock ? 'grab' : 'default')
      }}
    >
      {/* Drag handle / header — completely hidden for clock */}
      {!isClock && (
        <div className="wc-header" onMouseDown={onHeaderMouseDown}>
          <span className="wc-title">{TITLES[widget.type] ?? widget.type}</span>
          <div className="wc-controls">
            <button
              className="wc-btn minimize"
              onClick={() => toggleMinimize(widget.id)}
              title={widget.minimized ? 'Expand' : 'Minimize'}
            >
              {widget.minimized ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>
              )}
            </button>
            <button
              className="wc-btn close"
              onClick={() => removeWidget(widget.id)}
              title="Remove widget"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Body — hidden when minimized */}
      {!widget.minimized && (
        <>
          <div 
            className="wc-body" 
            onMouseDown={isClock && !isWidgetsLocked ? onHeaderMouseDown : undefined}
            style={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column', 
              cursor: isClock && !isWidgetsLocked ? 'grab' : 'inherit' 
            }}
          >
            {React.isValidElement(children) ? React.cloneElement(children, { size }) : children}
          </div>
          {/* Resize handle — hidden when locked */}
          {!isWidgetsLocked && (
            <div className="wc-resize-handle" onMouseDown={onResizeMouseDown}>
              <svg viewBox="0 0 10 10" width="10" height="10" className="wc-resize-svg">
                <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="10" y1="3" x2="3" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="10" y1="6" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
};
