import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense, lazy } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Play, Search, Menu, X, ChevronLeft, ChevronRight, 
  Clock, Flame, Sparkles, User, Settings, Loader2, BookOpen
} from 'lucide-react';
import { Seal } from './components/ui/Seal';
import { BrushDivider } from './components/ui/BrushDivider';
import { SectionHeader } from './components/ui/SectionHeader';
import { AnimeRow } from './components/anime/AnimeRow';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';

// ─── Code Splitting: Lazy-Loaded Subsystems ───
const MangaReader = lazy(() => import('./components/reader/MangaReader'));
const Dashboard = lazy(() => import('./components/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const AuthModal = lazy(() => import('./components/auth/AuthModal').then(m => ({ default: m.AuthModal })));
const SettingsModal = lazy(() => import('./components/auth/SettingsModal').then(m => ({ default: m.SettingsModal })));

const PlayerHeader = lazy(() => import('./components/player/PlayerHeader').then(m => ({ default: m.PlayerHeader })));
const PlayerSidebarLeft = lazy(() => import('./components/player/PlayerSidebarLeft').then(m => ({ default: m.PlayerSidebarLeft })));
const PlayerCenter = lazy(() => import('./components/player/PlayerCenter').then(m => ({ default: m.PlayerCenter })));
const PlayerSidebarRight = lazy(() => import('./components/player/PlayerSidebarRight').then(m => ({ default: m.PlayerSidebarRight })));
const PlayerExpansion = lazy(() => import('./components/player/PlayerExpansion').then(m => ({ default: m.PlayerExpansion })));

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FALLBACK_IMAGE = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22200%22%20height%3D%22300%22%20viewBox%3D%220%200%20200%20300%22%3E%3Crect%20fill%3D%22%2317130F%22%20width%3D%22200%22%20height%3D%22300%22%2F%3E%3Ctext%20fill%3D%22%236f90a8%22%20font-family%3D%22sans-serif%22%20font-size%3D%2214%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

// ─── Network Resilience: Fetch with AbortController Timeout ───
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return response;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
};

// ─── Security Sanitization Helpers ───
const sanitizeSynopsis = (str) => {
  if (!str) return 'No synopsis available.';
  return str
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim() || 'No synopsis available.';
};

// ─── Generate multiple normalized title variants ───
const buildVariants = (input) => {
  if (!input) return [];
  const titles = Array.isArray(input) ? input : [input];
  let allVariants = [];
  
  titles.forEach(t => {
    if (!t) return;
    const base = t.toLowerCase().trim();
    
    const withSpaces  = base.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
    const noSymbols   = base.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    const noSpaces    = withSpaces.replace(/\s+/g, '');
    const noSeason    = withSpaces.replace(/\s*(season|part|tv|cour)\s*\d*\s*$/i, '').trim();
    const withHyphens = withSpaces.replace(/\s+/g, '-');
    const baseHyphenated = base.replace(/\s+/g, '-');
    const pureAlphaNumeric = base.replace(/[^a-z0-9]/g, '');

    const subs = [base, withSpaces, noSymbols, noSpaces, noSeason, withHyphens, baseHyphenated, pureAlphaNumeric];
    allVariants.push(...subs, ...subs.map(s => `${s} dub`));
  });

  return [...new Set(allVariants)];
};

const GENRES = [
  { id: 1, name: 'Action', gradient: 'from-red-600 to-amber-600' },
  { id: 2, name: 'Adventure', gradient: 'from-orange-500 to-yellow-500' },
  { id: 4, name: 'Comedy', gradient: 'from-yellow-400 to-orange-400' },
  { id: 8, name: 'Drama', gradient: 'from-purple-600 to-blue-600' },
  { id: 10, name: 'Fantasy', gradient: 'from-emerald-500 to-teal-500' },
  { id: 14, name: 'Horror', gradient: 'from-zinc-800 to-red-950' },
  { id: 7, name: 'Mystery', gradient: 'from-indigo-900 to-purple-800' },
  { id: 22, name: 'Romance', gradient: 'from-pink-500 to-rose-400' },
  { id: 24, name: 'Sci-Fi', gradient: 'from-cyan-600 to-blue-700' },
  { id: 36, name: 'Slice of Life', gradient: 'from-teal-400 to-emerald-400' },
  { id: 37, name: 'Supernatural', gradient: 'from-violet-800 to-fuchsia-800' },
  { id: 30, name: 'Sports', gradient: 'from-blue-500 to-cyan-500' },
];

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
  const [audioMode, setAudioMode] = useState('sub');
  const [audioNotice, setAudioNotice] = useState(null);
  const [activeMiningSource, setActiveMiningSource] = useState('Ronin API (Default)');
  const [miningSourcesList, setMiningSourcesList] = useState([
    'Ronin API (Default)', 'GogoAnime Direct', 'Animepahe Direct', 'HiAnime Mirror', 'AutoEmbed Mirror'
  ]);

  const BACKEND_URL = import.meta.env.DEV ? 'http://127.0.0.1:8000' : 'https://ronin-api-proxy.vercel.app';

  const [relatedSeasons, setRelatedSeasons] = useState([]);
  const [activeStreamFormat, setActiveStreamFormat] = useState(null);
  const [nextAiringEpisode, setNextAiringEpisode] = useState(null);
  const [theaterMode, setTheaterMode] = useState(false);
  const triggeredMinersRef = useRef(new Set());
  const [animeCharacters, setAnimeCharacters] = useState([]);
  const [animeRecommendations, setAnimeRecommendations] = useState([]);
  
  // --- Manga States ---
  const [heroManga, setHeroManga] = useState([]);
  const [trendingManga, setTrendingManga] = useState([]);
  const [popularManga, setPopularManga] = useState([]);
  const [mangaSearchTerm, setMangaSearchTerm] = useState('');
  const [mangaSearchResults, setMangaSearchResults] = useState([]);
  const [isMangaSearching, setIsMangaSearching] = useState(false);
  const [isLoadingManga, setIsLoadingManga] = useState(true);
  
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreAnime, setGenreAnime] = useState([]);
  const [isLoadingGenre, setIsLoadingGenre] = useState(false);
  const [scheduleTab, setScheduleTab] = useState('airing');
  const [scheduleAnime, setScheduleAnime] = useState([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateMessage, setPasswordUpdateMessage] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [watchHistory, setWatchHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('animeWatchHistory');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('animeWatchlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const seriesCacheRef = useRef({});

  useEffect(() => {
    // Get active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncWatchHistory(session.user);
        syncWatchlist(session.user);
      }
    }).catch(e => console.warn("Supabase getSession error:", e));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncWatchHistory(session.user);
        syncWatchlist(session.user);
      } else {
        try {
          const savedHistory = localStorage.getItem('animeWatchHistory');
          setWatchHistory(savedHistory ? JSON.parse(savedHistory) : []);
          const savedList = localStorage.getItem('animeWatchlist');
          setWatchlist(savedList ? JSON.parse(savedList) : []);
        } catch {
          setWatchHistory([]);
          setWatchlist([]);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const removeFromHistory = async (title) => {
    setWatchHistory(prev => {
      const newList = prev.filter(item => item.title !== title);
      try { localStorage.setItem('animeWatchHistory', JSON.stringify(newList)); } catch {}
      return newList;
    });
    if (user) {
      await supabase.from('user_watch_history').delete().eq('user_id', user.id).eq('anime_title', title);
    }
  };

  const removeFromWatchlist = async (title) => {
    setWatchlist(prev => {
      const newList = prev.filter(item => item.title !== title);
      try { localStorage.setItem('animeWatchlist', JSON.stringify(newList)); } catch {}
      return newList;
    });
    if (user) {
      await supabase.from('user_watchlist').delete().eq('user_id', user.id).eq('anime_title', title);
    }
  };

  // Data States
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroAnime, setHeroAnime] = useState([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [topAiring, setTopAiring] = useState([]);
  const [actionAnime, setActionAnime] = useState([]);
  const [romanceAnime, setRomanceAnime] = useState([]);
  const [recommendedAnime, setRecommendedAnime] = useState([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!watchHistory || watchHistory.length === 0) return;
      try {
        const lastWatched = watchHistory[0].title;
        const query = `
          query ($search: String) {
            Media(search: $search, type: ANIME) {
              recommendations(sort: RATING_DESC, perPage: 15) {
                edges {
                  node {
                    mediaRecommendation {
                      title { romaji english }
                      coverImage { large }
                      episodes
                      averageScore
                      description
                    }
                  }
                }
              }
            }
          }
        `;
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { search: lastWatched } })
        }, 6000);
        const json = await res.json();
        const recs = json?.data?.Media?.recommendations?.edges || [];
        
        const mappedRecs = recs
          .filter(edge => edge?.node?.mediaRecommendation)
          .map(edge => {
            const media = edge.node.mediaRecommendation;
            return {
              title: media.title.english || media.title.romaji,
              originalTitle: media.title.romaji,
              image: media.coverImage?.large || FALLBACK_IMAGE,
              ep_count: media.episodes || 12,
              score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
              synopsis: sanitizeSynopsis(media.description)
            };
          });
          
        setRecommendedAnime(mappedRecs);
      } catch (err) {
        console.warn("Failed to fetch recommendations:", err);
      }
    };
    fetchRecommendations();
  }, [watchHistory]);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- Fetch Manga Home Data ---
  useEffect(() => {
    const fetchMangaHomeData = async () => {
      try {
        const query = `
          query {
            trending: Page (page: 1, perPage: 15) {
              media (type: MANGA, sort: TRENDING_DESC) {
                title { english romaji }
                synonyms
                coverImage { large }
                bannerImage
                chapters
                averageScore
                description
              }
            }
            popular: Page (page: 1, perPage: 15) {
              media (type: MANGA, sort: POPULARITY_DESC) {
                title { english romaji }
                synonyms
                coverImage { large }
                chapters
                averageScore
                description
              }
            }
          }
        `;
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query })
        }, 8000);
        const result = await res.json();
        
        const mapManga = media => ({
          title: media.title.english || media.title.romaji,
          originalTitle: media.title.romaji,
          synonyms: media.synonyms || [],
          image: media.coverImage?.large || FALLBACK_IMAGE,
          banner: media.bannerImage || null,
          ep_count: media.chapters || '?',
          score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
          synopsis: sanitizeSynopsis(media.description),
          isManga: true
        });

        if (result?.data?.trending?.media) {
          const mappedTrending = result.data.trending.media.map(mapManga);
          setHeroManga(mappedTrending.slice(0, 5));
          setTrendingManga(mappedTrending.slice(5));
        }
        if (result?.data?.popular?.media) {
          setPopularManga(result.data.popular.media.map(mapManga));
        }
      } catch (err) {
        console.error("AniList manga fetch failed:", err);
      } finally {
        setIsLoadingManga(false);
      }
    };
    fetchMangaHomeData();
  }, []);

  useEffect(() => {
    // Auto-rotate Hero Carousel
    if (heroAnime.length > 0 && !selectedAnime) {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroAnime.length);
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [heroAnime, selectedAnime]);

  const mapJikanAnime = useCallback((anime) => ({
    title: anime.title_english || anime.title,
    originalTitle: anime.title,
    synonyms: anime.title_synonyms || [],
    image: anime.images?.jpg?.large_image_url || FALLBACK_IMAGE,
    banner: null,
    ep_count: anime.episodes || 12,
    score: anime.score ? anime.score.toFixed(1) : 'N/A',
    synopsis: sanitizeSynopsis(anime.synopsis)
  }), []);

  // Securely parameterized hero banners GraphQL fetcher
  const fetchHeroBanners = useCallback(async (list) => {
    if (!list || list.length === 0) return list;
    try {
      const variables = {};
      const varDefs = list.map((_, idx) => `$title${idx}: String`).join(', ');
      const queries = list.map((_, idx) => `m${idx}: Media(search: $title${idx}, type: ANIME) { bannerImage }`).join('\n');
      list.forEach((anime, idx) => { variables[`title${idx}`] = anime.title; });

      const res = await fetchWithTimeout('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query(${varDefs}) { ${queries} }`, variables })
      }, 6000);
      const result = await res.json();
      return list.map((anime, idx) => ({
        ...anime,
        banner: result?.data?.[`m${idx}`]?.bannerImage || null
      }));
    } catch (e) {
      console.warn("Failed to fetch hero banner art, keeping cover fallback", e);
      return list;
    }
  }, []);

  useEffect(() => {
    // Fetch Data on Mount
    const fetchHomeData = async () => {
      try {
        // Fetch Top Airing for Hero & First Row
        const airingRes = await fetchWithTimeout('https://api.jikan.moe/v4/seasons/now?limit=15', {}, 6000);
        const airingData = await airingRes.json();
        const mappedAiring = airingData.data.map(mapJikanAnime);
        const heroSlice = mappedAiring.slice(0, 5);
        setHeroAnime(heroSlice);
        setTopAiring(mappedAiring.slice(5));

        fetchHeroBanners(heroSlice).then(setHeroAnime);

        await new Promise(resolve => setTimeout(resolve, 400));

        // Fetch Top Action (Genre ID 1)
        const actionRes = await fetchWithTimeout('https://api.jikan.moe/v4/anime?genres=1&order_by=popularity&sort=asc&limit=15', {}, 6000);
        const actionData = await actionRes.json();
        setActionAnime(actionData.data.map(mapJikanAnime));

        await new Promise(resolve => setTimeout(resolve, 400));

        // Fetch Top Romance (Genre ID 22)
        const romanceRes = await fetchWithTimeout('https://api.jikan.moe/v4/anime?genres=22&order_by=popularity&sort=asc&limit=15', {}, 6000);
        const romanceData = await romanceRes.json();
        if (!romanceData.data) throw new Error("Romance data undefined");
        setRomanceAnime(romanceData.data.map(mapJikanAnime));

      } catch (e) {
        console.warn("Jikan home data fetch error, activating AniList fallback...", e);
        try {
          const query = `
            query {
              trending: Page (page: 1, perPage: 15) {
                media (type: ANIME, sort: TRENDING_DESC) {
                  title { english romaji }
                  synonyms
                  coverImage { large }
                  bannerImage
                  episodes
                  averageScore
                  description
                }
              }
              action: Page (page: 1, perPage: 15) {
                media (genre: "Action", type: ANIME, sort: POPULARITY_DESC) {
                  title { english romaji }
                  synonyms
                  coverImage { large }
                  episodes
                  averageScore
                  description
                }
              }
              romance: Page (page: 1, perPage: 15) {
                media (genre: "Romance", type: ANIME, sort: POPULARITY_DESC) {
                  title { english romaji }
                  synonyms
                  coverImage { large }
                  episodes
                  averageScore
                  description
                }
              }
            }
          `;
          const res = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ query })
          }, 8000);
          const result = await res.json();
          
          const mapAni = media => ({
            title: media.title.english || media.title.romaji,
            originalTitle: media.title.romaji,
            synonyms: media.synonyms || [],
            image: media.coverImage?.large || FALLBACK_IMAGE,
            banner: media.bannerImage || null,
            ep_count: media.episodes || 12,
            score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
            synopsis: sanitizeSynopsis(media.description)
          });

          if (result?.data?.trending?.media) {
            const mappedTrending = result.data.trending.media.map(mapAni);
            setHeroAnime(mappedTrending.slice(0, 5));
            setTopAiring(mappedTrending.slice(5));
          }
          if (result?.data?.action?.media) {
            setActionAnime(result.data.action.media.map(mapAni));
          }
          if (result?.data?.romance?.media) {
            setRomanceAnime(result.data.romance.media.map(mapAni));
          }
        } catch (fallbackErr) {
          console.error("AniList home fallback failed:", fallbackErr);
        }
      }
    };
    fetchHomeData();
  }, [mapJikanAnime, fetchHeroBanners]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setActiveTab('search');
    
    try {
      const res = await fetchWithTimeout(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTerm)}&limit=18`, {}, 6000);
      const data = await res.json();
      if (!data.data || data.data.length === 0) throw new Error("Search data empty");
      setSearchResults(data.data.map(mapJikanAnime));
    } catch (err) {
      console.warn("Jikan search failed, falling back to AniList search...", err);
      try {
        const query = `
          query ($search: String) {
            Page (page: 1, perPage: 18) {
              media (search: $search, type: ANIME, sort: POPULARITY_DESC) {
                title { english romaji }
                coverImage { large }
                episodes
                averageScore
                description
              }
            }
          }
        `;
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { search: searchTerm }
          })
        }, 8000);
        const result = await res.json();
        const mediaList = result?.data?.Page?.media;
        if (mediaList && mediaList.length > 0) {
          const mapped = mediaList.map(media => ({
            title: media.title.english || media.title.romaji,
            image: media.coverImage?.large || FALLBACK_IMAGE,
            ep_count: media.episodes || 12,
            score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
            synopsis: sanitizeSynopsis(media.description)
          }));
          setSearchResults(mapped);
        }
      } catch (fallbackErr) {
        console.error("AniList search fallback failed:", fallbackErr);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleMangaSearch = async (e) => {
    e.preventDefault();
    if (!mangaSearchTerm.trim()) return;
    
    setIsMangaSearching(true);
    setMangaSearchResults([]);
    setActiveTab('mangaSearch');
    
    try {
      const query = `
        query ($search: String) {
          Page (page: 1, perPage: 24) {
            media (search: $search, type: MANGA, sort: POPULARITY_DESC) {
              title { english romaji }
              coverImage { large }
              chapters
              averageScore
              description
            }
          }
        }
      `;
      const res = await fetchWithTimeout('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables: { search: mangaSearchTerm } })
      }, 8000);
      const result = await res.json();
      const mediaList = result?.data?.Page?.media;
      if (mediaList && mediaList.length > 0) {
        const mapped = mediaList.map(media => ({
          title: media.title.english || media.title.romaji,
          image: media.coverImage?.large || FALLBACK_IMAGE,
          ep_count: media.chapters || '?',
          score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
          synopsis: sanitizeSynopsis(media.description),
          isManga: true
        }));
        setMangaSearchResults(mapped);
      }
    } catch (fallbackErr) {
      console.error("Manga search failed:", fallbackErr);
    } finally {
      setIsMangaSearching(false);
    }
  };

  const openAnime = async (anime) => {
    setSelectedAnime(anime);
    setIsPlaying(false);
    setActiveEpisode(null);
    setActiveEpRange(0);
    
    let baseEps = Array.from({length: anime.ep_count || 12}, (_, i) => i + 1);
    setAvailableEpisodes(baseEps);
    
    let anilistEpCount = 0;
    setNextAiringEpisode(null);
    try {
      const query = `
        query ($search: String) { 
          Media(search: $search, type: ${anime.isManga ? 'MANGA' : 'ANIME'}) { 
            ${anime.isManga ? 'chapters' : 'episodes'} 
            ${anime.isManga ? '' : 'nextAiringEpisode { episode airingAt }'} 
            relations {
              edges {
                relationType(version: 2)
                node {
                  type
                  title { english romaji }
                  synonyms
                  coverImage { large }
                  ${anime.isManga ? 'chapters' : 'episodes'}
                  averageScore
                  description
                }
              }
            }
            characters(sort: ROLE, perPage: 8) {
              edges {
                role
                node { name { full } image { medium } }
              }
            }
            recommendations(sort: RATING_DESC, perPage: 12) {
              nodes {
                mediaRecommendation {
                  title { english romaji }
                  coverImage { large }
                  averageScore
                  ${anime.isManga ? 'chapters' : 'episodes'}
                }
              }
            }
          } 
        }`;
        const aniRes = await fetchWithTimeout('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { search: anime.title } })
        }, 7000);
        const aniData = await aniRes.json();
        const media = aniData?.data?.Media;
        if (media) {
            if (!anime.isManga) {
              setNextAiringEpisode(media.nextAiringEpisode || null);
            }
            anilistEpCount = anime.isManga ? (media.chapters || 0) : (media.episodes || (media.nextAiringEpisode ? media.nextAiringEpisode.episode - 1 : 0));
            
            if (media.characters && media.characters.edges) {
              setAnimeCharacters(media.characters.edges);
            } else {
              setAnimeCharacters([]);
            }

            if (media.recommendations && media.recommendations.nodes) {
              const recs = media.recommendations.nodes
                .map(n => n.mediaRecommendation)
                .filter(Boolean)
                .map(r => ({
                  title: r.title.english || r.title.romaji,
                  originalTitle: r.title.romaji,
                  image: r.coverImage?.large || FALLBACK_IMAGE,
                  score: r.averageScore ? (r.averageScore / 10).toFixed(1) : 'N/A',
                  ep_count: r.episodes || '?'
                }));
              setAnimeRecommendations(recs);
            } else {
              setAnimeRecommendations([]);
            }

            if (media.relations && media.relations.edges) {
              const seasons = media.relations.edges
                .filter(edge => edge.node.type === (anime.isManga ? 'MANGA' : 'ANIME') && ['PREQUEL', 'SEQUEL', 'ALTERNATIVE', 'SPIN_OFF'].includes(edge.relationType))
                .map(edge => {
                  const rNode = edge.node;
                  return {
                    title: rNode.title.english || rNode.title.romaji,
                    originalTitle: rNode.title.romaji,
                    synonyms: rNode.synonyms || [],
                    image: rNode.coverImage?.large || FALLBACK_IMAGE,
                    ep_count: (anime.isManga ? rNode.chapters : rNode.episodes) || 12,
                    score: rNode.averageScore ? (rNode.averageScore / 10).toFixed(1) : 'N/A',
                    synopsis: sanitizeSynopsis(rNode.description),
                    relation: edge.relationType,
                    isManga: anime.isManga
                  };
                });
              setRelatedSeasons(seasons);
            } else {
              setRelatedSeasons([]);
            }
        }
    } catch (e) {
        console.error("AniList fetch failed", e);
        setRelatedSeasons([]);
    }

    // Prefetch cached episodes from Supabase for this series
    const searchVariants = buildVariants([anime.title, anime.originalTitle, ...(anime.synonyms || [])].filter(Boolean));
    let maxDbEp = 0;
    try {
      const { data: dbEpisodes } = await supabase
        .from('anime_links')
        .select('title, episode, url, type')
        .in('title', searchVariants);
        
      if (dbEpisodes && dbEpisodes.length > 0) {
         maxDbEp = Math.max(...dbEpisodes.map(e => e.episode || 0));
         const animeKey = (anime.title || anime.originalTitle || '').toLowerCase().trim();
         seriesCacheRef.current[animeKey] = dbEpisodes;
      }
    } catch (dbErr) {
      console.warn("Direct Supabase series prefetch error:", dbErr);
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
    setNextAiringEpisode(null);
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
      try { localStorage.setItem('animeWatchHistory', JSON.stringify(updated)); } catch {}
      return updated;
    });

    if (user) {
      supabase.from('user_watch_history').upsert({
        user_id: user.id,
        title: selectedAnime.title,
        image: selectedAnime.image,
        ep_count: selectedAnime.ep_count,
        last_ep: ep,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,title' }).then(({ error }) => {
        if (error) console.error("Failed to sync episode to Supabase:", error.message);
      });
    }

    fetchStream(selectedAnime, ep);
  };

  const playPrevEpisode = () => {
    if (!activeEpisode) return;
    const currentIndex = availableEpisodes.indexOf(activeEpisode);
    if (currentIndex > 0) {
      handleEpisodeChange(availableEpisodes[currentIndex - 1]);
    }
  };

  const playNextEpisode = () => {
    if (!activeEpisode) return;
    const currentIndex = availableEpisodes.indexOf(activeEpisode);
    if (currentIndex < availableEpisodes.length - 1) {
      handleEpisodeChange(availableEpisodes[currentIndex + 1]);
    }
  };

  const fetchStream = async (anime, epNum, sourceToForce = null) => {
    setIsLoadingStream(true);
    setStreamError(false);
    setIsIframe(false);
    setIsMagnet(false);
    setStreamUrl(null);
    setDownloadMagnetUrl(null);
    
    if (sourceToForce) {
      setActiveMiningSource(sourceToForce);
    }

    try {
      const searchVariants = buildVariants([anime.title, anime.originalTitle, ...(anime.synonyms || [])].filter(Boolean));
      const fallbackTitle = anime.originalTitle || anime.title;
      const animeKey = (anime.title || anime.originalTitle || '').toLowerCase().trim();

      // If user explicitly picked an alternate source, use the /api/stream endpoint
      if (sourceToForce && sourceToForce !== 'Ronin API (Default)' && sourceToForce !== 'Ronin API') {
        const streamApiUrl = `${BACKEND_URL}/api/stream/${encodeURIComponent(fallbackTitle)}/${parseInt(epNum)}?source=${encodeURIComponent(sourceToForce)}`;
        const res = await fetchWithTimeout(streamApiUrl, {}, 10000);
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data = await res.json();
        if (!data.results || data.results.length === 0) throw new Error("Stream not found");

        let formats = {};
        data.results.forEach(result => {
          if (result.url.startsWith('magnet:')) formats['torrent'] = result.url;
          else formats['main'] = result.url;
        });
        setAvailableStreams(formats);
        if (formats['main']) {
          setActiveStreamFormat('main');
          setActiveMiningSource(sourceToForce);
        } else if (formats['torrent']) {
          setActiveStreamFormat('torrent');
        }
        return;
      }

      // Step 1: Check In-Memory Series Cache
      let dbResList = (seriesCacheRef.current[animeKey] || []).filter(e => e.episode === parseInt(epNum));

      // Step 2: Direct Supabase Client Query
      if (dbResList.length === 0) {
        try {
          const { data } = await supabase
            .from('anime_links')
            .select('title, episode, url, type')
            .in('title', searchVariants)
            .eq('episode', parseInt(epNum));
            
          if (data && data.length > 0) {
            dbResList = data;
            seriesCacheRef.current[animeKey] = [...(seriesCacheRef.current[animeKey] || []), ...data];
          }
        } catch (supaErr) {
          console.warn("Direct Supabase query failed, attempting proxy fallback...", supaErr);
        }
      }

      // Step 3: Vercel Proxy Fallback
      if (dbResList.length === 0) {
        try {
          const proxyUrl = `https://ronin-api-proxy.vercel.app/api/db?episode=${parseInt(epNum)}&title=${encodeURIComponent(fallbackTitle)}&searchVariants=${encodeURIComponent(JSON.stringify(searchVariants))}`;
          const proxyRes = await fetchWithTimeout(proxyUrl, {}, 8000);
          if (proxyRes.ok) {
            dbResList = await proxyRes.json();
          }
        } catch (proxyErr) {
          console.warn("Proxy DB query failed:", proxyErr);
        }
      }
        
      if (!dbResList || dbResList.length === 0) {
        throw new Error("Stream not found");
      }
      
      let formats = {};
      let subCount = 1;
      let dubCount = 1;

      for (const dbRes of dbResList) {
        if (dbRes.url.startsWith('magnet:')) {
          formats['torrent'] = dbRes.url;
        } else if (dbRes.title.endsWith(' dub')) {
          formats[`dub-${dubCount}`] = dbRes.url;
          dubCount++;
        } else {
          formats[`server-${subCount}`] = dbRes.url;
          subCount++;
        }
      }

      setAvailableStreams(formats);

      const firstKey = Object.keys(formats)[0];
      if (firstKey) {
        setActiveStreamFormat(firstKey);
        setActiveMiningSource('Ronin API (Default)');
      } else {
        throw new Error("Unknown stream type");
      }
    } catch(err) {
      console.warn("fetchStream caught error:", err);
      const isBlocked = err.message?.toLowerCase().includes('failed to fetch') || 
                        err.message?.toLowerCase().includes('network') || 
                        err.message?.toLowerCase().includes('supabaseerror') ||
                        !window.navigator.onLine;

      setStreamError(isBlocked ? 'blocked' : 'notFound');

      if (!isBlocked) {
        const minerKey = `${anime.title}-${epNum}-${sourceToForce || 'default'}`;
        if (!triggeredMinersRef.current.has(minerKey)) {
          triggeredMinersRef.current.add(minerKey);
          const targetTitle = anime.originalTitle || anime.title || '';
          
          const triggerSubUrl = `https://ronin-api-proxy.vercel.app/api/trigger-miner?title=${encodeURIComponent(targetTitle)}&episode=${epNum}${sourceToForce ? `&source=${encodeURIComponent(sourceToForce)}` : ''}`;
          fetch(triggerSubUrl).catch(e => console.error("Failed to trigger Sub miner", e));

          const triggerDubUrl = `https://ronin-api-proxy.vercel.app/api/trigger-miner?title=${encodeURIComponent(targetTitle + ' dub')}&episode=${epNum}${sourceToForce ? `&source=${encodeURIComponent(sourceToForce)}` : ''}`;
          fetch(triggerDubUrl).catch(e => console.error("Failed to trigger Dub miner", e));
        }
      }
    } finally {
      setIsLoadingStream(false);
    }
  };

  const handleGenreClick = async (genre) => {
    setSelectedGenre(genre);
    setIsLoadingGenre(true);
    setGenreAnime([]);
    try {
      const res = await fetchWithTimeout(`https://api.jikan.moe/v4/anime?genres=${genre.id}&order_by=popularity&sort=asc&limit=24`, {}, 7000);
      const data = await res.json();
      if (data && data.data && data.data.length > 0) {
        setGenreAnime(data.data.map(mapJikanAnime));
      } else {
        throw new Error("Genre data empty");
      }
    } catch (err) {
      console.warn("Jikan genre fetch error, falling back to AniList...", err);
      try {
        const query = `
          query ($genre: String) {
            Page (page: 1, perPage: 24) {
              media (genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
                title { english romaji }
                coverImage { large }
                episodes
                averageScore
                description
              }
            }
          }
        `;
        const res = await fetchWithTimeout('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query, variables: { genre: genre.name } })
        }, 8000);
        const result = await res.json();
        const mediaList = result?.data?.Page?.media;
        if (mediaList && mediaList.length > 0) {
          const mapped = mediaList.map(media => ({
            title: media.title.english || media.title.romaji,
            image: media.coverImage?.large || FALLBACK_IMAGE,
            ep_count: media.episodes || 12,
            score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
            synopsis: sanitizeSynopsis(media.description)
          }));
          setGenreAnime(mapped);
        }
      } catch (fallbackErr) {
        console.error("AniList genre fallback failed:", fallbackErr);
      }
    } finally {
      setIsLoadingGenre(false);
    }
  };

  const handleScheduleTabChange = async (tab) => {
    setScheduleTab(tab);
    setIsLoadingSchedule(true);
    setScheduleAnime([]);

    let query = '';
    let variables = {};

    if (tab === 'airing') {
      query = `query { Page (page: 1, perPage: 24) { media (status: RELEASING, type: ANIME, sort: POPULARITY_DESC) { title { english romaji } coverImage { large } episodes averageScore description } } }`;
    } else if (tab === 'upcoming') {
      query = `query { Page (page: 1, perPage: 24) { media (status: NOT_YET_RELEASED, type: ANIME, sort: POPULARITY_DESC) { title { english romaji } coverImage { large } episodes averageScore description } } }`;
    } else if (tab === 'tv') {
      query = `query { Page (page: 1, perPage: 24) { media (format: TV, type: ANIME, sort: POPULARITY_DESC) { title { english romaji } coverImage { large } episodes averageScore description } } }`;
    } else if (tab === 'movie') {
      query = `query { Page (page: 1, perPage: 24) { media (format: MOVIE, type: ANIME, sort: POPULARITY_DESC) { title { english romaji } coverImage { large } episodes averageScore description } } }`;
    }

    try {
      const res = await fetchWithTimeout('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ query, variables })
      }, 8000);
      const result = await res.json();
      const mediaList = result?.data?.Page?.media;
      if (mediaList) {
        const mapped = mediaList.map(media => ({
          title: media.title.english || media.title.romaji,
          image: media.coverImage?.large || FALLBACK_IMAGE,
          ep_count: media.episodes || 12,
          score: media.averageScore ? (media.averageScore / 10).toFixed(1) : 'N/A',
          synopsis: sanitizeSynopsis(media.description)
        }));
        setScheduleAnime(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch schedule data:", e);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const syncWatchHistory = async (currentUser) => {
    try {
      const { data, error } = await supabase
        .from('user_watch_history')
        .select('title, image, ep_count, last_ep, updated_at')
        .eq('user_id', currentUser.id);

      if (error) {
        console.warn("Could not sync from user_watch_history table:", error.message);
        return;
      }

      if (data) {
        const dbHistory = data.map(item => ({
          title: item.title,
          image: item.image,
          ep_count: item.ep_count,
          lastEp: item.last_ep,
          timestamp: new Date(item.updated_at).getTime()
        }));

        let local = [];
        try { local = JSON.parse(localStorage.getItem('animeWatchHistory') || '[]'); } catch {}
        const mergedMap = new Map();

        local.forEach(item => mergedMap.set(item.title, item));
        dbHistory.forEach(dbItem => {
          const localItem = mergedMap.get(dbItem.title);
          if (!localItem || dbItem.timestamp > localItem.timestamp) {
            mergedMap.set(dbItem.title, dbItem);
          }
        });

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        setWatchHistory(mergedList);
        try { localStorage.setItem('animeWatchHistory', JSON.stringify(mergedList)); } catch {}

        for (const item of mergedList) {
          await supabase.from('user_watch_history').upsert({
            user_id: currentUser.id,
            title: item.title,
            image: item.image,
            ep_count: item.ep_count,
            last_ep: item.lastEp,
            updated_at: new Date(item.timestamp).toISOString()
          }, { onConflict: 'user_id,title' });
        }
      }
    } catch (err) {
      console.error("Sync watch history failed:", err);
    }
  };

  const syncWatchlist = async (currentUser) => {
    try {
      const { data, error } = await supabase
        .from('user_watchlist')
        .select('title, image, ep_count, score, synopsis, updated_at')
        .eq('user_id', currentUser.id);

      if (error) {
        console.warn("Could not sync from user_watchlist table:", error.message);
        return;
      }

      if (data) {
        const dbWatchlist = data.map(item => ({
          title: item.title,
          image: item.image,
          ep_count: item.ep_count,
          score: item.score,
          synopsis: item.synopsis,
          timestamp: new Date(item.updated_at).getTime()
        }));

        let local = [];
        try { local = JSON.parse(localStorage.getItem('animeWatchlist') || '[]'); } catch {}
        const mergedMap = new Map();

        local.forEach(item => mergedMap.set(item.title, item));
        dbWatchlist.forEach(dbItem => {
          const localItem = mergedMap.get(dbItem.title);
          if (!localItem || dbItem.timestamp > localItem.timestamp) {
            mergedMap.set(dbItem.title, dbItem);
          }
        });

        const mergedList = Array.from(mergedMap.values()).sort((a, b) => b.timestamp - a.timestamp);
        setWatchlist(mergedList);
        try { localStorage.setItem('animeWatchlist', JSON.stringify(mergedList)); } catch {}

        for (const item of mergedList) {
          await supabase.from('user_watchlist').upsert({
            user_id: currentUser.id,
            title: item.title,
            image: item.image,
            ep_count: item.ep_count,
            score: item.score,
            synopsis: item.synopsis,
            updated_at: new Date(item.timestamp).toISOString()
          }, { onConflict: 'user_id,title' });
        }
      }
    } catch (err) {
      console.error("Sync watchlist failed:", err);
    }
  };

  const toggleWatchlist = (anime) => {
    if (!anime) return;
    
    setWatchlist(prev => {
      const exists = prev.some(item => item.title === anime.title);
      let updated;
      if (exists) {
        updated = prev.filter(item => item.title !== anime.title);
      } else {
        const newEntry = {
          title: anime.title,
          image: anime.image,
          ep_count: anime.ep_count,
          score: anime.score,
          synopsis: anime.synopsis,
          timestamp: Date.now()
        };
        updated = [newEntry, ...prev];
      }
      
      try { localStorage.setItem('animeWatchlist', JSON.stringify(updated)); } catch {}
      
      if (user) {
        if (exists) {
          supabase.from('user_watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('title', anime.title)
            .then(({ error }) => {
              if (error) console.error("Failed to delete from Supabase watchlist:", error.message);
            });
        } else {
          supabase.from('user_watchlist').upsert({
            user_id: user.id,
            title: anime.title,
            image: anime.image,
            ep_count: anime.ep_count,
            score: anime.score,
            synopsis: anime.synopsis,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,title' }).then(({ error }) => {
            if (error) console.error("Failed to sync watchlist to Supabase:", error.message);
          });
        }
      }
      
      return updated;
    });
  };

  const isInWatchlist = (anime) => {
    if (!anime) return false;
    return watchlist.some(item => item.title === anime.title);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data?.user && !data?.session) {
          setAuthError("Check your email for the confirmation link!");
        } else if (data?.user) {
          setUser(data.user);
          setAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
        if (data?.user) {
          setUser(data.user);
          setAuthModalOpen(false);
          setAuthEmail('');
          setAuthPassword('');
        }
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordUpdateMessage('Password must be at least 6 characters.');
      return;
    }
    setIsUpdatingPassword(true);
    setPasswordUpdateMessage('');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);
    if (error) {
      setPasswordUpdateMessage(error.message);
    } else {
      setPasswordUpdateMessage('Password updated successfully!');
      setNewPassword('');
      setTimeout(() => {
        setSettingsModalOpen(false);
        setPasswordUpdateMessage('');
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-base text-white pb-48 font-sans">
      {!selectedAnime && (
        <>
          {/* Navigation */}
          <nav 
            role="navigation" 
            aria-label="Main Navigation"
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-base/80 backdrop-blur-2xl border-b border-white/5 py-6' : 'bg-transparent py-10'}`}
          >
            <div className="container mx-auto px-10 md:px-16 flex items-center justify-between">
              <div className="flex items-center gap-14">
                <div 
                  className="wordmark text-4xl cursor-pointer" 
                  onClick={() => { setActiveTab('discover'); setSearchTerm(''); }}
                  role="button"
                  tabIndex={0}
                  aria-label="RONIN Home"
                >
                  RONIN<span className="cut" />
                </div>
                <div className="hidden md:flex items-center gap-10 text-[17px] font-bold text-zinc-400">
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'discover' ? 'text-accent' : 'hover:text-white'}`} onClick={() => setActiveTab('discover')}>Home</button>
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'manga' ? 'text-accent' : 'hover:text-white'}`} onClick={() => setActiveTab('manga')}>Manga</button>
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'mylist' ? 'text-accent' : 'hover:text-white'}`} onClick={() => setActiveTab('mylist')}>My List</button>
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'browse' ? 'text-accent' : 'hover:text-white'}`} onClick={() => { setActiveTab('browse'); setSelectedGenre(null); }}>Browse</button>
                  <button className={`bg-transparent border-none cursor-pointer transition-colors ${activeTab === 'schedule' ? 'text-accent' : 'hover:text-white'}`} onClick={() => { setActiveTab('schedule'); handleScheduleTabChange('airing'); }}>Schedule</button>
                </div>
              </div>
              
              <div className="flex items-center gap-8">
                {activeTab === 'manga' || activeTab === 'mangaSearch' ? (
                  <form onSubmit={handleMangaSearch} className="relative hidden lg:block" role="search">
                    <input 
                      type="text" 
                      placeholder="Search for a manga..." 
                      value={mangaSearchTerm}
                      onChange={(e) => setMangaSearchTerm(e.target.value)}
                      aria-label="Search for a manga"
                      className="bg-white/5 border border-white/10 rounded-full py-3.5 pl-8 pr-14 text-base text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 w-96 transition-all font-medium placeholder-zinc-500"
                    />
                    <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </form>
                ) : (
                  <form onSubmit={handleSearch} className="relative hidden lg:block" role="search">
                    <input 
                      type="text" 
                      placeholder="Search for an anime..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search for an anime"
                      className="bg-white/5 border border-white/10 rounded-full py-3.5 pl-8 pr-14 text-base text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 w-96 transition-all font-medium placeholder-zinc-500"
                    />
                    <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </form>
                )}
                <div className="relative">
                  <button 
                    onClick={() => {
                      if (user) {
                        setProfileDropdownOpen(!profileDropdownOpen);
                      } else {
                        setAuthModalOpen(true);
                      }
                    }}
                    aria-label={user ? `User Profile (${user.email})` : "Sign In"}
                    className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border-none cursor-pointer text-white flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {user ? (
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-black text-white uppercase">
                        {user.email[0]}
                      </div>
                    ) : (
                      <User size={24} />
                    )}
                  </button>

                  {user && profileDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-surface border border-white/10 rounded-xl p-4 shadow-2xl z-50 flex flex-col gap-3 backdrop-blur-2xl animate-fade-in">
                      <button 
                        onClick={() => {
                          setSettingsModalOpen(true);
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border-none cursor-pointer flex items-center justify-center gap-2 text-[14px]"
                      >
                        <Settings size={16} /> Settings
                      </button>
                      <div className="w-full h-[1px] bg-white/5" />
                      <div className="text-sm font-medium text-zinc-400 break-all px-2">
                        Logged in as: <br />
                        <span className="text-white font-bold">{user.email}</span>
                      </div>
                      <div className="w-full h-[1px] bg-white/5" />
                      <button 
                        onClick={() => {
                          handleSignOut();
                          setProfileDropdownOpen(false);
                        }}
                        className="w-full py-2.5 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-xl font-bold transition-all border-none cursor-pointer text-[14px]"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Mobile Search Icon */}
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border-none cursor-pointer text-white lg:hidden flex items-center justify-center"
                  aria-label="Open Search Menu"
                >
                  <Search size={24} />
                </button>

                <button 
                  onClick={() => setMobileMenuOpen(true)} 
                  className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border-none cursor-pointer text-white md:hidden"
                  aria-label="Toggle Navigation Drawer"
                >
                  <Menu size={24} />
                </button>
              </div>
            </div>

            {/* Mobile Drawer Navigation Menu */}
            {mobileMenuOpen && (
              <div 
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md md:hidden transition-all duration-300"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div 
                  className="absolute top-0 right-0 h-full w-[300px] max-w-[85vw] bg-surface/95 border-l border-white/10 p-8 flex flex-col gap-8 shadow-2xl backdrop-blur-2xl transition-transform duration-300 translate-x-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between">
                    <span className="wordmark text-2xl">RONIN<span className="cut" /></span>
                    <button 
                      onClick={() => setMobileMenuOpen(false)}
                      aria-label="Close navigation menu"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all border-none cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Search Bar inside Drawer */}
                  <form 
                    onSubmit={(e) => {
                      handleSearch(e);
                      setMobileMenuOpen(false);
                    }} 
                    className="relative w-full"
                    role="search"
                  >
                    <input 
                      type="text" 
                      placeholder="Search for an anime..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      aria-label="Search anime in drawer"
                      className="bg-white/5 border border-white/10 rounded-full py-3.5 pl-6 pr-12 text-sm text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 w-full transition-all font-medium placeholder-zinc-500"
                    />
                    <button 
                      type="submit" 
                      aria-label="Submit search"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none text-zinc-400 hover:text-white cursor-pointer"
                    >
                      <Search size={18} />
                    </button>
                  </form>

                  {/* Navigation Links inside Drawer */}
                  <div className="flex flex-col gap-6 text-[18px] font-bold text-zinc-400 mt-4">
                    <button 
                      className={`w-full text-left bg-transparent border-none cursor-pointer py-2 transition-colors ${activeTab === 'discover' ? 'text-accent' : 'hover:text-white'}`} 
                      onClick={() => { setActiveTab('discover'); setMobileMenuOpen(false); }}
                    >
                      Home
                    </button>
                    <button 
                      className={`w-full text-left bg-transparent border-none cursor-pointer py-2 transition-colors ${activeTab === 'manga' ? 'text-accent' : 'hover:text-white'}`} 
                      onClick={() => { setActiveTab('manga'); setMobileMenuOpen(false); }}
                    >
                      Manga
                    </button>
                    <button 
                      className={`w-full text-left bg-transparent border-none cursor-pointer py-2 transition-colors ${activeTab === 'mylist' ? 'text-accent' : 'hover:text-white'}`} 
                      onClick={() => { setActiveTab('mylist'); setMobileMenuOpen(false); }}
                    >
                      My List
                    </button>
                    <button 
                      className={`w-full text-left bg-transparent border-none cursor-pointer py-2 transition-colors ${activeTab === 'browse' ? 'text-accent' : 'hover:text-white'}`} 
                      onClick={() => { setActiveTab('browse'); setSelectedGenre(null); setMobileMenuOpen(false); }}
                    >
                      Browse
                    </button>
                    <button 
                      className={`w-full text-left bg-transparent border-none cursor-pointer py-2 transition-colors ${activeTab === 'schedule' ? 'text-accent' : 'hover:text-white'}`} 
                      onClick={() => { setActiveTab('schedule'); handleScheduleTabChange('airing'); setMobileMenuOpen(false); }}
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </nav>

          <main className="relative z-10" role="main">
            {activeTab === 'search' ? (
              <div className="container mx-auto px-10 md:px-16 pt-40 pb-20">
                <SectionHeader title={`Search Results for "${searchTerm}"`} className="mb-12" />
                {isSearching ? (
                  <div className="text-xl text-zinc-400 animate-pulse font-bold flex items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-accent" />
                    Searching database...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-8">
                    {searchResults.map((anime, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => openAnime(anime)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAnime(anime); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Watch ${anime.title}`}
                        className="group relative flex-none w-[150px] sm:w-[180px] md:w-[200px] cursor-pointer mb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-700 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_40px_rgba(196,32,44,0.2)]">
                          <img 
                            src={anime.image || FALLBACK_IMAGE} 
                            alt={anime.title || 'Anime Cover'} 
                            loading="lazy" 
                            decoding="async"
                            onError={(e) => { if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE; }}
                            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="bg-accent p-6 rounded-full shadow-[0_0_40px_rgba(196,32,44,0.6)] backdrop-blur-lg transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                              <Play size={32} fill="white" className="ml-1" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 px-2">
                          <h3 className="text-[18px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">{anime.title}</h3>
                          <div className="flex items-center gap-3 mt-3 text-sm font-bold text-zinc-500 tracking-wide">
                            <Seal score={anime.score} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                            <span>{anime.ep_count} Eps</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'mangaSearch' ? (
              <div className="container mx-auto px-10 md:px-16 pt-40 pb-20">
                <SectionHeader title={`Manga Search Results for "${mangaSearchTerm}"`} className="mb-12" />
                {isMangaSearching ? (
                  <div className="text-xl text-zinc-400 animate-pulse font-bold flex items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-accent" />
                    Searching database...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-8">
                    {mangaSearchResults.map((anime, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => openAnime(anime)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAnime(anime); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Read ${anime.title}`}
                        className="group relative flex-none w-[150px] sm:w-[180px] md:w-[200px] cursor-pointer mb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-700 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_40px_rgba(196,32,44,0.2)]">
                          <img 
                            src={anime.image || FALLBACK_IMAGE} 
                            alt={anime.title || 'Manga Cover'} 
                            loading="lazy" 
                            decoding="async"
                            onError={(e) => { if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE; }}
                            className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                            <div className="bg-accent p-6 rounded-full shadow-[0_0_40px_rgba(196,32,44,0.6)] backdrop-blur-lg transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                              <BookOpen size={32} fill="white" className="ml-1" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 px-2">
                          <h3 className="text-[18px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">{anime.title}</h3>
                          <div className="flex items-center gap-3 mt-3 text-sm font-bold text-zinc-500 tracking-wide">
                            <Seal score={anime.score} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                            <span>{anime.ep_count} Chps</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'manga' ? (
              <>
                {heroManga.length > 0 && heroManga[currentHeroIndex] && (
                  <section className="relative h-screen min-h-[800px] w-full flex items-center justify-start overflow-hidden">
                    <div className="absolute inset-0 bg-base" />
                    <div
                      key={heroManga[currentHeroIndex].banner || heroManga[currentHeroIndex].image}
                      className={`absolute inset-0 bg-cover scale-105 transition-opacity duration-1000 animate-[heroKen_18s_ease-in-out_infinite] ${heroManga[currentHeroIndex].banner ? 'opacity-70 bg-[position:center_35%]' : 'opacity-35 bg-center'}`}
                      style={{ backgroundImage: `url(${heroManga[currentHeroIndex].banner || heroManga[currentHeroIndex].image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/55 to-transparent" />

                    <div className="relative container mx-auto px-10 md:px-16 pt-32">
                      <div className="max-w-[900px]">
                        <span className="inline-flex items-center gap-3 text-sm font-mono font-bold text-gold mb-8 tracking-[0.25em] uppercase">
                          <BrushDivider />
                          Trending Manga
                        </span>
                        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-8 drop-shadow-2xl text-white line-clamp-2 md:line-clamp-3">
                          {heroManga[currentHeroIndex].title}
                        </h1>
                        <div className="flex items-center gap-6 text-[15px] text-zinc-300 font-bold mb-8">
                          <Seal score={heroManga[currentHeroIndex].score} size="lg" />
                          <span>{heroManga[currentHeroIndex].ep_count} Chps</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-zinc-400 tracking-wide">HD</span>
                        </div>
                        <p className="text-[16px] text-zinc-300 leading-[1.8] mb-12 line-clamp-3 drop-shadow-lg font-medium max-w-[800px]">
                          {heroManga[currentHeroIndex].synopsis}
                        </p>

                        <div className="flex items-center gap-3 w-full max-w-[420px]">
                          <button
                            onClick={() => openAnime(heroManga[currentHeroIndex])}
                            aria-label={`Read ${heroManga[currentHeroIndex].title}`}
                            className="flex-1 flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] text-white font-extrabold text-[15px] px-8 py-3.5 rounded-lg shadow-lg shadow-accent/20 border-none cursor-pointer uppercase tracking-wide"
                          >
                            <BookOpen size={18} fill="white" /> Read Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
                <div className="container mx-auto px-4 sm:px-6 md:px-10 lg:px-16 -mt-10 md:-mt-20 relative z-10 space-y-12 md:space-y-24">
                  <AnimeRow title="Trending Manga" icon={<Flame className="text-accent" />} animeList={trendingManga} openAnime={openAnime} />
                  <AnimeRow title="Popular Manga" icon={<Sparkles className="text-accent" />} animeList={popularManga} openAnime={openAnime} />
                </div>
              </>
            ) : activeTab === 'browse' ? (
              <div className="container mx-auto px-10 md:px-16 pt-40 pb-20">
                {selectedGenre ? (
                  <>
                    <div className="flex items-center justify-between mb-12">
                      <SectionHeader title={`${selectedGenre.name} Anime`} />
                      <button 
                        onClick={() => setSelectedGenre(null)}
                        aria-label="Back to Genres"
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white rounded-full font-bold transition-all border border-white/10 hover:border-white/20 cursor-pointer"
                      >
                        ← Back to Genres
                      </button>
                    </div>

                    {isLoadingGenre ? (
                      <div className="text-xl text-zinc-400 animate-pulse font-bold flex items-center gap-3">
                        <Loader2 size={24} className="animate-spin text-accent" />
                        Loading {selectedGenre.name} anime...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                        {genreAnime.map((anime, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => openAnime(anime)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAnime(anime); } }}
                            role="button"
                            tabIndex={0}
                            aria-label={`Watch ${anime.title}`}
                            className="group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                          >
                            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-500 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_24px_rgba(196,32,44,0.25)]">
                              <img 
                                src={anime.image || FALLBACK_IMAGE} 
                                alt={anime.title || 'Anime Cover'} 
                                loading="lazy" 
                                decoding="async"
                                onError={(e) => { if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE; }}
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-500" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                                <div className="bg-accent p-4 rounded-full shadow-[0_0_20px_rgba(196,32,44,0.6)] backdrop-blur-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-400">
                                  <Play size={20} fill="white" className="ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 px-1">
                              <h3 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">{anime.title}</h3>
                              <div className="flex items-center gap-2 mt-2 text-xs font-bold text-zinc-500">
                                <Seal score={anime.score} />
                                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                <span>{anime.ep_count} Eps</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <SectionHeader title="Browse Genres" className="mb-12" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                      {GENRES.map((genre) => (
                        <div
                          key={genre.id}
                          onClick={() => handleGenreClick(genre)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleGenreClick(genre); } }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Browse ${genre.name} Genre`}
                          className={`relative aspect-[16/10] rounded-lg bg-gradient-to-br ${genre.gradient} p-6 flex flex-col justify-end overflow-hidden cursor-pointer group shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                        >
                          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          <span className="relative text-xl md:text-2xl font-display font-extrabold tracking-tight text-white drop-shadow-md group-hover:scale-105 transition-transform duration-500 origin-bottom-left">
                            {genre.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === 'schedule' ? (
              <div className="container mx-auto px-10 md:px-16 pt-40 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                  <SectionHeader title="Anime Lists & Schedule" />
                  
                  {/* Sub-tab selection */}
                  <div className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5 backdrop-blur-md">
                    {[
                      { id: 'airing', label: 'Top Airing' },
                      { id: 'upcoming', label: 'Top Upcoming' },
                      { id: 'tv', label: 'TV Shows' },
                      { id: 'movie', label: 'Movies' }
                    ].map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => handleScheduleTabChange(sub.id)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-[14px] transition-all border-none cursor-pointer ${scheduleTab === sub.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-zinc-400 hover:text-white bg-transparent'}`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingSchedule ? (
                  <div className="text-xl text-zinc-400 animate-pulse font-bold flex items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-accent" />
                    Loading list...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
                    {scheduleAnime.map((anime, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => openAnime(anime)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openAnime(anime); } }}
                        role="button"
                        tabIndex={0}
                        aria-label={`Watch ${anime.title}`}
                        className="group relative cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
                      >
                        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-500 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_24px_rgba(196,32,44,0.25)]">
                          <img 
                            src={anime.image || FALLBACK_IMAGE} 
                            alt={anime.title || 'Anime Cover'} 
                            loading="lazy" 
                            decoding="async"
                            onError={(e) => { if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE; }}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-500" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                            <div className="bg-accent p-4 rounded-full shadow-[0_0_20px_rgba(196,32,44,0.6)] backdrop-blur-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-400">
                              <Play size={20} fill="white" className="ml-0.5" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 px-1">
                          <h3 className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">{anime.title}</h3>
                          <div className="flex items-center gap-2 mt-2 text-xs font-bold text-zinc-500">
                            <Seal score={anime.score} />
                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                            <span>{anime.ep_count} Eps</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'mylist' ? (
              <ErrorBoundary title="Failed to load dashboard">
                <Suspense fallback={
                  <div className="container mx-auto px-10 md:px-16 pt-40 pb-20 text-center flex items-center justify-center gap-3 text-zinc-400">
                    <Loader2 size={24} className="animate-spin text-accent" /> Loading your dashboard...
                  </div>
                }>
                  <Dashboard 
                    watchHistory={watchHistory} 
                    watchlist={watchlist} 
                    openAnime={openAnime}
                    removeFromHistory={removeFromHistory}
                    removeFromWatchlist={removeFromWatchlist}
                  />
                </Suspense>
              </ErrorBoundary>
            ) : (
              <>
                {/* Cinematic Hero Section */}
                {heroAnime.length > 0 && heroAnime[currentHeroIndex] && (
                  <section className="relative h-screen min-h-[800px] w-full flex items-center justify-start overflow-hidden">
                    <div className="absolute inset-0 bg-base" />
                    <div
                      key={heroAnime[currentHeroIndex].banner || heroAnime[currentHeroIndex].image}
                      className={`absolute inset-0 bg-cover scale-105 transition-opacity duration-1000 animate-[heroKen_18s_ease-in-out_infinite] ${heroAnime[currentHeroIndex].banner ? 'opacity-70 bg-[position:center_35%]' : 'opacity-35 bg-center'}`}
                      style={{ backgroundImage: `url(${heroAnime[currentHeroIndex].banner || heroAnime[currentHeroIndex].image})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-base via-base/30 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/55 to-transparent" />

                    <div className="relative container mx-auto px-10 md:px-16 pt-32">
                      <div className="max-w-[900px]">
                        <span className="inline-flex items-center gap-3 text-sm font-mono font-bold text-gold mb-8 tracking-[0.25em] uppercase">
                          <BrushDivider />
                          Trending This Season
                        </span>
                        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight mb-8 drop-shadow-2xl text-white line-clamp-2 md:line-clamp-3">
                          {heroAnime[currentHeroIndex].title}
                        </h1>
                        <div className="flex items-center gap-6 text-[15px] text-zinc-300 font-bold mb-8">
                          <Seal score={heroAnime[currentHeroIndex].score} size="lg" />
                          <span>{heroAnime[currentHeroIndex].ep_count} Eps</span>
                          <span className="text-zinc-600">|</span>
                          <span className="text-zinc-400 tracking-wide">HD · SUB / DUB</span>
                        </div>
                        <p className="text-[16px] text-zinc-300 leading-[1.8] mb-12 line-clamp-3 drop-shadow-lg font-medium max-w-[800px]">
                          {heroAnime[currentHeroIndex].synopsis}
                        </p>

                        <div className="flex items-center gap-3 w-full max-w-[420px]">
                          <button
                            onClick={() => openAnime(heroAnime[currentHeroIndex])}
                            aria-label={`Watch ${heroAnime[currentHeroIndex].title}`}
                            className="flex-1 flex items-center justify-center gap-2.5 bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] text-white font-extrabold text-[15px] px-8 py-3.5 rounded-lg shadow-lg shadow-accent/20 border-none cursor-pointer uppercase tracking-wide"
                          >
                            <Play size={18} fill="white" /> Watch Now
                          </button>
                          <button 
                            onClick={() => toggleWatchlist(heroAnime[currentHeroIndex])}
                            aria-label={isInWatchlist(heroAnime[currentHeroIndex]) ? "Remove from List" : "Add to List"}
                            title={isInWatchlist(heroAnime[currentHeroIndex]) ? "Remove from List" : "Add to List"}
                            className={`p-3.5 border transition-all rounded-lg cursor-pointer flex items-center justify-center hover:scale-[1.02] active:scale-[0.98] ${isInWatchlist(heroAnime[currentHeroIndex]) ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 text-white'}`}
                          >
                            <span className="text-[18px] font-bold">
                              {isInWatchlist(heroAnime[currentHeroIndex]) ? '✓' : '+'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Carousel controls */}
                    <button
                      onClick={() => setCurrentHeroIndex((currentHeroIndex - 1 + heroAnime.length) % heroAnime.length)}
                      aria-label="Previous Featured Anime"
                      className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md"
                    >
                      <ChevronLeft size={22} />
                    </button>
                    <button
                      onClick={() => setCurrentHeroIndex((currentHeroIndex + 1) % heroAnime.length)}
                      aria-label="Next Featured Anime"
                      className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-10 w-11 h-11 items-center justify-center rounded-full bg-black/30 hover:bg-black/50 border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer backdrop-blur-md"
                    >
                      <ChevronRight size={22} />
                    </button>
                    <div className="absolute bottom-20 md:bottom-24 left-10 md:left-16 z-10 flex items-center gap-2.5">
                      {heroAnime.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentHeroIndex(idx)}
                          aria-label={`Go to featured slide ${idx + 1}`}
                          className={`h-1.5 rounded-full border-none cursor-pointer transition-all duration-300 ${idx === currentHeroIndex ? 'w-8 bg-accent shadow-[0_0_10px_var(--color-accent)]' : 'w-3 bg-white/25 hover:bg-white/50'}`}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Cinematic Anime Lists */}
                <div className="container mx-auto px-4 sm:px-6 md:px-10 lg:px-16 -mt-10 md:-mt-20 relative z-10 space-y-12 md:space-y-24">
                  {watchHistory.length > 0 && (
                     <AnimeRow title="Continue Watching" icon={<Clock className="text-accent" />} animeList={watchHistory} openAnime={openAnime} />
                  )}
                  {recommendedAnime.length > 0 && (
                     <AnimeRow title="Recommended for You" icon={<Sparkles className="text-accent" />} animeList={recommendedAnime} openAnime={openAnime} />
                  )}
                  <AnimeRow title="Top Airing This Season" icon={<Flame className="text-accent" />} animeList={topAiring} openAnime={openAnime} />
                  <AnimeRow title="Epic Action & Adventure" icon={<Sparkles className="text-accent" />} animeList={actionAnime} openAnime={openAnime} />
                  <AnimeRow title="Trending Romance" icon={<Flame className="text-accent" />} animeList={romanceAnime} openAnime={openAnime} />
                </div>
              </>
            )}
          </main>
        </>
      )}

      {/* YouTube-style Player */}
      {selectedAnime && !selectedAnime.isManga && (
        <ErrorBoundary title="Player encountered an issue" onReset={closePlayer}>
          <Suspense fallback={
            <div className="fixed inset-0 z-[100] bg-base flex flex-col items-center justify-center gap-4 text-white">
              <Loader2 size={36} className="animate-spin text-accent" />
              <p className="font-display text-lg font-bold">Loading Theater Player...</p>
            </div>
          }>
            <div className={`player-page ${theaterMode ? 'theater' : ''}`}>
              {/* Header Bar */}
              <PlayerHeader 
                selectedAnime={selectedAnime}
                activeEpisode={activeEpisode}
                theaterMode={theaterMode}
                setTheaterMode={setTheaterMode}
                closePlayer={closePlayer}
              />

              {/* Main Content: 3-Column Layout */}
              <div className="player-body">
                {/* Left Sidebar: Episodes */}
                <PlayerSidebarLeft 
                  availableEpisodes={availableEpisodes}
                  activeEpisode={activeEpisode}
                  activeEpRange={activeEpRange}
                  setActiveEpRange={setActiveEpRange}
                  handleEpisodeChange={handleEpisodeChange}
                />

                {/* Center Column: Video & Server Controls */}
                <PlayerCenter 
                  isLoadingStream={isLoadingStream}
                  streamError={streamError}
                  activeStreamFormat={activeStreamFormat}
                  availableStreams={availableStreams}
                  theaterMode={theaterMode}
                  setTheaterMode={setTheaterMode}
                  playPrevEpisode={playPrevEpisode}
                  playNextEpisode={playNextEpisode}
                  activeEpisode={activeEpisode}
                  setActiveStreamFormat={setActiveStreamFormat}
                  relatedSeasons={relatedSeasons}
                  openAnime={openAnime}
                  nextAiringEpisode={nextAiringEpisode}
                  miningSourcesList={miningSourcesList}
                  activeMiningSource={activeMiningSource}
                  audioMode={audioMode}
                  audioNotice={audioNotice}
                  hasDubStreams={Object.keys(availableStreams).some(k => k.startsWith('dub-'))}
                  onAudioModeChange={(mode) => {
                    if (mode === 'dub') {
                      const dubKey = Object.keys(availableStreams).find(k => k.startsWith('dub-'));
                      if (dubKey) {
                        setAudioMode('dub');
                        setActiveStreamFormat(dubKey);
                        setAudioNotice(null);
                      } else {
                        setAudioMode('sub');
                        setAudioNotice(`English Dub is not available for Episode ${activeEpisode}. Continuing on Japanese Sub.`);
                        setTimeout(() => setAudioNotice(null), 4000);
                        if (selectedAnime) {
                          const targetTitle = selectedAnime.originalTitle || selectedAnime.title || '';
                          const triggerDubUrl = `https://ronin-api-proxy.vercel.app/api/trigger-miner?title=${encodeURIComponent(targetTitle + ' dub')}&episode=${activeEpisode}`;
                          fetch(triggerDubUrl).catch(e => console.error("Failed to trigger Dub miner", e));
                        }
                      }
                    } else {
                      setAudioMode('sub');
                      setAudioNotice(null);
                      const subKey = Object.keys(availableStreams).find(k => k.startsWith('server-') || k === 'main');
                      if (subKey) setActiveStreamFormat(subKey);
                    }
                  }}
                  onSourceChange={(sourceName) => fetchStream(selectedAnime, activeEpisode, sourceName)}
                />

                {/* Right Sidebar: Anime Info */}
                <PlayerSidebarRight 
                  selectedAnime={selectedAnime}
                  isInWatchlist={isInWatchlist}
                  toggleWatchlist={toggleWatchlist}
                  nextAiringEpisode={nextAiringEpisode}
                />
              </div>

              {/* Lower Player Expansion */}
              <PlayerExpansion 
                animeCharacters={animeCharacters}
                animeRecommendations={animeRecommendations}
                openAnime={openAnime}
              />
            </div>
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Manga Reader */}
      {selectedAnime && selectedAnime.isManga && (
        <ErrorBoundary title="Manga Reader encountered an issue" onReset={closePlayer}>
          <Suspense fallback={
            <div className="fixed inset-0 z-[100] bg-base flex flex-col items-center justify-center gap-4 text-white">
              <Loader2 size={36} className="animate-spin text-accent" />
              <p className="font-display text-lg font-bold">Loading Manga Reader...</p>
            </div>
          }>
            <MangaReader 
              selectedManga={selectedAnime} 
              closeReader={closePlayer} 
              user={user}
              supabase={supabase}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Authentication & Settings Modals */}
      <Suspense fallback={null}>
        {settingsModalOpen && (
          <SettingsModal 
            settingsModalOpen={settingsModalOpen}
            setSettingsModalOpen={setSettingsModalOpen}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            isUpdatingPassword={isUpdatingPassword}
            passwordUpdateMessage={passwordUpdateMessage}
            setPasswordUpdateMessage={setPasswordUpdateMessage}
            handlePasswordUpdate={handlePasswordUpdate}
          />
        )}

        {authModalOpen && (
          <AuthModal 
            authModalOpen={authModalOpen}
            setAuthModalOpen={setAuthModalOpen}
            isSignUp={isSignUp}
            setIsSignUp={setIsSignUp}
            authEmail={authEmail}
            setAuthEmail={setAuthEmail}
            authPassword={authPassword}
            setAuthPassword={setAuthPassword}
            authError={authError}
            setAuthError={setAuthError}
            authLoading={authLoading}
            handleAuthSubmit={handleAuthSubmit}
          />
        )}
      </Suspense>
    </div>
  );
}

export default App;
