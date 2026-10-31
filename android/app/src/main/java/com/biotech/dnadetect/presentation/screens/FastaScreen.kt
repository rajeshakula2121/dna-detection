package com.biotech.dnadetect.presentation.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.biotech.dnadetect.domain.BioEngine
import com.biotech.dnadetect.domain.FastaRecord
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.presentation.viewmodel.UiState
import com.biotech.dnadetect.utils.FileUtils

@Composable
fun FastaScreen(
    viewModel: AnalysisViewModel,
    onNavigateToMutation: () -> Unit,
    onNavigateToPattern: () -> Unit
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    var rawFastaText by remember { mutableStateOf("") }
    val fastaState by viewModel.fastaState.collectAsState()

    // Storage Access Framework file launcher for .fasta, .fa, .fna, .txt
    val fileLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            val content = FileUtils.readTextFromUri(context, uri)
            if (content.isNotBlank()) {
                rawFastaText = content
                viewModel.parseFastaContent(content)
            }
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
        // Title
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Default.FolderOpen, contentDescription = null, tint = GuanineYellow)
            Text(
                text = "FASTA File Import & Parser",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
            )
        }

        Text(
            text = "Select .fasta, .fa, or .fna files from storage or paste raw FASTA records. Supports multi-sequence files and IUPAC validation.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        // File Selector Actions
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Button(
                onClick = { fileLauncher.launch("*/*") },
                colors = ButtonDefaults.buttonColors(containerColor = GuanineYellow),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.UploadFile, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Import FASTA File", fontWeight = FontWeight.Bold)
            }

            OutlinedButton(
                onClick = {
                    val demo = ">HBB_wildtype Canonical Human Beta-Globin Exon 1\nATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC\n>HBB_sickle Pathogenic Sickle Cell Allele\nATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC"
                    rawFastaText = demo
                    viewModel.parseFastaContent(demo)
                },
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Demo FASTA", fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
        }

        // Paste FASTA Text
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(text = "OR PASTE FASTA CONTENT", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Slate400)
                OutlinedTextField(
                    value = rawFastaText,
                    onValueChange = {
                        rawFastaText = it
                        if (it.startsWith(">")) {
                            viewModel.parseFastaContent(it)
                        }
                    },
                    placeholder = { Text(">header description\nATGCGATCGATC...") },
                    modifier = Modifier.fillMaxWidth(),
                    maxLines = 6,
                    textStyle = LocalTextStyle.current.copy(fontFamily = FontFamily.Monospace, fontSize = 12.sp)
                )

                Button(
                    onClick = { viewModel.parseFastaContent(rawFastaText) },
                    colors = ButtonDefaults.buttonColors(containerColor = Navy900),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.align(Alignment.End)
                ) {
                    Text("Parse Records", fontWeight = FontWeight.Bold)
                }
            }
        }

        // Error message
        if (fastaState is UiState.Error) {
            Card(
                colors = CardDefaults.cardColors(containerColor = ThymineRed.copy(alpha = 0.12f)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.ErrorOutline, contentDescription = null, tint = ThymineRed)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = (fastaState as UiState.Error).message,
                        color = ThymineRed,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // Parsed Records List
        val records = (fastaState as? UiState.Success)?.data
        if (records != null) {
            Text(
                text = "Parsed Records (${records.size})",
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )

            records.forEachIndexed { i, rec ->
                FastaRecordCard(
                    record = rec,
                    index = i + 1,
                    onSetAsReference = {
                        viewModel.referenceInput.value = rec.sequence
                        viewModel.sequenceTitle.value = rec.id
                        onNavigateToMutation()
                    },
                    onSetAsQuery = {
                        viewModel.alternateInput.value = rec.sequence
                        viewModel.sequenceTitle.value = rec.id
                        onNavigateToMutation()
                    },
                    onRunPattern = {
                        viewModel.referenceInput.value = rec.sequence
                        viewModel.sequenceTitle.value = rec.id
                        onNavigateToPattern()
                    }
                )
            }
        }
    }
}

@Composable
fun FastaRecordCard(
    record: FastaRecord,
    index: Int,
    onSetAsReference: () -> Unit,
    onSetAsQuery: () -> Unit,
    onRunPattern: () -> Unit
) {
    val metrics = remember(record.sequence) { BioEngine.calculateMetrics(record.sequence) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "#$index ${record.id}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Teal600
                )
                Text(
                    text = "${record.length} bp",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Slate400
                )
            }

            if (record.description.isNotBlank()) {
                Text(
                    text = record.description,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Text(text = "GC: ${metrics.gcContent}%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = AdenineGreen)
                Text(text = "AT: ${metrics.atContent}%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = ThymineRed)
                Text(text = "GC-Skew: ${metrics.gcSkew}", fontSize = 11.sp, color = Slate400)
            }

            // Preview
            Text(
                text = if (record.sequence.length > 50) "${record.sequence.take(40)}...${record.sequence.takeLast(10)}" else record.sequence,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = MaterialTheme.colorScheme.onSurface
            )

            // Actions Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                FilledTonalButton(
                    onClick = onSetAsQuery,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text("Set Query", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                FilledTonalButton(
                    onClick = onSetAsReference,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text("Set Ref", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }

                FilledTonalButton(
                    onClick = onRunPattern,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                ) {
                    Text("Patterns", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

