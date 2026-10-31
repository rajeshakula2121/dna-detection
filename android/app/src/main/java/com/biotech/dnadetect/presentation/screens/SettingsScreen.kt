package com.biotech.dnadetect.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biotech.dnadetect.data.api.BioApiClient
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.AuthViewModel

@Composable
fun SettingsScreen(
    authViewModel: AuthViewModel,
    analysisViewModel: AnalysisViewModel,
    onSignOut: () -> Unit
) {
    val scrollState = rememberScrollState()
    val isBackendOnline by analysisViewModel.backendConnected.collectAsState()

    var customUrl by remember { mutableStateOf(BioApiClient.baseUrl) }
    var urlSaveMsg by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Default.Settings, contentDescription = null, tint = Teal600)
            Text(
                text = "Account & System Settings",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        // Account Details Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "RESEARCHER ACCOUNT",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate400
                )

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.AccountCircle, contentDescription = null, tint = Teal600, modifier = Modifier.size(28.dp))
                    Column {
                        Text(
                            text = authViewModel.userDisplayEmail.ifEmpty { "Guest Researcher" },
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "UID: ${authViewModel.userDisplayId.ifEmpty { "demo-local" }}",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = Slate400
                        )
                    }
                }

                Surface(
                    shape = RoundedCornerShape(6.dp),
                    color = Teal600.copy(alpha = 0.12f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Synchronized with Firebase Authentication and Cloud Firestore",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Teal600,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
                    )
                }
            }
        }

        // Backend Connectivity Settings Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "BACKEND API CONFIGURATION",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Slate400
                    )

                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = if (isBackendOnline == true) Teal600.copy(alpha = 0.15f) else GuanineYellow.copy(alpha = 0.15f)
                    ) {
                        Text(
                            text = if (isBackendOnline == true) "Port 8000 Online" else "Offline / Local Engine",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isBackendOnline == true) Teal600 else GuanineYellow,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
                        )
                    }
                }

                Text(
                    text = "Android Emulator uses http://10.0.2.2:8000/. For physical device, enter your workstation's LAN IP address (e.g. http://192.168.1.100:8000/).",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

                OutlinedTextField(
                    value = customUrl,
                    onValueChange = { customUrl = it },
                    label = { Text("FastAPI Server Base URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = {
                            analysisViewModel.setBackendBaseUrl(customUrl)
                            urlSaveMsg = "Applied base URL. Checking server probe..."
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("Apply & Probe", fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = {
                            customUrl = "http://10.0.2.2:8000/"
                            analysisViewModel.setBackendBaseUrl(customUrl)
                        },
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text("Reset Default", fontSize = 12.sp)
                    }
                }

                if (urlSaveMsg != null) {
                    Text(text = urlSaveMsg!!, fontSize = 11.sp, color = Teal600, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // About & Version Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(text = "GenomicsAI Android Application", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(text = "Version: 1.0.0 • Architecture: Jetpack Compose + MVVM", fontSize = 11.sp, color = Slate400)
                Text(text = "Engine: Deterministic Native Bioinformatics + FastAPI V1/Platform", fontSize = 11.sp, color = Slate400)
            }
        }

        // Sign Out Button
        Button(
            onClick = {
                authViewModel.signOut()
                onSignOut()
            },
            colors = ButtonDefaults.buttonColors(containerColor = ThymineRed),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Sign Out", fontWeight = FontWeight.Bold)
        }
    }
}

