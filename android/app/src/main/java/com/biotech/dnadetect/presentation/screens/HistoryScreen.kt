package com.biotech.dnadetect.presentation.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.biotech.dnadetect.data.model.AnalysisRecord
import com.biotech.dnadetect.presentation.theme.*
import com.biotech.dnadetect.presentation.viewmodel.AnalysisViewModel
import com.biotech.dnadetect.utils.FileUtils
import java.text.SimpleDateFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    viewModel: AnalysisViewModel
) {
    val context = LocalContext.current
    val historyList by viewModel.historyFlow.collectAsState(initial = emptyList())

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("ALL") } // "ALL", "MUTATION_DETECTION", "DNA_PATTERN_ANALYSIS"
    var inspectedRecord by remember { mutableStateOf<AnalysisRecord?>(null) }

    val filteredList = remember(historyList, searchQuery, selectedFilter) {
        historyList.filter { rec ->
            val matchesFilter = when (selectedFilter) {
                "MUTATION_DETECTION" -> rec.module == "MUTATION_DETECTION" || rec.analysisType.contains("Alignment", true)
                "DNA_PATTERN_ANALYSIS" -> rec.module == "DNA_PATTERN_ANALYSIS" || rec.analysisType.contains("Pattern", true)
                else -> true
            }
            val matchesSearch = searchQuery.isBlank() ||
                rec.title.contains(searchQuery, true) ||
                rec.summary.contains(searchQuery, true) ||
                rec.mutationsSummary.contains(searchQuery, true)

            matchesFilter && matchesSearch
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Title & Cloud Sync Pill
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(Icons.Default.History, contentDescription = null, tint = Teal600)
                Text(
                    text = "Analysis History",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onBackground
                )
            }

            Surface(
                shape = RoundedCornerShape(12.dp),
                color = Teal600.copy(alpha = 0.12f)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Icon(Icons.Default.CloudDone, contentDescription = null, tint = Teal600, modifier = Modifier.size(14.dp))
                    Text(
                        text = "Cloud Firestore",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Teal600
                    )
                }
            }
        }

        // Search Bar
        OutlinedTextField(
            value = searchQuery,
            onValueChange = { searchQuery = it },
            placeholder = { Text("Search records by gene, variant, or motif...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { searchQuery = "" }) {
                        Icon(Icons.Default.Close, contentDescription = "Clear", modifier = Modifier.size(16.dp))
                    }
                }
            }
        )

        // Module Filter Chips
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            FilterChip(
                selected = selectedFilter == "ALL",
                onClick = { selectedFilter = "ALL" },
                label = { Text("All Records (${historyList.size})", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedFilter == "MUTATION_DETECTION",
                onClick = { selectedFilter = "MUTATION_DETECTION" },
                label = { Text("Mutations", fontSize = 11.sp) }
            )
            FilterChip(
                selected = selectedFilter == "DNA_PATTERN_ANALYSIS",
                onClick = { selectedFilter = "DNA_PATTERN_ANALYSIS" },
                label = { Text("Patterns", fontSize = 11.sp) }
            )
        }

        // List or Empty View
        if (filteredList.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.HistoryEdu, contentDescription = null, tint = Slate400, modifier = Modifier.size(48.dp))
                    Text(
                        text = if (historyList.isEmpty()) "No saved analyses found." else "No records match search filter.",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = "Analyses saved on web or Android appear here automatically.",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        } else {
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(filteredList, key = { it.id }) { record ->
                    HistoryItemCard(
                        record = record,
                        onClick = { inspectedRecord = record },
                        onDelete = { viewModel.deleteAnalysisRecord(record.id) }
                    )
                }
            }
        }
    }

    // Interactive Deep Dive Inspection Dialog
    if (inspectedRecord != null) {
        val rec = inspectedRecord!!
        val dateStr = remember(rec.createdAt, rec.timestamp) {
            rec.createdAt?.let { SimpleDateFormat("MMM dd, yyyy • HH:mm", Locale.getDefault()).format(it) }
                ?: rec.timestamp.take(16).replace("T", " ")
        }

        AlertDialog(
            onDismissRequest = { inspectedRecord = null },
            title = {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = if (rec.module.contains("MUTATION")) Color(0xFF6366F1).copy(alpha = 0.15f) else Teal600.copy(alpha = 0.15f)
                        ) {
                            Text(
                                text = rec.module.replace("_", " "),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (rec.module.contains("MUTATION")) Color(0xFF6366F1) else Teal600,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                        Text(text = dateStr, fontSize = 10.sp, color = Slate400)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = rec.title.ifEmpty { "DNA Analysis" },
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                val dialogScroll = rememberScrollState()
                Column(
                    modifier = Modifier
                        .verticalScroll(dialogScroll)
                        .fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Algorithm: ${rec.algorithm.ifEmpty { rec.analysisType }}",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Teal600
                    )

                    Text(
                        text = rec.summary.ifEmpty { "Analysis completed successfully." },
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurface
                    )

                    if (rec.identityPercent > 0.0 || rec.mutationCount > 0) {
                        Divider()
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(text = "Identity: ${rec.identityPercent}%", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Text(text = "Variants: ${rec.mutationCount}", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = ThymineRed)
                        }
                    }

                    if (rec.mutationsSummary.isNotBlank()) {
                        Divider()
                        Text(text = "Variant Details:", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        Text(
                            text = rec.mutationsSummary,
                            fontSize = 11.sp,
                            fontFamily = FontFamily.Monospace,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }

                    if (rec.refAligned.isNotBlank() && rec.altAligned.isNotBlank()) {
                        Divider()
                        Text(text = "Alignment Preview:", fontWeight = FontWeight.Bold, fontSize = 11.sp)
                        val hScroll = rememberScrollState()
                        Column(
                            modifier = Modifier
                                .horizontalScroll(hScroll)
                                .background(Navy900, RoundedCornerShape(6.dp))
                                .padding(8.dp)
                        ) {
                            Text(text = "Ref: ${rec.refAligned.take(60)}", color = Color.White, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                            Text(text = "Alt: ${rec.altAligned.take(60)}", color = Color.White, fontFamily = FontFamily.Monospace, fontSize = 11.sp)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { inspectedRecord = null }) {
                    Text("Close", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        val shareText = "GenomicsAI Analysis Record\nTitle: ${rec.title}\nModule: ${rec.module}\nSummary: ${rec.summary}\nDate: $dateStr"
                        FileUtils.shareTextContent(context, rec.title, shareText)
                    }
                ) {
                    Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Share")
                }
            }
        )
    }
}

@Composable
fun HistoryItemCard(
    record: AnalysisRecord,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    val dateStr = remember(record.createdAt, record.timestamp) {
        record.createdAt?.let { SimpleDateFormat("MMM dd, yyyy • HH:mm", Locale.getDefault()).format(it) }
            ?: record.timestamp.take(16).replace("T", " ")
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = if (record.module.contains("MUTATION")) Color(0xFF6366F1).copy(alpha = 0.15f) else Teal600.copy(alpha = 0.15f)
                ) {
                    Text(
                        text = if (record.module.contains("MUTATION")) "MUTATION DETECTION" else "PATTERN ANALYSIS",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (record.module.contains("MUTATION")) Color(0xFF6366F1) else Teal600,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = dateStr, fontSize = 10.sp, color = Slate400)
                    Spacer(modifier = Modifier.width(6.dp))
                    IconButton(
                        onClick = onDelete,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = ThymineRed, modifier = Modifier.size(16.dp))
                    }
                }
            }

            Text(
                text = record.title.ifEmpty { "DNA Analysis" },
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = record.summary.ifEmpty { "Analysis record stored in Cloud Firestore." },
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (record.identityPercent > 0.0) {
                    Text(
                        text = "Identity: ${record.identityPercent}% • ${record.mutationCount} Variant(s)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Teal600
                    )
                } else if (record.sequenceLength > 0) {
                    Text(
                        text = "Length: ${record.sequenceLength} bp",
                        fontSize = 11.sp,
                        color = Slate400
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("View Details", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Teal600)
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Teal600, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}
