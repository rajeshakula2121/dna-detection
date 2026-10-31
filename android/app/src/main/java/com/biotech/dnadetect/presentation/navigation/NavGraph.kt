package com.biotech.dnadetect.presentation.navigation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.*
import com.biotech.dnadetect.presentation.screens.*
import com.biotech.dnadetect.presentation.theme.Teal600
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.AuthViewModel

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Dashboard : Screen("dashboard", "Home", Icons.Default.Home)
    object Pattern : Screen("pattern", "Patterns", Icons.Default.Search)
    object Mutation : Screen("mutation", "Mutations", Icons.Default.CompareArrows)
    object Fasta : Screen("fasta", "FASTA", Icons.Default.FolderOpen)
    object Translation : Screen("translation", "ORFs", Icons.Default.Transform)
    object History : Screen("history", "History", Icons.Default.History)
    object Settings : Screen("settings", "Account", Icons.Default.AccountCircle)
    object Auth : Screen("auth", "Sign In", Icons.Default.Lock)
}

@Composable
fun MainNavigationApp(
    analysisViewModel: AnalysisViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
    authViewModel: AuthViewModel = androidx.lifecycle.viewmodel.compose.viewModel(),
    navController: NavHostController = rememberNavController()
) {
    // Primary bottom navigation items
    val bottomNavItems = listOf(
        Screen.Dashboard,
        Screen.Pattern,
        Screen.Mutation,
        Screen.History,
        Screen.Settings
    )

    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            if (currentRoute != Screen.Auth.route) {
                NavigationBar {
                    bottomNavItems.forEach { screen ->
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = currentRoute == screen.route,
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Teal600,
                                selectedTextColor = Teal600,
                                indicatorColor = Teal600.copy(alpha = 0.15f)
                            ),
                            onClick = {
                                navController.navigate(screen.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Screen.Dashboard.route,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(Screen.Dashboard.route) {
                DashboardScreen(
                    viewModel = analysisViewModel,
                    onNavigateToPattern = { navController.navigate(Screen.Pattern.route) },
                    onNavigateToMutation = { navController.navigate(Screen.Mutation.route) },
                    onNavigateToFasta = { navController.navigate(Screen.Fasta.route) },
                    onNavigateToTranslation = { navController.navigate(Screen.Translation.route) },
                    onNavigateToHistory = { navController.navigate(Screen.History.route) },
                    onNavigateToSettings = { navController.navigate(Screen.Settings.route) }
                )
            }

            composable(Screen.Pattern.route) {
                PatternAnalysisScreen(viewModel = analysisViewModel)
            }

            composable(Screen.Mutation.route) {
                MutationDetectionScreen(viewModel = analysisViewModel)
            }

            composable(Screen.Fasta.route) {
                FastaScreen(
                    viewModel = analysisViewModel,
                    onNavigateToMutation = { navController.navigate(Screen.Mutation.route) },
                    onNavigateToPattern = { navController.navigate(Screen.Pattern.route) }
                )
            }

            composable(Screen.Translation.route) {
                TranslationScreen(viewModel = analysisViewModel)
            }

            composable(Screen.History.route) {
                HistoryScreen(viewModel = analysisViewModel)
            }

            composable(Screen.Settings.route) {
                SettingsScreen(
                    authViewModel = authViewModel,
                    analysisViewModel = analysisViewModel,
                    onSignOut = {
                        navController.navigate(Screen.Auth.route) {
                            popUpTo(0) { inclusive = true }
                        }
                    }
                )
            }

            composable(Screen.Auth.route) {
                AuthScreen(
                    viewModel = authViewModel,
                    onAuthSuccess = {
                        navController.navigate(Screen.Dashboard.route) {
                            popUpTo(Screen.Auth.route) { inclusive = true }
                        }
                    }
                )
            }
        }
    }
}
