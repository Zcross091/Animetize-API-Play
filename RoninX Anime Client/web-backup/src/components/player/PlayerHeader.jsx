import React from 'react';

export function PlayerHeader({ selectedAnime, activeEpisode, theaterMode, setTheaterMode, closePlayer }) {
  if (!selectedAnime) return null;

  return (
    <div className="player-header">
      <h2>{selectedAnime.title}{activeEpisode ? <span className="text-accent"> · Ep {activeEpisode}</span> : ''}</h2>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTheaterMode(t => !t)}
          title={theaterMode ? 'Exit Theater' : 'Theater Mode'}
          className="border-none cursor-pointer text-zinc-400 hover:text-white transition-colors bg-transparent px-2 py-1 rounded"
          style={{fontSize:'1.1rem'}}
        >
          {theaterMode ? '⊡' : '⛶'}
        </button>
        <button className="bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition-colors border-none cursor-pointer" onClick={closePlayer}>
          ✕ Close
        </button>
      </div>
    </div>
  );
}
