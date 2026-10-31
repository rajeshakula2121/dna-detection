package com.biotech.dnadetect

import com.biotech.dnadetect.domain.*
import org.junit.Assert.*
import org.junit.Test

class BioEngineTest {

    @Test
    fun testSequenceValidation_validAndInvalid() {
        val (valid1, clean1) = BioEngine.validateSequence("ATGCGATCGATC", false)
        assertTrue(valid1)
        assertEquals("ATGCGATCGATC", clean1)

        val (valid2, _) = BioEngine.validateSequence("NOT_A_REAL_VARIANT_12345", false)
        assertFalse(valid2)

        val invalidChars = BioEngine.extractInvalidChars("NOT_A_REAL_VARIANT_12345", false)
        assertTrue(invalidChars.contains('N') || invalidChars.contains('O') || invalidChars.contains('1'))
        assertTrue(invalidChars.contains('_'))
    }

    @Test
    fun testMetrics_compositionAndSkew() {
        val metrics = BioEngine.calculateMetrics("ATGC")
        assertEquals(4, metrics.length)
        assertEquals(1, metrics.countA)
        assertEquals(1, metrics.countT)
        assertEquals(1, metrics.countC)
        assertEquals(1, metrics.countG)
        assertEquals(50.0, metrics.gcContent, 0.01)
        assertEquals(50.0, metrics.atContent, 0.01)
        assertEquals(0.0, metrics.gcSkew, 0.001)
        assertEquals(0.0, metrics.atSkew, 0.001)
    }

    @Test
    fun testReverseComplement() {
        val revComp = BioEngine.reverseComplement("ATGGT")
        assertEquals("ACCAT", revComp)
    }

    @Test
    fun testKmpAlgorithm_exactMatch() {
        val seq = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC"
        val pattern = "CCTGAG"
        val result = BioEngine.kmpSearch(seq, pattern, true)

        assertTrue("Should find at least 1 match", result.totalMatches >= 1)
        assertEquals("CCTGAG", result.pattern)
        assertTrue("Execution time recorded", result.executionTimeMs >= 0.0)
        assertTrue("Comparisons count > 0", result.comparisonsCount > 0)
        assertEquals(6, result.lpsTable.size)
    }

    @Test
    fun testBoyerMooreAlgorithm_badCharacterHeuristic() {
        val seq = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAAC"
        val pattern = "CCTGAG"
        val result = BioEngine.boyerMooreSearch(seq, pattern, true)

        assertTrue("Should find matches", result.totalMatches >= 1)
        assertTrue("Total shifts recorded", result.totalShifts > 0)
        assertTrue("Bad char table generated", result.badCharTable.isNotEmpty())
    }

    @Test
    fun testSuffixArrayKasai_repeatsAndLrs() {
        val seq = "ATGCGATCGATCGATGCGATCGATCGATGCA"
        val result = BioEngine.suffixArrayRepeatAnalysis(seq, 4, 2)

        assertTrue("Should identify repeated substrings", result.totalRepeatsFound > 0)
        assertNotNull("Longest repeated substring must exist", result.longestRepeatedSubstring)
        assertTrue("LRS length >= 4", result.longestRepeatedSubstring!!.length >= 4)
    }

    @Test
    fun testKmerFrequencies_shannonEntropy() {
        val seq = "ATGCGATCGATCGATGCGATCGATCGATGCA"
        val result = BioEngine.calculateKmerFrequencies(seq, 3, 5)

        assertEquals(3, result.k)
        assertTrue("Total windows > 0", result.totalWindows > 0)
        assertTrue("Unique kmers > 0", result.uniqueKmers > 0)
        assertTrue("Shannon entropy is non-negative", result.shannonEntropy > 0.0)
        assertTrue("Top kmers returned", result.topKmers.isNotEmpty())
    }

    @Test
    fun testNeedlemanWunsch_identicalSequences() {
        val seq = "ATGCGTACGTAG"
        val result = BioEngine.needlemanWunsch(seq, seq)

        assertEquals(100.0, result.identityPercent, 0.01)
        assertEquals(0, result.mutations.size)
        assertEquals(0, result.snpCount)
        assertEquals(0, result.insertionCount)
        assertEquals(0, result.deletionCount)
    }

    @Test
    fun testNeedlemanWunsch_hbbSickleCellMutation() {
        val hbb = BioEngine.VERIFIED_BENCHMARKS.first { it.geneSymbol == "HBB" }
        val result = BioEngine.needlemanWunsch(
            refSequence = hbb.refSequence,
            altSequence = hbb.altSequence,
            coordinateOffset = hbb.transcriptOffset
        )

        assertEquals("Should identify exactly 1 variant", 1, result.mutations.size)
        val m = result.mutations.first()
        assertEquals(MutationType.SUBSTITUTION, m.type)
        assertEquals(SubstitutionSubType.TRANSVERSION, m.subType)
        assertEquals(20, m.position)
        assertEquals("A", m.refBase)
        assertEquals("T", m.altBase)
        assertEquals("c.20A>T", m.hgvs)
    }

    @Test
    fun testNeedlemanWunsch_brca1Deletion() {
        val brca1 = BioEngine.VERIFIED_BENCHMARKS.first { it.geneSymbol == "BRCA1" }
        val result = BioEngine.needlemanWunsch(
            refSequence = brca1.refSequence,
            altSequence = brca1.altSequence,
            coordinateOffset = brca1.transcriptOffset
        )

        assertTrue("Should detect deletion", result.deletionCount >= 1)
        val del = result.mutations.first { it.type == MutationType.DELETION }
        assertEquals(2, del.length)
        assertTrue("HGVS should describe 2-bp deletion", del.hgvs.contains("del"))
    }

    @Test
    fun testSixFrameTranslation_andOrfs() {
        val dna = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCCTATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA"
        val result = BioEngine.translateSixFrames(dna, 8)

        assertEquals(3, result.forwardFrames.size)
        assertEquals(3, result.reverseFrames.size)
        assertTrue("Should identify candidate coding ORFs", result.orfs.isNotEmpty())
    }

    @Test
    fun testFastaParser_multiRecord() {
        val fasta = """
            >seq1 First test sequence
            ATGCGATCGATC
            >seq2 Second sequence
            GCTAGCTAGCTA
        """.trimIndent()

        val records = BioEngine.parseFasta(fasta)
        assertEquals(2, records.size)
        assertEquals("seq1", records[0].id)
        assertEquals("First test sequence", records[0].description)
        assertEquals("ATGCGATCGATC", records[0].sequence)
        assertEquals("seq2", records[1].id)
        assertEquals("GCTAGCTAGCTA", records[1].sequence)
    }
}

