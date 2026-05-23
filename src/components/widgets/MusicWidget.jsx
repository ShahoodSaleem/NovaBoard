import React, { useEffect, useRef, useState, useCallback } from 'react';
import { spotifyService } from '../../services/spotifyService';
import { useWidgetStore } from '../../store/useWidgetStore';

const fmt = (ms) => {
  if (!ms || isNaN(ms)) return '0:00';
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/* ── Equalizer bars animation ── */
const Equalizer = ({ playing }) => (
  <div className={`eq-bars ${playing ? 'eq-playing' : ''}`}>
    {[1, 2, 3, 4].map((i) => <span key={i} className={`eq-bar eq-bar-${i}`} />)}
  </div>
);

/* ── Connect screen ── */
const ConnectScreen = ({ onConnect, isConnecting, error, clientId, onClientIdChange, onSave }) => (
  <div className="music-connect-screen">
    <div className="music-brand-icon">
      <svg viewBox="0 0 168 168" fill="none">
        <circle cx="84" cy="84" r="84" fill="#1DB954"/>
        <path d="M120.8 117.4c-1.6 2.6-5 3.4-7.6 1.7-20.8-12.7-47-15.6-77.8-8.5-3 .7-6-1.2-6.7-4.2-.7-3 1.2-6 4.2-6.7 33.7-7.7 62.6-4.4 86 9.7 2.6 1.6 3.4 5 1.7 7.6zm10.2-22.7c-2 3.3-6.3 4.3-9.6 2.3-23.8-14.6-60-18.8-88.2-10.3-3.6 1.1-7.5-1-8.5-4.6-1.1-3.6 1-7.5 4.6-8.5 32.2-9.7 72.2-5 99.4 11.5 3.3 2 4.3 6.3 2.3 9.6zm.9-23.6C101.3 54.7 55.9 53 29 61.1c-4.3 1.3-8.9-1.1-10.2-5.4-1.3-4.3 1.1-8.9 5.4-10.2 30.6-9.3 81.4-7.5 113.6 11.5 3.9 2.3 5.2 7.3 2.9 11.2-2.3 3.9-7.3 5.2-11.2 2.9z" fill="white"/>
      </svg>
    </div>
    <p className="music-connect-title">Connect to Spotify</p>
    <p className="music-connect-sub">Enter your Spotify App Client ID to control playback</p>

    <div className="music-client-id-row">
      <input
        type="text"
        className="music-client-input"
        placeholder="Spotify Client ID…"
        value={clientId}
        onChange={(e) => onClientIdChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
      />
      <button className="music-save-btn" onClick={onSave} title="Save">✓</button>
    </div>

    <button
      className="music-connect-btn spotify-btn"
      onClick={onConnect}
      disabled={isConnecting || !clientId}
    >
      {isConnecting ? (
        <span className="music-spinner" />
      ) : (
        <>
          <svg viewBox="0 0 24 24" fill="currentColor" className="music-btn-icon">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.65 14.46c-.2.32-.63.42-.95.21-2.6-1.59-5.87-1.95-9.73-1.07-.37.09-.74-.14-.83-.51-.09-.37.14-.74.51-.83 4.22-.96 7.84-.55 10.77 1.24.32.2.42.63.21.95zm1.27-2.83c-.24.4-.77.52-1.17.28-2.98-1.83-7.51-2.36-11.03-1.29-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 4.02-1.22 9.01-.63 12.42 1.47.4.24.52.77.28 1.17zm.11-2.95C14.71 8.63 9.36 8.46 6.29 9.4c-.55.17-1.13-.14-1.29-.69-.17-.55.14-1.13.69-1.29 3.57-1.08 9.5-.87 13.25 1.44.5.3.66.95.37 1.44-.3.5-.95.66-1.44.37z"/>
          </svg>
          Connect Spotify
        </>
      )}
    </button>

    <button
      className="music-connect-btn youtube-btn"
      onClick={() => { if (typeof chrome !== 'undefined' && chrome.tabs) { chrome.tabs.create({ url: 'https://music.youtube.com' }); } else { window.open('https://music.youtube.com', '_blank'); } }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="music-btn-icon">
        <path d="M21.58 7.19c-.23-.86-.9-1.54-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42c-.86.23-1.53.91-1.76 1.77C2 8.76 2 12 2 12s0 3.24.42 4.81c.23.86.9 1.54 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42c.86-.23 1.53-.91 1.76-1.77C22 15.24 22 12 22 12s0-3.24-.42-4.81zM10 15V9l5.2 3-5.2 3z"/>
      </svg>
      Open YouTube Music
    </button>

    {error && <p className="music-error">{error}</p>}
    <p className="music-help-link">
      <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
        Get a Client ID at developer.spotify.com →
      </a>
    </p>
  </div>
);

/* ── Player screen ── */
const PlayerScreen = ({
  track,
  isPlaying,
  progress,
  duration,
  volume,
  onPlay,
  onNext,
  onPrev,
  onVolumeChange,
  onMuteToggle,
  onDisconnect
}) => {
  const albumArt = track?.album?.images?.[0]?.url;
  const trackName = track?.name || 'Unknown Track';
  const artistName = track?.artists?.map((a) => a.name).join(', ') || 'Unknown Artist';
  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="music-player-screen-new">
      {/* Blurred album art background (visionOS-like feel behind the glass container) */}
      {albumArt && (
        <div className="music-bg-blur" style={{ backgroundImage: `url(${albumArt})` }} />
      )}
      
      {/* Container layout split in two columns */}
      <div className="music-layout-columns">
        
        {/* LEFT COLUMN: Cover Art */}
        <div className="music-left-col">
          {albumArt ? (
            <img src={albumArt} alt="Album Art" className="music-cover-art-new" />
          ) : (
            <div className="music-cover-placeholder-new">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            </div>
          )}
          <Equalizer playing={isPlaying} />
        </div>

        {/* RIGHT COLUMN: Metadata & Controls */}
        <div className="music-right-col">
          {/* Header Row: Apple/Spotify styled Logo + Meta Info + Logout Button */}
          <div className="music-meta-container">
            <div className="music-brand-and-title">
              {/* Apple Icon */}
              <svg className="music-apple-logo" viewBox="0 0 170 170" fill="currentColor">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.92-14.34-6.12-3.8-3.08-7.8-7.91-12-14.51-6.7-10.74-12.03-23.75-16-39.04-3.97-15.29-5.96-29.35-5.96-42.18 0-14.75 3.86-26.88 11.6-36.4 7.73-9.51 17.5-14.36 29.28-14.53 5.48 0 11.29 1.48 17.44 4.43 6.14 2.95 10.3 4.43 12.48 4.43 1.9 0 5.86-1.39 11.89-4.18 7.42-3.4 13.91-4.94 19.46-4.63 15.18.9 26.65 6.64 34.42 17.22-11.97 7.27-17.8 17.15-17.5 29.62.3 9.97 4.13 18.23 11.5 24.8 7.37 6.57 16.1 10.15 26.19 10.74-1.9 6.2-4.48 12.4-7.73 18.6zm-26.01-114.7c0-7.86 2.82-15.15 8.45-21.87 6.84-8.13 15.29-12.79 25.32-13.68.17 1 .25 1.95.25 2.84 0 7.55-2.9 14.85-8.71 21.92-6.84 8.08-15.35 12.63-25.06 13.67-.17-.89-.25-1.84-.25-2.88z"/>
              </svg>
              <div className="music-meta-text">
                <div className="music-track-title-new" title={trackName}>{trackName}</div>
                <div className="music-artist-name-new" title={artistName}>{artistName}</div>
              </div>
            </div>
            
            {/* Elegant Hover-Revealed Disconnect Power Button */}
            <button className="music-power-btn" onClick={onDisconnect} title="Disconnect Spotify">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 3h-2v10h2V3zm4.78 1.42l-1.42 1.42A7.94 7.94 0 0 1 19 12c0 4.42-3.58 8-8 8s-8-3.58-8-8c0-2.82 1.46-5.3 3.64-6.74L5.22 4.42A9.913 9.913 0 0 0 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-3.13-1.44-5.92-3.72-7.58z"/>
              </svg>
            </button>
          </div>

          {/* Progress Row (Inline Bar + Inline Times) */}
          <div className="music-progress-row-new">
            <span className="music-time-new">{fmt(progress)}</span>
            <div className="music-progress-bar-container">
              <div className="music-progress-bar-track-new">
                <div className="music-progress-bar-fill-new" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <span className="music-time-new">-{fmt(duration - progress)}</span>
          </div>

          {/* Playback Controls & Cast/Bluetooth Button */}
          <div className="music-controls-row-new">
            <div className="music-playback-buttons">
              {/* Prev */}
              <button className="music-btn-raw" onClick={onPrev} title="Previous">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6L9 12l10 6V6zM7 6h2v12H7V6z"/>
                </svg>
              </button>

              {/* Play/Pause */}
              <button className="music-btn-raw play-pause-new" onClick={onPlay} title={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Next */}
              <button className="music-btn-raw" onClick={onNext} title="Next">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 6v12l10-6L5 6zm12 0h2v12h-2V6z"/>
                </svg>
              </button>
            </div>

            {/* Cast / Bluetooth Airplay Icon */}
            <button className="music-cast-btn" title="AirPlay / Wireless Devices">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.65 14.46c-.2.32-.63.42-.95.21-2.6-1.59-5.87-1.95-9.73-1.07-.37.09-.74-.14-.83-.51-.09-.37.14-.74.51-.83 4.22-.96 7.84-.55 10.77 1.24.32.2.42.63.21.95zm1.27-2.83c-.24.4-.77.52-1.17.28-2.98-1.83-7.51-2.36-11.03-1.29-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 4.02-1.22 9.01-.63 12.42 1.47.4.24.52.77.28 1.17zm.11-2.95C14.71 8.63 9.36 8.46 6.29 9.4c-.55.17-1.13-.14-1.29-.69-.17-.55.14-1.13.69-1.29 3.57-1.08 9.5-.87 13.25 1.44.5.3.66.95.37 1.44-.3.5-.95.66-1.44.37z" style={{ fill: '#1DB954', opacity: 0.85 }} />
              </svg>
            </button>
          </div>

          {/* Volume Row with speaker icons */}
          <div className="music-volume-row-new">
            <button className="music-vol-icon-btn" onClick={onMuteToggle} title={volume === 0 ? 'Unmute' : 'Mute'}>
              {volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.63 3.63a.996.996 0 0 0 0 1.41L7.29 8.7 7 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.03a11.96 11.96 0 0 0 3.66-1.78l2.42 2.42a.996.996 0 1 0 1.41-1.41L5.05 3.63a.996.996 0 0 0-1.42 0z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                </svg>
              )}
            </button>

            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => onVolumeChange(parseInt(e.target.value))}
              className="music-volume-slider-new"
              title={`Volume: ${volume}%`}
            />

            <button className="music-vol-icon-btn louder" onClick={() => onVolumeChange(Math.min(100, volume + 10))} title="Louder">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

/* ── No track screen ── */
const NoTrackScreen = ({ onDisconnect, onLaunch }) => (
  <div className="music-no-track-new">
    <div className="music-no-track-content">
      <Equalizer playing={false} />
      <p className="music-no-track-title">Nothing playing</p>
      <p className="music-no-track-sub">Open Spotify and start a song</p>
      
      <button 
        className="music-launch-btn spotify-btn" 
        onClick={onLaunch}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#1DB954',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s',
          boxShadow: '0 4px 12px rgba(29, 185, 84, 0.3)',
          marginTop: '6px'
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '15px', height: '15px' }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.65 14.46c-.2.32-.63.42-.95.21-2.6-1.59-5.87-1.95-9.73-1.07-.37.09-.74-.14-.83-.51-.09-.37.14-.74.51-.83 4.22-.96 7.84-.55 10.77 1.24.32.2.42.63.21.95zm1.27-2.83c-.24.4-.77.52-1.17.28-2.98-1.83-7.51-2.36-11.03-1.29-.45.14-.93-.12-1.07-.57-.14-.45.12-.93.57-1.07 4.02-1.22 9.01-.63 12.42 1.47.4.24.52.77.28 1.17zm.11-2.95C14.71 8.63 9.36 8.46 6.29 9.4c-.55.17-1.13-.14-1.29-.69-.17-.55.14-1.13.69-1.29 3.57-1.08 9.5-.87 13.25 1.44.5.3.66.95.37 1.44-.3.5-.95.66-1.44.37z"/>
        </svg>
        Launch Spotify
      </button>

      <button className="music-disconnect-btn-new" onClick={onDisconnect} style={{ marginTop: '10px' }}>Disconnect Spotify</button>
    </div>
  </div>
);

/* ── Main Music Widget ── */
export const MusicWidget = () => {
  const { spotifyClientId, saveSpotifyClientId } = useWidgetStore();
  const [clientIdInput, setClientIdInput] = useState(spotifyClientId || '');
  const [isConnected, setIsConnected]   = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [track, setTrack]               = useState(null);
  const [isPlaying, setIsPlaying]       = useState(false);
  const [progress, setProgress]         = useState(0);
  const [duration, setDuration]         = useState(0);
  const [volume, setVolumeState]        = useState(50);
  const [prevVolume, setPrevVolume]     = useState(50);
  const [error, setError]               = useState(null);
  const pollRef    = useRef(null);
  const progressRef = useRef(null);

  // Sync input with store
  useEffect(() => { setClientIdInput(spotifyClientId || ''); }, [spotifyClientId]);

  const stopPoll = () => {
    clearInterval(pollRef.current);
    clearInterval(progressRef.current);
  };

  const handleLaunchSpotify = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: 'https://open.spotify.com', active: true });
    } else {
      window.open('https://open.spotify.com', '_blank');
    }
  };

  const fetchPlayer = useCallback(async () => {
    try {
      const data = await spotifyService.getCurrentlyPlaying();
      if (data && data.item) {
        setTrack(data.item);
        setIsPlaying(data.is_playing);
        setProgress(data.progress_ms || 0);
        setDuration(data.item.duration_ms || 0);
        if (data.device && typeof data.device.volume_percent === 'number') {
          setVolumeState(data.device.volume_percent);
        }
      } else {
        // Nothing active. Check if we should auto-launch this session.
        if (!sessionStorage.getItem('spotify_launched_this_session')) {
          sessionStorage.setItem('spotify_launched_this_session', 'true');
          if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.create({ url: 'https://open.spotify.com', active: false }); // Background launch
          } else {
            window.open('https://open.spotify.com', '_blank');
          }
        }
        setTrack(null);
      }
    } catch (e) {
      if (e.message === 'Not authenticated') {
        setIsConnected(false);
        stopPoll();
      }
    }
  }, []);

  const startPoll = useCallback(() => {
    fetchPlayer();
    pollRef.current = setInterval(fetchPlayer, 6000);
    // Local progress tick
    progressRef.current = setInterval(() => {
      setIsPlaying((playing) => {
        if (playing) setProgress((p) => p + 1000);
        return playing;
      });
    }, 1000);
  }, [fetchPlayer]);

  useEffect(() => {
    spotifyService.getToken().then((token) => {
      if (token) { setIsConnected(true); startPoll(); }
    });
    return stopPoll;
  }, [startPoll]);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await spotifyService.authenticate(clientIdInput);
      setIsConnected(true);
      startPoll();
    } catch (e) {
      setError(e.message || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    stopPoll();
    await spotifyService.logout();
    setIsConnected(false);
    setTrack(null);
  };

  const handlePlay = async () => {
    try {
      if (isPlaying) { await spotifyService.pause(); setIsPlaying(false); }
      else           { await spotifyService.play();  setIsPlaying(true);  }
    } catch { setError('Playback requires Spotify Premium'); }
  };

  const handleNext = async () => {
    try { await spotifyService.next(); setTimeout(fetchPlayer, 600); } catch {}
  };

  const handlePrev = async () => {
    try { await spotifyService.previous(); setTimeout(fetchPlayer, 600); } catch {}
  };

  const handleVolumeChange = async (newVal) => {
    setVolumeState(newVal);
    try {
      await spotifyService.setVolume(newVal);
    } catch (e) {
      console.error('Failed to change volume:', e);
    }
  };

  const handleMuteToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      handleVolumeChange(0);
    } else {
      handleVolumeChange(prevVolume || 50);
    }
  };

  const handleSaveClientId = () => { saveSpotifyClientId(clientIdInput); };

  if (!isConnected) {
    return (
      <ConnectScreen
        onConnect={handleConnect}
        isConnecting={isConnecting}
        error={error}
        clientId={clientIdInput}
        onClientIdChange={setClientIdInput}
        onSave={handleSaveClientId}
      />
    );
  }

  if (!track) return <NoTrackScreen onDisconnect={handleDisconnect} onLaunch={handleLaunchSpotify} />;

  return (
    <PlayerScreen
      track={track}
      isPlaying={isPlaying}
      progress={progress}
      duration={duration}
      volume={volume}
      onPlay={handlePlay}
      onNext={handleNext}
      onPrev={handlePrev}
      onVolumeChange={handleVolumeChange}
      onMuteToggle={handleMuteToggle}
      onDisconnect={handleDisconnect}
    />
  );
};
