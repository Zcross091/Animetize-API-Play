import React, { useState, useEffect } from 'react';
import { Seal } from '../ui/Seal';

export function PlayerSidebarRight({
  selectedAnime,
  isInWatchlist,
  toggleWatchlist,
  nextAiringEpisode,
}) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!nextAiringEpisode || !nextAiringEpisode.airingAt) return;
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = nextAiringEpisode.airingAt - now;

      if (diff <= 0) {
        setTimeLeft('Airing Soon');
        return;
      }

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);

      setTimeLeft(parts.join(' '));
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [nextAiringEpisode]);

  return (
    <div className="player-sidebar-right">
      <img src={selectedAnime.image} alt={selectedAnime.title} className="sidebar-right-cover" />
      <h3 className="sidebar-right-title">{selectedAnime.title}</h3>
      
      <div className="sidebar-right-meta flex flex-wrap gap-1.5 items-center my-2">
        <span className="sidebar-right-badge">HD</span>
        <span className="sidebar-right-badge pink">Ep {selectedAnime.ep_count || '?'}</span>
        <span className="sidebar-right-badge">{selectedAnime.type || selectedAnime.format || 'TV'}</span>
        {selectedAnime.score && selectedAnime.score !== 'N/A' && (
          <span className="flex items-center gap-1"><Seal score={selectedAnime.score} /></span>
        )}
      </div>

      {nextAiringEpisode && nextAiringEpisode.airingAt && (
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 text-center my-3 shadow-[0_0_15px_rgba(196,32,44,0.1)] w-full">
          <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold mb-0.5">
            Next Ep {nextAiringEpisode.episode} Release
          </div>
          <div className="text-[14px] text-accent font-black tracking-wider uppercase">
            {timeLeft || 'Calculating...'}
          </div>
        </div>
      )}
      
      <p className="sidebar-right-synopsis">
        {selectedAnime.synopsis || 'No synopsis available.'}
      </p>
      
      <p className="sidebar-right-synopsis mt-4" style={{fontSize:'0.75rem'}}>
        Ronin Anime is the best site to watch <strong>{selectedAnime.title}</strong> SUB online, or you can even watch <strong>{selectedAnime.title}</strong> DUB in HD quality.
      </p>

      <button
        onClick={() => toggleWatchlist(selectedAnime)}
        className={`flex items-center justify-center gap-2 border font-bold text-[13px] px-4 py-3 rounded-lg cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] w-full mt-4 ${isInWatchlist(selectedAnime) ? 'bg-accent border-accent text-white shadow-[0_0_15px_rgba(196,32,44,0.3)]' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white'}`}
      >
        <span className="text-[15px] font-black">{isInWatchlist(selectedAnime) ? '✓' : '+'}</span>
        {isInWatchlist(selectedAnime) ? 'In Watchlist' : 'Add to Watchlist'}
      </button>
    </div>
  );
}
