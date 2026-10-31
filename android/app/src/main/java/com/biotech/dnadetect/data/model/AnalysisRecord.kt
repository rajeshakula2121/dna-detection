package com.biotech.dnadetect.data.model

import com.google.firebase.firestore.DocumentId
import com.google.firebase.firestore.IgnoreExtraProperties
import com.google.firebase.firestore.ServerTimestamp
import java.util.Date

@IgnoreExtraProperties
data class AnalysisRecord(
    @DocumentId
    val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val title: String = "",
    val module: String = "MUTATION_DETECTION", // "MUTATION_DETECTION", "DNA_PATTERN_ANALYSIS", "PAIRWISE_ALIGNMENT", "FASTA_ANALYSIS", "ORF_ANALYSIS", "QUALITY_CONTROL"
    val analysisType: String = "Pairwise Needleman-Wunsch Alignment & Mutation Detection",
    val algorithm: String = "Needleman-Wunsch Global Alignment & HGVS Normalization",
    val sequenceLength: Int = 0,
    val summary: String = "",
    val status: String = "COMPLETED",
    val sequencePreview: String = "",
    val timestamp: String = "",
    val parameters: Map<String, Any> = emptyMap(),
    val results: Map<String, Any> = emptyMap(),
    val mutationDetails: List<Map<String, Any>> = emptyList(),

    // Legacy/Convenience fields
    val gcContent: Double = 0.0,
    val atContent: Double = 0.0,
    val refSequence: String = "",
    val altSequence: String = "",
    val refAligned: String = "",
    val altAligned: String = "",
    val matchString: String = "",
    val identityPercent: Double = 0.0,
    val mutationCount: Int = 0,
    val mutationsSummary: String = "",
    val motifQuery: String = "",
    val motifCount: Int = 0,

    @ServerTimestamp
    val createdAt: Date? = null
)
