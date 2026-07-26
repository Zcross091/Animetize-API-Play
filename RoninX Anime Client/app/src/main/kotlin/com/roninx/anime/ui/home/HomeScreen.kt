package com.roninx.anime.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.roninx.anime.data.api.JikanAnime
import com.roninx.anime.ui.components.AnimeRow
import com.roninx.anime.ui.theme.RoninBase
import com.roninx.anime.ui.theme.RoninRed

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onAnimeClick: (JikanAnime) -> Unit
) {
    val uiState by viewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize().background(RoninBase)) {
        when (val state = uiState) {
            is HomeUiState.Loading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = RoninRed
                )
            }
            is HomeUiState.Success -> {
                HomeContent(
                    state = state,
                    onAnimeClick = onAnimeClick
                )
            }
            is HomeUiState.Error -> {
                Text(
                    text = state.message,
                    color = Color.Red,
                    modifier = Modifier.align(Alignment.Center)
                )
            }
        }
    }
}

@Composable
fun HomeContent(
    state: HomeUiState.Success,
    onAnimeClick: (JikanAnime) -> Unit
) {
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
    ) {
        // Hero Section (Simple first one for now)
        if (state.heroAnime.isNotEmpty()) {
            HeroSection(anime = state.heroAnime[0], onClick = { onAnimeClick(state.heroAnime[0]) })
        }

        Spacer(modifier = Modifier.height(24.dp))

        AnimeRow(
            title = "Top Airing",
            animeList = state.topAiring,
            onAnimeClick = onAnimeClick
        )

        Spacer(modifier = Modifier.height(24.dp))

        AnimeRow(
            title = "Action",
            animeList = state.actionAnime,
            onAnimeClick = onAnimeClick
        )

        Spacer(modifier = Modifier.height(24.dp))

        AnimeRow(
            title = "Romance",
            animeList = state.romanceAnime,
            onAnimeClick = onAnimeClick
        )
        
        Spacer(modifier = Modifier.height(100.dp)) // Bottom nav space
    }
}

@Composable
fun HeroSection(
    anime: JikanAnime,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(450.dp)
    ) {
        AsyncImage(
            model = anime.images.jpg.large_image_url,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            RoninBase.copy(alpha = 0.5f),
                            RoninBase
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(24.dp)
        ) {
            Text(
                text = "TRENDING NOW",
                color = RoninRed,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 2.sp
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = anime.title_english ?: anime.title,
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                lineHeight = 38.sp
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = anime.synopsis?.take(150) + "...",
                color = Color.LightGray,
                fontSize = 14.sp,
                maxLines = 3,
                lineHeight = 20.sp
            )
        }
    }
}
