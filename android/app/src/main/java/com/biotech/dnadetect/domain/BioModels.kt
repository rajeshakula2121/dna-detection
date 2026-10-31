package com.biotech.dnadetect.domain

enum class SequenceType {
    DNA,
    RNA,
    PROTEIN
}

data class ValidationResult(
    val isValid: Boolean,
    val detectedType: SequenceType?,
    val suggestedType: SequenceType,
    val cleanedSequence: String,
    val invalidCharacters: List<Char>,
    val warnings: List<String>
)

data class SequenceMetrics(
    val length: Int,
    val countA: Int,
    val countT: Int,
    val countC: Int,
    val countG: Int,
    val countOther: Int,
    val gcContent: Double,
    val atContent: Double,
    val gcSkew: Double,
    val atSkew: Double
)

data class FastaRecord(
    val id: String,
    val description: String,
    val sequence: String,
    val length: Int
)

// ======================== PATTERN ALGORITHMS ========================

data class LpsEntry(
    val index: Int,
    val char: Char,
    val lps: Int
)

data class KmpMatch(
    val matchNumber: Int,
    val startCoordinate: Int, // 1-based biological coordinate
    val endCoordinate: Int,
    val strand: String, // "Forward (+)" or "Reverse Complement (-)"
    val matchedSequence: String,
    val context: String
)

data class KmpResult(
    val pattern: String,
    val matches: List<KmpMatch>,
    val forwardMatches: Int,
    val reverseMatches: Int,
    val totalMatches: Int,
    val comparisonsCount: Int,
    val executionTimeMs: Double,
    val lpsTable: List<LpsEntry>
)

data class BadCharEntry(
    val char: Char,
    val lastIndex: Int,
    val shift: Int
)

data class BoyerMooreResult(
    val pattern: String,
    val matches: List<KmpMatch>,
    val forwardMatches: Int,
    val reverseMatches: Int,
    val totalMatches: Int,
    val comparisonsCount: Int,
    val totalShifts: Int,
    val executionTimeMs: Double,
    val badCharTable: List<BadCharEntry>
)

data class RepeatElement(
    val sequence: String,
    val length: Int,
    val occurrences: Int,
    val startCoordinates: List<Int> // 1-based coordinates
)

data class SuffixArrayResult(
    val totalRepeatsFound: Int,
    val longestRepeatedSubstring: RepeatElement?,
    val repeats: List<RepeatElement>,
    val executionTimeMs: Double,
    val suffixArrayPreview: List<Pair<Int, String>> // Index to suffix
)

data class KmerFrequencyItem(
    val kmer: String,
    val count: Int,
    val frequency: Double
)

data class KmerAnalysisResult(
    val k: Int,
    val totalWindows: Int,
    val uniqueKmers: Int,
    val shannonEntropy: Double, // in bits/window
    val topKmers: List<KmerFrequencyItem>,
    val executionTimeMs: Double
)

data class PatternAnalysisComposite(
    val metrics: SequenceMetrics,
    val kmp: KmpResult,
    val boyerMoore: BoyerMooreResult,
    val suffixArray: SuffixArrayResult,
    val kmerResult: KmerAnalysisResult
)

// ======================== MUTATION & ALIGNMENT ========================

enum class MutationType {
    SUBSTITUTION,
    INSERTION,
    DELETION
}

enum class SubstitutionSubType {
    TRANSITION,
    TRANSVERSION
}

data class DetectedMutation(
    val type: MutationType,
    val position: Int, // 1-based biological local position
    val refPosition: Int,
    val altPosition: Int,
    val cdsPosition: Int? = null,
    val refBase: String,
    val altBase: String,
    val subType: SubstitutionSubType? = null,
    val length: Int = 1,
    val hgvs: String = "",
    val description: String = "",
    val flanking5Prime: String = "",
    val flanking3Prime: String = ""
)

data class AlignmentBlock(
    val startCol: Int,
    val endCol: Int,
    val refChunk: String,
    val matchChunk: String,
    val altChunk: String
)

data class AlignmentResult(
    val score: Int,
    val refName: String,
    val altName: String,
    val refAligned: String,
    val altAligned: String,
    val matchString: String,
    val alignmentLength: Int,
    val matchesCount: Int,
    val mismatchesCount: Int,
    val gapsCount: Int,
    val snpCount: Int,
    val insertionCount: Int,
    val deletionCount: Int,
    val identityPercent: Double,
    val similarityPercent: Double,
    val mutations: List<DetectedMutation>,
    val blocks: List<AlignmentBlock>
)

// ======================== TRANSLATION & ORFS ========================

data class CodonTranslation(
    val codon: String,
    val aminoAcid: Char,
    val name: String,
    val position: Int
)

data class ReadingFrame(
    val frame: Int, // +1, +2, +3, -1, -2, -3
    val strand: Char, // '+' or '-'
    val proteinSequence: String,
    val codons: List<CodonTranslation>,
    val stopCount: Int
)

data class OpenReadingFrame(
    val frame: Int,
    val startNucleotide: Int,
    val endNucleotide: Int,
    val lengthNucleotides: Int,
    val lengthAminoAcids: Int,
    val proteinSequence: String,
    val molecularWeightDa: Double = 0.0,
    val hasStartCodon: Boolean,
    val hasStopCodon: Boolean
)

data class SixFrameTranslationResult(
    val forwardFrames: List<ReadingFrame>,
    val reverseFrames: List<ReadingFrame>,
    val orfs: List<OpenReadingFrame>,
    val codonTable: String = "STANDARD NCBI Genetic Code Table 1"
)

// ======================== BENCHMARK PRESET ========================

data class BenchmarkCase(
    val id: String,
    val geneSymbol: String,
    val condition: String,
    val refAccession: String,
    val transcriptOffset: Int,
    val expectedHgvs: String,
    val refSequence: String,
    val altSequence: String,
    val description: String
)
