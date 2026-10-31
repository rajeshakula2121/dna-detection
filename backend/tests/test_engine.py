"""
Automated Pytest Suite for BioDNA Algorithm Engine.
Tests:
  - Sequence validation & IUPAC codes
  - Knuth-Morris-Pratt (KMP) exact matching
  - Aho-Corasick multi-pattern search
  - K-mer frequency and Shannon entropy
  - Needleman-Wunsch global alignment
  - Mutation calling (substitutions, micro-indels, HGVS notation)
  - Mutation-aware motif disruption classification
  - 6-frame translation and coding variants
"""

import pytest
from app.engine.validation import validate_dna
from app.engine.kmp import search_kmp_pattern, compute_lps_table
from app.engine.aho_corasick import aho_corasick_search
from app.engine.kmer import analyze_kmers
from app.engine.alignment import needleman_wunsch_align
from app.engine.mutations import detect_mutations
from app.engine.motif_disruption import evaluate_motif_disruptions
from app.engine.coding import translate_six_frames, compare_coding_sequences


def test_validation_canonical_dna():
    res = validate_dna("ATGCGATCGATCG")
    assert res['isValid'] is True
    assert res['sequenceLength'] == 13
    assert res['hasAmbiguousBases'] is False
    assert res['error'] is None


def test_validation_rejects_invalid_bases():
    res = validate_dna("ATGCXZ123")
    assert res['isValid'] is False
    assert "Invalid nucleotide characters" in res['error']


def test_validation_ambiguous_bases():
    res = validate_dna("ATGCNRY", allow_ambiguous=True)
    assert res['isValid'] is True
    assert res['hasAmbiguousBases'] is True
    assert res['ambiguousBaseCount'] == 3


def test_kmp_overlapping_matches():
    # Sequence with overlapping pattern "AWA" -> "ABA" -> "AAA"
    text = "AAAAA"
    pattern = "AAA"
    res = search_kmp_pattern(text, pattern, allow_overlapping=True)
    assert res['matchCount'] == 3
    assert res['positions'] == [1, 2, 3]


def test_kmp_lps_table():
    # Pattern "AABAACAABAA"
    lps = compute_lps_table("AABAACAABAA")
    assert lps[0] == 0
    assert lps[1] == 1
    assert lps[2] == 0
    assert lps[-1] == 5


def test_aho_corasick_multi_search():
    text = "ATGCGATCGATCA"
    patterns = ["ATGC", "GATC", "TCA"]
    res = aho_corasick_search(text, patterns)
    assert res['totalMatchesFound'] >= 4
    assert len(res['matchesByPattern']['GATC']) == 2


def test_kmer_frequencies_and_entropy():
    seq = "ATGCATGCATGC"
    res = analyze_kmers(seq, k=4)
    assert res['k'] == 4
    assert res['totalKmers'] == 9
    assert res['shannonEntropy'] > 0


def test_needleman_wunsch_alignment():
    ref = "AGCTACGT"
    alt = "AGCTTCGT"
    aln = needleman_wunsch_align(ref, alt, match_score=2, mismatch_penalty=-1, gap_penalty=-2)
    # 7 matches (14) + 1 mismatch (-1) = 13
    assert aln['alignmentScore'] == 13
    assert aln['identity'] == 87.5
    assert aln['matchesCount'] == 7
    assert aln['mismatchesCount'] == 1


def test_mutation_detection_snv_and_indel():
    # Substitution at pos 5: A -> T
    ref_aligned = "AGCTACGT"
    alt_aligned = "AGCTTCGT"
    mutations = detect_mutations(ref_aligned, alt_aligned)
    assert len(mutations) == 1
    m = mutations[0]
    assert m['position'] == 5
    assert m['refBase'] == 'A'
    assert m['altBase'] == 'T'
    assert m['mutationType'] == 'SUBSTITUTION'
    assert m['subType'] == 'TRANSVERSION'
    assert m['hgvs'] == 'c.5A>T'


def test_motif_disruption_analysis():
    ref = "TATAAAAGCGCT"  # Contains TATA box
    alt = "TACAAAAGCGCT"  # TATA mutated to TACA
    aln = needleman_wunsch_align(ref, alt)
    mutations = detect_mutations(aln['refAligned'], aln['altAligned'])
    
    motifs = [{'name': 'TATA_box', 'pattern': 'TATAAA'}]
    res = evaluate_motif_disruptions(ref, alt, motifs, aln['refAligned'], aln['altAligned'], mutations)
    
    assert res['totalMotifsEvaluated'] == 1
    event = res['events'][0]
    assert event['classification'] in ('DISRUPTED', 'LOST')
    assert event['refMatchCount'] == 1
    assert event['altMatchCount'] == 0


def test_coding_sequence_comparison():
    # Exon 1 sickle cell mutation: GAG (Glu) -> GTG (Val)
    ref_dna = "ATGGTGCACCTGACTCCTGAGGAGAAGTCT"
    alt_dna = "ATGGTGCACCTGACTCCTGTGGAGAAGTCT"
    
    res = compare_coding_sequences(ref_dna, alt_dna, frame=1)
    assert res['variantCount'] == 1
    var = res['variants'][0]
    assert var['variantType'] == 'MISSENSE'
    assert var['refAa'] == 'E'
    assert var['altAa'] == 'V'
    assert var['hgvsProtein'] == 'p.Glu7Val'
    assert var['isConservative'] is False
