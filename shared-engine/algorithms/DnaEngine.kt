package com.biotech.dnadetect.domain

/**
 * Smart Bioinformatics Application - Kotlin Native DNA Engine
 * 
 * Genuine native Android implementation of:
 * - FASTA Parsing
 * - IUPAC DNA Validation
 * - GC Content & Skew computation
 * - Motif Identification
 * - Needleman-Wunsch Global Alignment
 * - Mutation & Indel Classification
 */

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

data class MotifMatch(
    val start: Int,
    val end: Int,
    val strand: Char,
    val matchedSequence: String
)

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
    val position: Int,
    val refBase: String,
    val altBase: String,
    val subType: SubstitutionSubType? = null,
    val length: Int = 1,
    val description: String
)

data class AlignmentResult(
    val score: Int,
    val refAligned: String,
    val altAligned: String,
    val alignmentLength: Int,
    val identicalMatches: Int,
    val identityPercent: Double,
    val mutations: List<DetectedMutation>
)

object DnaEngine {

    private val PURINES = setOf('A', 'G')
    private val PYRIMIDINES = setOf('C', 'T')

    private val COMPLEMENT_MAP = mapOf(
        'A' to 'T', 'T' to 'A', 'C' to 'G', 'G' to 'C',
        'U' to 'A', 'R' to 'Y', 'Y' to 'R', 'S' to 'S',
        'W' to 'W', 'K' to 'M', 'M' to 'K', 'B' to 'V',
        'D' to 'H', 'H' to 'D', 'V' to 'B', 'N' to 'N',
        '-' to '-'
    )

    fun validateSequence(raw: String, allowAmbiguous: Boolean = false): Pair<Boolean, String> {
        val cleaned = raw.replace("\\s+".toRegex(), "").uppercase()
        val validChars = if (allowAmbiguous) "ACGTURYMKWSBDHVN-" else "ACGT-"
        val isValid = cleaned.isNotEmpty() && cleaned.all { it in validChars }
        return Pair(isValid, cleaned)
    }

    fun parseFasta(content: String): List<FastaRecord> {
        val records = mutableListOf<FastaRecord>()
        var currentId = ""
        var currentDesc = ""
        val seqBuilder = StringBuilder()

        content.lines().forEach { rawLine ->
            val line = rawLine.trim()
            if (line.isNotEmpty() && !line.startsWith(";")) {
                if (line.startsWith(">")) {
                    if (currentId.isNotEmpty()) {
                        val seq = seqBuilder.toString()
                        records.add(FastaRecord(currentId, currentDesc, seq, seq.length))
                        seqBuilder.clear()
                    }
                    val header = line.substring(1).trim()
                    val spaceIdx = header.indexOf(' ')
                    if (spaceIdx != -1) {
                        currentId = header.substring(0, spaceIdx)
                        currentDesc = header.substring(spaceIdx + 1).trim()
                    } else {
                        currentId = header
                        currentDesc = ""
                    }
                } else {
                    seqBuilder.append(line.replace("\\s+".toRegex(), "").uppercase())
                }
            }
        }

        if (currentId.isNotEmpty()) {
            val seq = seqBuilder.toString()
            records.add(FastaRecord(currentId, currentDesc, seq, seq.length))
        }

        return records
    }

    fun calculateMetrics(sequence: String): SequenceMetrics {
        val cleaned = sequence.replace("\\s+".toRegex(), "").uppercase()
        var a = 0; var t = 0; var c = 0; var g = 0; var other = 0

        for (ch in cleaned) {
            when (ch) {
                'A' -> a++
                'T', 'U' -> t++
                'C' -> c++
                'G' -> g++
                '-' -> {}
                else -> other++
            }
        }

        val validBases = (a + t + c + g).toDouble()
        val gc = if (validBases > 0) ((g + c) / validBases) * 100.0 else 0.0
        val at = if (validBases > 0) ((a + t) / validBases) * 100.0 else 0.0
        val gcSkew = if ((g + c) > 0) (g - c).toDouble() / (g + c).toDouble() else 0.0
        val atSkew = if ((a + t) > 0) (a - t).toDouble() / (a + t).toDouble() else 0.0

        return SequenceMetrics(
            length = cleaned.length,
            countA = a,
            countT = t,
            countC = c,
            countG = g,
            countOther = other,
            gcContent = Math.round(gc * 100.0) / 100.0,
            atContent = Math.round(at * 100.0) / 100.0,
            gcSkew = Math.round(gcSkew * 10000.0) / 10000.0,
            atSkew = Math.round(atSkew * 10000.0) / 10000.0
        )
    }

    fun getReverseComplement(sequence: String): String {
        val cleaned = sequence.replace("\\s+".toRegex(), "").uppercase()
        return cleaned.reversed().map { COMPLEMENT_MAP[it] ?: 'N' }.joinToString("")
    }

    fun findMotifs(sequence: String, motif: String, searchBothStrands: Boolean = true): List<MotifMatch> {
        val seq = sequence.replace("\\s+".toRegex(), "").uppercase()
        val mot = motif.replace("\\s+".toRegex(), "").uppercase()
        if (seq.isEmpty() || mot.isEmpty() || mot.length > seq.length) return emptyList()

        val results = mutableListOf<MotifMatch>()

        // Forward strand
        var index = seq.indexOf(mot)
        while (index >= 0) {
            results.add(MotifMatch(index + 1, index + mot.length, '+', mot))
            index = seq.indexOf(mot, index + 1)
        }

        // Reverse complement strand
        if (searchBothStrands) {
            val revMotif = getReverseComplement(mot)
            if (revMotif != mot) {
                var revIdx = seq.indexOf(revMotif)
                while (revIdx >= 0) {
                    results.add(MotifMatch(revIdx + 1, revIdx + revMotif.length, '-', revMotif))
                    revIdx = seq.indexOf(revMotif, revIdx + 1)
                }
            }
        }

        return results.sortedBy { it.start }
    }

    fun alignAndDetect(
        refSeq: String,
        altSeq: String,
        matchScore: Int = 2,
        mismatchPenalty: Int = -1,
        gapPenalty: Int = -2
    ): AlignmentResult {
        val ref = refSeq.replace("\\s+".toRegex(), "").uppercase()
        val alt = altSeq.replace("\\s+".toRegex(), "").uppercase()
        val n = ref.length
        val m = alt.length

        val dp = Array(n + 1) { IntArray(m + 1) }

        for (i in 0..n) dp[i][0] = i * gapPenalty
        for (j in 0..m) dp[0][j] = j * gapPenalty

        for (i in 1..n) {
            for (j in 1..m) {
                val score = if (ref[i - 1] == alt[j - 1]) matchScore else mismatchPenalty
                val diag = dp[i - 1][j - 1] + score
                val up = dp[i - 1][j] + gapPenalty
                val left = dp[i][j - 1] + gapPenalty
                dp[i][j] = maxOf(diag, up, left)
            }
        }

        val refAlignedBuilder = StringBuilder()
        val altAlignedBuilder = StringBuilder()
        var i = n
        var j = m

        while (i > 0 || j > 0) {
            val score = if (i > 0 && j > 0 && ref[i - 1] == alt[j - 1]) matchScore else mismatchPenalty
            if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + score) {
                refAlignedBuilder.append(ref[i - 1])
                altAlignedBuilder.append(alt[j - 1])
                i--; j--
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + gapPenalty) {
                refAlignedBuilder.append(ref[i - 1])
                altAlignedBuilder.append('-')
                i--
            } else {
                refAlignedBuilder.append('-')
                altAlignedBuilder.append(alt[j - 1])
                j--
            }
        }

        val refAligned = refAlignedBuilder.reverse().toString()
        val altAligned = altAlignedBuilder.reverse().toString()

        var matches = 0
        for (k in refAligned.indices) {
            if (refAligned[k] == altAligned[k] && refAligned[k] != '-') matches++
        }
        val identity = if (refAligned.isNotEmpty()) (matches.toDouble() / refAligned.length.toDouble()) * 100.0 else 0.0

        val mutations = mutableListOf<DetectedMutation>()
        var refPos = 0

        for (k in refAligned.indices) {
            val r = refAligned[k]
            val a = altAligned[k]

            if (r != '-') refPos++

            if (r != a) {
                if (r != '-' && a != '-') {
                    val isTransition = (r in PURINES && a in PURINES) || (r in PYRIMIDINES && a in PYRIMIDINES)
                    val subType = if (isTransition) SubstitutionSubType.TRANSITION else SubstitutionSubType.TRANSVERSION
                    mutations.add(
                        DetectedMutation(
                            type = MutationType.SUBSTITUTION,
                            position = refPos,
                            refBase = r.toString(),
                            altBase = a.toString(),
                            subType = subType,
                            description = "c.${refPos}${r}>${a} (${subType.name.lowercase()})"
                        )
                    )
                } else if (r == '-' && a != '-') {
                    mutations.add(
                        DetectedMutation(
                            type = MutationType.INSERTION,
                            position = refPos,
                            refBase = "-",
                            altBase = a.toString(),
                            description = "ins$a at pos $refPos"
                        )
                    )
                } else if (r != '-' && a == '-') {
                    mutations.add(
                        DetectedMutation(
                            type = MutationType.DELETION,
                            position = refPos,
                            refBase = r.toString(),
                            altBase = "-",
                            description = "del$r at pos $refPos"
                        )
                    )
                }
            }
        }

        return AlignmentResult(
            score = dp[n][m],
            refAligned = refAligned,
            altAligned = altAligned,
            alignmentLength = refAligned.length,
            identicalMatches = matches,
            identityPercent = Math.round(identity * 100.0) / 100.0,
            mutations = mutations
        )
    }
}

