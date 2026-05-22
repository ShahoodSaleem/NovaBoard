import React, { useEffect, useState } from 'react';

const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const ClockWidget = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');
  const h = pad(time.getHours());
  const m = pad(time.getMinutes());
  const s = pad(time.getSeconds());

  const secDeg = time.getSeconds() * 6;
  const minDeg = time.getMinutes() * 6 + time.getSeconds() * 0.1;
  const hrDeg  = (time.getHours() % 12) * 30 + time.getMinutes() * 0.5;

  const hand = (deg, len) => ({
    x2: 50 + len * Math.cos((deg - 90) * (Math.PI / 180)),
    y2: 50 + len * Math.sin((deg - 90) * (Math.PI / 180)),
  });

  return (
    <div className="clock-widget">
      {/* Analog face */}
      <div className="clock-analog">
        <svg viewBox="0 0 100 100" className="clock-svg">
          {/* Tick marks */}
          {Array.from({ length: 60 }).map((_, i) => {
            const a = (i * 6 - 90) * (Math.PI / 180);
            const major = i % 5 === 0;
            const r1 = major ? 41 : 44;
            return (
              <line key={i}
                x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
                x2={50 + 47 * Math.cos(a)} y2={50 + 47 * Math.sin(a)}
                stroke={major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.18)'}
                strokeWidth={major ? 1.5 : 0.7}
              />
            );
          })}
          {/* Hour hand */}
          <line x1="50" y1="50" {...hand(hrDeg, 26)}
            stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          {/* Minute hand */}
          <line x1="50" y1="50" {...hand(minDeg, 35)}
            stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" strokeLinecap="round" />
          {/* Second hand */}
          <line x1="50" y1="50" {...hand(secDeg, 39)}
            stroke="var(--accent-color)" strokeWidth="1" strokeLinecap="round" />
          {/* Counter weight */}
          <line x1="50" y1="50"
            x2={50 - 10 * Math.cos((secDeg - 90) * (Math.PI / 180))}
            y2={50 - 10 * Math.sin((secDeg - 90) * (Math.PI / 180))}
            stroke="var(--accent-color)" strokeWidth="1" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2.5" fill="white" />
        </svg>
      </div>

      {/* Digital */}
      <div className="clock-digital">
        <div className="clock-time-row">
          <span className="clock-hm">{h}:{m}</span>
          <span className="clock-sec">{s}</span>
        </div>
        <div className="clock-date-row">
          {DAYS[time.getDay()]}, {MONTHS[time.getMonth()]} {time.getDate()}, {time.getFullYear()}
        </div>
      </div>
    </div>
  );
};
