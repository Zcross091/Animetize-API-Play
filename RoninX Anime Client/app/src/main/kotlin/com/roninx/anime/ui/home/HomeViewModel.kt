package com.roninx.anime.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.roninx.anime.data.api.JikanAnime
import com.roninx.anime.data.repository.AnimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: AnimeRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState

    init {
        fetchHomeData()
    }

    private fun fetchHomeData() {
        viewModelScope.launch {
            try {
                val topAiring = repository.getTopAiring()
                val action = repository.getActionAnime()
                val romance = repository.getRomanceAnime()
                
                _uiState.value = HomeUiState.Success(
                    heroAnime = topAiring.take(5),
                    topAiring = topAiring.drop(5),
                    actionAnime = action,
                    romanceAnime = romance
                )
            } catch (e: Exception) {
                _uiState.value = HomeUiState.Error(e.message ?: "Unknown error")
            }
        }
    }
}

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(
        val heroAnime: List<JikanAnime>,
        val topAiring: List<JikanAnime>,
        val actionAnime: List<JikanAnime>,
        val romanceAnime: List<JikanAnime>
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}
