package com.biotech.dnadetect.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
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
import com.biotech.dnadetect.domain.MutationType
import com.biotech.dnadetect.domain.SubstitutionSubType
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState

@Composable
fun AlignmentScreen(
    viewModel: AnalysisViewModel,
    onNavigateBack: () -> Unit
) {
    val scrollState = rememberScrollState()
    val horizScrollState = rememberScrollState()

    val alignmentState by viewModel.alignmentState.collectAsState()

    val alignment = (alignmentState as? UiState.Success)?.data

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Top Back Row
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onNavigateBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text(
                text = "Alignment & Mutation Results",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        if (alignment == null) {
            Text("No active alignment result. Run analysis from the Analyze tab.")
            return@Column
        }

        // Summary Metric Cards
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Identity", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${alignment.identityPercent}%", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Teal600)
                    Text("${alignment.matchesCount} / ${alignment.alignmentLength}", fontSize = 10.sp, color = Slate400)
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Score", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${alignment.score}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Navy900)
                    Text("Needleman-Wunsch", fontSize = 10.sp, color = Slate400)
                }
            }

            Card(
                modifier = Modifier.weight(1f),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(modifier = Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Mutations", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${alignment.mutations.size}", fontSize = 20.sp, fontWeight = FontWeight.Bold, color = ThymineRed)
                    Text("Detected", fontSize = 10.sp, color = Slate400)
                }
            }
        }

        // Detected Mutations List
        Text(
            text = "Detected Variations (${alignment.mutations.size})",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        if (alignment.mutations.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Text(
                    text = "No mutations found. Sequences are 100% identical.",
                    modifier = Modifier.padding(16.dp),
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            alignment.mutations.forEach { m ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                val badgeColor = when (m.type) {
                                    MutationType.SUBSTITUTION -> MutationOrange
                                    MutationType.INSERTION -> InsertionPurple
                                    MutationType.DELETION -> DeletionPink
                                }
                                Surface(
                                    color = badgeColor.copy(alpha = 0.15f),
                                    shape = RoundedCornerShape(4.dp)
                                ) {
                                    Text(
                                        text = m.type.name,
                                        color = badgeColor,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                    )
                                }

                                if (m.subType != null) {
                                    Text(
                                        text = m.subType.name.lowercase(),
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            Text(
                                text = m.description,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Text(
                            text = "pos ${m.position}",
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = Teal600
                        )
                    }
                }
            }
        }

        // Base Alignment Matrix
        Text(
            text = "Pairwise Alignment Matrix",
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = Navy900),
            shape = RoundedCornerShape(12.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp)
                    .horizontalScroll(horizScrollState),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = "REF: ${alignment.refAligned}",
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    color = Teal300
                )
                Text(
                    text = "     " + alignment.refAligned.mapIndexed { i, r ->
                        val a = alignment.altAligned.getOrNull(i) ?: '-'
                        if (r == a) '|' else if (r == '-' || a == '-') ' ' else '*'
                    }.joinToString(""),
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    color = Slate400
                )
                Text(
                    text = "ALT: ${alignment.altAligned}",
                    fontFamily = FontFamily.Monospace,
                    fontSize = 12.sp,
                    color = Color(0xFFA5B4FC)
                )
            }
        }
    }
}

