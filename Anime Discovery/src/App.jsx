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

  // Example trending anime for the initial view
  const trendingAnime = [
    { title: "One Piece", image: "https://cdn.myanimelist.net/images/anime/6/73245l.jpg", ep_count: 1143 },
    { title: "Solo Leveling", image: "https://cdn.myanimelist.net/images/anime/1105/138421l.jpg", ep_count: 12 },
    { title: "Jujutsu Kaisen", image: "https://cdn.myanimelist.net/images/anime/1171/109222l.jpg", ep_count: 47 },
    { title: "Attack on Titan", image: "https://cdn.myanimelist.net/images/anime/10/47347l.jpg", ep_count: 89 }
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      // Using Jikan API for metadata search
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=8`);
      const data = await res.json();
      
      const mappedResults = data.data.map(anime => ({
        title: anime.title_english || anime.title,
        image: anime.images.jpg.large_image_url,
        ep_count: anime.episodes || 12,
        score: anime.score
      }));
      
      setSearchResults(mappedResults);
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
    
    // Default to Jikan's count immediately for responsive UI
    let baseEps = Array.from({length: anime.ep_count || 12}, (_, i) => i + 1);
    setAvailableEpisodes(baseEps);
    
    // Query our own database to strictly match this anime (and its dub)
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
    
    // Save to Local Storage (Continue Watching)
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
      
      let formats = {
        'http-sub': null,
        'http-dub': null,
        'torrent': null
      };

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
    <div className="app-container">
      {!selectedAnime && (
        <>
          <header className="header">
        <div className="logo" style={{cursor: 'pointer'}} onClick={() => setActiveTab('discover')}>Fanime</div>
        <nav className="main-nav">
          <button 
            className={`nav-btn ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            Discover
          </button>
          <button 
            className={`nav-btn ${activeTab === 'mylist' ? 'active' : ''}`}
            onClick={() => setActiveTab('mylist')}
          >
            My List
          </button>
        </nav>
      </header>

      <main className="main-content">
        {activeTab === 'discover' ? (
          <>
            <section className="hero">
              <h1>Discover & Stream <br/><span style={{color: 'var(--accent-color)'}}>True P2P Anime</span></h1>
          <p>The ultimate decentralized network. Access tens of thousands of anime directly through peer-to-peer magnet streams and high-speed offshore nodes.</p>
          
          <div className="search-container">
            <form onSubmit={handleSearch}>
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search for an anime (e.g., One Piece)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="search-button">Search</button>
            </form>
          </div>
        </section>

        <section className="results-section">
          {isSearching ? (
            <div className="loading">Connecting to nodes...</div>
          ) : searchResults.length > 0 ? (
            <div className="results-grid">
              {searchResults.map((anime, idx) => (
                <div className="anime-card" key={idx} onClick={() => openAnime(anime)}>
                  <img src={anime.image} alt={anime.title} className="card-image" />
                  <div className="card-content">
                    <h3 className="card-title">{anime.title}</h3>
                    <div className="card-meta">
                      <span className="badge">TV</span>
                      <span>★ {anime.score || 'N/A'}</span>
                      <span>{anime.ep_count} Episodes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <h2 style={{marginTop: '2rem', marginBottom: '1rem'}}>Trending Now</h2>
              <div className="results-grid">
                {trendingAnime.map((anime, idx) => (
                  <div className="anime-card" key={idx} onClick={() => openAnime(anime)}>
                    <img src={anime.image} alt={anime.title} className="card-image" />
                    <div className="card-content">
                      <h3 className="card-title">{anime.title}</h3>
                      <div className="card-meta">
                        <span className="badge">TV</span>
                        <span>{anime.ep_count} Episodes</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
          </>
        ) : (
          <section className="mylist-section">
            <h2 className="section-title">Continue Watching</h2>
            {watchHistory.length === 0 ? (
              <div style={{textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)'}}>
                <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🍿</div>
                <p>You haven't watched anything yet.</p>
                <button 
                  className="magnet-btn" 
                  style={{marginTop: '1rem', padding: '0.8rem 2rem'}}
                  onClick={() => setActiveTab('discover')}
                >
                  Discover Anime
                </button>
              </div>
            ) : (
              <div className="anime-grid">
                {watchHistory.map((item, idx) => (
                  <div key={idx} className="anime-card" onClick={() => openAnime(item)}>
                    <img src={item.image} alt={item.title} className="card-image" />
                    <div className="card-content">
                      <h3 className="card-title">{item.title}</h3>
                      <div className="card-meta">
                        <span className="ep-count">Watched: Ep {item.lastEp} / {item.ep_count}</span>
                      </div>
                      <div style={{marginTop: '1rem', width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px'}}>
                        <div style={{height: '100%', width: `${Math.min(100, (item.lastEp / item.ep_count) * 100)}%`, background: 'var(--accent-color)', borderRadius: '2px'}}></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
        </>
      )}

      {/* Premium Video Player Page */}
      {selectedAnime && (
        <div className="player-page">
          <div className="player-header">
            <button className="nav-btn active" onClick={closePlayer} style={{ background: 'var(--accent-color)', color: '#fff' }}>
              ← Back to Discover
            </button>
            <h2>{selectedAnime.title} {activeEpisode ? `- Episode ${activeEpisode}` : ''}</h2>
          </div>
          
          {isPlaying ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="video-wrapper">
                {isLoadingStream ? (
                  <div className="p2p-state">
                    <h3 className="loading">Decrypting nodes...</h3>
                  </div>
                ) : streamError ? (
                  <div className="p2p-state error-state">
                    <div className="p2p-icon">⚠️</div>
                    <h3>Stream Not Found</h3>
                    <p>Our miners haven't archived this episode yet. Please check back later.</p>
                  </div>
                ) : activeStreamFormat === 'torrent' ? (
                  <div className="p2p-state" style={{maxWidth: '600px', margin: '0 auto', padding: '1rem 2rem'}}>
                  <div className="p2p-icon" style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>⚡</div>
                  <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Decentralized Stream Ready</h3>
                  <p style={{marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.4'}}>
                    To bypass browser sandbox limits and stream ultra high-quality `.mkv` files without ads or buffering, you must use a dedicated P2P client.
                  </p>
                  
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center'}}>
                    <a 
                      href={availableStreams['torrent']} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="magnet-btn"
                      style={{width: '100%', padding: '0.8rem', fontSize: '1.1rem', fontWeight: 'bold'}}
                    >
                      ▶️ Launch WebTorrent
                    </a>
                    
                    <button 
                      className="magnet-btn" 
                      style={{background: 'rgba(255,255,255,0.05)', boxShadow: 'none', width: '100%', padding: '0.6rem', fontSize: '0.9rem'}}
                      onClick={() => {
                        navigator.clipboard.writeText(availableStreams['torrent']);
                        alert("Magnet link copied! You can paste this directly into WebTorrent Desktop.");
                      }}
                    >
                      📋 Copy Magnet Link
                    </button>
                  </div>
                  
                  <div style={{marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,100,100,0.05)', borderRadius: '8px', border: '1px solid rgba(255,100,100,0.1)', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{fontSize: '1.5rem'}}>⚠️</div>
                    <div style={{textAlign: 'left'}}>
                      <h4 style={{color: '#ff6b6b', margin: 0, fontSize: '0.9rem'}}>Nothing happened?</h4>
                      <p style={{margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                        You need <a href="https://webtorrent.io/desktop/" target="_blank" rel="noopener noreferrer" style={{color: '#fff', textDecoration: 'underline'}}>WebTorrent Desktop</a> to stream instantly.
                      </p>
                    </div>
                  </div>
                </div>
                ) : activeStreamFormat && activeStreamFormat.startsWith('http') ? (
                  <>
                    <iframe src={availableStreams[activeStreamFormat]} allowFullScreen allow="autoplay; fullscreen" title="Anime Player" style={{ width: '100%', height: '100%', border: 'none' }}></iframe>
                  </>
                ) : null}
              </div>

              {/* Server Switchers & Download Button row below video */}
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(20,20,20,0.8)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {availableStreams['http-sub'] && (
                  <button 
                    className={`ep-btn ${activeStreamFormat === 'http-sub' ? 'active' : ''}`}
                    onClick={() => setActiveStreamFormat('http-sub')}
                  >
                    HTTP (Sub)
                  </button>
                )}
                {availableStreams['http-dub'] && (
                  <button 
                    className={`ep-btn ${activeStreamFormat === 'http-dub' ? 'active' : ''}`}
                    onClick={() => setActiveStreamFormat('http-dub')}
                  >
                    HTTP (Dub)
                  </button>
                )}
                {availableStreams['torrent'] && (
                  <button 
                    className={`ep-btn ${activeStreamFormat === 'torrent' ? 'active' : ''}`}
                    onClick={() => setActiveStreamFormat('torrent')}
                  >
                    P2P Torrent
                  </button>
                )}
                
                <div style={{ flex: 1 }}></div>
                
                {availableStreams['torrent'] && (
                  <a href={availableStreams['torrent']} target="_blank" rel="noopener noreferrer" className="magnet-btn" style={{fontSize: '0.9rem', padding: '0.8rem 1.5rem', width: 'auto', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', textDecoration: 'none'}}>
                    ⬇️ DL Torrent
                  </a>
                )}
              </div>
            </div>
            ) : (
              <div style={{display: 'flex', gap: '2rem', padding: '2rem', background: '#0a0a0a'}}>
                 <img src={selectedAnime.image} alt={selectedAnime.title} style={{width: '200px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'}} />
                 <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
                    <h3 style={{fontSize: '2rem', marginBottom: '1rem'}}>{selectedAnime.title}</h3>
                    <div className="card-meta" style={{marginBottom: '1.5rem', fontSize: '1rem'}}>
                       <span className="badge">TV</span>
                       <span>★ {selectedAnime.score || 'N/A'}</span>
                       <span>{selectedAnime.ep_count} Episodes</span>
                    </div>
                    <p style={{color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.6', maxWidth: '500px'}}>
                      Welcome to the decentralized network. Select an episode from the list below to connect to the P2P swarm and begin streaming instantly.
                    </p>
                 </div>
              </div>
            )}
            
            
            {availableEpisodes.length > 100 && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem 2rem', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {Array.from({ length: Math.ceil(availableEpisodes.length / 100) }).map((_, idx) => (
                  <button 
                    key={idx}
                    className={`ep-btn ${activeEpRange === idx ? 'active' : ''}`}
                    style={{ minWidth: 'fit-content', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
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
