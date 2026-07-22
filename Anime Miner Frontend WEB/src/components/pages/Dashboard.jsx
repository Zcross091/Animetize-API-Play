import React, { useState } from 'react';
import { SectionHeader } from '../ui/SectionHeader';
import { Play, Clock, Bookmark, X, Trash2 } from 'lucide-react';

export const Dashboard = ({ 
  watchHistory, 
  watchlist, 
  openAnime, 
  removeFromHistory, 
  removeFromWatchlist 
}) => {
  const [activeTab, setActiveTab] = useState('history');

  return (
    <div className="pt-32 pb-20 px-10 md:px-16 container mx-auto relative z-10">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-5xl font-display font-bold text-white mb-4">Your Dashboard</h1>
          <p className="text-zinc-400 text-lg">Manage your watch history and bookmarked anime.</p>
        </div>
        <div className="flex bg-white/5 border border-white/10 rounded-full p-1 backdrop-blur-md">
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
              activeTab === 'history' 
                ? 'bg-accent text-white shadow-[0_0_20px_rgba(196,32,44,0.4)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Clock size={18} /> Watch History
          </button>
          <button 
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${
              activeTab === 'watchlist' 
                ? 'bg-accent text-white shadow-[0_0_20px_rgba(196,32,44,0.4)]' 
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bookmark size={18} /> Bookmarks
          </button>
        </div>
      </div>

      {activeTab === 'history' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <SectionHeader title="Continue Watching" />
            <span className="text-zinc-500 font-medium">{watchHistory.length} items</span>
          </div>
          
          {watchHistory.length === 0 ? (
            <div className="text-zinc-500 font-bold bg-white/5 border border-white/5 rounded-2xl p-16 text-center backdrop-blur-md">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              You haven't watched anything yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {watchHistory.map((item, idx) => (
                <div key={idx} className="group relative">
                  <div 
                    onClick={() => openAnime(item)} 
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface border border-white/10 group-hover:border-accent/50 transition-all duration-500 shadow-xl cursor-pointer"
                  >
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-85 group-hover:opacity-60 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight mb-2 drop-shadow-md">{item.title}</h3>
                      <div className="flex items-center gap-2 text-xs font-bold text-accent">
                        <Play size={12} fill="currentColor" /> Resume
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id || item.title); }}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-accent text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                    title="Remove from history"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'watchlist' && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between mb-8">
            <SectionHeader title="Your Bookmarks" />
            <span className="text-zinc-500 font-medium">{watchlist.length} items</span>
          </div>
          
          {watchlist.length === 0 ? (
            <div className="text-zinc-500 font-bold bg-white/5 border border-white/5 rounded-2xl p-16 text-center backdrop-blur-md">
              <Bookmark size={48} className="mx-auto mb-4 opacity-50" />
              Your watchlist is empty.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {watchlist.map((item, idx) => (
                <div key={idx} className="group relative">
                  <div 
                    onClick={() => openAnime(item)} 
                    className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface border border-white/10 group-hover:border-accent/50 transition-all duration-500 shadow-xl cursor-pointer"
                  >
                    <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
                      <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight drop-shadow-md">{item.title}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeFromWatchlist(item.id || item.title); }}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-accent text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 z-10"
                    title="Remove from bookmarks"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
