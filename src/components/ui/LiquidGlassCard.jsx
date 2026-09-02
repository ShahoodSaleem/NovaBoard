import React, { useRef } from 'react';

/**
 * LiquidGlassCard Component
 * Implements the clean, high-contrast dark frosted glass aesthetic from Analytics
 * with reduced backdrop-blur (10px instead of 40px) so the wallpaper shows through cleanly.
 */
export const LiquidGlassCard = ({
  children,
  className = '',
  style = {},
  isDropActive = false,
  glareColor = null,
  blur = '10px',
  onMouseMove,
  ...props
}) => {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mx = `${((e.clientX - rect.left) / rect.width) * 100}%`;
    const my = `${((e.clientY - rect.top) / rect.height) * 100}%`;
    cardRef.current.style.setProperty('--mx', mx);
    cardRef.current.style.setProperty('--my', my);
    if (onMouseMove) onMouseMove(e);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`relative rounded-2xl isolate overflow-hidden group/liquid transition-all duration-200 ${
        isDropActive
          ? 'bg-amber-500/10 border border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
          : 'bg-black/40 hover:border-white/20 border border-white/10 shadow-xl'
      } ${className}`}
      style={{
        backdropFilter: `blur(${blur}) saturate(140%)`,
        WebkitBackdropFilter: `blur(${blur}) saturate(140%)`,
        boxShadow: isDropActive
          ? '0 0 30px rgba(245, 158, 11, 0.25), 0 20px 40px -15px rgba(0, 0, 0, 0.6)'
          : '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
        ...style,
        ...(glareColor ? { '--glare-color': glareColor } : {}),
      }}
      {...props}
    >
      {/* Interactive Cursor Glare Tracked on Hover */}
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover/liquid:opacity-100 transition-opacity duration-300"
        style={{
          zIndex: 1,
          background:
            'radial-gradient(circle at var(--mx, 50%) var(--my, 50%), var(--glare-color, rgba(255, 255, 255, 0.12)), transparent 45%)',
          mixBlendMode: 'soft-light',
        }}
      />

      {/* Internal Slot: Children Content (clean, crisp, and high-contrast) */}
      <div className="relative z-[2] h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default LiquidGlassCard;
