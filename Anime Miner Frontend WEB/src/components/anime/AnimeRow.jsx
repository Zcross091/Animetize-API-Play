import React from 'react';
import { Play } from 'lucide-react';
import { BrushDivider } from '../ui/BrushDivider';
import { Seal } from '../ui/Seal';

export function AnimeRow({ title, icon, animeList, openAnime }) {
  if (!animeList || animeList.length === 0) return null;
  return (
    <section>
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
            key={idx} 
            onClick={() => openAnime(anime)}
            className="group relative flex-none cursor-pointer anime-card"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-500 shadow-xl shadow-black/60 group-hover:shadow-[0_0_24px_rgba(196,32,44,0.25)]">
              <img 
                src={anime.image} 
                alt={anime.title} 
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                <div className="bg-accent p-3 rounded-full shadow-[0_0_20px_rgba(196,32,44,0.6)] backdrop-blur-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-400">
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
                <span>{anime.ep_count} Eps</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
