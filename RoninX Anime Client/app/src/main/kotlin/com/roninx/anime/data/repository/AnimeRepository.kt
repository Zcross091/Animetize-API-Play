package com.roninx.anime.data.repository

import com.roninx.anime.data.api.JikanApi
import com.roninx.anime.data.api.JikanAnime
import com.roninx.anime.data.api.RoninProxyApi
import com.roninx.anime.data.api.StreamLink
import com.roninx.anime.data.util.TitleUtils
import com.google.gson.Gson
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnimeRepository @Inject constructor(
    private val jikanApi: JikanApi,
    private val roninProxyApi: RoninProxyApi
) {
    suspend fun getTopAiring(): List<JikanAnime> {
        return jikanApi.getSeasonNow().data
    }

    suspend fun getActionAnime(): List<JikanAnime> {
        return jikanApi.getAnimeByGenre("1").data
    }

    suspend fun getRomanceAnime(): List<JikanAnime> {
        return jikanApi.getAnimeByGenre("22").data
    }

    suspend fun searchAnime(query: String): List<JikanAnime> {
        return jikanApi.searchAnime(query).data
    }

    suspend fun getAnimeFull(id: Int): JikanAnime {
        return jikanApi.getAnimeFull(id).data
    }

    suspend fun getStreamLinks(title: String, originalTitle: String?, synonyms: List<String>, episode: Int): List<StreamLink> {
        val variants = TitleUtils.buildVariants(listOf(title, originalTitle) + synonyms)
        val variantsJson = Gson().toJson(variants)
        return roninProxyApi.getStreamLinks(episode, originalTitle ?: title, variantsJson)
    }

    suspend fun triggerMiner(title: String, episode: Int) {
        roninProxyApi.triggerMiner(title, episode)
    }
}
