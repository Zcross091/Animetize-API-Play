import React from 'react';
import { Play } from 'lucide-react';
import { BrushDivider } from '../ui/BrushDivider';
import { Seal } from '../ui/Seal';

const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22300%22%20viewBox%3D%220%200%20200%20300%22%3E%3Crect%20fill%3D%22%2317130F%22%20width%3D%22200%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%236f90a8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

export function AnimeRow({ title, icon, animeList, openAnime }) {
  if (!animeList || animeList.length === 0) return null;
  return (
    <section aria-label={title}>
      <div className="flex items-center gap-3 mb-5">
        <BrushDivider />
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl sm:text-2xl font-display font-extrabold tracking-tight text-white">{title}</h2>
        </div>
      </div>
      
      <div className="flex overflow-x-auto gap-3 pb-6 hide-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6">
        {animeList.map((anime, idx) => (
          <div 
            key={anime.title ? `${anime.title}-${idx}` : idx} 
            onClick={() => openAnime(anime)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAnime(anime);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${anime.isManga ? 'Read' : 'Watch'} ${anime.title}`}
            className="group relative flex-none cursor-pointer anime-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg glass-panel group-hover:border-accent/50 transition-all duration-500 shadow-xl shadow-black/60 group-hover:shadow-[0_0_24px_rgba(196,32,44,0.25)]">
              <img 
                src={anime.image || FALLBACK_IMAGE} 
                alt={anime.title || 'Anime Cover'} 
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  if (e.currentTarget.src !== FALLBACK_IMAGE) {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }
                }}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                <div className="glass-panel-accent p-3 rounded-full transform translate-y-4 group-hover:translate-y-0 transition-all duration-400">
                  <Play size={18} fill="white" className="ml-0.5" />
                </div>
              </div>
            </div>

            <div className="mt-2 px-0.5">
              <h3 className="text-[12px] sm:text-[13px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                {anime.title}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 text-[11px] font-bold text-zinc-500">
                <Seal score={anime.score} />
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>{anime.ep_count} {anime.isManga ? 'Chps' : 'Eps'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
