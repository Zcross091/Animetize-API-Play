package com.roninx.anime.data.api

import retrofit2.http.GET
import retrofit2.http.Query

interface JikanApi {
    @GET("seasons/now")
    suspend fun getSeasonNow(
        @Query("limit") limit: Int = 15
    ): JikanResponse

    @GET("anime")
    suspend fun searchAnime(
        @Query("q") query: String,
        @Query("limit") limit: Int = 15
    ): JikanResponse

    @GET("anime")
    suspend fun getAnimeByGenre(
        @Query("genres") genres: String,
        @Query("order_by") orderBy: String = "popularity",
        @Query("sort") sort: String = "asc",
        @Query("limit") limit: Int = 15
    ): JikanResponse
}

data class JikanResponse(
    val data: List<JikanAnime>
)

data class JikanAnime(
    val mal_id: Int,
    val title: String,
    val title_english: String?,
    val images: JikanImages,
    val episodes: Int?,
    val score: Double?,
    val synopsis: String?
)

data class JikanImages(
    val jpg: JikanJpg
)

data class JikanJpg(
    val large_image_url: String
)
