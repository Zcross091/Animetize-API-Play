import React, { useState, useEffect } from 'react';
import { Play, Search, User, Menu, Loader2, HardDriveDownload, Sparkles, Flame, Clock, Trophy, Grid } from 'lucide-react';

// --- Types ---
type Anime = {
  id: number;
  title: string;
  image: string;
  score: number;
  episodes: number | null;
  genres: string[];
  synopsis: string;
};

// --- Mock Data ---
const mockHero: Anime = {
  id: 1,
  title: "Mushoku Tensei: Jobless Reincarnation Season 3",
  image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx108465-B1R2PryY7O1Z.jpg",
  score: 8.6,
  episodes: 24,
  genres: ["Action", "Adventure", "Drama", "Ecchi", "Fantasy"],
  synopsis: "The third season of Mushoku Tensei: Isekai Ittara Honki Dasu. Following the events of the Teleport Incident, Rudeus Greyrat continues his journey across the vast world."
};

const mockList: Anime[] = [
  { id: 2, title: "Trapped in a Dating Sim", image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx142340-0vHhV0Z6Vw4V.jpg", score: 7.6, episodes: 12, genres: [], synopsis: "" },
  { id: 3, title: "Grand Blue Dreaming Season 2", image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx100922-hAozEw4sN86X.jpg", score: 8.4, episodes: 12, genres: [], synopsis: "" },
  { id: 4, title: "Skeleton Knight in Another World", image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx132474-x9zWq8D26jP5.jpg", score: 7.2, episodes: 12, genres: [], synopsis: "" },
  { id: 5, title: "You and I Are Polar Opposites", image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx146646-v7uE8w7L3PqS.jpg", score: 7.8, episodes: 12, genres: [], synopsis: "" },
  { id: 6, title: "I Want to Love You Till You Die", image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx158791-P9w9s8v6B4J3.png", score: 7.1, episodes: 12, genres: [], synopsis: "" },
  { id: 7, title: "Solo Leveling: Beyond", image: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx151807-m1gX3iwQjQHQ.png", score: 8.8, episodes: 12, genres: [], synopsis: "" }
];

const mockGenres = [
  { name: "Action", image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/101922-YfZhKABsomRy.jpg" },
  { name: "Romance", image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-jQBSkxWAAk83.jpg" },
  { name: "Sci-Fi", image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/9253-xXXXpQ6q48XG.jpg" },
  { name: "Fantasy", image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/11061-n5O5r9H5l5QG.jpg" },
  { name: "Slice of Life", image: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/112641-sS8o8hZ5v5q4.jpg" },
];

export default function App() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleExtract = (server: string) => {
    setIsExtracting(true);
    setTimeout(() => {
      alert(`Successfully simulated DB check for ${server}!\nReady to auto-play video.`);
      setIsExtracting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-base text-white pb-48 font-sans">
      {/* 1. Luxurious Frosted Glass Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-base/80 backdrop-blur-2xl border-b border-white/5 py-6' : 'bg-transparent py-10'}`}>
        <div className="container mx-auto px-10 md:px-16 flex items-center justify-between">
          <div className="flex items-center gap-14">
            <a href="/" className="text-4xl font-black text-accent tracking-tighter drop-shadow-lg">RONIN</a>
            <div className="hidden md:flex items-center gap-10 text-[17px] font-bold text-zinc-400">
              <a href="/" className="text-accent hover:text-accent-hover transition-colors">Home</a>
              <a href="/" className="hover:text-white transition-colors">My List</a>
              <a href="/" className="hover:text-white transition-colors">Browse</a>
              <a href="/" className="hover:text-white transition-colors">Schedule</a>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="relative hidden lg:block">
              <input 
                type="text" 
                placeholder="Search for an anime..." 
                className="bg-white/5 border border-white/10 rounded-full py-3.5 pl-8 pr-14 text-base text-zinc-200 focus:outline-none focus:border-accent/50 focus:bg-white/10 w-96 transition-all font-medium placeholder-zinc-500"
              />
              <Search size={20} className="absolute right-5 top-1/2 -translate-y-1/2 text-zinc-400" />
            </div>
            <button className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><User size={24} /></button>
            <button className="p-3.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors md:hidden"><Menu size={24} /></button>
          </div>
        </div>
      </nav>

      {/* 2. Cinematic Hero Section */}
      <section className="relative h-screen min-h-[800px] w-full flex items-center justify-start overflow-hidden">
        {/* Background Layers */}
        <div className="absolute inset-0 bg-base" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 scale-105" 
          style={{ backgroundImage: `url(https://s4.anilist.co/file/anilistcdn/media/anime/banner/108465-bAIGxPoyR2Y9.jpg)` }} 
        />
        {/* Gradients tailored for the dark Ronin indigo/base */}
        <div className="absolute inset-0 bg-gradient-to-t from-base via-base/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-base/95 via-base/80 to-transparent" />

        {/* Hero Content */}
        <div className="relative container mx-auto px-10 md:px-16 pt-32">
          <div className="max-w-[900px]">
            <span className="inline-flex items-center gap-3 text-sm font-mono font-bold text-accent mb-8 tracking-[0.25em] uppercase">
              <span className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_15px_var(--color-accent)]" />
              AniList #1 Trending
            </span>
            <h1 className="text-6xl md:text-[90px] font-black leading-[0.95] tracking-tight mb-10 drop-shadow-2xl text-white">
              {mockHero.title}
            </h1>
            <div className="flex items-center gap-6 text-[18px] text-zinc-300 font-bold mb-8">
              <span className="flex items-center gap-2 text-white bg-accent/90 backdrop-blur-md rounded-md px-4 py-1.5 shadow-lg shadow-accent/20">
                ★ {mockHero.score}
              </span>
              <span>{mockHero.episodes} Eps</span>
              <span className="text-zinc-600">|</span>
              <span className="text-zinc-400 tracking-wide">{mockHero.genres.join(" · ")}</span>
            </div>
            <p className="text-[20px] text-zinc-300 leading-[1.8] mb-12 line-clamp-3 drop-shadow-lg font-medium max-w-[800px]">
              {mockHero.synopsis}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-wrap items-center gap-6">
                <button
                  onClick={() => handleExtract("Server 1")}
                  disabled={isExtracting}
                  className="flex items-center justify-center gap-4 bg-accent hover:bg-accent-hover disabled:bg-accent/50 disabled:cursor-not-allowed transition-all hover:scale-105 text-white font-black text-lg px-14 py-5 rounded-xl w-72 shadow-[0_0_40px_rgba(230,52,98,0.4)]"
                >
                  {isExtracting ? (
                    <><Loader2 size={24} className="animate-spin" /> Fetching DB...</>
                  ) : (
                    <><Play size={24} fill="white" /> WATCH NOW</>
                  )}
                </button>
                <button className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 hover:bg-white/10 transition-colors text-white font-bold text-lg px-12 py-5 rounded-xl">
                  + Add to List
                </button>
              </div>
              
              {/* Ronin Server Selection */}
              <div className="flex items-center gap-4 mt-6 bg-surface/50 backdrop-blur-2xl w-max p-3 rounded-2xl border border-white/5 shadow-2xl">
                <span className="text-[13px] text-zinc-400 font-bold uppercase tracking-[0.2em] mx-4">Extraction Servers</span>
                <div className="w-px h-6 bg-white/10 mr-2" />
                {["Server 1", "Server 2", "Server 3"].map((server) => (
                  <button 
                    key={server}
                    onClick={() => handleExtract(server)}
                    disabled={isExtracting}
                    className="text-sm font-bold text-zinc-300 bg-transparent hover:bg-white/10 hover:text-white px-5 py-3 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {server}
                  </button>
                ))}
                <div className="w-px h-6 bg-white/10 mx-2" />
                <button 
                  onClick={() => handleExtract("Torrents")}
                  disabled={isExtracting}
                  className="flex items-center gap-2.5 text-sm font-bold text-accent hover:bg-accent/10 px-5 py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  <HardDriveDownload size={18} /> Torrents
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Luxurious Cinematic Anime Lists */}
      {/* Huge space-y to give the layout breathing room */}
      <main className="container mx-auto px-10 md:px-16 -mt-20 relative z-10 space-y-40">
        <AnimeRow title="Top Airing This Season" icon={<Flame className="text-accent" />} animes={mockList} />
        <GenreRow title="Browse by Genre" icon={<Grid className="text-accent" />} genres={mockGenres} />
        <AnimeRow title="New Episodes" icon={<Sparkles className="text-accent" />} animes={mockList.slice().reverse()} />
        <AnimeRow title="Popular Now" icon={<Flame className="text-accent" />} animes={mockList} />
        <AnimeRow title="Coming Up" icon={<Clock className="text-accent" />} animes={mockList.slice().reverse()} />
        <AnimeRow title="Best of All Time" icon={<Trophy className="text-gold" />} animes={mockList} />
      </main>
    </div>
  );
}

// --- Anime Carousel Component ---
function AnimeRow({ title, icon, animes }: { title: string, icon: React.ReactNode, animes: Anime[] }) {
  return (
    <section>
      <div className="flex items-center gap-5 mb-12">
        <div className="w-2 h-10 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]" />
        <div className="flex items-center gap-4">
          {icon}
          <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-md">{title}</h2>
        </div>
      </div>
      
      {/* Massive cards and gap */}
      <div className="flex overflow-x-auto gap-8 pb-12 hide-scrollbar -mx-10 px-10 sm:mx-0 sm:px-0">
        {animes.map((anime) => (
          <div 
            key={anime.id} 
            className="group relative flex-none w-[240px] sm:w-[280px] md:w-[320px] cursor-pointer"
          >
            {/* Enlarged Image Container */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-surface border border-white/5 group-hover:border-accent/50 transition-all duration-700 shadow-2xl shadow-black/60 group-hover:shadow-[0_0_40px_rgba(230,52,98,0.2)]">
              <img 
                src={anime.image} 
                alt={anime.title} 
                className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-700" />
              
              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="bg-accent p-6 rounded-full shadow-[0_0_40px_rgba(230,52,98,0.6)] backdrop-blur-lg transform translate-y-8 group-hover:translate-y-0 transition-all duration-700">
                  <Play size={32} fill="white" className="ml-1" />
                </div>
              </div>
            </div>

            {/* Meta Information */}
            <div className="mt-5 px-2">
              <h3 className="text-[18px] font-bold text-zinc-100 line-clamp-2 leading-snug group-hover:text-accent transition-colors">
                {anime.title}
              </h3>
              <div className="flex items-center gap-3 mt-3 text-sm font-bold text-zinc-500 tracking-wide">
                <span className="flex items-center gap-1.5 text-accent">
                  <span className="text-[17px] drop-shadow-[0_0_8px_var(--color-accent)]">★</span>
                  {anime.score === 0 ? "N/A" : anime.score}
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                <span>{anime.episodes || "?"} Episodes</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Genre Row Component ---
function GenreRow({ title, icon, genres }: { title: string, icon: React.ReactNode, genres: {name: string, image: string}[] }) {
  return (
    <section>
      <div className="flex items-center gap-5 mb-12">
        <div className="w-2 h-10 bg-accent rounded-full shadow-[0_0_15px_var(--color-accent)]" />
        <div className="flex items-center gap-4">
          {icon}
          <h2 className="text-4xl font-black tracking-tight text-white drop-shadow-md">{title}</h2>
        </div>
      </div>
      
      <div className="flex overflow-x-auto gap-8 pb-12 hide-scrollbar -mx-10 px-10 sm:mx-0 sm:px-0">
        {genres.map((genre) => (
          <div 
            key={genre.name} 
            className="group relative flex-none w-[320px] md:w-[400px] h-[160px] cursor-pointer overflow-hidden rounded-3xl border border-white/5 hover:border-accent/50 transition-all duration-700 shadow-2xl"
          >
            <img 
              src={genre.image} 
              alt={genre.name} 
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-40 group-hover:opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-base/90 to-transparent" />
            <div className="absolute inset-0 flex items-center px-10">
              <span className="text-3xl font-black text-white drop-shadow-xl tracking-wider group-hover:text-accent transition-colors">
                {genre.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
