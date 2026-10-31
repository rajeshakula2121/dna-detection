package com.biotech.dnadetect.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biotech.dnadetect.domain.BioEngine
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel

@Composable
fun DashboardScreen(
    viewModel: AnalysisViewModel,
    onNavigateToPattern: () -> Unit,
    onNavigateToMutation: () -> Unit,
    onNavigateToFasta: () -> Unit,
    onNavigateToTranslation: () -> Unit,
    onNavigateToHistory: () -> Unit,
    onNavigateToSettings: () -> Unit
) {
    val scrollState = rememberScrollState()
    val isBackendOnline by viewModel.backendConnected.collectAsState()
    val historyList by viewModel.historyFlow.collectAsState(initial = emptyList())

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Top Header Bar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Navy900),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Science,
                        contentDescription = "Logo",
                        tint = Teal300,
                        modifier = Modifier.size(22.dp)
                    )
                }
                Column {
                    Text(
                        text = "GenomicsAI",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Text(
                        text = "Bioinformatics Platform",
                        fontSize = 11.sp,
                        color = Slate400
                    )
                }
            }

            // Backend Status Pill
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isBackendOnline == true) Teal500.copy(alpha = 0.15f) else GuanineYellow.copy(alpha = 0.15f),
                modifier = Modifier.clickable { onNavigateToSettings() }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(if (isBackendOnline == true) Teal600 else GuanineYellow)
                    )
                    Text(
                        text = if (isBackendOnline == true) "API Connected" else "Local Engine Mode",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (isBackendOnline == true) Teal600 else GuanineYellow
                    )
                }
            }
        }

        // Hero Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Navy900)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = "DNA Pattern & Mutation Analysis",
                    color = Color.White,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    lineHeight = 26.sp
                )

                Text(
                    text = "High-performance native bioinformatics system supporting KMP motif search, Boyer-Moore scanning, Suffix Array LRS, Needleman-Wunsch global alignment, and Cloud Firestore synchronization.",
                    color = Slate400,
                    fontSize = 12.sp,
                    lineHeight = 18.sp
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onNavigateToMutation,
                        colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Mutations", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }

                    OutlinedButton(
                        onClick = onNavigateToPattern,
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Teal300),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(text = "Patterns", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }

        // Quick Analysis Modules Grid
        Text(
            text = "Analysis Modules",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ModuleCard(
                title = "Pattern Search",
                desc = "KMP, Boyer-Moore & Suffix Array",
                icon = Icons.Default.Search,
                accentColor = Teal600,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToPattern
            )
            ModuleCard(
                title = "Mutation Detect",
                desc = "Needleman-Wunsch & HGVS",
                icon = Icons.Default.CompareArrows,
                accentColor = Color(0xFF6366F1),
                modifier = Modifier.weight(1f),
                onClick = onNavigateToMutation
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            ModuleCard(
                title = "FASTA Parser",
                desc = "Multi-record file inspection",
                icon = Icons.Default.FolderOpen,
                accentColor = GuanineYellow,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToFasta
            )
            ModuleCard(
                title = "6-Frame Translation",
                desc = "Reading frames & candidate ORFs",
                icon = Icons.Default.Transform,
                accentColor = InsertionPurple,
                modifier = Modifier.weight(1f),
                onClick = onNavigateToTranslation
            )
        }

        // Clinical Benchmarks Section
        Text(
            text = "Authoritative Clinical Benchmarks",
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        BioEngine.VERIFIED_BENCHMARKS.forEach { b ->
            BenchmarkCard(
                benchmark = b,
                onClick = {
                    viewModel.loadBenchmark(b)
                    onNavigateToMutation()
                }
            )
        }

        // Recent Analyses Status Card
        if (historyList.isNotEmpty()) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNavigateToHistory() },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Icon(Icons.Default.History, contentDescription = null, tint = Teal600)
                        Column {
                            Text(
                                text = "Saved Cloud Analyses",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            Text(
                                text = "${historyList.size} record(s) synced in Cloud Firestore",
                                fontSize = 11.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Slate400)
                }
            }
        }
    }
}

@Composable
fun ModuleCard(
    title: String,
    desc: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    ElevatedCard(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(accentColor.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(18.dp))
            }
            Text(text = title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text(text = desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 15.sp)
        }
    }
}

@Composable
fun BenchmarkCard(
    benchmark: com.biotech.dnadetect.domain.BenchmarkCase,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = benchmark.geneSymbol,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Teal600
                    )
                    Text(
                        text = "• ${benchmark.refAccession}",
                        fontSize = 11.sp,
                        color = Slate400
                    )
                }
                Text(
                    text = benchmark.expectedHgvs,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = ThymineRed
                )
            }

            Text(
                text = benchmark.condition,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = benchmark.description,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 15.sp
            )
        }
    }
}
