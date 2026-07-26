package com.roninx.anime.data.api

import retrofit2.http.GET
import retrofit2.http.Query

interface RoninProxyApi {
    @GET("api/db")
    suspend fun getStreamLinks(
        @Query("episode") episode: Int,
        @Query("title") title: String,
        @Query("searchVariants") searchVariantsJson: String
    ): List<StreamLink>

    @GET("api/trigger-miner")
    suspend fun triggerMiner(
        @Query("title") title: String,
        @Query("episode") episode: Int,
        @Query("source") source: String? = null
    )
}

data class StreamLink(
    val title: String,
    val url: String,
    val type: String? = null
)
