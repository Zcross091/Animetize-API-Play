package com.roninx.anime

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.roninx.anime.ui.detail.DetailScreen
import com.roninx.anime.ui.detail.DetailViewModel
import com.roninx.anime.ui.home.HomeScreen
import com.roninx.anime.ui.home.HomeViewModel
import com.roninx.anime.ui.player.PlayerScreen
import com.roninx.anime.ui.player.PlayerViewModel
import com.roninx.anime.ui.search.SearchScreen
import com.roninx.anime.ui.search.SearchViewModel
import com.roninx.anime.ui.navigation.Screen
import com.roninx.anime.ui.theme.RoninBase
import com.roninx.anime.ui.theme.RoninRed
import com.roninx.anime.ui.theme.RoninXAnimeTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            RoninXAnimeTheme {
                MainScreen()
            }
        }
    }
}

@Composable
fun MainScreen() {
    val navController = rememberNavController()
    val items = listOf(
        BottomNavItem("Home", Screen.Home.route, Icons.Default.Home),
        BottomNavItem("Manga", Screen.Manga.route, Icons.Default.List),
        BottomNavItem("Browse", Screen.Browse.route, Icons.Default.Menu),
        BottomNavItem("Search", Screen.Search.route, Icons.Default.Search),
        BottomNavItem("My List", Screen.MyList.route, Icons.Default.Person)
    )

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = RoninBase,
                contentColor = Color.White
            ) {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                items.forEach { item ->
                    NavigationBarItem(
                        icon = { Icon(item.icon, contentDescription = item.title) },
                        label = { Text(item.title) },
                        selected = currentDestination?.hierarchy?.any { it.route == item.route } == true,
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = RoninRed,
                            selectedTextColor = RoninRed,
                            unselectedIconColor = Color.Gray,
                            unselectedTextColor = Color.Gray,
                            indicatorColor = RoninBase
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController, 
            startDestination = Screen.Home.route, 
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Home.route) {
                val viewModel: HomeViewModel = hiltViewModel()
                HomeScreen(viewModel = viewModel, onAnimeClick = { anime ->
                    navController.navigate(Screen.Detail.createRoute(anime.mal_id))
                })
            }
            composable(
                Screen.Detail.route,
                arguments = listOf(navArgument("animeId") { type = NavType.IntType })
            ) {
                val viewModel: DetailViewModel = hiltViewModel()
                DetailScreen(
                    viewModel = viewModel,
                    onBackClick = { navController.popBackStack() },
                    onEpisodeClick = { anime, episode ->
                        navController.navigate(Screen.Player.createRoute(anime.mal_id, episode))
                    }
                )
            }
            composable(
                Screen.Player.route,
                arguments = listOf(
                    navArgument("animeId") { type = NavType.IntType },
                    navArgument("episode") { type = NavType.IntType }
                )
            ) {
                val viewModel: PlayerViewModel = hiltViewModel()
                PlayerScreen(
                    viewModel = viewModel,
                    onBackClick = { navController.popBackStack() }
                )
            }
            composable(Screen.Manga.route) { PlaceholderScreen("Manga") }
            composable(Screen.Browse.route) { PlaceholderScreen("Browse") }
            composable(Screen.Search.route) {
                val viewModel: SearchViewModel = hiltViewModel()
                SearchScreen(
                    viewModel = viewModel,
                    onAnimeClick = { anime ->
                        navController.navigate(Screen.Detail.createRoute(anime.mal_id))
                    }
                )
            }
            composable(Screen.MyList.route) { PlaceholderScreen("My List") }
        }
    }
}

@Composable
fun PlaceholderScreen(name: String) {
    Box(modifier = Modifier.fillMaxSize().background(RoninBase), contentAlignment = Alignment.Center) {
        Text(text = "$name Screen coming soon!", color = Color.White)
    }
}

data class BottomNavItem(val title: String, val route: String, val icon: ImageVector)
