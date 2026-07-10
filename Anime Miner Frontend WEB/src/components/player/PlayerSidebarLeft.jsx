import React from 'react';
import { List, Search, ChevronDown } from 'lucide-react';

export function PlayerSidebarLeft({
  availableEpisodes,
  activeEpisode,
  activeEpRange,
  setActiveEpRange,
  handleEpisodeChange,
}) {
  return (
    <div className="player-sidebar-left">
      <div className="sidebar-header" style={{padding: '0.8rem 0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
        {availableEpisodes.length > 100 ? (
          <div className="relative flex items-center bg-black/30 hover:bg-black/50 transition-colors rounded cursor-pointer" style={{padding: '0.3rem 0.5rem'}}>
            <List size={12} className="mr-1 opacity-70" />
            <select
              value={activeEpRange}
              onChange={e => setActiveEpRange(Number(e.target.value))}
              className="bg-transparent text-white outline-none border-none text-[11px] font-bold cursor-pointer appearance-none"
              style={{paddingRight: '1rem'}}
            >
              {Array.from({ length: Math.ceil(availableEpisodes.length / 100) }).map((_, idx) => (
                <option key={idx} value={idx} className="bg-[#2a2c31] text-white">EPS: {idx * 100 + 1}–{Math.min((idx + 1) * 100, availableEpisodes.length)}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-1 opacity-70 pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center text-[11px] font-bold bg-black/30 rounded px-2 py-1">
            <List size={12} className="mr-1 opacity-70" /> EPS: 1-{availableEpisodes.length}
          </div>
        )}
        
        <div className="relative flex items-center flex-1">
          <Search size={12} className="absolute left-2 opacity-50 pointer-events-none" />
          <input
            type="number"
            min="1"
            placeholder="Find Episode"
            className="bg-black/30 border-none rounded py-1.5 pl-6 pr-2 text-white outline-none w-full text-[11px] placeholder-white/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                handleEpisodeChange(parseInt(e.target.value));
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>

      <div className="episode-list">
        {availableEpisodes.slice(activeEpRange * 100, (activeEpRange + 1) * 100).map(ep => (
          <button
            key={ep}
            className={`ep-list-item ${ep === activeEpisode ? 'active' : ''}`}
            onClick={() => handleEpisodeChange(ep)}
          >
            <span className="ep-num">{ep}</span>
            <span>Episode {ep}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
