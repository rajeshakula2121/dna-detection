package com.biotech.dnadetect.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.biotech.dnadetect.data.api.ApiMutationRequest
import com.biotech.dnadetect.data.api.BioApiClient
import com.biotech.dnadetect.data.model.AnalysisRecord
import com.biotech.dnadetect.data.repository.FirebaseRepository
import com.biotech.dnadetect.domain.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<out T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

class AnalysisViewModel(
    private val repository: FirebaseRepository = FirebaseRepository()
) : ViewModel() {

    // Inputs
    val referenceInput = MutableStateFlow("")
    val alternateInput = MutableStateFlow("")
    val motifInput = MutableStateFlow("TATA")
    val sequenceTitle = MutableStateFlow("Hemoglobin Beta (HBB) Analysis")
    val selectedBenchmarkId = MutableStateFlow("benchmark-hbb")

    // Match parameters
    val matchScore = MutableStateFlow(2)
    val mismatchPenalty = MutableStateFlow(-1)
    val gapPenalty = MutableStateFlow(-2)

    // UI States
    private val _metricsState = MutableStateFlow<UiState<SequenceMetrics>>(UiState.Idle)
    val metricsState: StateFlow<UiState<SequenceMetrics>> = _metricsState.asStateFlow()

    private val _patternState = MutableStateFlow<UiState<PatternAnalysisComposite>>(UiState.Idle)
    val patternState: StateFlow<UiState<PatternAnalysisComposite>> = _patternState.asStateFlow()
    val motifState: StateFlow<UiState<PatternAnalysisComposite>> get() = patternState

    private val _alignmentState = MutableStateFlow<UiState<AlignmentResult>>(UiState.Idle)
    val alignmentState: StateFlow<UiState<AlignmentResult>> = _alignmentState.asStateFlow()

    private val _translationState = MutableStateFlow<UiState<SixFrameTranslationResult>>(UiState.Idle)
    val translationState: StateFlow<UiState<SixFrameTranslationResult>> = _translationState.asStateFlow()

    private val _fastaState = MutableStateFlow<UiState<List<FastaRecord>>>(UiState.Idle)
    val fastaState: StateFlow<UiState<List<FastaRecord>>> = _fastaState.asStateFlow()

    private val _backendConnected = MutableStateFlow<Boolean?>(null)
    val backendConnected: StateFlow<Boolean?> = _backendConnected.asStateFlow()

    private val _saveState = MutableStateFlow<UiState<String>>(UiState.Idle)
    val saveState: StateFlow<UiState<String>> = _saveState.asStateFlow()

    // History Flow from Firebase Cloud Firestore
    val historyFlow = repository.getAnalysesFlow()

    init {
        // Load default HBB clinical benchmark sequence
        loadBenchmark(BioEngine.VERIFIED_BENCHMARKS.first())
        checkBackendHealth()
    }

    fun checkBackendHealth() {
        viewModelScope.launch {
            try {
                val resp = BioApiClient.service.checkHealth()
                _backendConnected.value = resp.isSuccessful
            } catch (e: Exception) {
                _backendConnected.value = false
            }
        }
    }

    fun setBackendBaseUrl(newUrl: String) {
        BioApiClient.setBaseUrl(newUrl)
        checkBackendHealth()
    }

    // ======================== PATTERN ANALYSIS ========================

    fun analyzePattern() {
        val seq = referenceInput.value.trim()
        val motif = motifInput.value.trim().ifEmpty { "TATA" }

        val (isValid, cleanedSeq) = BioEngine.validateSequence(seq, true)
        if (!isValid) {
            val invalid = BioEngine.extractInvalidChars(seq, true)
            _patternState.value = UiState.Error("Invalid DNA characters detected: ${invalid.joinToString(", ")}. Only IUPAC nucleotide codes allowed.")
            return
        }

        _patternState.value = UiState.Loading
        viewModelScope.launch {
            try {
                // Compute using in-app native bio-engine (deterministic and fast)
                val metrics = BioEngine.calculateMetrics(cleanedSeq)
                val kmp = BioEngine.kmpSearch(cleanedSeq, motif, true)
                val bm = BioEngine.boyerMooreSearch(cleanedSeq, motif, true)
                val sa = BioEngine.suffixArrayRepeatAnalysis(cleanedSeq, 4, 2)
                val kmer = BioEngine.calculateKmerFrequencies(cleanedSeq, 3, 8)

                val composite = PatternAnalysisComposite(
                    metrics = metrics,
                    kmp = kmp,
                    boyerMoore = bm,
                    suffixArray = sa,
                    kmerResult = kmer
                )

                _patternState.value = UiState.Success(composite)

                // Auto-save analysis to Cloud Firestore
                if (repository.isUserLoggedIn) {
                    savePatternAnalysisRecord(composite, motif)
                }
            } catch (e: Exception) {
                _patternState.value = UiState.Error(e.localizedMessage ?: "Pattern analysis failed")
            }
        }
    }

    // ======================== PAIRWISE ALIGNMENT ========================

    fun runPairwiseAlignment() {
        val ref = referenceInput.value.trim()
        val alt = alternateInput.value.trim()

        val (validRef, cleanRef) = BioEngine.validateSequence(ref, false)
        val (validAlt, cleanAlt) = BioEngine.validateSequence(alt, false)

        if (!validRef) {
            val invalid = BioEngine.extractInvalidChars(ref, false)
            _alignmentState.value = UiState.Error("Reference sequence contains unsupported characters: ${invalid.joinToString(", ")}. Only A, C, G, T allowed.")
            return
        }

        if (!validAlt) {
            val invalid = BioEngine.extractInvalidChars(alt, false)
            _alignmentState.value = UiState.Error("Query sample sequence contains unsupported characters: ${invalid.joinToString(", ")}. Only A, C, G, T allowed.")
            return
        }

        _alignmentState.value = UiState.Loading
        viewModelScope.launch {
            // Determine clinical coordinate offset
            val benchmark = BioEngine.VERIFIED_BENCHMARKS.find { it.id == selectedBenchmarkId.value }
            val offset = benchmark?.transcriptOffset ?: 0

            var apiResult: AlignmentResult? = null

            // Try FastAPI backend if connected
            if (_backendConnected.value == true) {
                try {
                    val req = ApiMutationRequest(
                        query_sequence = cleanAlt,
                        reference_sequence = cleanRef,
                        match_score = matchScore.value,
                        mismatch_penalty = mismatchPenalty.value,
                        gap_penalty = gapPenalty.value
                    )
                    val resp = BioApiClient.service.detectMutations(req)
                    if (resp.isSuccessful && resp.body() != null) {
                        val body = resp.body()!!
                        val mutations = body.mutations.map { m ->
                            DetectedMutation(
                                type = when (m.mutationType.uppercase()) {
                                    "INSERTION" -> MutationType.INSERTION
                                    "DELETION" -> MutationType.DELETION
                                    else -> MutationType.SUBSTITUTION
                                },
                                position = m.position,
                                refPosition = m.refPosition,
                                altPosition = m.altPosition ?: m.position,
                                cdsPosition = offset + m.refPosition,
                                refBase = m.refBase,
                                altBase = m.altBase,
                                subType = if (m.subType?.contains("TRANSITION", true) == true) SubstitutionSubType.TRANSITION else SubstitutionSubType.TRANSVERSION,
                                length = 1,
                                hgvs = m.hgvs ?: "",
                                description = m.description ?: ""
                            )
                        }

                        // Blocks
                        val alnLen = body.refAligned.length
                        val blockSize = 60
                        val blocks = mutableListOf<AlignmentBlock>()
                        var col = 0
                        while (col < alnLen) {
                            val end = kotlin.math.min(col + blockSize, alnLen)
                            blocks.add(
                                AlignmentBlock(
                                    startCol = col + 1,
                                    endCol = end,
                                    refChunk = body.refAligned.substring(col, end),
                                    matchChunk = body.matchString.substring(col, end),
                                    altChunk = body.altAligned.substring(col, end)
                                )
                            )
                            col += blockSize
                        }

                        apiResult = AlignmentResult(
                            score = body.alignmentScore,
                            refName = body.referenceName ?: "Reference Standard",
                            altName = body.queryName ?: "Query DNA Sample",
                            refAligned = body.refAligned,
                            altAligned = body.altAligned,
                            matchString = body.matchString,
                            alignmentLength = body.refAligned.length,
                            matchesCount = body.matchesCount,
                            mismatchesCount = body.mismatchesCount,
                            gapsCount = body.gapsCount,
                            snpCount = body.snpCount,
                            insertionCount = body.insertionCount,
                            deletionCount = body.deletionCount,
                            identityPercent = body.identity,
                            similarityPercent = body.similarity,
                            mutations = mutations,
                            blocks = blocks
                        )
                    }
                } catch (e: Exception) {
                    // Backend call failed; continue to native BioEngine
                }
            }

            // Fallback / Standalone: Native BioEngine execution
            val result = apiResult ?: BioEngine.needlemanWunsch(
                refSequence = cleanRef,
                altSequence = cleanAlt,
                matchScore = matchScore.value,
                mismatchPenalty = mismatchPenalty.value,
                gapPenalty = gapPenalty.value,
                coordinateOffset = offset,
                refName = benchmark?.geneSymbol ?: "Reference Sequence",
                altName = sequenceTitle.value
            )

            _alignmentState.value = UiState.Success(result)

            // Auto-save to Cloud Firestore
            if (repository.isUserLoggedIn) {
                saveAlignmentRecord(result)
            }
        }
    }

    // ======================== TRANSLATION & ORFS ========================

    fun runSixFrameTranslation() {
        val seq = referenceInput.value.trim()
        val (isValid, cleaned) = BioEngine.validateSequence(seq, true)
        if (!isValid) {
            _translationState.value = UiState.Error("Invalid sequence input for translation.")
            return
        }

        _translationState.value = UiState.Loading
        viewModelScope.launch {
            try {
                val res = BioEngine.translateSixFrames(cleaned, 8)
                _translationState.value = UiState.Success(res)
            } catch (e: Exception) {
                _translationState.value = UiState.Error(e.localizedMessage ?: "Translation failed")
            }
        }
    }

    // ======================== FASTA IMPORT ========================

    fun parseFastaContent(content: String) {
        if (content.isBlank()) {
            _fastaState.value = UiState.Error("FASTA input is empty.")
            return
        }

        try {
            val records = BioEngine.parseFasta(content)
            if (records.isEmpty()) {
                _fastaState.value = UiState.Error("No valid FASTA records found. Headers must start with '>'")
            } else {
                _fastaState.value = UiState.Success(records)
                // Set first record into reference input
                referenceInput.value = records.first().sequence
                sequenceTitle.value = records.first().id
            }
        } catch (e: Exception) {
            _fastaState.value = UiState.Error(e.localizedMessage ?: "FASTA parsing failed")
        }
    }

    // ======================== BENCHMARK PRESETS ========================

    fun loadBenchmark(benchmark: BenchmarkCase) {
        selectedBenchmarkId.value = benchmark.id
        sequenceTitle.value = "${benchmark.geneSymbol}: ${benchmark.condition}"
        referenceInput.value = benchmark.refSequence
        alternateInput.value = benchmark.altSequence
        motifInput.value = if (benchmark.geneSymbol == "HBB") "CCTGAG" else "TATA"
    }

    // ======================== CLOUD FIRESTORE AUTO-SAVE ========================

    private fun saveAlignmentRecord(result: AlignmentResult) {
        val summary = "${result.mutations.size} variant(s) detected (${result.snpCount} SNPs, ${result.insertionCount} Ins, ${result.deletionCount} Del); Identity: ${result.identityPercent}%, Score: ${result.score}."
        val preview = if (result.altAligned.length > 60) "${result.altAligned.take(30)}...${result.altAligned.takeLast(30)}" else result.altAligned

        val record = AnalysisRecord(
            title = sequenceTitle.value,
            module = "MUTATION_DETECTION",
            analysisType = "Pairwise Needleman-Wunsch Alignment & Mutation Detection",
            algorithm = "Needleman-Wunsch Global Alignment & HGVS Normalization",
            sequenceLength = result.altAligned.replace("-", "").length,
            summary = summary,
            status = "COMPLETED",
            sequencePreview = preview,
            refSequence = referenceInput.value,
            altSequence = alternateInput.value,
            refAligned = result.refAligned,
            altAligned = result.altAligned,
            matchString = result.matchString,
            identityPercent = result.identityPercent,
            mutationCount = result.mutations.size,
            mutationsSummary = result.mutations.joinToString("; ") { "${it.hgvs}: ${it.description}" }
        )

        viewModelScope.launch {
            _saveState.value = UiState.Loading
            repository.saveAnalysis(record).onSuccess { docId ->
                _saveState.value = UiState.Success(docId)
            }.onFailure { err ->
                _saveState.value = UiState.Error(err.localizedMessage ?: "Save failed")
            }
        }
    }

    private fun savePatternAnalysisRecord(composite: PatternAnalysisComposite, motif: String) {
        val summary = "Identified ${composite.kmp.totalMatches} KMP matches and ${composite.boyerMoore.totalMatches} BM matches for motif \"$motif\"; ${composite.suffixArray.totalRepeatsFound} repeat elements (LRS: ${composite.suffixArray.longestRepeatedSubstring?.length ?: 0} bp); Shannon entropy ${composite.kmerResult.shannonEntropy} bits."

        val record = AnalysisRecord(
            title = "Pattern Search: \"$motif\" on ${sequenceTitle.value}",
            module = "DNA_PATTERN_ANALYSIS",
            analysisType = "DNA Pattern Analysis (KMP, Boyer-Moore, Suffix Array)",
            algorithm = "Knuth-Morris-Pratt, Boyer-Moore, Suffix Array & Kasai LCP",
            sequenceLength = composite.metrics.length,
            summary = summary,
            status = "COMPLETED",
            gcContent = composite.metrics.gcContent,
            atContent = composite.metrics.atContent,
            motifQuery = motif,
            motifCount = composite.kmp.totalMatches
        )

        viewModelScope.launch {
            repository.saveAnalysis(record)
        }
    }

    fun deleteAnalysisRecord(id: String) {
        viewModelScope.launch {
            repository.deleteAnalysis(id)
        }
    }
}
