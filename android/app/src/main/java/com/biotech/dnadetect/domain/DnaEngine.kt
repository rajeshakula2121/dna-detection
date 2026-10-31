package com.biotech.dnadetect.domain

/**
 * DnaEngine — Backward-compatible facade delegating directly to BioEngine.
 */
object DnaEngine {

    fun validateSequence(raw: String, allowAmbiguous: Boolean = false): Pair<Boolean, String> =
        BioEngine.validateSequence(raw, allowAmbiguous)

    fun calculateMetrics(sequence: String): SequenceMetrics =
        BioEngine.calculateMetrics(sequence)

    fun reverseComplement(sequence: String): String =
        BioEngine.reverseComplement(sequence)

    fun findMotifs(sequence: String, motif: String, searchBothStrands: Boolean = true): List<KmpMatch> =
        BioEngine.kmpSearch(sequence, motif, searchBothStrands).matches

    fun alignAndDetect(
        refSequence: String,
        altSequence: String,
        matchScore: Int = 2,
        mismatchPenalty: Int = -1,
        gapPenalty: Int = -2
    ): AlignmentResult =
        BioEngine.needlemanWunsch(refSequence, altSequence, matchScore, mismatchPenalty, gapPenalty)

    fun parseFasta(content: String): List<FastaRecord> =
        BioEngine.parseFasta(content)
}
