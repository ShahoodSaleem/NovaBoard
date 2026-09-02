import React, { useEffect, useState, useRef } from 'react';

/**
 * Minimalist, ultra-smooth startup animation for new browser sessions.
 * Automatically exits after 1.9s or immediately upon user click / keypress.
 */
export function StartupAnimation({ onComplete, accentColor = '#f59e0b' }) {
  const [isExiting, setIsExiting] = useState(false);
  const timerRef = useRef(null);

  const handleDismiss = () => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(() => {
      onComplete?.();
    }, 450);
  };

  useEffect(() => {
    // Auto complete after 1.85s
    timerRef.current = setTimeout(() => {
      handleDismiss();
    }, 1850);

    const onKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center cursor-pointer select-none bg-[#050507] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isExiting ? 'opacity-0 scale-[1.03] blur-sm pointer-events-none' : 'opacity-100 scale-100 blur-0'
      }`}
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
      }}
    >
      {/* Dynamic Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle 420px at 50% 48%, ${accentColor}18, transparent 70%), radial-gradient(circle 700px at 50% 50%, rgba(255,255,255,0.02), transparent 75%)`
        }}
      />

      {/* Subtle Noise / Grid Accent */}
      <div 
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Main Animated Core */}
      <div className="relative flex flex-col items-center justify-center gap-6">
        {/* Nova Emblem */}
        <div className="relative w-20 h-20 flex items-center justify-center">
          {/* Outer Breathing Ring */}
          <div
            className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-25"
            style={{ animationDuration: '2.4s' }}
          />

          {/* Rotating Geometric Aura Ring */}
          <div
            className="absolute inset-0 rounded-full border border-dashed border-white/20 animate-spin"
            style={{ animationDuration: '14s' }}
          />

          {/* Inner Accent Ring */}
          <div
            className="absolute inset-2 rounded-full border border-white/15 backdrop-blur-md bg-white/[0.03] shadow-[0_0_25px_rgba(255,255,255,0.06)]"
            style={{ borderColor: `${accentColor}33` }}
          />

          {/* Center Glowing Nova Star */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-8 h-8 text-white relative z-10 drop-shadow-[0_0_12px_rgba(255,255,255,0.8)] animate-pulse"
            style={{ animationDuration: '1.8s' }}
          >
            <path
              d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* Brand Name with dynamic tracking expansion */}
        <div className="flex flex-col items-center gap-2">
          <h1
            className="text-[17px] font-semibold uppercase text-transparent bg-clip-text bg-gradient-to-b from-white via-white/90 to-white/60 tracking-[0.38em] translate-x-[0.19em] animate-in fade-in zoom-in-95 duration-700"
          >
            NOVABOARD
          </h1>

          {/* Horizontal energy draw beam */}
          <div className="relative w-28 h-[1.5px] bg-white/10 rounded-full overflow-hidden my-1">
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse"
              style={{
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                animationDuration: '1.2s'
              }}
            />
          </div>

          <p className="text-[11px] font-medium tracking-[0.2em] text-white/40 uppercase translate-x-[0.1em] animate-in fade-in duration-1000">
            SESSION READY
          </p>
        </div>
      </div>

      {/* Subtle Skip Hint in bottom corner */}
      <div className="absolute bottom-8 text-[11px] tracking-wider text-white/20 uppercase font-mono hover:text-white/40 transition-colors">
        Click or press Esc to skip
      </div>
    </div>
  );
}
export default StartupAnimation;
