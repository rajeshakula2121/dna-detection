package com.biotech.dnadetect.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.biotech.dnadetect.data.repository.FirebaseRepository
import com.biotech.dnadetect.presentation.navigation.MainNavigationApp
import com.biotech.dnadetect.presentation.theme.DnaDetectionTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        FirebaseRepository.init(applicationContext)
        enableEdgeToEdge()
        setContent {
            DnaDetectionTheme {
                MainNavigationApp()
            }
        }
    }
}
