import React, { useEffect, useState } from 'react';
import { useWidgetStore } from '../../store/useWidgetStore';

export const ClockWidget = ({ size }) => {
  const [style, setStyle] = useState(() => localStorage.getItem('flowmarks_clock_style') || 'shooting-star');
  const [time, setTime] = useState(new Date());
  const { tasks } = useWidgetStore();

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleCycleStyle = () => {
    const styles = ['shooting-star', 'wiggles', 'eastern-sunrise'];
    const nextIdx = (styles.indexOf(style) + 1) % styles.length;
    const nextStyle = styles[nextIdx];
    setStyle(nextStyle);
    localStorage.setItem('flowmarks_clock_style', nextStyle);
  };

  const pad = (n) => String(n).padStart(2, '0');
  const hr = pad(time.getHours());
  const min = pad(time.getMinutes());
  
  const month = time.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayName = time.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateNum = pad(time.getDate());
  
  const activeTasks = tasks ? tasks.filter(t => !t.completed).length : 0;
  
  // Simulated steps that tick up dynamically to make it feel alive!
  // Uses hours and minutes as seed + seconds as tick
  const baseSteps = (time.getHours() * 320) + (time.getMinutes() * 65);
  const steps = 3420 + baseSteps + (time.getSeconds() * 2);

  // Dynamic capsule sizing based on container height/width
  const bodyW = size ? size.w : 280;
  const bodyH = size ? size.h - 40 : 110;

  // Watch faces are roughly 1:2.6 aspect ratio
  let capsuleH = bodyH * 0.92;
  let capsuleW = capsuleH / 2.6;
  if (capsuleW > bodyW * 0.9) {
    capsuleW = bodyW * 0.9;
    capsuleH = capsuleW * 2.6;
  }

  // Base font size for em units inside the capsule clock
  const capsuleFontSize = capsuleW / 8.5;

  return (
    <div className="clock-widget-container" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div 
        className={`clock-capsule clock-capsule-${style}`}
        onClick={handleCycleStyle}
        title="Click to cycle clock styles!"
        style={{
          position: 'relative',
          width: `${capsuleW}px`,
          height: `${capsuleH}px`,
          fontSize: `${capsuleFontSize}px`,
          borderRadius: `${capsuleW / 2}px`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.2em 0.8em',
          cursor: 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Style 1: Shooting Star Background and Graphics */}
        {style === 'shooting-star' && (
          <>
            {/* Ambient Star particles / background glows */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #07070d 0%, #020204 100%)', zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '15%', left: '20%', width: '2px', height: '2px', background: 'white', borderRadius: '50%', opacity: 0.8, zIndex: 1 }} />
            <div style={{ position: 'absolute', top: '40%', right: '25%', width: '3px', height: '3px', background: '#00d2ff', borderRadius: '50%', opacity: 0.6, zIndex: 1, boxShadow: '0 0 4px #00d2ff' }} />
            <div style={{ position: 'absolute', bottom: '30%', left: '30%', width: '2px', height: '2px', background: '#e07eff', borderRadius: '50%', opacity: 0.5, zIndex: 1 }} />
            
            {/* Top Date */}
            <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1em' }}>
              <span style={{ fontSize: '0.65em', fontWeight: '700', color: 'rgba(255, 255, 255, 0.85)', letterSpacing: '0.05em' }}>{dayName}</span>
              <span style={{ fontSize: '0.55em', fontWeight: '500', color: '#00d2ff', letterSpacing: '0.1em' }}>{month}/{dateNum}</span>
            </div>

            {/* Stacked Time */}
            <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '0.9', margin: '0.4em 0' }}>
              <span style={{ fontSize: '3.1em', fontWeight: '200', color: 'white', letterSpacing: '-0.05em', fontFamily: "'Outfit', 'Inter', sans-serif" }}>{hr}</span>
              {/* Glowing horizontal divider line */}
              <div style={{ width: '2.5em', height: '1.5px', background: 'linear-gradient(90deg, transparent, #00d2ff, transparent)', margin: '0.1em 0', boxShadow: '0 0 6px #00d2ff' }} />
              <span style={{ fontSize: '3.1em', fontWeight: '200', color: 'white', letterSpacing: '-0.05em', fontFamily: "'Outfit', 'Inter', sans-serif" }}>{min}</span>
            </div>

            {/* Bottom active task or simulated steps */}
            <div style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1em' }}>
              <span style={{ fontSize: '0.68em', fontWeight: '800', color: 'white', letterSpacing: '0.05em' }}>{steps}</span>
              <span style={{ fontSize: '0.42em', fontWeight: '600', color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>steps</span>
              {activeTasks > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3em', background: 'rgba(0,210,255,0.12)', border: '1px solid rgba(0,210,255,0.2)', padding: '0.1em 0.5em', borderRadius: '20px', marginTop: '0.3em' }}>
                  <span style={{ fontSize: '0.45em', fontWeight: '800', color: '#00d2ff' }}>{activeTasks} TODO</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Style 2: Wiggles Background and Graphics */}
        {style === 'wiggles' && (
          <>
            {/* Flowing abstract neon waves */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #030303 0%, #0d0d0d 100%)', zIndex: 1 }} />
            <svg viewBox="0 0 100 260" fill="none" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 2 }}>
              <path d="M-10,30 C30,100 80,60 110,130 C70,180 30,150 -10,240" stroke="url(#orange-grad)" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.9" />
              <path d="M115,50 C80,120 20,80 -15,160 C30,210 70,180 115,250" stroke="url(#blue-grad)" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.85" />
              <defs>
                <linearGradient id="orange-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff3f0f" />
                  <stop offset="100%" stopColor="#ff9900" />
                </linearGradient>
                <linearGradient id="blue-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0055ff" />
                  <stop offset="100%" stopColor="#00d2ff" />
                </linearGradient>
              </defs>
            </svg>
            {/* Translucent overlay inside capsule to keep text perfectly legible */}
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.28)', backdropFilter: 'blur(1.5px)', zIndex: 3 }} />

            {/* Top Date Badge */}
            <div style={{ zIndex: 4, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.15)', padding: '0.2em 0.7em', borderRadius: '15px', backdropFilter: 'blur(6px)' }}>
              <span style={{ fontSize: '0.52em', fontWeight: '700', color: 'white', letterSpacing: '0.12em' }}>{month} {dateNum}</span>
            </div>

            {/* Stacked Time */}
            <div style={{ zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '0.85', margin: '0.4em 0' }}>
              <span style={{ fontSize: '3.3em', fontWeight: '900', color: 'white', letterSpacing: '-0.06em', fontFamily: "'Outfit', 'Inter', sans-serif", textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>{hr}</span>
              <span style={{ fontSize: '3.3em', fontWeight: '900', color: 'white', letterSpacing: '-0.06em', fontFamily: "'Outfit', 'Inter', sans-serif", textShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>{min}</span>
            </div>

            {/* Bottom active status / year */}
            <div style={{ zIndex: 4, background: 'rgba(255, 255, 255, 0.1)', padding: '0.2em 0.8em', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.5em', fontWeight: '600', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em' }}>{dayName}</span>
            </div>
          </>
        )}

        {/* Style 3: Eastern Sunrise Background and Graphics */}
        {style === 'eastern-sunrise' && (
          <>
            {/* Vector nature sunset background */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #446efc 0%, #769eff 65%)', zIndex: 1 }} />
            
            {/* Sun in center */}
            <div style={{ 
              position: 'absolute', 
              bottom: '26%', 
              left: '50%', 
              transform: 'translateX(-50%)', 
              width: '4.8em', 
              height: '4.8em', 
              borderRadius: '50%', 
              background: '#ff6b8b', 
              boxShadow: '0 0 18px rgba(255, 107, 139, 0.65)',
              zIndex: 2 
            }} />
            
            {/* Landscape Hills absolute-positioned */}
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '35%', fill: '#2ab45b', zIndex: 3 }}>
              <path d="M0,75 C30,45 70,85 100,55 L100,100 L0,100 Z" />
              <path d="M-10,85 C25,65 75,90 110,80 L110,100 L-10,100 Z" fill="#1b9a47" opacity="0.85" />
            </svg>

            {/* Top time */}
            <div style={{ zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: '0.85', marginTop: '0.2em' }}>
              <span style={{ fontSize: '3.1em', fontWeight: '900', color: 'white', letterSpacing: '-0.05em', fontFamily: "'Outfit', 'Inter', sans-serif" }}>{hr}</span>
              <span style={{ fontSize: '3.1em', fontWeight: '900', color: 'white', letterSpacing: '-0.05em', fontFamily: "'Outfit', 'Inter', sans-serif" }}>{min}</span>
            </div>

            {/* Bottom Month/Date Badge */}
            <div style={{ zIndex: 4, background: '#138b43', border: '1.5px solid rgba(255,255,255,0.25)', padding: '0.3em 0.8em', borderRadius: '20px', marginBottom: '0.2em', boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}>
              <span style={{ fontSize: '0.52em', fontWeight: '800', color: 'white', letterSpacing: '0.08em' }}>{month}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
