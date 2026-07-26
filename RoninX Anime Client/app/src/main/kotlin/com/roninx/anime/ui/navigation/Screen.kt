package com.roninx.anime.ui.navigation

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object Manga : Screen("manga")
    object Browse : Screen("browse")
    object Search : Screen("search")
    object MyList : Screen("mylist")
    object Detail : Screen("detail/{animeId}") {
        fun createRoute(animeId: Int) = "detail/$animeId"
    }
    object Player : Screen("player/{animeId}/{episode}") {
        fun createRoute(animeId: Int, episode: Int) = "player/$animeId/$episode"
    }
}
