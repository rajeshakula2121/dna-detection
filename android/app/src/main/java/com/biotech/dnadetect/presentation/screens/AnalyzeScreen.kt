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
import com.biotech.dnadetect.domain.BioEngine
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState

@Composable
fun AnalyzeScreen(
    viewModel: AnalysisViewModel,
    onNavigateToAlignment: () -> Unit
) {
    val scrollState = rememberScrollState()

    val refSeq by viewModel.referenceInput.collectAsState()
    val altSeq by viewModel.alternateInput.collectAsState()
    val motif by viewModel.motifInput.collectAsState()
    val title by viewModel.sequenceTitle.collectAsState()

    val alignmentState by viewModel.alignmentState.collectAsState()
    val metricsState by viewModel.metricsState.collectAsState()
    val patternState by viewModel.patternState.collectAsState()

    LaunchedEffect(alignmentState) {
        if (alignmentState is UiState.Success) {
            onNavigateToAlignment()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text(
            text = "DNA Sequence Analysis",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
        )

        // Experiment Title
        OutlinedTextField(
            value = title,
            onValueChange = { viewModel.sequenceTitle.value = it },
            label = { Text("Analysis Title / Identifier") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        // Preset Chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = false,
                onClick = { viewModel.loadBenchmark(BioEngine.VERIFIED_BENCHMARKS[0]) },
                label = { Text("Sickle Cell (HBB)", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(16.dp)) }
            )

            FilterChip(
                selected = false,
                onClick = { viewModel.loadBenchmark(BioEngine.VERIFIED_BENCHMARKS[1]) },
                label = { Text("Micro-Indel", fontSize = 12.sp) },
                leadingIcon = { Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(16.dp)) }
            )
        }

        // Reference Sequence Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Reference DNA Sequence (5' → 3')",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Teal600
                    )
                    Text(
                        text = "${refSeq.replace("\\s+".toRegex(), "").length} bp",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                OutlinedTextField(
                    value = refSeq,
                    onValueChange = { viewModel.referenceInput.value = it.uppercase() },
                    placeholder = { Text("Paste A, C, G, T reference sequence...") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
                )
            }
        }

        // Alternate Sequence Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Alternate / Patient DNA Sequence",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color(0xFF6366F1)
                    )
                    Text(
                        text = "${altSeq.replace("\\s+".toRegex(), "").length} bp",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                OutlinedTextField(
                    value = altSeq,
                    onValueChange = { viewModel.alternateInput.value = it.uppercase() },
                    placeholder = { Text("Paste variant / patient sequence to compare...") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 4,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
                )
            }
        }

        // Motif Query
        OutlinedTextField(
            value = motif,
            onValueChange = { viewModel.motifInput.value = it.uppercase() },
            label = { Text("Motif Pattern to Search (e.g. CCTGAG)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            textStyle = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace)
        )

        // Error message if any
        if (alignmentState is UiState.Error) {
            Text(
                text = (alignmentState as UiState.Error).message,
                color = ThymineRed,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold
            )
        }

        // Action Buttons
        Button(
            onClick = { viewModel.runPairwiseAlignment() },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
            shape = RoundedCornerShape(8.dp),
            enabled = refSeq.isNotBlank() && altSeq.isNotBlank() && alignmentState !is UiState.Loading
        ) {
            if (alignmentState is UiState.Loading) {
                CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Aligning Sequences...")
            } else {
                Icon(Icons.Default.CompareArrows, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Run Pairwise Alignment & Detect Mutations", fontWeight = FontWeight.Bold)
            }
        }
    }
}

