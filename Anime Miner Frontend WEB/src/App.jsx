import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
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
    const { data } = await supabase
      .from('anime_links')
      .select('episode')
      .in('title', [searchTitle, `${searchTitle} dub`])
      .order('episode', { ascending: false })
      .limit(1);
      
    if (data && data.length > 0) {
       const maxDbEp = data[0].episode;
       if (maxDbEp > (anime.ep_count || 0)) {
           setAvailableEpisodes(Array.from({length: maxDbEp}, (_, i) => i + 1));
       }
    }
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

  const AnimeCarouselRow = ({ title, animeList }) => {
    if (!animeList || animeList.length === 0) return null;
    return (
      <div className="content-row">
        <h2 className="row-title">{title}</h2>
        <div className="carousel-container">
          {animeList.map((anime, idx) => (
            <div className="anime-card" key={idx} onClick={() => openAnime(anime)}>
              <img src={anime.image} alt={anime.title} className="card-image" loading="lazy" />
              <div className="card-content">
                <h3 className="card-title">{anime.title}</h3>
                <div className="card-meta">
                  <span style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>★ {anime.score}</span>
                  <span>{anime.ep_count} Eps</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {!selectedAnime && (
        <>
          <header className="header">
            <div className="logo" style={{cursor: 'pointer'}} onClick={() => { setActiveTab('discover'); setSearchTerm(''); }}>Fanime</div>
            <nav className="main-nav">
              <button className={`nav-btn ${activeTab === 'discover' ? 'active' : ''}`} onClick={() => setActiveTab('discover')}>
                Home
              </button>
              <button className={`nav-btn ${activeTab === 'mylist' ? 'active' : ''}`} onClick={() => setActiveTab('mylist')}>
                My List
              </button>
            </nav>
            <div className="search-container">
              <form onSubmit={handleSearch} style={{display: 'flex', width: '100%'}}>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Search for an anime..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
            </div>
          </header>

          <main className="main-content">
            {activeTab === 'search' ? (
              <div className="content-row">
                <h2 className="row-title">Search Results for "{searchTerm}"</h2>
                {isSearching ? (
                  <div className="loading">Searching database...</div>
                ) : (
                  <div className="carousel-container" style={{flexWrap: 'wrap', gap: '1.5rem'}}>
                    {searchResults.map((anime, idx) => (
                      <div className="anime-card" key={idx} onClick={() => openAnime(anime)} style={{marginBottom: '1rem'}}>
                        <img src={anime.image} alt={anime.title} className="card-image" loading="lazy" />
                        <div className="card-content">
                          <h3 className="card-title">{anime.title}</h3>
                          <div className="card-meta">
                            <span style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>★ {anime.score}</span>
                            <span>{anime.ep_count} Eps</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'mylist' ? (
              <div className="content-row">
                <h2 className="row-title">Continue Watching</h2>
                {watchHistory.length === 0 ? (
                  <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)'}}>
                    <p>You haven't watched anything yet.</p>
                  </div>
                ) : (
                  <div className="carousel-container" style={{flexWrap: 'wrap', gap: '1.5rem'}}>
                    {watchHistory.map((item, idx) => (
                      <div key={idx} className="anime-card" onClick={() => openAnime(item)} style={{marginBottom: '1rem'}}>
                        <img src={item.image} alt={item.title} className="card-image" loading="lazy" />
                        <div className="card-content">
                          <h3 className="card-title">{item.title}</h3>
                          <div className="card-meta" style={{color: 'var(--accent-color)'}}>
                            Watched: Ep {item.lastEp} / {item.ep_count}
                          </div>
                          <div style={{marginTop: '0.8rem', width: '100%', height: '4px', background: '#333', borderRadius: '2px'}}>
                            <div style={{height: '100%', width: `${Math.min(100, (item.lastEp / item.ep_count) * 100)}%`, background: 'var(--accent-color)', borderRadius: '2px'}}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Hero Carousel */}
                {heroAnime.length > 0 && (
                  <div className="hero-carousel">
                    {heroAnime.map((anime, idx) => (
                      <div key={idx} className={`hero-slide ${idx === currentHeroIndex ? 'active' : ''}`} style={{ backgroundImage: `url(${anime.image})` }}>
                        <div className="hero-gradient"></div>
                        <div className="hero-content">
                          <h1 className="hero-title">{anime.title}</h1>
                          <p className="hero-synopsis">{anime.synopsis}</p>
                          <button className="watch-btn" onClick={() => openAnime(anime)}>
                            <span style={{fontSize: '1.5rem'}}>▶</span> WATCH NOW
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content Rows */}
                {watchHistory.length > 0 && <AnimeCarouselRow title="Continue Watching" animeList={watchHistory} />}
                <AnimeCarouselRow title="Top Airing This Season" animeList={topAiring} />
                <AnimeCarouselRow title="Epic Action & Adventure" animeList={actionAnime} />
                <AnimeCarouselRow title="Trending Romance" animeList={romanceAnime} />
              </>
            )}
          </main>
        </>
      )}

      {/* Premium Video Player Page */}
      {selectedAnime && (
        <div className="player-page">
          <div className="player-header">
            <h2>{selectedAnime.title} {activeEpisode ? `- Episode ${activeEpisode}` : ''}</h2>
            <button className="watch-btn" onClick={closePlayer} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
              ✕ Close Player
            </button>
          </div>
          
          {isPlaying ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <div className="video-wrapper">
                {isLoadingStream ? (
                  <div className="p2p-state">
                    <h3 className="loading">Connecting to Swarm...</h3>
                  </div>
                ) : streamError ? (
                  <div className="p2p-state error-state">
                    <h3>Stream Not Found</h3>
                    <p>Our miners haven't archived this episode yet. Please check back later.</p>
                  </div>
                ) : activeStreamFormat === 'torrent' ? (
                  <div className="p2p-state">
                    <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Decentralized Stream Ready</h3>
                    <p style={{marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                      To bypass browser sandbox limits and stream ultra high-quality `.mkv` files without ads or buffering, you must use a dedicated P2P client.
                    </p>
                    <a href={availableStreams['torrent']} target="_blank" rel="noopener noreferrer" className="magnet-btn">
                      ▶️ Launch WebTorrent Desktop
                    </a>
                  </div>
                ) : activeStreamFormat && activeStreamFormat.startsWith('http') ? (
                  <iframe src={availableStreams[activeStreamFormat]} allowFullScreen allow="autoplay; fullscreen" title="Anime Player"></iframe>
                ) : null}
              </div>

              {/* Server Switchers */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1rem 5%', background: 'var(--bg-color-light)' }}>
                {availableStreams['http-sub'] && (
                  <button className={`ep-btn ${activeStreamFormat === 'http-sub' ? 'active' : ''}`} onClick={() => setActiveStreamFormat('http-sub')}>
                    HTTP (Sub)
                  </button>
                )}
                {availableStreams['http-dub'] && (
                  <button className={`ep-btn ${activeStreamFormat === 'http-dub' ? 'active' : ''}`} onClick={() => setActiveStreamFormat('http-dub')}>
                    HTTP (Dub)
                  </button>
                )}
                {availableStreams['torrent'] && (
                  <button className={`ep-btn ${activeStreamFormat === 'torrent' ? 'active' : ''}`} onClick={() => setActiveStreamFormat('torrent')}>
                    P2P Torrent
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{display: 'flex', gap: '2rem', padding: '3rem 5%', background: 'var(--bg-color-light)'}}>
               <img src={selectedAnime.image} alt={selectedAnime.title} style={{width: '250px', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'}} />
               <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                  <h3 style={{fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)'}}>{selectedAnime.title}</h3>
                  <div style={{marginBottom: '1.5rem', fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem'}}>
                     <span style={{color: 'var(--accent-color)', fontWeight: 'bold'}}>★ {selectedAnime.score || 'N/A'}</span>
                     <span>{selectedAnime.ep_count} Episodes</span>
                  </div>
                  <p style={{color: '#ddd', fontSize: '1.1rem', lineHeight: '1.6', maxWidth: '800px', marginBottom: '2rem'}}>
                    {selectedAnime.synopsis || "Welcome to the decentralized network. Select an episode from the list below to connect to the P2P swarm and begin streaming instantly."}
                  </p>
               </div>
            </div>
          )}
          
          {availableEpisodes.length > 100 && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 5%', overflowX: 'auto', borderBottom: '1px solid #222' }}>
              {Array.from({ length: Math.ceil(availableEpisodes.length / 100) }).map((_, idx) => (
                <button 
                  key={idx}
                  className={`ep-btn ${activeEpRange === idx ? 'active' : ''}`}
                  onClick={() => setActiveEpRange(idx)}
                >
                  Eps {idx * 100 + 1}-{Math.min((idx + 1) * 100, availableEpisodes.length)}
                </button>
              ))}
            </div>
          )}
          
          <div className="episode-selector">
            {availableEpisodes.slice(activeEpRange * 100, (activeEpRange + 1) * 100).map(ep => (
              <button 
                key={ep} 
                className={`ep-btn ${ep === activeEpisode ? 'active' : ''}`}
                onClick={() => handleEpisodeChange(ep)}
              >
                Ep {ep}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
