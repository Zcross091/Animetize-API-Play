import React, { useState, useEffect } from 'react';
import { Loader2, Play, ChevronLeft, ChevronRight, HardDriveDownload } from 'lucide-react';

function AiringCountdown({ nextAiringEpisode }) {
  if (!nextAiringEpisode) return null;

  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = nextAiringEpisode.airingAt - now;

      if (diff <= 0) {
        setTimeLeft('Airing now / Aired');
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      if (minutes > 0 || hours > 0 || days > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setTimeLeft(parts.join(' '));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [nextAiringEpisode]);

  return (
    <div className="bg-accent/10 border border-accent/20 rounded-xl p-3.5 text-center mb-4 mt-2 font-bold shadow-[0_0_15px_rgba(196,32,44,0.05)] w-full">
      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
        Next Episode {nextAiringEpisode.episode} Releases In
      </div>
      <div className="text-[16px] text-accent font-display font-black tracking-wider uppercase animate-pulse">
        {timeLeft}
      </div>
    </div>
  );
}

export function PlayerCenter({
  isLoadingStream,
  streamError,
  activeStreamFormat,
  availableStreams,
  theaterMode,
  setTheaterMode,
  playPrevEpisode,
  playNextEpisode,
  activeEpisode,
  setActiveStreamFormat,
  relatedSeasons,
  openAnime,
  nextAiringEpisode,
  miningSourcesList = [],
  activeMiningSource,
  onSourceChange,
}) {
  return (
    <div className="player-center">
      {/* Video Box */}
      <div className="video-wrapper shadow-2xl">
        {isLoadingStream ? (
          <div className="p2p-state">
            <Loader2 size={36} className="animate-spin text-accent mb-3" />
            <h3>Connecting to Swarm...</h3>
          </div>
        ) : streamError === 'blocked' ? (
          <div className="p2p-state error-state" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' }}>
            <h3 style={{color:'var(--color-accent)', marginBottom: '0.75rem'}}>Connection Blocked</h3>
            <p style={{color:'#d4d4d8', lineHeight: '1.6', marginBottom: '1.25rem'}}>
              We couldn't connect to the database. If you are using <strong>Brave Browser</strong> or an <strong>ad blocker</strong>, it is likely blocking our secure database connection.
            </p>
            <p style={{color:'#a1a1aa', fontSize: '0.85rem'}}>
              <strong>To fix this:</strong> Turn off Brave Shields (tap the Lion icon in the address bar and switch it off) or whitelist this domain in your ad blocker.
            </p>
          </div>
        ) : streamError ? (
          <div className="p2p-state error-state">
            <h3 style={{color:'var(--color-accent)'}}>Extracting Episode...</h3>
            <p>Our miners have been deployed. Check back in a few minutes.</p>
          </div>
        ) : activeStreamFormat === 'torrent' ? (
          <div className="p2p-state">
            <h3>Decentralized Stream Ready</h3>
            <p style={{color:'#a1a1aa',maxWidth:'480px',margin:'0.5rem 0 1rem'}}>Use a P2P client to stream ad-free high-quality video.</p>
            <a href={availableStreams['torrent']} target="_blank" rel="noopener noreferrer" className="magnet-btn flex items-center gap-2">
              <Play size={18} fill="white" /> Launch WebTorrent
            </a>
          </div>
        ) : activeStreamFormat && availableStreams[activeStreamFormat]?.startsWith('http') ? (
          <iframe src={availableStreams[activeStreamFormat]} allowFullScreen allow="autoplay; fullscreen" title="Anime Player" />
        ) : (
          // Not playing yet — show placeholder
          <div className="p2p-state">
            <h3 style={{color:'#fff'}}>Select an episode to begin streaming.</h3>
          </div>
        )}
      </div>

      {/* Player Controls Bar */}
      <div className="player-controls-bar">
        <div className="controls-left">
          <button className="control-toggle" onClick={() => setTheaterMode(t => !t)}>
            {theaterMode ? '⊡' : '⛶'} <span>{theaterMode ? 'Collapse' : 'Expand'}</span>
          </button>
          <button className="control-toggle">
            💡 <span>Light</span> On
          </button>
        </div>
        <div className="controls-right flex">
          <button className="control-toggle">
            Auto Play <span style={{color: 'var(--color-accent)'}}>Off</span>
          </button>
          <button className="control-toggle">
            Auto Next <span style={{color: 'var(--color-accent)'}}>Off</span>
          </button>
          <button className="control-toggle">
            Auto Skip Intro <span style={{color: 'var(--color-accent)'}}>Off</span>
          </button>
          <div className="flex items-center gap-2 ml-4">
            <button onClick={playPrevEpisode} className="bg-transparent border-none text-white cursor-pointer hover:text-accent p-1"><ChevronLeft size={18} /></button>
            <button onClick={playNextEpisode} className="bg-transparent border-none text-white cursor-pointer hover:text-accent p-1"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      {/* Airing Countdown Banner */}
      <AiringCountdown nextAiringEpisode={nextAiringEpisode} />

      {/* Server Switcher Panel */}
      {Object.keys(availableStreams).length > 0 && (
        <div className="server-switcher-panel">
          <div className="server-switcher-left">
            <p>You are watching</p>
            <h4>Episode {activeEpisode}</h4>
            <p style={{marginTop:'0.5rem'}}>If current server doesn't work please try other servers.</p>
          </div>
          <div className="server-switcher-right">
            
            <div className="server-group">
              <div className="server-group-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HardDriveDownload size={14} /> Source
              </div>
              <div className="server-buttons" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select 
                  className="bg-black/30 border border-white/10 rounded px-3 py-1.5 text-white text-[13px] font-bold outline-none cursor-pointer"
                  value={activeMiningSource || ''}
                  onChange={(e) => onSourceChange(e.target.value)}
                >
                  <option value="" disabled>Select Server...</option>
                  {activeMiningSource === 'Cached' && (
                    <option value="Cached" className="bg-[#1a1b1e]">
                      Main Server
                    </option>
                  )}
                  {miningSourcesList.map((source, index) => (
                    <option key={source} value={source} className="bg-[#1a1b1e]">
                      Server {index + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Show P2P Separately if available */}
            {availableStreams['torrent'] && (
               <div className="server-group">
                 <div className="server-group-label">
                   <HardDriveDownload size={14} /> P2P
                 </div>
                 <div className="server-buttons">
                   <button
                     className={`server-btn text-accent border border-accent/30 ${activeStreamFormat === 'torrent' ? 'active' : ''}`}
                     onClick={() => setActiveStreamFormat('torrent')}
                   >
                     Decentralized Torrents
                   </button>
                 </div>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Seasons & Related Dropdown */}
      {relatedSeasons.length > 0 && (
        <div className="server-switcher-panel" style={{marginTop:0}}>
          <div className="server-switcher-right">
            <div className="server-group">
              <div className="server-group-label">Related</div>
              <div className="server-buttons">
                {relatedSeasons.map((season, idx) => (
                  <button
                    key={idx}
                    className="server-btn text-[11px]"
                    onClick={() => openAnime(season)}
                  >
                    {season.relation}: {season.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
