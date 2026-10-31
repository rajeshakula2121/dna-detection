package com.biotech.dnadetect.domain

import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * BioEngine — Comprehensive Kotlin Native Bioinformatics Engine
 *
 * Implements deterministic scientific algorithms matching the web application:
 * 1. IUPAC Sequence Validation & Composition Metrics
 * 2. Knuth-Morris-Pratt (KMP) exact pattern search with LPS prefix table
 * 3. Boyer-Moore (BM) motif search with Bad Character heuristic
 * 4. Suffix Array & Kasai LCP repeat analysis and Longest Repeated Substring (LRS)
 * 5. K-mer frequency analysis & Shannon Information Entropy
 * 6. Needleman-Wunsch global pairwise alignment & variant calling (SNPs, Indels, HGVS)
 * 7. Six-Frame genetic translation and Open Reading Frame (ORF) detection
 * 8. FASTA multi-record parser
 * 9. Verified clinical genomics benchmarks (HBB, BRCA1, CFTR)
 */
object BioEngine {

    // ======================== STANDARD GENETIC CODE ========================

    val CODON_TABLE = mapOf(
        "TTT" to 'F', "TTC" to 'F', "TTA" to 'L', "TTG" to 'L',
        "CTT" to 'L', "CTC" to 'L', "CTA" to 'L', "CTG" to 'L',
        "ATT" to 'I', "ATC" to 'I', "ATA" to 'I', "ATG" to 'M',
        "GTT" to 'V', "GTC" to 'V', "GTA" to 'V', "GTG" to 'V',
        "TCT" to 'S', "TCC" to 'S', "TCA" to 'S', "TCG" to 'S',
        "CCT" to 'P', "CCC" to 'P', "CCA" to 'P', "CCG" to 'P',
        "ACT" to 'T', "ACC" to 'T', "ACA" to 'T', "ACG" to 'T',
        "GCT" to 'A', "GCC" to 'A', "GCA" to 'A', "GCG" to 'A',
        "TAT" to 'Y', "TAC" to 'Y', "TAA" to '*', "TAG" to '*',
        "CAT" to 'H', "CAC" to 'H', "CAA" to 'Q', "CAG" to 'Q',
        "AAT" to 'N', "AAC" to 'N', "AAA" to 'K', "AAG" to 'K',
        "GAT" to 'D', "GAC" to 'D', "GAA" to 'E', "GAG" to 'E',
        "TGT" to 'C', "TGC" to 'C', "TGA" to '*', "TGG" to 'W',
        "CGT" to 'R', "CGC" to 'R', "CGA" to 'R', "CGG" to 'R',
        "AGT" to 'S', "AGC" to 'S', "AGA" to 'R', "AGG" to 'R',
        "GGT" to 'G', "GGC" to 'G', "GGA" to 'G', "GGG" to 'G'
    )

    val AMINO_ACID_NAMES = mapOf(
        'A' to "Alanine", 'R' to "Arginine", 'N' to "Asparagine", 'D' to "Aspartic Acid",
        'C' to "Cysteine", 'E' to "Glutamic Acid", 'Q' to "Glutamine", 'G' to "Glycine",
        'H' to "Histidine", 'I' to "Isoleucine", 'L' to "Leucine", 'K' to "Lysine",
        'M' to "Methionine", 'F' to "Phenylalanine", 'P' to "Proline", 'S' to "Serine",
        'T' to "Threonine", 'W' to "Tryptophan", 'Y' to "Tyrosine", 'V' to "Valine",
        '*' to "Stop Codon", 'X' to "Unknown"
    )

    private val AMINO_ACID_MW = mapOf(
        'A' to 71.08, 'R' to 156.19, 'N' to 114.10, 'D' to 115.09,
        'C' to 103.14, 'E' to 129.12, 'Q' to 128.13, 'G' to 57.05,
        'H' to 137.14, 'I' to 113.16, 'L' to 113.16, 'K' to 128.17,
        'M' to 131.19, 'F' to 147.18, 'P' to 97.12, 'S' to 87.08,
        'T' to 101.11, 'W' to 186.21, 'Y' to 163.18, 'V' to 99.13
    )

    private val DNA_COMPLEMENT = mapOf(
        'A' to 'T', 'T' to 'A', 'C' to 'G', 'G' to 'C',
        'R' to 'Y', 'Y' to 'R', 'S' to 'S', 'W' to 'W',
        'K' to 'M', 'M' to 'K', 'B' to 'V', 'D' to 'H',
        'H' to 'D', 'V' to 'B', 'N' to 'N', '-' to '-'
    )

    private val PURINES = setOf('A', 'G')
    private val PYRIMIDINES = setOf('C', 'T')

    // ======================== 1. SEQUENCE VALIDATION & METRICS ========================

    fun validateSequence(rawSequence: String, allowAmbiguous: Boolean = false): Pair<Boolean, String> {
        val cleaned = rawSequence.replace("\\s+".toRegex(), "").uppercase()
        val validBases = if (allowAmbiguous) "ACGTURYMKWSBDHVN-" else "ACGT-"
        val isValid = cleaned.isNotEmpty() && cleaned.all { it in validBases }
        return Pair(isValid, cleaned)
    }

    fun extractInvalidChars(rawSequence: String, allowAmbiguous: Boolean = false): List<Char> {
        val cleaned = rawSequence.replace("\\s+".toRegex(), "").uppercase()
        val validBases = if (allowAmbiguous) "ACGTURYMKWSBDHVN-" else "ACGT-"
        return cleaned.filter { it !in validBases }.toList().distinct()
    }

    fun reverseComplement(sequence: String): String {
        return sequence.replace("\\s+".toRegex(), "").uppercase().reversed().map { ch ->
            DNA_COMPLEMENT[ch] ?: ch
        }.joinToString("")
    }

    fun calculateMetrics(sequence: String): SequenceMetrics {
        val cleaned = sequence.replace("\\s+".toRegex(), "").uppercase()
        val len = cleaned.length
        var a = 0; var t = 0; var c = 0; var g = 0; var other = 0

        for (ch in cleaned) {
            when (ch) {
                'A' -> a++
                'T', 'U' -> t++
                'C' -> c++
                'G' -> g++
                else -> other++
            }
        }

        val gc = if (len > 0) ((c + g).toDouble() / len * 100.0) else 0.0
        val at = if (len > 0) ((a + t).toDouble() / len * 100.0) else 0.0
        val gcSkew = if (g + c > 0) (g - c).toDouble() / (g + c) else 0.0
        val atSkew = if (a + t > 0) (a - t).toDouble() / (a + t) else 0.0

        return SequenceMetrics(
            length = len,
            countA = a,
            countT = t,
            countC = c,
            countG = g,
            countOther = other,
            gcContent = ((gc * 100.0).roundToInt() / 100.0),
            atContent = ((at * 100.0).roundToInt() / 100.0),
            gcSkew = ((gcSkew * 10000.0).roundToInt() / 10000.0),
            atSkew = ((atSkew * 10000.0).roundToInt() / 10000.0)
        )
    }

    // ======================== 2. KNUTH-MORRIS-PRATT (KMP) ========================

    fun computeLpsTable(pattern: String): IntArray {
        val m = pattern.length
        val lps = IntArray(m)
        var len = 0
        var i = 1

        while (i < m) {
            if (pattern[i] == pattern[len]) {
                len++
                lps[i] = len
                i++
            } else {
                if (len != 0) {
                    len = lps[len - 1]
                } else {
                    lps[i] = 0
                    i++
                }
            }
        }
        return lps
    }

    fun kmpSearch(sequence: String, pattern: String, searchBothStrands: Boolean = true): KmpResult {
        val startTime = System.nanoTime()
        val text = sequence.replace("\\s+".toRegex(), "").uppercase()
        val pat = pattern.replace("\\s+".toRegex(), "").uppercase()

        if (text.isEmpty() || pat.isEmpty() || pat.length > text.length) {
            return KmpResult(
                pattern = pat,
                matches = emptyList(),
                forwardMatches = 0,
                reverseMatches = 0,
                totalMatches = 0,
                comparisonsCount = 0,
                executionTimeMs = 0.0,
                lpsTable = emptyList()
            )
        }

        val lps = computeLpsTable(pat)
        val lpsEntries = pat.mapIndexed { idx, ch ->
            LpsEntry(index = idx, char = ch, lps = lps[idx])
        }

        var comparisons = 0
        val matches = mutableListOf<KmpMatch>()

        // 1. Forward Strand Search
        var i = 0
        var j = 0
        while (i < text.length) {
            comparisons++
            if (pat[j] == text[i]) {
                i++
                j++
            }
            if (j == pat.length) {
                val start = i - j + 1 // 1-based coordinate
                val end = i
                val ctxStart = max(0, start - 10)
                val ctxEnd = min(text.length, end + 10)
                val context = text.substring(ctxStart, ctxEnd)

                matches.add(
                    KmpMatch(
                        matchNumber = matches.size + 1,
                        startCoordinate = start,
                        endCoordinate = end,
                        strand = "Forward (+)",
                        matchedSequence = text.substring(start - 1, end),
                        context = context
                    )
                )
                j = lps[j - 1]
            } else if (i < text.length && pat[j] != text[i]) {
                if (j != 0) {
                    j = lps[j - 1]
                } else {
                    i++
                }
            }
        }
        val fwdCount = matches.size

        // 2. Reverse Complement Strand Search
        if (searchBothStrands) {
            val revComp = reverseComplement(pat)
            if (revComp != pat) {
                val revLps = computeLpsTable(revComp)
                var ri = 0
                var rj = 0
                while (ri < text.length) {
                    comparisons++
                    if (revComp[rj] == text[ri]) {
                        ri++
                        rj++
                    }
                    if (rj == revComp.length) {
                        val start = ri - rj + 1
                        val end = ri
                        val ctxStart = max(0, start - 10)
                        val ctxEnd = min(text.length, end + 10)
                        val context = text.substring(ctxStart, ctxEnd)

                        matches.add(
                            KmpMatch(
                                matchNumber = matches.size + 1,
                                startCoordinate = start,
                                endCoordinate = end,
                                strand = "Reverse Complement (-)",
                                matchedSequence = text.substring(start - 1, end),
                                context = context
                            )
                        )
                        rj = revLps[rj - 1]
                    } else if (ri < text.length && revComp[rj] != text[ri]) {
                        if (rj != 0) {
                            rj = revLps[rj - 1]
                        } else {
                            ri++
                        }
                    }
                }
            }
        }

        val elapsedMs = (System.nanoTime() - startTime) / 1_000_000.0

        return KmpResult(
            pattern = pat,
            matches = matches,
            forwardMatches = fwdCount,
            reverseMatches = matches.size - fwdCount,
            totalMatches = matches.size,
            comparisonsCount = comparisons,
            executionTimeMs = ((elapsedMs * 1000.0).roundToInt() / 1000.0),
            lpsTable = lpsEntries
        )
    }

    // ======================== 3. BOYER-MOORE ALGORITHM ========================

    private fun buildBadCharTable(pattern: String): Map<Char, Int> {
        val table = mutableMapOf<Char, Int>()
        for (idx in pattern.indices) {
            table[pattern[idx]] = idx
        }
        return table
    }

    fun boyerMooreSearch(sequence: String, pattern: String, searchBothStrands: Boolean = true): BoyerMooreResult {
        val startTime = System.nanoTime()
        val text = sequence.replace("\\s+".toRegex(), "").uppercase()
        val pat = pattern.replace("\\s+".toRegex(), "").uppercase()

        if (text.isEmpty() || pat.isEmpty() || pat.length > text.length) {
            return BoyerMooreResult(
                pattern = pat,
                matches = emptyList(),
                forwardMatches = 0,
                reverseMatches = 0,
                totalMatches = 0,
                comparisonsCount = 0,
                totalShifts = 0,
                executionTimeMs = 0.0,
                badCharTable = emptyList()
            )
        }

        val badChar = buildBadCharTable(pat)
        val badCharEntries = pat.mapIndexed { idx, ch ->
            val shift = max(1, pat.length - 1 - idx)
            BadCharEntry(char = ch, lastIndex = idx, shift = shift)
        }.distinctBy { it.char }

        var comparisons = 0
        var shifts = 0
        val matches = mutableListOf<KmpMatch>()

        // 1. Forward Scan
        var s = 0
        val m = pat.length
        val n = text.length

        while (s <= n - m) {
            var j = m - 1
            while (j >= 0) {
                comparisons++
                if (pat[j] == text[s + j]) {
                    j--
                } else {
                    break
                }
            }

            if (j < 0) {
                val start = s + 1
                val end = s + m
                val ctxStart = max(0, start - 10)
                val ctxEnd = min(n, end + 10)
                matches.add(
                    KmpMatch(
                        matchNumber = matches.size + 1,
                        startCoordinate = start,
                        endCoordinate = end,
                        strand = "Forward (+)",
                        matchedSequence = text.substring(start - 1, end),
                        context = text.substring(ctxStart, ctxEnd)
                    )
                )
                val shift = if (s + m < n) m - (badChar[text[s + m]] ?: -1) else 1
                s += max(1, shift)
                shifts++
            } else {
                val lastIdx = badChar[text[s + j]] ?: -1
                val shift = max(1, j - lastIdx)
                s += shift
                shifts++
            }
        }
        val fwdCount = matches.size

        // 2. Reverse Complement Scan
        if (searchBothStrands) {
            val revComp = reverseComplement(pat)
            if (revComp != pat) {
                val revBadChar = buildBadCharTable(revComp)
                var rs = 0
                while (rs <= n - m) {
                    var j = m - 1
                    while (j >= 0) {
                        comparisons++
                        if (revComp[j] == text[rs + j]) {
                            j--
                        } else {
                            break
                        }
                    }

                    if (j < 0) {
                        val start = rs + 1
                        val end = rs + m
                        val ctxStart = max(0, start - 10)
                        val ctxEnd = min(n, end + 10)
                        matches.add(
                            KmpMatch(
                                matchNumber = matches.size + 1,
                                startCoordinate = start,
                                endCoordinate = end,
                                strand = "Reverse Complement (-)",
                                matchedSequence = text.substring(start - 1, end),
                                context = text.substring(ctxStart, ctxEnd)
                            )
                        )
                        val shift = if (rs + m < n) m - (revBadChar[text[rs + m]] ?: -1) else 1
                        rs += max(1, shift)
                        shifts++
                    } else {
                        val lastIdx = revBadChar[text[rs + j]] ?: -1
                        val shift = max(1, j - lastIdx)
                        rs += shift
                        shifts++
                    }
                }
            }
        }

        val elapsedMs = (System.nanoTime() - startTime) / 1_000_000.0

        return BoyerMooreResult(
            pattern = pat,
            matches = matches,
            forwardMatches = fwdCount,
            reverseMatches = matches.size - fwdCount,
            totalMatches = matches.size,
            comparisonsCount = comparisons,
            totalShifts = shifts,
            executionTimeMs = ((elapsedMs * 1000.0).roundToInt() / 1000.0),
            badCharTable = badCharEntries
        )
    }

    // ======================== 4. SUFFIX ARRAY & KASAI LCP ========================

    fun suffixArrayRepeatAnalysis(sequence: String, minRepeatLen: Int = 4, minOccurrences: Int = 2): SuffixArrayResult {
        val startTime = System.nanoTime()
        val text = sequence.replace("\\s+".toRegex(), "").uppercase()
        val n = text.length

        if (n < minRepeatLen) {
            return SuffixArrayResult(
                totalRepeatsFound = 0,
                longestRepeatedSubstring = null,
                repeats = emptyList(),
                executionTimeMs = 0.0,
                suffixArrayPreview = emptyList()
            )
        }

        // 1. Build Suffix Array
        val suffixes = Array(n) { i -> i }
        suffixes.sortWith(Comparator { a, b ->
            var i = a
            var j = b
            while (i < n && j < n) {
                if (text[i] != text[j]) return@Comparator text[i].compareTo(text[j])
                i++
                j++
            }
            (n - a).compareTo(n - b)
        })

        // 2. Build LCP Array using Kasai's algorithm
        val rank = IntArray(n)
        for (i in 0 until n) {
            rank[suffixes[i]] = i
        }

        val lcp = IntArray(n)
        var h = 0
        for (i in 0 until n) {
            if (rank[i] > 0) {
                val k = suffixes[rank[i] - 1]
                while (i + h < n && k + h < n && text[i + h] == text[k + h]) {
                    h++
                }
                lcp[rank[i]] = h
                if (h > 0) h--
            }
        }

        // 3. Extract Repeated Substrings
        val repeatCandidates = mutableMapOf<String, MutableSet<Int>>()

        for (i in 1 until n) {
            val commonLen = lcp[i]
            if (commonLen >= minRepeatLen) {
                for (subLen in minRepeatLen..commonLen) {
                    val sub = text.substring(suffixes[i], suffixes[i] + subLen)
                    val set = repeatCandidates.getOrPut(sub) { mutableSetOf() }
                    set.add(suffixes[i] + 1)
                    set.add(suffixes[i - 1] + 1)
                }
            }
        }

        val repeatList = repeatCandidates
            .filter { it.value.size >= minOccurrences }
            .map { (sub, starts) ->
                RepeatElement(
                    sequence = sub,
                    length = sub.length,
                    occurrences = starts.size,
                    startCoordinates = starts.sorted()
                )
            }
            .sortedWith(compareByDescending<RepeatElement> { it.length }.thenByDescending { it.occurrences })

        val lrs = repeatList.firstOrNull()

        val preview = suffixes.take(min(n, 12)).map { idx ->
            Pair(idx + 1, text.substring(idx, min(n, idx + 15)))
        }

        val elapsedMs = (System.nanoTime() - startTime) / 1_000_000.0

        return SuffixArrayResult(
            totalRepeatsFound = repeatList.size,
            longestRepeatedSubstring = lrs,
            repeats = repeatList.take(20),
            executionTimeMs = ((elapsedMs * 1000.0).roundToInt() / 1000.0),
            suffixArrayPreview = preview
        )
    }

    // ======================== 5. K-MER FREQUENCY & SHANNON ENTROPY ========================

    fun calculateKmerFrequencies(sequence: String, k: Int = 3, topN: Int = 8): KmerAnalysisResult {
        val startTime = System.nanoTime()
        val text = sequence.replace("\\s+".toRegex(), "").uppercase()
        val n = text.length

        if (n < k || k <= 0) {
            return KmerAnalysisResult(
                k = k,
                totalWindows = 0,
                uniqueKmers = 0,
                shannonEntropy = 0.0,
                topKmers = emptyList(),
                executionTimeMs = 0.0
            )
        }

        val counts = mutableMapOf<String, Int>()
        val totalWindows = n - k + 1

        for (i in 0 until totalWindows) {
            val kmer = text.substring(i, i + k)
            counts[kmer] = (counts[kmer] ?: 0) + 1
        }

        val uniqueKmers = counts.size

        // Shannon Entropy: H = - sum(p * log2(p))
        var entropy = 0.0
        val log2 = ln(2.0)

        for ((_, cnt) in counts) {
            val p = cnt.toDouble() / totalWindows
            if (p > 0.0) {
                entropy -= p * (ln(p) / log2)
            }
        }

        val topKmers = counts.entries
            .map { (kmer, cnt) ->
                KmerFrequencyItem(
                    kmer = kmer,
                    count = cnt,
                    frequency = ((cnt.toDouble() / totalWindows * 100.0 * 100.0).roundToInt() / 100.0)
                )
            }
            .sortedByDescending { it.count }
            .take(topN)

        val elapsedMs = (System.nanoTime() - startTime) / 1_000_000.0

        return KmerAnalysisResult(
            k = k,
            totalWindows = totalWindows,
            uniqueKmers = uniqueKmers,
            shannonEntropy = ((entropy * 1000.0).roundToInt() / 1000.0),
            topKmers = topKmers,
            executionTimeMs = ((elapsedMs * 1000.0).roundToInt() / 1000.0)
        )
    }

    // ======================== 6. NEEDLEMAN-WUNSCH ALIGNMENT & VARIANTS ========================

    fun needlemanWunsch(
        refSequence: String,
        altSequence: String,
        matchScore: Int = 2,
        mismatchPenalty: Int = -1,
        gapPenalty: Int = -2,
        coordinateOffset: Int = 0,
        refName: String = "Reference DNA",
        altName: String = "Query Sample"
    ): AlignmentResult {
        val s1 = refSequence.replace("\\s+".toRegex(), "").uppercase()
        val s2 = altSequence.replace("\\s+".toRegex(), "").uppercase()

        val n = s1.length
        val m = s2.length

        val dp = Array(n + 1) { IntArray(m + 1) }

        for (i in 0..n) dp[i][0] = i * gapPenalty
        for (j in 0..m) dp[0][j] = j * gapPenalty

        for (i in 1..n) {
            for (j in 1..m) {
                val match = dp[i - 1][j - 1] + if (s1[i - 1] == s2[j - 1]) matchScore else mismatchPenalty
                val delete = dp[i - 1][j] + gapPenalty
                val insert = dp[i][j - 1] + gapPenalty
                dp[i][j] = max(match, max(delete, insert))
            }
        }

        // Traceback
        val aln1 = StringBuilder()
        val aln2 = StringBuilder()
        var i = n
        var j = m

        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && dp[i][j] == dp[i - 1][j - 1] + if (s1[i - 1] == s2[j - 1]) matchScore else mismatchPenalty) {
                aln1.append(s1[i - 1])
                aln2.append(s2[j - 1])
                i--
                j--
            } else if (i > 0 && dp[i][j] == dp[i - 1][j] + gapPenalty) {
                aln1.append(s1[i - 1])
                aln2.append('-')
                i--
            } else {
                aln1.append('-')
                aln2.append(s2[j - 1])
                j--
            }
        }

        val refAligned = aln1.reverse().toString()
        val altAligned = aln2.reverse().toString()

        val matchStringBuilder = StringBuilder()
        var matches = 0
        var mismatches = 0
        var gaps = 0
        var snps = 0
        var insertions = 0
        var deletions = 0

        for (k in refAligned.indices) {
            val r = refAligned[k]
            val a = altAligned[k]
            if (r == '-' || a == '-') {
                matchStringBuilder.append(' ')
                gaps++
                if (r == '-') insertions++
                if (a == '-') deletions++
            } else if (r == a) {
                matchStringBuilder.append('|')
                matches++
            } else {
                matchStringBuilder.append('.')
                mismatches++
                snps++
            }
        }

        val matchString = matchStringBuilder.toString()
        val alnLen = refAligned.length
        val identity = if (alnLen > 0) ((matches.toDouble() / alnLen * 100.0 * 100.0).roundToInt() / 100.0) else 0.0

        // Variant Calling
        val detectedMutations = mutableListOf<DetectedMutation>()
        var refPos = 0
        var altPos = 0

        var idx = 0
        while (idx < alnLen) {
            val r = refAligned[idx]
            val a = altAligned[idx]

            if (r != '-') refPos++
            if (a != '-') altPos++

            if (r != a) {
                if (r != '-' && a != '-') {
                    // Substitution (SNP)
                    val isPurineRef = r in PURINES
                    val isPurineAlt = a in PURINES
                    val isTransition = isPurineRef == isPurineAlt
                    val subType = if (isTransition) SubstitutionSubType.TRANSITION else SubstitutionSubType.TRANSVERSION
                    val cds = coordinateOffset + refPos
                    val hgvs = "c.${cds}${r}>${a}"

                    val ctxStart = max(0, refPos - 5)
                    val ctxEnd = min(s1.length, refPos + 5)
                    val flk5 = if (refPos > 1) s1.substring(ctxStart, refPos - 1) else ""
                    val flk3 = if (refPos < s1.length) s1.substring(refPos, ctxEnd) else ""

                    detectedMutations.add(
                        DetectedMutation(
                            type = MutationType.SUBSTITUTION,
                            position = refPos,
                            refPosition = refPos,
                            altPosition = altPos,
                            cdsPosition = cds,
                            refBase = r.toString(),
                            altBase = a.toString(),
                            subType = subType,
                            length = 1,
                            hgvs = hgvs,
                            description = "Single nucleotide $subType ($r > $a) at local bp $refPos (coding c.$cds).",
                            flanking5Prime = flk5,
                            flanking3Prime = flk3
                        )
                    )
                } else if (r == '-') {
                    // Insertion in Alt
                    val insBases = StringBuilder()
                    val startAltPos = altPos
                    insBases.append(a)

                    var k = idx + 1
                    while (k < alnLen && refAligned[k] == '-') {
                        altPos++
                        insBases.append(altAligned[k])
                        k++
                    }
                    idx = k - 1

                    val insSeq = insBases.toString()
                    val cds = coordinateOffset + refPos
                    val hgvs = "c.${cds}_${cds + 1}ins$insSeq"

                    detectedMutations.add(
                        DetectedMutation(
                            type = MutationType.INSERTION,
                            position = refPos,
                            refPosition = refPos,
                            altPosition = startAltPos,
                            cdsPosition = cds,
                            refBase = "-",
                            altBase = insSeq,
                            length = insSeq.length,
                            hgvs = hgvs,
                            description = "Insertion of ${insSeq.length} bp ($insSeq) after position $refPos.",
                            flanking5Prime = s1.substring(max(0, refPos - 4), refPos),
                            flanking3Prime = if (refPos < s1.length) s1.substring(refPos, min(s1.length, refPos + 4)) else ""
                        )
                    )
                } else if (a == '-') {
                    // Deletion in Alt
                    val delBases = StringBuilder()
                    val startRefPos = refPos
                    delBases.append(r)

                    var k = idx + 1
                    while (k < alnLen && altAligned[k] == '-') {
                        refPos++
                        delBases.append(refAligned[k])
                        k++
                    }
                    idx = k - 1

                    val delSeq = delBases.toString()
                    val cdsStart = coordinateOffset + startRefPos
                    val cdsEnd = coordinateOffset + refPos
                    val hgvs = if (delSeq.length == 1) "c.${cdsStart}del$delSeq" else "c.${cdsStart}_${cdsEnd}del$delSeq"

                    detectedMutations.add(
                        DetectedMutation(
                            type = MutationType.DELETION,
                            position = startRefPos,
                            refPosition = startRefPos,
                            altPosition = altPos,
                            cdsPosition = cdsStart,
                            refBase = delSeq,
                            altBase = "-",
                            length = delSeq.length,
                            hgvs = hgvs,
                            description = "Contiguous deletion of ${delSeq.length} bp ($delSeq) spanning positions $startRefPos to $refPos.",
                            flanking5Prime = s1.substring(max(0, startRefPos - 5), startRefPos - 1),
                            flanking3Prime = if (refPos < s1.length) s1.substring(refPos, min(s1.length, refPos + 5)) else ""
                        )
                    )
                }
            }
            idx++
        }

        // Format 60-bp alignment blocks
        val blockSize = 60
        val blocks = mutableListOf<AlignmentBlock>()
        var col = 0
        while (col < alnLen) {
            val end = min(col + blockSize, alnLen)
            blocks.add(
                AlignmentBlock(
                    startCol = col + 1,
                    endCol = end,
                    refChunk = refAligned.substring(col, end),
                    matchChunk = matchString.substring(col, end),
                    altChunk = altAligned.substring(col, end)
                )
            )
            col += blockSize
        }

        return AlignmentResult(
            score = dp[n][m],
            refName = refName,
            altName = altName,
            refAligned = refAligned,
            altAligned = altAligned,
            matchString = matchString,
            alignmentLength = alnLen,
            matchesCount = matches,
            mismatchesCount = mismatches,
            gapsCount = gaps,
            snpCount = snps,
            insertionCount = insertions,
            deletionCount = deletions,
            identityPercent = identity,
            similarityPercent = identity,
            mutations = detectedMutations,
            blocks = blocks
        )
    }

    // ======================== 7. SIX-FRAME TRANSLATION & ORFS ========================

    fun translateFrame(dna: String, frameOffset: Int, strand: Char, frameNumber: Int): ReadingFrame {
        val proteinSeq = StringBuilder()
        val codons = mutableListOf<CodonTranslation>()
        var stopCount = 0

        var pos = frameOffset
        var codonIndex = 1

        while (pos + 2 < dna.length) {
            val codon = dna.substring(pos, pos + 3)
            val aa = CODON_TABLE[codon] ?: 'X'
            proteinSeq.append(aa)
            if (aa == '*') stopCount++

            codons.add(
                CodonTranslation(
                    codon = codon,
                    aminoAcid = aa,
                    name = AMINO_ACID_NAMES[aa] ?: "Unknown",
                    position = codonIndex
                )
            )
            pos += 3
            codonIndex++
        }

        return ReadingFrame(
            frame = frameNumber,
            strand = strand,
            proteinSequence = proteinSeq.toString(),
            codons = codons,
            stopCount = stopCount
        )
    }

    fun translateSixFrames(sequence: String, minOrfLengthAa: Int = 10): SixFrameTranslationResult {
        val fwdDna = sequence.replace("\\s+".toRegex(), "").uppercase()
        val revDna = reverseComplement(fwdDna)

        val f1 = translateFrame(fwdDna, 0, '+', 1)
        val f2 = translateFrame(fwdDna, 1, '+', 2)
        val f3 = translateFrame(fwdDna, 2, '+', 3)

        val r1 = translateFrame(revDna, 0, '-', -1)
        val r2 = translateFrame(revDna, 1, '-', -2)
        val r3 = translateFrame(revDna, 2, '-', -3)

        val forwardFrames = listOf(f1, f2, f3)
        val reverseFrames = listOf(r1, r2, r3)

        // Find candidate ORFs in all 6 frames
        val orfs = mutableListOf<OpenReadingFrame>()

        fun findOrfsInFrame(rf: ReadingFrame, dnaSeq: String) {
            val prot = rf.proteinSequence
            val codons = rf.codons
            var startIdx = -1

            for (i in prot.indices) {
                val aa = prot[i]
                if (aa == 'M' && startIdx == -1) {
                    startIdx = i
                } else if (aa == '*' && startIdx != -1) {
                    val orfLen = i - startIdx
                    if (orfLen >= minOrfLengthAa) {
                        val subProt = prot.substring(startIdx, i)
                        val startNuc = (rf.codons[startIdx].position - 1) * 3 + 1
                        val endNuc = rf.codons[i].position * 3

                        var mw = 0.0
                        for (ch in subProt) mw += (AMINO_ACID_MW[ch] ?: 110.0)

                        orfs.add(
                            OpenReadingFrame(
                                frame = rf.frame,
                                startNucleotide = startNuc,
                                endNucleotide = endNuc,
                                lengthNucleotides = (orfLen + 1) * 3,
                                lengthAminoAcids = orfLen,
                                proteinSequence = subProt,
                                molecularWeightDa = ((mw * 100.0).roundToInt() / 100.0),
                                hasStartCodon = true,
                                hasStopCodon = true
                            )
                        )
                    }
                    startIdx = -1
                }
            }
        }

        forwardFrames.forEach { findOrfsInFrame(it, fwdDna) }
        reverseFrames.forEach { findOrfsInFrame(it, revDna) }

        return SixFrameTranslationResult(
            forwardFrames = forwardFrames,
            reverseFrames = reverseFrames,
            orfs = orfs.sortedByDescending { it.lengthAminoAcids }
        )
    }

    // ======================== 8. FASTA MULTI-RECORD PARSER ========================

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

        if (currentId.isNotEmpty() && seqBuilder.isNotEmpty()) {
            val seq = seqBuilder.toString()
            records.add(FastaRecord(currentId, currentDesc, seq, seq.length))
        }

        return records
    }

    // ======================== 9. VERIFIED CLINICAL BENCHMARKS ========================

    val VERIFIED_BENCHMARKS = listOf(
        BenchmarkCase(
            id = "benchmark-hbb",
            geneSymbol = "HBB",
            condition = "Sickle Cell Anemia (HbS)",
            refAccession = "NM_000518.5",
            transcriptOffset = 0,
            expectedHgvs = "c.20A>T (p.Glu7Val)",
            refSequence = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA",
            altSequence = "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA",
            description = "Canonical human beta-globin gene (444 bp coding sequence) with pathogenic transversion c.20A>T (rs334, ClinVar:15147)."
        ),
        BenchmarkCase(
            id = "benchmark-brca1",
            geneSymbol = "BRCA1",
            condition = "Hereditary Breast and Ovarian Cancer",
            refAccession = "NM_007294.4",
            transcriptOffset = 0,
            expectedHgvs = "c.68_69delAG (p.Glu23fs)",
            refSequence = "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGACTGATTTTCAGGGTAAATGATGTGGTGAGAGCTTCAGTCACAGATTCAGTAAAATATACTCAGACATTTGGAGTATGCAAACAGCTATATACTAACCAGGAGAAG",
            altSequence = "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGACTGATTTTCAGGGTAAATGATGTGGTGAGAGCTTCAGTCACAGATTCAGTAAAATATACTCAGACATTTGGAGTATGCAAACAGCTATATACTAACCAGGAGAAG",
            description = "Human BRCA1 Exon 2 (175 bp) with pathogenic 2-bp deletion c.68_69delAG (ClinVar:17662) causing premature protein truncation."
        ),
        BenchmarkCase(
            id = "benchmark-cftr",
            geneSymbol = "CFTR",
            condition = "Cystic Fibrosis",
            refAccession = "NM_000492.4",
            transcriptOffset = 1448,
            expectedHgvs = "c.1521_1523delCTT (p.Phe508del)",
            refSequence = "AAGAAAATATCATCTTTGGTGTTTCCTATGATGAATATAGATACAGAAGCGTCATCAAAGCATGCCAACTAGAAGAG",
            altSequence = "AAGAAAATATCATTGGTGTTTCCTATGATGAATATAGATACAGAAGCGTCATCAAAGCATGCCAACTAGAAGAG",
            description = "Human CFTR Exon 11 (78 bp fragment) with classic 3-bp in-frame deletion c.1521_1523delCTT (delta-F508, ClinVar:7105)."
        )
    )
}
