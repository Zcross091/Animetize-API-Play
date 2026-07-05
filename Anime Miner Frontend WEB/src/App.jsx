import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Play, Search, User, Menu, Loader2, HardDriveDownload, Sparkles, Flame, Clock, Trophy, Grid } from 'lucide-react';
import './index.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [activeEpisode, setActiveEpisode] = useState(1);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isIframe, setIsIframe] = useState(false);
  const [isLoadingStream, setIsLoadingStream] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [isMagnet, setIsMagnet] = useState(false);
  const [downloadMagnetUrl, setDownloadMagnetUrl] = useState(null);
  const [availableEpisodes, setAvailableEpisodes] = useState([]);
  const [activeEpRange, setActiveEpRange] = useState(0);
  
  const [availableStreams, setAvailableStreams] = useState({});
  const [activeStreamFormat, setActiveStreamFormat] = useState(null);
  
  const [activeTab, setActiveTab] = useState('discover');
  const [watchHistory, setWatchHistory] = useState(() => {
    const saved = localStorage.getItem('animeWatchHistory');
    return saved ? JSON.parse(saved) : [];
  });

  // Crunchyroll Redesign Data States
  const [heroAnime, setHeroAnime] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [topAiring, setTopAiring] = useState([]);
  const [actionAnime, setActionAnime] = useState([]);
  const [romanceAnime, setRomanceAnime] = useState([]);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Auto-rotate Hero Carousel
    if (heroAnime.length > 0 && !selectedAnime) {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroAnime.length);
      }, 7000); // 7 seconds
      return () => clearInterval(interval);
    }
  }, [heroAnime, selectedAnime]);

  useEffect(() => {
    // Fetch Data on Mount
    const fetchHomeData = async () => {
      try {
        // Fetch Top Airing for Hero & First Row
        const airingRes = await fetch('https://api.jikan.moe/v4/seasons/now?limit=15');
        const airingData = await airingRes.json();
        const mappedAiring = airingData.data.map(mapJikanAnime);
        setHeroAnime(mappedAiring.slice(0, 5));
        setTopAiring(mappedAiring.slice(5));

        // Delay to avoid Jikan rate limits (3 requests per second)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch Top Action (Genre ID 1)
        const actionRes = await fetch('https://api.jikan.moe/v4/anime?genres=1&order_by=popularity&sort=asc&limit=15');
        const actionData = await actionRes.json();
        setActionAnime(actionData.data.map(mapJikanAnime));

        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch Top Romance (Genre ID 22)
        const romanceRes = await fetch('https://api.jikan.moe/v4/anime?genres=22&order_by=popularity&sort=asc&limit=15');
        const romanceData = await romanceRes.json();
        setRomanceAnime(romanceData.data.map(mapJikanAnime));

      } catch (e) {
        console.error("Failed to fetch home data", e);
      }
    };
    fetchHomeData();
  }, []);

  const mapJikanAnime = (anime) => ({
    title: anime.title_english || anime.title,
    image: anime.images.jpg.large_image_url,
    ep_count: anime.episodes || 12,
    score: anime.score || 'N/A',
    synopsis: anime.synopsis || 'No synopsis available.'
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setActiveTab('search');
    
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=15`);
      const data = await res.json();
      setSearchResults(data.data.map(mapJikanAnime));
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const openAnime = async (anime) => {
    setSelectedAnime(anime);
    setIsPlaying(false);
    setActiveEpisode(null);
    setActiveEpRange(0);
    
    let baseEps = Array.from({length: anime.ep_count || 12}, (_, i) => i + 1);
    setAvailableEpisodes(baseEps);
    
    const searchTitle = anime.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    
    // Fetch from AniList for accurate ongoing episode counts
    let anilistEpCount = 0;
    try {
        const aniRes = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: '{ Media(search: "' + anime.title.replace(/"/g, '\\"') + '", type: ANIME) { episodes nextAiringEpisode { episode } } }'
            })
        });
        const aniData = await aniRes.json();
        const media = aniData?.data?.Media;
        if (media) {
            anilistEpCount = media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : 0);
        }
    } catch (e) {
        console.error("AniList fetch failed", e);
    }

    // Fetch from Supabase
    const { data } = await supabase
      .from('anime_links')
      .select('episode')
      .in('title', [searchTitle, `${searchTitle} dub`])
      .order('episode', { ascending: false })
      .limit(1);
      
    let maxDbEp = 0;
    if (data && data.length > 0) {
       maxDbEp = data[0].episode;
    }

    const ultimateEps = Math.max(anime.ep_count === '?' ? 0 : (anime.ep_count || 12), anilistEpCount, maxDbEp);
    
    setAvailableEpisodes(Array.from({length: ultimateEps}, (_, i) => i + 1));
    setSelectedAnime(prev => ({ ...prev, ep_count: ultimateEps }));
  };

  const closePlayer = () => {
    setSelectedAnime(null);
    setIsPlaying(false);
    setActiveEpisode(null);
    setStreamUrl(null);
    setStreamError(false);
    setIsMagnet(false);
    setDownloadMagnetUrl(null);
    setAvailableStreams({});
    setActiveStreamFormat(null);
  };

  const handleEpisodeChange = (ep) => {
    setActiveEpisode(ep);
    setIsPlaying(true);
    
    const newEntry = {
      title: selectedAnime.title,
      image: selectedAnime.image,
      ep_count: selectedAnime.ep_count,
      lastEp: ep,
      timestamp: Date.now()
    };
    
    setWatchHistory(prev => {
      const filtered = prev.filter(item => item.title !== selectedAnime.title);
      const updated = [newEntry, ...filtered];
      localStorage.setItem('animeWatchHistory', JSON.stringify(updated));
      return updated;
    });

    fetchStream(selectedAnime.title, ep);
  };

  const fetchStream = async (title, epNum) => {
    setIsLoadingStream(true);
    setStreamError(false);
    setIsIframe(false);
    setIsMagnet(false);
    setStreamUrl(null);
    setDownloadMagnetUrl(null);

    try {
      const searchTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      
      const { data: dbResList, error } = await supabase
        .from('anime_links')
        .select('title, url, type')
        .in('title', [searchTitle, `${searchTitle} dub`])
        .eq('episode', parseInt(epNum));
        
      if (error || !dbResList || dbResList.length === 0) {
        throw new Error("Stream not found");
      }
      
      let formats = { 'http-sub': null, 'http-dub': null, 'torrent': null };

      for (const dbRes of dbResList) {
          if (dbRes.url.startsWith('magnet:')) {
              formats['torrent'] = dbRes.url;
          } else if (dbRes.title.endsWith(' dub')) {
              formats['http-dub'] = dbRes.url;
          } else {
              formats['http-sub'] = dbRes.url;
          }
      }

      setAvailableStreams(formats);
      
      if (formats['http-sub']) {
          setActiveStreamFormat('http-sub');
      } else if (formats['http-dub']) {
          setActiveStreamFormat('http-dub');
      } else if (formats['torrent']) {
          setActiveStreamFormat('torrent');
      } else {
          throw new Error("Unknown stream type");
      }
    } catch(err) {
      setStreamError(true);
    } finally {
      setIsLoadingStream(false);
    }
  };

  return (
    <div className="min-h-screen bg-base text-white pb-48 font-sans">
      {!selectedAnime && (
        <>
          {/* 1. Luxurious Frosted Glass Navbar */}
          <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-base/80 backdrop-blur-2xl border-b border-white/5 py-6' : 'bg-transparent py-10'}`}>
            <div className="container mx-auto px-10 md:px-16 flex items-center justify-between">
              <div className="flex items-center gap-14">
                <div className="text-4xl font-black text-accent tracking-tighter drop-shadow-lg cursor-pointer" onClick={() => { setActiveTab('discover'); setSearchTerm(''); }}>RONIN</div>
                <div className="hidden md:flex items-center gap-10 text-[17px] font-bold text-zinc-400">
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'discover' ? 'text-accent' : 'hover:text-white'}`} onClick={() => setActiveTab('discover')}>Home</button>
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'mylist' ? 'text-accent' : 'hover:text-white'}`} onClick={() => setActiveTab('mylist')}>My List</button>
                  <button className="bg-transparent border-none cursor-pointer hover:text-white transition-colors">Browse</button>
                  <button className="bg-transparent border-none cursor-pointer hover:text-white transition-colors">Schedule</button>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                <form onSubmit={handleSearch} className="relative hidden lg:block">
                  <input 
                    type="text" 
                    placeholder="Search for an anime..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-full py-3.5 pl-8 pr-14 text-base text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 w-96 transition-all font-medium placeholder-zinc-500"
                  />
                  <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400" />
                </form>
                <button className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border-none cursor-pointer text-white"><User size={24} /></button>
                <button className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border-none cursor-pointer text-white md:hidden"><Menu size={24} /></button>
              </div>
            </div>
          </nav>

          <main className="relative z-10">
            {activeTab === 'search' ? (
              <div className="container mx-auto px-10 md:px-16 pt-40 pb-20">
                <div className="flex items-center gap-5 mb-12">
                  <div className="w-2 h-10 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]" />
                  <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-md">Search Results for "{searchTerm}"</h2>
                </div>
                {isSearching ? (
                  <div className="text-xl text-zinc-400 animate-pulse font-bold">Searching database...</div>
                ) : (
                  <div className="flex flex-wrap gap-8">
                    {searchResults.map((anime, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => openAnime(anime)}
                        className="group relative flex-none w-[240px] sm:w-[280px] md:w-[320px] cursor-pointer mb-8"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-700 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_40px_rgba(230,52,98,0.2)]">
                          <img src={anime.image} alt={anime.title} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="bg-accent p-6 rounded-full shadow-[0_0_40px_rgba(230,52,98,0.6)] backdrop-blur-lg transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                              <Play size={32} fill="white" className="ml-1" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 px-2">
                          <h3 className="text-[18px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">{anime.title}</h3>
                          <div className="flex items-center gap-3 mt-3 text-sm font-bold text-zinc-500 tracking-wide">
                            <span className="flex items-center gap-1.5 text-accent"><span className="text-[17px] drop-shadow-[0_0_8px_var(--color-accent)]">★</span>{anime.score}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                            <span>{anime.ep_count} Eps</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'mylist' ? (
              <div className="container mx-auto px-10 md:px-16 pt-40 pb-20">
                <div className="flex items-center gap-5 mb-12">
                  <div className="w-2 h-10 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]" />
                  <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">Continue Watching</h2>
                </div>
                {watchHistory.length === 0 ? (
                  <div className="text-center py-20 text-xl text-zinc-500 font-bold">You haven't watched anything yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-8">
                    {watchHistory.map((item, idx) => (
                      <div key={idx} onClick={() => openAnime(item)} className="group relative flex-none w-[240px] sm:w-[280px] md:w-[320px] cursor-pointer mb-8">
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-700 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_40px_rgba(230,52,98,0.2)]">
                          <img src={item.image} alt={item.title} className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-700" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="bg-accent p-6 rounded-full shadow-[0_0_40px_rgba(230,52,98,0.6)] backdrop-blur-lg transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                              <Play size={32} fill="white" className="ml-1" />
                            </div>
                          </div>
                          {/* Progress Bar inside image for History */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
                              <div className="h-full bg-accent shadow-[0_0_10px_var(--color-accent)]" style={{width: `${Math.min(100, (item.lastEp / item.ep_count) * 100)}%`}}></div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 px-2">
                          <h3 className="text-[18px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">{item.title}</h3>
                          <div className="mt-3 text-sm font-bold text-accent tracking-wide drop-shadow-[0_0_5px_rgba(230,52,98,0.3)]">
                            Watched: Ep {item.lastEp} / {item.ep_count}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 2. Cinematic Hero Section */}
                {heroAnime.length > 0 && heroAnime[currentHeroIndex] && (
                  <section className="relative h-screen min-h-[800px] w-full flex items-center justify-start overflow-hidden">
                    <div className="absolute inset-0 bg-base" />
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-40 scale-105 transition-all duration-1000" 
                      style={{ backgroundImage: `url(${heroAnime[currentHeroIndex].image})` }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/80 to-transparent" />

                    <div className="relative container mx-auto px-10 md:px-16 pt-32">
                      <div className="max-w-[900px]">
                        <span className="inline-flex items-center gap-3 text-sm font-mono font-bold text-accent mb-8 tracking-[0.25em] uppercase">
                          <span className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_15px_var(--color-accent)]" />
                          AniList #1 Trending
                        </span>
                        <h1 className="text-5xl md:text-[72px] font-black leading-[0.95] tracking-tight mb-10 drop-shadow-2xl text-white line-clamp-2 md:line-clamp-3">
                          {heroAnime[currentHeroIndex].title}
                        </h1>
                        <div className="flex items-center gap-6 text-[15px] text-zinc-300 font-bold mb-8">
                          <span className="flex items-center gap-2 text-white bg-accent/90 backdrop-blur-md rounded-md px-4 py-1.5 shadow-lg shadow-accent/20">
                            ★ {heroAnime[currentHeroIndex].score}
                          </span>
                          <span>{heroAnime[currentHeroIndex].ep_count} Eps</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-zinc-400 tracking-wide">HD · SUB / DUB</span>
                        </div>
                        <p className="text-[16px] text-zinc-300 leading-[1.8] mb-12 line-clamp-3 drop-shadow-lg font-medium max-w-[800px]">
                          {heroAnime[currentHeroIndex].synopsis}
                        </p>

                        <div className="flex flex-col gap-8">
                          <div className="flex flex-wrap items-center gap-6">
                            <button
                              onClick={() => openAnime(heroAnime[currentHeroIndex])}
                              className="flex items-center justify-center gap-4 bg-accent hover:bg-accent-hover transition-all hover:scale-105 text-white font-black text-lg px-14 py-5 rounded-xl w-72 shadow-[0_0_40px_rgba(230,52,98,0.4)] border-none cursor-pointer"
                            >
                              <Play size={24} fill="white" /> WATCH NOW
                            </button>
                            <button className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors text-white font-bold text-lg px-12 py-5 rounded-xl cursor-pointer">
                              + Add to List
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* 3. Luxurious Cinematic Anime Lists */}
                <div className="container mx-auto px-10 md:px-16 -mt-20 relative z-10 space-y-40">
                  <AnimeRow title="Top Airing This Season" icon={<Flame className="text-accent" />} animeList={topAiring} openAnime={openAnime} />
                  <AnimeRow title="Epic Action & Adventure" icon={<Sparkles className="text-accent" />} animeList={actionAnime} openAnime={openAnime} />
                  <AnimeRow title="Trending Romance" icon={<Flame className="text-accent" />} animeList={romanceAnime} openAnime={openAnime} />
                  {watchHistory.length > 0 && (
                     <AnimeRow title="Continue Watching" icon={<Clock className="text-accent" />} animeList={watchHistory} openAnime={openAnime} />
                  )}
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* Premium Video Player Page (Styled to Match Theme and Interactive) */}
      {selectedAnime && (
        <div className="player-page" style={{backgroundColor: 'var(--color-base)'}}>
          <div className="player-header bg-surface border-b border-white/5">
            <h2 className="text-2xl font-bold tracking-tight">{selectedAnime.title} {activeEpisode ? <span className="text-accent">- Episode {activeEpisode}</span> : ''}</h2>
            <button className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-2 rounded-lg transition-colors border-none cursor-pointer" onClick={closePlayer}>
              ✕ Close Player
            </button>
          </div>
          
          {isPlaying ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div className="video-wrapper shadow-2xl">
                {isLoadingStream ? (
                  <div className="p2p-state">
                    <Loader2 size={48} className="animate-spin text-accent mb-4" />
                    <h3 className="text-2xl font-bold">Connecting to Swarm...</h3>
                  </div>
                ) : streamError ? (
                  <div className="p2p-state error-state">
                    <h3 className="text-2xl font-bold text-accent mb-2">Stream Not Found</h3>
                    <p className="text-zinc-400">Our miners haven't archived this episode yet. Please check back later.</p>
                  </div>
                ) : activeStreamFormat === 'torrent' ? (
                  <div className="p2p-state">
                    <h3 className="text-3xl font-black mb-4">Decentralized Stream Ready</h3>
                    <p className="text-zinc-400 mb-8 max-w-2xl leading-relaxed">
                      To bypass browser sandbox limits and stream ultra high-quality <code className="bg-white/10 px-2 py-1 rounded">.mkv</code> files without ads or buffering, you must use a dedicated P2P client.
                    </p>
                    <a href={availableStreams['torrent']} target="_blank" rel="noopener noreferrer" className="bg-accent hover:bg-accent-hover hover:scale-105 transition-all text-white font-black px-10 py-4 rounded-xl shadow-[0_0_30px_rgba(230,52,98,0.4)] no-underline flex items-center gap-3 text-lg">
                      <Play size={24} fill="white" /> Launch WebTorrent Desktop
                    </a>
                  </div>
                ) : activeStreamFormat && activeStreamFormat.startsWith('http') ? (
                  <iframe src={availableStreams[activeStreamFormat]} allowFullScreen allow="autoplay; fullscreen" title="Anime Player"></iframe>
                ) : null}
              </div>

              {/* Server Switchers */}
              <div className="flex flex-wrap items-center gap-4 py-6 px-10 bg-surface border-y border-white/5 shadow-2xl">
                <span className="text-sm text-zinc-400 font-bold uppercase tracking-[0.2em] mr-4">Extraction Servers</span>
                <div className="w-px h-6 bg-white/10 mr-2" />
                {availableStreams['http-sub'] && (
                  <button className={`ep-btn hover:-translate-y-1 ${activeStreamFormat === 'http-sub' ? 'active shadow-[0_0_15px_var(--color-accent)]' : ''}`} onClick={() => setActiveStreamFormat('http-sub')}>
                    HTTP (Sub)
                  </button>
                )}
                {availableStreams['http-dub'] && (
                  <button className={`ep-btn hover:-translate-y-1 ${activeStreamFormat === 'http-dub' ? 'active shadow-[0_0_15px_var(--color-accent)]' : ''}`} onClick={() => setActiveStreamFormat('http-dub')}>
                    HTTP (Dub)
                  </button>
                )}
                {availableStreams['torrent'] && (
                  <button className={`flex items-center gap-2 ep-btn hover:-translate-y-1 ${activeStreamFormat === 'torrent' ? 'active shadow-[0_0_15px_var(--color-accent)]' : 'text-accent border-accent/30'}`} onClick={() => setActiveStreamFormat('torrent')}>
                    <HardDriveDownload size={18} /> P2P Torrent
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-10 p-16 bg-surface">
               <img src={selectedAnime.image} alt={selectedAnime.title} className="w-[220px] h-[320px] object-cover flex-shrink-0 rounded-2xl shadow-2xl shadow-black/50" />
               <div className="flex flex-col justify-center">
                  <h3 className="text-3xl font-black mb-4 text-white drop-shadow-md">{selectedAnime.title}</h3>
                  <div className="flex items-center gap-4 mb-8 text-lg text-zinc-400 font-bold">
                     <span className="flex items-center gap-2 text-white bg-accent/20 px-3 py-1 rounded text-accent">★ {selectedAnime.score || 'N/A'}</span>
                     <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                     <span>{selectedAnime.ep_count} Episodes</span>
                  </div>
                  <p className="text-[15px] text-zinc-300 leading-[1.8] max-w-[900px] mb-10">
                    {selectedAnime.synopsis || "Welcome to the decentralized network. Select an episode from the list below to connect to the P2P swarm and begin streaming instantly."}
                  </p>
               </div>
            </div>
          )}
          
          {availableEpisodes.length > 100 && (
            <div className="flex gap-3 py-6 px-10 overflow-x-auto border-b border-white/5 bg-base">
              {Array.from({ length: Math.ceil(availableEpisodes.length / 100) }).map((_, idx) => (
                <button 
                  key={idx}
                  className={`ep-btn hover:bg-white/10 ${activeEpRange === idx ? 'active shadow-[0_0_10px_var(--color-accent)]' : ''}`}
                  onClick={() => setActiveEpRange(idx)}
                >
                  Eps {idx * 100 + 1}-{Math.min((idx + 1) * 100, availableEpisodes.length)}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex flex-wrap gap-3 py-10 px-10 bg-base items-center">
            {availableEpisodes.slice(activeEpRange * 100, (activeEpRange + 1) * 100).map(ep => (
              <button 
                key={ep} 
                className={`ep-btn hover:-translate-y-1 transition-transform ${ep === activeEpisode ? 'active shadow-[0_0_15px_var(--color-accent)] scale-110' : ''}`}
                onClick={() => handleEpisodeChange(ep)}
              >
                Ep {ep}
              </button>
            ))}
            
            <div className="ml-4 flex items-center gap-2">
              <span className="text-zinc-400 font-bold text-sm uppercase tracking-wider">Missing Ep?</span>
              <input 
                type="number" 
                min="1"
                placeholder="e.g. 1100"
                className="bg-zinc-800 text-white px-3 py-2 w-[100px] rounded border border-zinc-700 outline-none focus:border-accent text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value) {
                    handleEpisodeChange(parseInt(e.target.value));
                    e.target.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Anime Carousel Component ---
function AnimeRow({ title, icon, animeList, openAnime }) {
  if (!animeList || animeList.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-5 mb-12">
        <div className="w-2 h-10 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]" />
        <div className="flex items-center gap-4">
          {icon}
          <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-md">{title}</h2>
        </div>
      </div>
      
      <div className="flex overflow-x-auto gap-8 pb-12 hide-scrollbar -mx-10 px-10 sm:mx-0 sm:px-0">
        {animeList.map((anime, idx) => (
          <div 
            key={idx} 
            onClick={() => openAnime(anime)}
            className="group relative flex-none w-[240px] sm:w-[280px] md:w-[320px] cursor-pointer"
          >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-700 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_40px_rgba(230,52,98,0.2)]">
              <img 
                src={anime.image} 
                alt={anime.title} 
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="bg-accent p-6 rounded-full shadow-[0_0_40px_rgba(230,52,98,0.6)] backdrop-blur-lg transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                  <Play size={32} fill="white" className="ml-1" />
                </div>
              </div>
            </div>

            <div className="mt-5 px-2">
              <h3 className="text-[15px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                {anime.title}
              </h3>
              <div className="flex items-center gap-3 mt-3 text-sm font-bold text-zinc-500 tracking-wide">
                <span className="flex items-center gap-1.5 text-accent">
                  <span className="text-[17px] drop-shadow-[0_0_8px_var(--color-accent)]">★</span>
                  {anime.score}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span>{anime.ep_count} Eps</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default App;
