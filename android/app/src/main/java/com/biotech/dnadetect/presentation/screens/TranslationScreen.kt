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
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState

@Composable
fun TranslationScreen(
    viewModel: AnalysisViewModel
) {
    val scrollState = rememberScrollState()
    val sequence by viewModel.referenceInput.collectAsState()
    val translationState by viewModel.translationState.collectAsState()

    var selectedFrameIdx by remember { mutableStateOf(0) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Default.Transform, contentDescription = null, tint = InsertionPurple)
            Text(
                text = "Six-Frame Translation & ORFs",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        Text(
            text = "Translates nucleotide sequences across all 6 reading frames (+1..+3, -1..-3) using NCBI Genetic Code Table 1 to identify candidate coding Open Reading Frames (ORFs).",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // Sequence Input
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "CODING DNA SEQUENCE", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate400)
                OutlinedTextField(
                    value = sequence,
                    onValueChange = { viewModel.referenceInput.value = it },
                    placeholder = { Text("Paste DNA sequence...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 4,
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                )

                Button(
                    onClick = { viewModel.runSixFrameTranslation() },
                    colors = ButtonDefaults.buttonColors(containerColor = InsertionPurple),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (translationState is UiState.Loading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Default.PlayArrow, contentDescription = null)
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Translate 6 Frames", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Error Banner
        if (translationState is UiState.Error) {
            Card(
                colors = CardDefaults.cardColors(containerColor = ThymineRed.copy(alpha = 0.12f)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = ThymineRed)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = (translationState as UiState.Error).message,
                        color = ThymineRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Translation Results
        val res = (translationState as? UiState.Success)?.data
        if (res != null) {
            val allFrames = res.forwardFrames + res.reverseFrames
            val frameNames = listOf("+1", "+2", "+3", "-1", "-2", "-3")

            Text(text = "Reading Frames", fontSize = 15.sp, fontWeight = FontWeight.Bold)

            // Tabs for frames
            ScrollableTabRow(
                selectedTabIndex = selectedFrameIdx,
                edgePadding = 0.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                frameNames.forEachIndexed { idx, name ->
                    Tab(
                        selected = selectedFrameIdx == idx,
                        onClick = { selectedFrameIdx = idx },
                        text = { Text("Frame $name", fontWeight = FontWeight.Bold) }
                    )
                }
            }

            // Display selected frame
            if (selectedFrameIdx in allFrames.indices) {
                val current = allFrames[selectedFrameIdx]
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = CardDefaults.cardColors(containerColor = Navy900)
                ) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Frame ${current.frame} (Strand ${current.strand})",
                                color = Teal300,
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp
                            )
                            Text(
                                text = "${current.proteinSequence.length} Amino Acids • ${current.stopCount} Stop Codons",
                                color = Slate400,
                                fontSize = 11.sp
                            )
                        }

                        val hScroll = rememberScrollState()
                        Text(
                            text = current.proteinSequence,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp,
                            color = Color.White,
                            modifier = Modifier.horizontalScroll(hScroll)
                        )
                    }
                }
            }

            // Candidate Open Reading Frames (ORFs)
            Text(
                text = "Candidate Open Reading Frames (${res.orfs.size})",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold
            )

            if (res.orfs.isEmpty()) {
                Text(
                    text = "No ORFs meeting minimum length threshold (≥ 8 amino acids) flanked by start (M) and stop (*) codons.",
                    fontSize = 12.sp,
                    color = Slate400
                )
            } else {
                res.orfs.forEachIndexed { i, orf ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                    ) {
                        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "ORF #${i + 1} (Frame ${if (orf.frame > 0) "+${orf.frame}" else orf.frame})",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = InsertionPurple
                                )
                                Text(
                                    text = "${orf.lengthAminoAcids} AA (${orf.lengthNucleotides} nt)",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }

                            Text(
                                text = "Coordinates: bp ${orf.startNucleotide} .. ${orf.endNucleotide} • MW: ${orf.molecularWeightDa} Da",
                                fontSize = 11.sp,
                                color = Slate400
                            )

                            Text(
                                text = orf.proteinSequence,
                                fontSize = 11.sp,
                                fontFamily = FontFamily.Monospace,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }
                    }
                }
            }
        }
    }
}

