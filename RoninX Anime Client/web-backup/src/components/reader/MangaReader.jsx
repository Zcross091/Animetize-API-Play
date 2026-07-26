import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2, Loader2, ArrowUp, Menu } from 'lucide-react';

export default function MangaReader({ selectedManga, closeReader, user, supabase }) {
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [isLoadingChapters, setIsLoadingChapters] = useState(true);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [error, setError] = useState(null);
  
  // Customization states
  const [zoomLevel, setZoomLevel] = useState(100); // percentage
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [scrollMode, setScrollMode] = useState(true); // vertical scroll vs single page (default scroll)
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const readerRef = useRef(null);

  // 1. Fetch Manga ID and Chapter List
  useEffect(() => {
    const resolveMangaAndChapters = async () => {
      setIsLoadingChapters(true);
      setError(null);
      try {
        // Build search variants from title, original title, synonyms
        const titleVariants = [
          selectedManga.title,
          selectedManga.originalTitle,
          ...(selectedManga.synonyms || [])
        ].filter(Boolean).map(t => t.toLowerCase().trim());

        let mangaId = null;
        let provider = 'MangaDex'; // Default provider

        // Query Supabase first
        if (supabase) {
          const { data, error } = await supabase
            .from('manga_links')
            .select('manga_id, provider')
            .in('title', titleVariants)
            .limit(1);

          if (data && data.length > 0) {
            mangaId = data[0].manga_id;
            provider = data[0].provider;
          }
        }

        // If not found in DB, trigger a search on the API
        if (!mangaId) {
          console.log("Manga mapping not found in DB, searching API directly...");
          const searchRes = await fetch(`https://ronin-api-proxy.vercel.app/manga/mangadex/${encodeURIComponent(selectedManga.title)}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.results && searchData.results.length > 0) {
              mangaId = searchData.results[0].id;
            }
          }
        }

        if (!mangaId) {
          throw new Error("Could not find this manga on MangaDex.");
        }

        // Fetch chapters info
        const infoRes = await fetch(`https://ronin-api-proxy.vercel.app/manga/${provider.toLowerCase()}/info/${mangaId}`);
        if (!infoRes.ok) {
          throw new Error(`Failed to fetch manga chapters: ${infoRes.statusText}`);
        }
        
        const infoData = await infoRes.json();
        if (infoData.chapters && infoData.chapters.length > 0) {
          // Sort chapters numerically if possible
          const sortedChapters = infoData.chapters.sort((a, b) => {
            const numA = parseFloat(a.title.replace(/[^\d.]/g, '')) || 0;
            const numB = parseFloat(b.title.replace(/[^\d.]/g, '')) || 0;
            return numB - numA; // Descending order (newest chapters first)
          });
          setChapters(sortedChapters);
          
          // Auto select first chapter (oldest or first in index)
          // Usually oldest is at the end of descending array
          setActiveChapter(sortedChapters[sortedChapters.length - 1]);
        } else {
          throw new Error("No chapters available for this manga.");
        }

      } catch (err) {
        console.error("resolveMangaAndChapters failed:", err);
        setError(err.message);
      } finally {
        setIsLoadingChapters(false);
      }
    };

    resolveMangaAndChapters();
  }, [selectedManga, supabase]);

  // 2. Fetch Pages when Active Chapter changes
  useEffect(() => {
    if (!activeChapter) return;

    const fetchPages = async () => {
      setIsLoadingPages(true);
      setPages([]);
      setError(null);
      try {
        const pagesRes = await fetch(`https://ronin-api-proxy.vercel.app/manga/mangadex/read/${activeChapter.id}`);
        if (!pagesRes.ok) {
          throw new Error("Failed to load chapter pages.");
        }
        const pagesData = await pagesRes.json();
        // Sort by page number
        const sortedPages = pagesData.sort((a, b) => a.page - b.page);
        setPages(sortedPages);

        // Scroll reader back to top
        if (readerRef.current) {
          readerRef.current.scrollTop = 0;
        }

        // Update local reading history
        saveReadHistory(activeChapter);

      } catch (err) {
        console.error("fetchPages failed:", err);
        setError(err.message);
      } finally {
        setIsLoadingPages(false);
      }
    };

    fetchPages();
  }, [activeChapter]);

  // Handle scroll detection for Scroll-To-Top button
  const handleScroll = (e) => {
    if (e.target.scrollTop > 500) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  };

  const saveReadHistory = (chapter) => {
    try {
      const history = JSON.parse(localStorage.getItem('mangaReadHistory') || '[]');
      const filtered = history.filter(item => item.mangaTitle !== selectedManga.title);
      const newEntry = {
        mangaTitle: selectedManga.title,
        image: selectedManga.image,
        chapterTitle: chapter.title,
        chapterId: chapter.id,
        timestamp: Date.now()
      };
      localStorage.setItem('mangaReadHistory', JSON.stringify([newEntry, ...filtered]));
    } catch (e) {
      console.warn("Failed to save reading history:", e);
    }
  };

  const handleNextChapter = () => {
    const currentIndex = chapters.findIndex(c => c.id === activeChapter.id);
    if (currentIndex > 0) { // Since array is sorted descending, index-1 is the NEXT chapter
      setActiveChapter(chapters[currentIndex - 1]);
    }
  };

  const handlePrevChapter = () => {
    const currentIndex = chapters.findIndex(c => c.id === activeChapter.id);
    if (currentIndex < chapters.length - 1) { // Since array is sorted descending, index+1 is the PREVIOUS chapter
      setActiveChapter(chapters[currentIndex + 1]);
    }
  };

  const changeZoom = (factor) => {
    setZoomLevel(prev => Math.min(150, Math.max(50, prev + factor)));
  };

  const hasNextChapter = chapters.findIndex(c => c.id === activeChapter?.id) > 0;
  const hasPrevChapter = activeChapter && chapters.findIndex(c => c.id === activeChapter.id) < chapters.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-[#060606] text-zinc-100 flex flex-col h-screen overflow-hidden">
      
      {/* --- 1. Top Control Bar --- */}
      <header className="h-16 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-md px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors border-none text-zinc-400 hover:text-white cursor-pointer"
            title="Toggle Chapters Sidebar"
          >
            <Menu size={20} />
          </button>
          
          <div className="truncate max-w-[200px] sm:max-w-md">
            <h1 className="text-sm font-bold text-zinc-400 truncate uppercase tracking-wider">{selectedManga.title}</h1>
            <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
              {activeChapter ? activeChapter.title : 'Loading chapter...'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
            <button 
              onClick={() => changeZoom(-10)} 
              className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white border-none cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono px-2 text-zinc-400 font-bold select-none">{zoomLevel}%</span>
            <button 
              onClick={() => changeZoom(10)} 
              className="p-1.5 hover:bg-white/10 rounded text-zinc-400 hover:text-white border-none cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={handlePrevChapter} 
              disabled={!hasPrevChapter}
              className="p-2 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-zinc-400 hover:text-white border-none cursor-pointer"
              title="Previous Chapter"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={handleNextChapter} 
              disabled={!hasNextChapter}
              className="p-2 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-zinc-400 hover:text-white border-none cursor-pointer"
              title="Next Chapter"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          <button 
            onClick={closeReader}
            className="p-2 hover:bg-accent/20 hover:text-accent rounded-lg transition-colors border-none text-zinc-400 cursor-pointer"
            title="Exit Reader"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* --- 2. Main Reader Viewport --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* --- Left Sidebar: Chapters List --- */}
        {sidebarOpen && (
          <aside className="w-80 border-r border-white/5 bg-[#090909] flex flex-col z-20 transition-transform duration-300">
            <div className="p-4 border-b border-white/5">
              <h2 className="text-xs font-black tracking-widest text-zinc-500 uppercase">Available Chapters</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {isLoadingChapters ? (
                <div className="flex flex-col items-center justify-center p-12 text-zinc-500 gap-3">
                  <Loader2 className="animate-spin text-accent" size={24} />
                  <span className="text-xs font-bold font-mono">Loading index...</span>
                </div>
              ) : error && !activeChapter ? (
                <div className="p-6 text-center text-xs text-red-500 font-bold bg-red-500/10 border border-red-500/20 m-4 rounded-xl">
                  {error}
                </div>
              ) : (
                chapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      setActiveChapter(chapter);
                      if (window.innerWidth < 768) setSidebarOpen(false); // Close on mobile
                    }}
                    className={`w-full text-left p-4 hover:bg-white/5 border-none transition-all flex items-start gap-3 cursor-pointer ${activeChapter?.id === chapter.id ? 'bg-accent/10 text-accent font-bold border-l-2 border-accent' : 'text-zinc-400'}`}
                  >
                    <BookOpen size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm font-semibold leading-snug">{chapter.title}</div>
                      {chapter.scanlator && (
                        <div className="text-[10px] text-zinc-500 font-medium font-mono mt-1 uppercase tracking-wider">{chapter.scanlator}</div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </aside>
        )}

        {/* --- Center: Image Pages Scroll Area --- */}
        <main 
          ref={readerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-[#040404] px-4 py-8 flex flex-col items-center hide-scrollbar relative"
        >
          {isLoadingPages ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 gap-4">
              <Loader2 className="animate-spin text-accent" size={40} />
              <span className="text-sm font-black font-mono tracking-widest uppercase">Fetching Chapter Pages...</span>
            </div>
          ) : error && activeChapter ? (
            <div className="max-w-md p-10 text-center bg-red-500/5 border border-red-500/10 rounded-2xl flex flex-col items-center gap-4 m-auto">
              <span className="text-red-500 text-lg font-bold">Failed to load pages</span>
              <p className="text-zinc-500 text-sm">{error}</p>
              <button 
                onClick={() => setActiveChapter({ ...activeChapter })} 
                className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-bold cursor-pointer border-none text-xs uppercase"
              >
                Retry
              </button>
            </div>
          ) : (
            <div 
              className="flex flex-col gap-1 items-center select-none shadow-2xl transition-all duration-300"
              style={{ width: `${zoomLevel}%`, maxWidth: '1000px' }}
            >
              {pages.map((page, idx) => (
                <div key={idx} className="w-full relative bg-zinc-950 flex justify-center">
                  <img 
                    src={page.img} 
                    alt={`Page ${page.page}`}
                    loading={idx < 3 ? "eager" : "lazy"} 
                    className="w-full h-auto object-contain max-h-[160vh]"
                  />
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-zinc-500 font-bold border border-white/5">
                    Page {page.page} / {pages.length}
                  </div>
                </div>
              ))}
              
              {/* End of Chapter Controls */}
              {pages.length > 0 && (
                <div className="w-full border border-white/5 bg-[#0a0a0a] rounded-xl p-8 mt-12 text-center flex flex-col items-center gap-5">
                  <h3 className="text-base font-bold text-zinc-300">You finished reading: {activeChapter.title}</h3>
                  <div className="flex gap-4">
                    <button 
                      onClick={handlePrevChapter} 
                      disabled={!hasPrevChapter}
                      className="px-6 py-3 border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg cursor-pointer transition-all text-xs uppercase disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Previous Chapter
                    </button>
                    <button 
                      onClick={handleNextChapter} 
                      disabled={!hasNextChapter}
                      className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg cursor-pointer transition-all text-xs uppercase disabled:opacity-30 disabled:pointer-events-none"
                    >
                      Next Chapter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating Actions */}
          {showScrollTop && (
            <button
              onClick={() => readerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fixed bottom-8 right-8 p-4 bg-accent hover:bg-accent-hover text-white rounded-full shadow-lg cursor-pointer border-none z-30 transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
              title="Scroll to Top"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </main>
      </div>
    </div>
  );
}
