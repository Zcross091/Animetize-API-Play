/**
 * 4-Tier Anime Metadata Provider Fallback Service:
 * Tier 1: Jikan (api.jikan.moe) - Primary REST API (MAL data)
 * Tier 2: AniList (graphql.anilist.co) - Secondary GraphQL API
 * Tier 3: Kitsu (kitsu.app/api) - Tertiary JSON:API
 * Tier 4: Shikimori (shikimori.one/api) - Quaternary REST API
 */

export async function fetchAnimeMetadataWithFallbacks(searchQuery) {
  const cleanQuery = searchQuery?.trim();
  if (!cleanQuery) return null;

  // ── Tier 1: Jikan API (api.jikan.moe) ──
  try {
    const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(cleanQuery)}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const anime = data.data?.[0];
      if (anime) {
        return {
          id: anime.mal_id,
          title: anime.title_english || anime.title,
          romajiTitle: anime.title,
          englishTitle: anime.title_english,
          japaneseTitle: anime.title_japanese,
          synonyms: anime.title_synonyms || [],
          bannerImage: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          coverImage: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
          description: anime.synopsis,
          episodes: anime.episodes || 0,
          averageScore: anime.score ? Math.round(anime.score * 10) : null,
          status: anime.status,
          genres: anime.genres?.map(g => g.name) || [],
          source: 'jikan'
        };
      }
    }
  } catch (e) {
    console.warn("⚠️ Tier 1 (Jikan) failed. Falling back to Tier 2 (AniList)...", e);
  }

  // ── Tier 2: AniList GraphQL (graphql.anilist.co) ──
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query: `query ($search: String) {
          Media (search: $search, type: ANIME) {
            id
            title { romaji english native }
            synonyms
            averageScore
            episodes
            status
            description
            coverImage { extraLarge large medium }
            bannerImage
            genres
            nextAiringEpisode { episode airingAt }
          }
        }`,
        variables: { search: cleanQuery }
      })
    });
    if (res.ok) {
      const data = await res.json();
      const media = data.data?.Media;
      if (media) {
        return {
          id: media.id,
          title: media.title?.english || media.title?.romaji,
          romajiTitle: media.title?.romaji,
          englishTitle: media.title?.english,
          japaneseTitle: media.title?.native,
          synonyms: media.synonyms || [],
          bannerImage: media.bannerImage || media.coverImage?.extraLarge,
          coverImage: media.coverImage?.extraLarge || media.coverImage?.large,
          description: media.description?.replace(/<[^>]*>?/gm, ''),
          episodes: media.episodes || 0,
          averageScore: media.averageScore,
          status: media.status,
          genres: media.genres || [],
          nextAiringEpisode: media.nextAiringEpisode,
          source: 'anilist'
        };
      }
    }
  } catch (e) {
    console.warn("⚠️ Tier 2 (AniList) failed. Falling back to Tier 3 (Kitsu)...", e);
  }

  // ── Tier 3: Kitsu REST API (kitsu.app/api) ──
  try {
    const res = await fetch(`https://kitsu.app/api/edge/anime?filter[text]=${encodeURIComponent(cleanQuery)}&page[limit]=1`);
    if (res.ok) {
      const data = await res.json();
      const anime = data.data?.[0]?.attributes;
      if (anime) {
        return {
          id: data.data[0].id,
          title: anime.titles?.en || anime.canonicalTitle || anime.titles?.en_jp,
          romajiTitle: anime.canonicalTitle,
          englishTitle: anime.titles?.en,
          japaneseTitle: anime.titles?.ja_jp,
          synonyms: anime.abbreviatedTitles || [],
          bannerImage: anime.coverImage?.original || anime.coverImage?.large || anime.posterImage?.original,
          coverImage: anime.posterImage?.original || anime.posterImage?.large,
          description: anime.synopsis,
          episodes: anime.episodeCount || 0,
          averageScore: anime.averageRating ? Math.round(parseFloat(anime.averageRating)) : null,
          status: anime.status,
          genres: [],
          source: 'kitsu'
        };
      }
    }
  } catch (e) {
    console.warn("⚠️ Tier 3 (Kitsu) failed. Falling back to Tier 4 (Shikimori)...", e);
  }

  // ── Tier 4: Shikimori API (shikimori.one/api) ──
  try {
    const res = await fetch(`https://shikimori.one/api/animes?search=${encodeURIComponent(cleanQuery)}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      const anime = data?.[0];
      if (anime) {
        return {
          id: anime.id,
          title: anime.name || anime.russian,
          romajiTitle: anime.name,
          englishTitle: anime.name,
          japaneseTitle: anime.japanese?.[0] || anime.name,
          synonyms: [],
          bannerImage: anime.image?.original ? `https://shikimori.one${anime.image.original}` : null,
          coverImage: anime.image?.original ? `https://shikimori.one${anime.image.original}` : null,
          description: '',
          episodes: anime.episodes || 0,
          averageScore: anime.score ? Math.round(parseFloat(anime.score) * 10) : null,
          status: anime.status,
          genres: [],
          source: 'shikimori'
        };
      }
    }
  } catch (e) {
    console.warn("⚠️ Tier 4 (Shikimori) failed.", e);
  }

  return null;
}
