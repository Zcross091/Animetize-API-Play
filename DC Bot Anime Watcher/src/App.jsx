import { useState, useEffect } from 'react'
import { DiscordSDK } from '@discord/embedded-app-sdk'
import { supabase } from './supabaseClient'
import './App.css'

// Optional: Initialize Discord SDK if running inside Discord
// We wrap it in a try-catch so it still works in a regular browser during dev
let discordSdk = null;
try {
  // If we had a Client ID we could initialize it properly, 
  // but for a simple iframe activity, we just need to ensure the UI fits.
  // discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
} catch (e) {
  console.log("Not running in Discord environment or missing Client ID");
}

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  
  const [activeVideo, setActiveVideo] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setResults([])
    setActiveVideo(null)

    try {
      // Query the Supabase database directly for anime titles matching the search
      const { data, error: dbError } = await supabase
        .from('anime_links')
        .select('*')
        .ilike('title', `%${searchQuery}%`)
        .eq('status', 'ACTIVE')
        .not('url', 'ilike', 'magnet:%')
        .order('title', { ascending: true })
        .order('episode', { ascending: true })
        .limit(50)

      if (dbError) throw dbError

      if (data && data.length > 0) {
        setResults(data)
      } else {
        setError("No streams found. The miners might still be uploading this anime!")
      }
    } catch (err) {
      console.error(err)
      setError("Failed to connect to the database. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="app-container">
      {/* Search Bar - Hidden if watching a video to maximize space */}
      {!activeVideo && (
        <form className="search-bar" onSubmit={handleSearch}>
          <input 
            type="text" 
            className="search-input"
            placeholder="Search for anime (e.g., One Piece, Naruto)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="search-button" disabled={isSearching}>
            {isSearching ? 'SEARCHING...' : 'SEARCH'}
          </button>
        </form>
      )}

      <div className="content-area">
        {/* Video Player View */}
        {activeVideo && (
          <div className="video-container">
            <button className="back-button" onClick={() => setActiveVideo(null)}>
              ← Back to Results
            </button>
            <iframe 
              src={activeVideo.url} 
              className="video-player"
              allowFullScreen
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            ></iframe>
          </div>
        )}

        {/* Search Results Grid */}
        {!activeVideo && results.length > 0 && (
          <div className="results-grid">
            {results.map((anime) => (
              <div 
                key={`${anime.title}-${anime.episode}`} 
                className="anime-card"
                onClick={() => setActiveVideo(anime)}
              >
                <div className="anime-title">{anime.title}</div>
                <div className="anime-ep">Episode {anime.episode}</div>
              </div>
            ))}
          </div>
        )}

        {/* Status Messages */}
        {!activeVideo && results.length === 0 && !isSearching && !error && (
          <div className="status-message">
            <h2>Welcome to ANISTREAM</h2>
            <p>Enter an anime name above to search the database.</p>
          </div>
        )}

        {!activeVideo && error && (
          <div className="status-message error-message">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
