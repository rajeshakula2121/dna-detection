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
import com.biotech.dnadetect.domain.BioEngine
import com.biotech.dnadetect.domain.PatternAnalysisComposite
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState

@Composable
fun PatternAnalysisScreen(
    viewModel: AnalysisViewModel
) {
    val scrollState = rememberScrollState()
    val sequence by viewModel.referenceInput.collectAsState()
    val motif by viewModel.motifInput.collectAsState()
    val patternState by viewModel.patternState.collectAsState()

    var showLpsTable by remember { mutableStateOf(false) }

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
            Icon(Icons.Default.Search, contentDescription = null, tint = Teal600)
            Text(
                text = "DNA Pattern Analysis",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        Text(
            text = "Deterministic exact motif matching (KMP, Boyer-Moore) and exhaustive repeat analysis via Suffix Array & Kasai LCP.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Preset Chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            BioEngine.VERIFIED_BENCHMARKS.forEach { b ->
                FilterChip(
                    selected = false,
                    onClick = { viewModel.loadBenchmark(b) },
                    label = { Text(b.geneSymbol, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                    leadingIcon = { Icon(Icons.Default.Bookmark, contentDescription = null, modifier = Modifier.size(14.dp)) }
                )
            }
        }

        // Sequence Input
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "TARGET DNA SEQUENCE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                OutlinedTextField(
                    value = sequence,
                    onValueChange = { viewModel.referenceInput.value = it },
                    placeholder = { Text("Paste DNA sequence (A, C, G, T)...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 5,
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = motif,
                        onValueChange = { viewModel.motifInput.value = it },
                        label = { Text("Motif / Query Pattern") },
                        modifier = Modifier.weight(1f),
                        singleLine = true,
                        textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                    )

                    Button(
                        onClick = { viewModel.analyzePattern() },
                        colors = ButtonDefaults.buttonColors(containerColor = Teal600),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.height(56.dp)
                    ) {
                        if (patternState is UiState.Loading) {
                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Run", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Error Banner
        if (patternState is UiState.Error) {
            Card(
                colors = CardDefaults.cardColors(containerColor = ThymineRed.copy(alpha = 0.12f)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = ThymineRed)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = (patternState as UiState.Error).message,
                        color = ThymineRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Results Section
        val result = (patternState as? UiState.Success)?.data
        if (result != null) {
            PatternResultsView(
                result = result,
                showLps = showLpsTable,
                onToggleLps = { showLpsTable = !showLpsTable }
            )
        }
    }
}

@Composable
fun PatternResultsView(
    result: PatternAnalysisComposite,
    showLps: Boolean,
    onToggleLps: () -> Unit
) {
    val m = result.metrics
    val kmp = result.kmp
    val bm = result.boyerMoore
    val sa = result.suffixArray
    val kmer = result.kmerResult

    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        // Base Composition Summary Cards
        Text(text = "Composition & Skew Metrics", fontSize = 14.sp, fontWeight = FontWeight.Bold)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            MetricStatCard("Length", "${m.length} bp", Teal600, Modifier.weight(1f))
            MetricStatCard("GC Content", "${m.gcContent}%", AdenineGreen, Modifier.weight(1f))
            MetricStatCard("AT Content", "${m.atContent}%", ThymineRed, Modifier.weight(1f))
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            BasePill("Adenine (A)", m.countA, AdenineGreen, Modifier.weight(1f))
            BasePill("Thymine (T)", m.countT, ThymineRed, Modifier.weight(1f))
            BasePill("Cytosine (C)", m.countC, CytosineBlue, Modifier.weight(1f))
            BasePill("Guanine (G)", m.countG, GuanineYellow, Modifier.weight(1f))
        }

        // Knuth-Morris-Pratt (KMP) Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Knuth-Morris-Pratt (KMP)", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Teal600)
                    Text(text = "${kmp.executionTimeMs} ms", fontSize = 11.sp, color = Slate400)
                }

                Text(
                    text = "Total Matches: ${kmp.totalMatches} (${kmp.forwardMatches} Fwd, ${kmp.reverseMatches} Rev) • ${kmp.comparisonsCount} comparisons",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )

                if (kmp.matches.isEmpty()) {
                    Text(text = "No exact occurrences found on either strand.", fontSize = 12.sp, color = Slate400)
                } else {
                    kmp.matches.take(5).forEach { match ->
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "#${match.matchNumber} [bp ${match.startCoordinate}..${match.endCoordinate}] ${match.strand}",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = match.matchedSequence,
                                    fontSize = 11.sp,
                                    fontFamily = FontFamily.Monospace,
                                    color = Teal600,
                                    fontWeight = FontWeight.ExtraBold
                                )
                            }
                        }
                    }
                }

                TextButton(onClick = onToggleLps) {
                    Text(if (showLps) "Hide LPS Prefix Table" else "View LPS Prefix Table (${kmp.lpsTable.size} entries)")
                }

                if (showLps) {
                    val horizScroll = rememberScrollState()
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(horizScroll)
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        kmp.lpsTable.forEach { entry ->
                            Surface(
                                shape = RoundedCornerShape(4.dp),
                                color = Navy900,
                                modifier = Modifier.padding(2.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(text = "${entry.char}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    Text(text = "${entry.lps}", color = Teal300, fontSize = 10.sp)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Boyer-Moore (BM) Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Boyer-Moore (Bad Character Heuristic)", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF6366F1))
                    Text(text = "${bm.executionTimeMs} ms", fontSize = 11.sp, color = Slate400)
                }

                Text(
                    text = "Total Matches: ${bm.totalMatches} • ${bm.comparisonsCount} comparisons • ${bm.totalShifts} shift operations",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold
                )

                Text(
                    text = "Scans pattern right-to-left and skips sublinear intervals on mismatch using bad character jump table.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Suffix Array & Kasai LCP Repeats Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(text = "Suffix Array & Kasai LCP Repeat Analysis", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = GuanineYellow)

                val lrs = sa.longestRepeatedSubstring
                if (lrs != null) {
                    Surface(
                        shape = RoundedCornerShape(8.dp),
                        color = GuanineYellow.copy(alpha = 0.12f),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(10.dp)) {
                            Text(text = "LONGEST REPEATED SUBSTRING (LRS)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = GuanineYellow)
                            Text(text = lrs.sequence, fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, fontFamily = FontFamily.Monospace)
                            Text(text = "Length: ${lrs.length} bp • Occurrences: ${lrs.occurrences}x (at pos: ${lrs.startCoordinates.joinToString(", ")})", fontSize = 11.sp)
                        }
                    }
                }

                Text(text = "Discovered Repeat Elements (${sa.totalRepeatsFound} total):", fontSize = 12.sp, fontWeight = FontWeight.Bold)

                sa.repeats.take(6).forEach { r ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = r.sequence, fontSize = 12.sp, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.SemiBold)
                        Text(text = "${r.length} bp (${r.occurrences}x)", fontSize = 11.sp, color = Slate400)
                    }
                }
            }
        }

        // K-mer Frequency & Shannon Entropy Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "K-mer Distribution & Shannon Entropy (k=${kmer.k})", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = InsertionPurple)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "Shannon Information Entropy:", fontSize = 12.sp)
                    Text(text = "${kmer.shannonEntropy} bits/window", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = InsertionPurple)
                }

                Text(text = "Unique ${kmer.k}-mers: ${kmer.uniqueKmers} of ${kmer.totalWindows} sliding windows", fontSize = 11.sp, color = Slate400)

                kmer.topKmers.forEach { item ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(text = item.kmer, fontFamily = FontFamily.Monospace, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        Text(text = "${item.count}x (${item.frequency}%)", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun MetricStatCard(label: String, value: String, accent: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = label, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(text = value, fontSize = 15.sp, fontWeight = FontWeight.Bold, color = accent)
        }
    }
}

@Composable
fun BasePill(label: String, count: Int, accent: Color, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(8.dp),
        color = accent.copy(alpha = 0.12f)
    ) {
        Column(modifier = Modifier.padding(6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text(text = label.take(1), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = accent)
            Text(text = "$count", fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
    }
}

