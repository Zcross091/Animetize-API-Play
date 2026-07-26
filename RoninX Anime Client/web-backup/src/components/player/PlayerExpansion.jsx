import React, { useState } from 'react';
import { Play, Share2, Check } from 'lucide-react';
import logoImg from '../../assets/logo.png';

export function PlayerExpansion({
  animeCharacters,
  animeRecommendations,
  openAnime,
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-[1200px] w-full mx-auto px-4 pb-20 pt-10">
      {/* Share Anime */}
      <div
        onClick={handleShare}
        className="flex items-center justify-between p-4 mb-8 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-2xl cursor-pointer group transition-all duration-300 active:scale-98 select-none"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-accent transition-transform duration-300 group-hover:rotate-12">
            <img src={logoImg} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h4 className="text-accent font-bold text-lg m-0 flex items-center gap-2">
              Share Anime
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40 group-hover:text-accent'}`}>
                {copied ? 'Copied!' : 'Click to copy'}
              </span>
            </h4>
            <p className="text-white/60 text-sm m-0">Spread the word about RONIN with your friends</p>
          </div>
        </div>
        <div className={`p-3 rounded-xl border transition-all duration-300 ${copied ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-white/60 group-hover:text-accent group-hover:border-accent/40'}`}>
          {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
        </div>
      </div>

      {/* Characters & Voice Actors */}
      {animeCharacters && animeCharacters.length > 0 && (
        <div className="mb-12">
          <h3 className="text-accent font-black text-xl mb-6">Characters & Voice Actors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {animeCharacters.map((charEdge, idx) => (
              <div key={idx} className="flex items-center justify-between bg-[#1a1b1e] p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <img src={charEdge.node.image.medium} alt={charEdge.node.name.full} className="w-12 h-12 rounded-full object-cover bg-black" />
                  <div>
                    <h5 className="text-white font-bold text-sm m-0">{charEdge.node.name.full}</h5>
                    <p className="text-white/50 text-xs m-0 capitalize">{charEdge.role.toLowerCase()}</p>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  {charEdge.voiceActors && charEdge.voiceActors.slice(0, 3).map((va, vidx) => (
                    <img key={vidx} src={va.image.medium} title={va.name.full} alt={va.name.full} className="w-10 h-10 rounded-full border-2 border-[#1a1b1e] object-cover bg-black grayscale hover:grayscale-0 transition-all cursor-pointer" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended For You */}
      {animeRecommendations && animeRecommendations.length > 0 && (
        <div className="mb-12">
          <h3 className="text-accent font-black text-xl mb-6">Recommended for you</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
            {animeRecommendations.slice(0, 12).map((rec, idx) => (
              <div key={idx} className="anime-card group cursor-pointer" onClick={() => openAnime(rec)}>
                <div className="anime-poster-wrapper relative rounded-xl overflow-hidden shadow-lg bg-black aspect-[2/3]">
                  <img src={rec.image} alt={rec.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-[0_0_20px_rgba(196,32,44,0.5)] transform scale-50 group-hover:scale-100 transition-all duration-300">
                      <Play size={24} fill="white" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 left-2 flex gap-1 flex-wrap">
                    <span className="bg-accent text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm">Ep {rec.ep_count}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="text-[13px] md:text-sm font-bold text-white/90 truncate transition-colors group-hover:text-accent">{rec.title}</h4>
                  <div className="text-[11px] text-white/50 mt-1 flex items-center gap-2">
                    TV <span className="w-1 h-1 rounded-full bg-white/20"></span> {rec.score}★
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
