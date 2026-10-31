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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biotech.dnadetect.domain.BioEngine
import com.biotech.dnadetect.domain.DetectedMutation
import com.biotech.dnadetect.domain.MutationType
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState
import com.biotech.dnadetect.utils.FileUtils

@Composable
fun MutationDetectionScreen(
    viewModel: AnalysisViewModel
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    val refSeq by viewModel.referenceInput.collectAsState()
    val altSeq by viewModel.alternateInput.collectAsState()
    val title by viewModel.sequenceTitle.collectAsState()
    val selectedBmId by viewModel.selectedBenchmarkId.collectAsState()

    val alignmentState by viewModel.alignmentState.collectAsState()
    val saveState by viewModel.saveState.collectAsState()

    var showParameters by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Screen Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Default.CompareArrows, contentDescription = null, tint = Teal600)
            Text(
                text = "Mutation Detection",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        Text(
            text = "Pairwise Needleman-Wunsch global sequence alignment and variant calling for SNPs, transitions, transversions, indels, and HGVS nomenclature.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Clinical Benchmark Chips
        Text(text = "Clinical Benchmark Presets", fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            BioEngine.VERIFIED_BENCHMARKS.forEach { b ->
                FilterChip(
                    selected = selectedBmId == b.id,
                    onClick = { viewModel.loadBenchmark(b) },
                    label = { Text("${b.geneSymbol} (${b.condition.take(15)})", fontSize = 11.sp) },
                    leadingIcon = { Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(14.dp)) }
                )
            }
        }

        // Experiment Identifier
        OutlinedTextField(
            value = title,
            onValueChange = { viewModel.sequenceTitle.value = it },
            label = { Text("Analysis Title / Gene Identifier") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )

        // Query Sequence (Sample / Variant) Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "1. QUERY SAMPLE (PATIENT / TEST DNA)",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Teal600
                )
                OutlinedTextField(
                    value = altSeq,
                    onValueChange = { viewModel.alternateInput.value = it },
                    placeholder = { Text("Paste query variant DNA sequence...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 4,
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                )
                Text(
                    text = "Length: ${altSeq.replace("\\s+".toRegex(), "").length} bp",
                    fontSize = 10.sp,
                    color = Slate400
                )
            }
        }

        // Reference Sequence Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    text = "2. REFERENCE GENOME / WILD-TYPE SEQUENCE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = refSeq,
                    onValueChange = { viewModel.referenceInput.value = it },
                    placeholder = { Text("Paste reference wild-type DNA sequence...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 4,
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                )
                Text(
                    text = "Length: ${refSeq.replace("\\s+".toRegex(), "").length} bp",
                    fontSize = 10.sp,
                    color = Slate400
                )
            }
        }

        // Parameter Expander
        TextButton(onClick = { showParameters = !showParameters }) {
            Icon(Icons.Default.Tune, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(if (showParameters) "Hide Alignment Parameters" else "Configure Alignment Parameters (Match: +2, Mismatch: -1, Gap: -2)")
        }

        if (showParameters) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Needleman-Wunsch Global Alignment Parameters", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("• Match Score: +2 (Reward for identical alignment pairs)", fontSize = 11.sp)
                    Text("• Mismatch Penalty: -1 (Cost for substitutions)", fontSize = 11.sp)
                    Text("• Linear Gap Penalty: -2 (Penalty for insertions/deletions)", fontSize = 11.sp)
                }
            }
        }

        // Run Button
        Button(
            onClick = { viewModel.runPairwiseAlignment() },
            colors = ButtonDefaults.buttonColors(containerColor = Teal600),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            if (alignmentState is UiState.Loading) {
                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Aligning Sequences...", fontWeight = FontWeight.Bold)
            } else {
                Icon(Icons.Default.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Run Mutation Detection", fontWeight = FontWeight.Bold)
            }
        }

        // Error Banner
        if (alignmentState is UiState.Error) {
            Card(
                colors = CardDefaults.cardColors(containerColor = ThymineRed.copy(alpha = 0.12f)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = ThymineRed)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = (alignmentState as UiState.Error).message,
                        color = ThymineRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Cloud Firestore Auto-save status
        if (saveState is UiState.Success) {
            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Teal600.copy(alpha = 0.12f),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.CloudDone, contentDescription = null, tint = Teal600, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Saved to Cloud Firestore (ID: ${(saveState as UiState.Success).data.take(8)}...)",
                        color = Teal600,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Results Display
        val aln = (alignmentState as? UiState.Success)?.data
        if (aln != null) {
            // Metrics Summary Grid
            Text(text = "Alignment & Mutation Results", fontSize = 16.sp, fontWeight = FontWeight.Bold)

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AlignmentMetricCard("Identity", "${aln.identityPercent}%", Teal600, Modifier.weight(1f))
                AlignmentMetricCard("Score", "${aln.score}", Navy900, Modifier.weight(1f))
                AlignmentMetricCard("Total Variants", "${aln.mutations.size}", ThymineRed, Modifier.weight(1f))
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AlignmentMetricCard("SNVs", "${aln.snpCount}", MutationOrange, Modifier.weight(1f))
                AlignmentMetricCard("Insertions", "${aln.insertionCount}", InsertionPurple, Modifier.weight(1f))
                AlignmentMetricCard("Deletions", "${aln.deletionCount}", DeletionPink, Modifier.weight(1f))
            }

            // Export Actions
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                OutlinedButton(
                    onClick = {
                        val csv = FileUtils.generateMutationCsv(aln)
                        FileUtils.shareTextContent(context, "${aln.altName} - Mutation Report.csv", csv)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Export CSV", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }

                OutlinedButton(
                    onClick = {
                        val txt = FileUtils.generateTextReport(aln)
                        FileUtils.shareTextContent(context, "${aln.altName} - Alignment Summary.txt", txt)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Share Report", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Formatted 60-bp Alignment Blocks Viewer
            Text(text = "Visual Pairwise Alignment (60-bp blocks)", fontSize = 14.sp, fontWeight = FontWeight.Bold)

            aln.blocks.forEach { block ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = Navy900)
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(
                            text = "Columns ${block.startCol} .. ${block.endCol}",
                            fontSize = 10.sp,
                            color = Teal300,
                            fontWeight = FontWeight.Bold
                        )
                        val horiz = rememberScrollState()
                        Column(modifier = Modifier.horizontalScroll(horiz)) {
                            Text(
                                text = "Ref: ${block.refChunk}",
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                color = Color.White
                            )
                            Text(
                                text = "     ${block.matchChunk}",
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                color = Teal400
                            )
                            Text(
                                text = "Alt: ${block.altChunk}",
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            // Identified Sequence Variants List
            Text(text = "Identified Sequence Variants (${aln.mutations.size})", fontSize = 14.sp, fontWeight = FontWeight.Bold)

            if (aln.mutations.isEmpty()) {
                Text(
                    text = "No sequence variants identified. The query matches the reference sequence with 100% identity.",
                    fontSize = 12.sp,
                    color = Slate400
                )
            } else {
                aln.mutations.forEachIndexed { idx, m ->
                    VariantDetailCard(index = idx + 1, mutation = m)
                }
            }
        }
    }
}

@Composable
fun AlignmentMetricCard(label: String, value: String, accent: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(value, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = accent)
        }
    }
}

@Composable
fun VariantDetailCard(index: Int, mutation: DetectedMutation) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = when (mutation.type) {
                            MutationType.SUBSTITUTION -> MutationOrange.copy(alpha = 0.15f)
                            MutationType.INSERTION -> InsertionPurple.copy(alpha = 0.15f)
                            MutationType.DELETION -> DeletionPink.copy(alpha = 0.15f)
                        }
                    ) {
                        Text(
                            text = mutation.type.name,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = when (mutation.type) {
                                MutationType.SUBSTITUTION -> MutationOrange
                                MutationType.INSERTION -> InsertionPurple
                                MutationType.DELETION -> DeletionPink
                            },
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }

                    if (mutation.subType != null) {
                        Text(
                            text = mutation.subType.name,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Slate400
                        )
                    }
                }

                Text(
                    text = mutation.hgvs.ifEmpty { "Position ${mutation.position}" },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.ExtraBold,
                    fontFamily = FontFamily.Monospace,
                    color = Teal600
                )
            }

            Text(
                text = mutation.description,
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurface
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(text = "Local bp: ${mutation.position}", fontSize = 10.sp, color = Slate400)
                if (mutation.cdsPosition != null) {
                    Text(text = "Coding CDS: c.${mutation.cdsPosition}", fontSize = 10.sp, color = Slate400)
                }
                Text(text = "Ref: ${mutation.refBase} → Alt: ${mutation.altBase}", fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

