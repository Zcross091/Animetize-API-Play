package com.roninx.anime.ui.player

import android.content.Context
import android.net.Uri
import androidx.annotation.OptIn
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import com.roninx.anime.data.api.JikanAnime
import com.roninx.anime.data.api.StreamLink
import com.roninx.anime.data.repository.AnimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val repository: AnimeRepository,
    @ApplicationContext private val context: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val animeId: Int = checkNotNull(savedStateHandle["animeId"])
    private val episode: Int = checkNotNull(savedStateHandle["episode"])

    private val _uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)
    val uiState: StateFlow<PlayerUiState> = _uiState

    val player: ExoPlayer = ExoPlayer.Builder(context).build().apply {
        prepare()
        playWhenReady = true
    }

    init {
        fetchStreamAndPlay()
    }

    private fun fetchStreamAndPlay() {
        viewModelScope.launch {
            try {
                val anime = repository.getAnimeFull(animeId)
                val streams = repository.getStreamLinks(
                    title = anime.title,
                    originalTitle = anime.title_english ?: anime.title,
                    synonyms = emptyList(), // Can add synonyms if needed
                    episode = episode
                )

                if (streams.isNotEmpty()) {
                    val streamToPlay = streams.firstOrNull { it.url.startsWith("http") }
                    if (streamToPlay != null) {
                        playStream(streamToPlay.url)
                        _uiState.value = PlayerUiState.Success(anime, episode)
                    } else {
                        _uiState.value = PlayerUiState.Error("No playable stream found. Miner triggered.")
                        repository.triggerMiner(anime.title, episode)
                    }
                } else {
                    _uiState.value = PlayerUiState.Error("Fetching stream... Miner triggered.")
                    repository.triggerMiner(anime.title, episode)
                }
            } catch (e: Exception) {
                _uiState.value = PlayerUiState.Error(e.message ?: "Unknown error")
            }
        }
    }

    @OptIn(UnstableApi::class)
    private fun playStream(url: String) {
        val mediaItem = MediaItem.Builder()
            .setUri(Uri.parse(url))
            .setMimeType(if (url.contains("m3u8")) MimeTypes.APPLICATION_M3U8 else MimeTypes.VIDEO_MP4)
            .build()
        player.setMediaItem(mediaItem)
    }

    override fun onCleared() {
        super.onCleared()
        player.release()
    }
}

sealed class PlayerUiState {
    object Loading : PlayerUiState()
    data class Success(val anime: JikanAnime, val episode: Int) : PlayerUiState()
    data class Error(val message: String) : PlayerUiState()
}
