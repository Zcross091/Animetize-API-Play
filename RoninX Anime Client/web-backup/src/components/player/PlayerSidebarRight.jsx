import React, { useState, useEffect } from 'react';
import { Seal } from '../ui/Seal';



export function PlayerSidebarRight({
  selectedAnime,
  isInWatchlist,
  toggleWatchlist,
  nextAiringEpisode,
}) {
  return (
    <div className="player-sidebar-right">
      <img src={selectedAnime.image} alt={selectedAnime.title} className="sidebar-right-cover" />
      <h3 className="sidebar-right-title">{selectedAnime.title}</h3>
      
      <div className="sidebar-right-meta">
        <span className="sidebar-right-badge">HD</span>
        <span className="sidebar-right-badge pink">Ep {selectedAnime.ep_count}</span>
        <span className="sidebar-right-badge">TV</span>
        <span className="flex items-center gap-1"><Seal score={selectedAnime.score || 'N/A'} /></span>
      </div>
      

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
