"""
Automated Validation Tests for Suffix Array & LCP and K-mer & Shannon Entropy Engine.

Validates:
1. Suffix array lexicographical ordering and Kasai LCP array computation.
2. Longest Repeated Substring (LRS) identification, length, count, and 1-based coordinates.
3. Distinction between unique repeated substrings (89), occurrences (209), and pairs (170).
4. Repeat topology classification (Tandem, Overlapping, Separated, Mixed) with no biological inference.
5. Indexing conventions: 0-based internal SA[i] vs 1-based biological coordinates.
6. K-mer frequency distribution for k=3 on the reference benchmark sequence:
   Sequence: ATGCGATCGATCGATGCGATCGATCGATGCA (31 bp, 29 sliding windows).
7. Direct Shannon entropy computation: H = -sum(p_i * log2(p_i)).
8. Theoretical entropy upper bounds under 3 distinct contextual assumptions (alphabet, categories, windows).
9. Underrepresented k-mers ascending ordering (lowest frequency first) and uniform background representation ratio.
10. Generalization to other DNA sequences without hardcoding.
"""

import math
import pytest
from app.engine.suffix_array import (
    build_suffix_array,
    build_lcp_kasai,
    classify_repeat_topology,
    suffix_array_repeat_analysis,
)
from app.engine.kmer import analyze_kmers, calculate_kmer_frequencies


TEST_SEQUENCE = "ATGCGATCGATCGATGCGATCGATCGATGCA"


class TestKmerAndShannonEntropyValidation:
    """Rigorous mathematical and biological verification for K-mer and Entropy module."""

    def test_kmer_exact_counts_and_frequencies(self):
        """Verifies k=3 decomposition on the 31 bp benchmark sequence."""
        res = analyze_kmers(TEST_SEQUENCE, k=3)

        # 1. Sequence length and sliding window count
        assert len(TEST_SEQUENCE) == 31
        total_windows = len(TEST_SEQUENCE) - 3 + 1
        assert total_windows == 29
        assert res["total_observed_windows"] == 29

        # 2. Exact expected counts for each of the 8 observed 3-mers
        expected_counts = {
            "CGA": 6,
            "GAT": 6,
            "ATC": 4,
            "TCG": 4,
            "ATG": 3,
            "TGC": 3,
            "GCG": 2,
            "GCA": 1,
        }
        assert res["frequencies"] == expected_counts
        assert sum(res["frequencies"].values()) == 29
        assert res["unique_kmers_observed"] == 8

        # 3. Direct Shannon Entropy calculation: H = -sum(p_i * log2(p_i))
        manual_entropy = 0.0
        for count in expected_counts.values():
            p = count / 29.0
            manual_entropy -= p * math.log2(p)

        assert pytest.approx(manual_entropy, abs=1e-4) == 2.8397
        assert res["shannon_entropy"] == pytest.approx(round(manual_entropy, 4), abs=1e-4)

    def test_entropy_bounds_under_distinct_assumptions(self):
        """
        Verifies that maximum entropy is clearly distinguished across:
          - Alphabet maximum: log2(4^3) = 6.000 bits
          - Observed categories maximum: log2(8) = 3.000 bits
          - Sample windows maximum: log2(29) ~= 4.858 bits
        """
        res = analyze_kmers(TEST_SEQUENCE, k=3)
        metrics = res["entropy_metrics"]

        assert metrics["max_alphabet_entropy"] == 6.0000
        assert metrics["max_observed_categories_entropy"] == 3.0000
        assert metrics["max_sample_windows_entropy"] == round(math.log2(29), 4)  # 4.8580

        # Verifies descriptive notes are present explaining assumptions
        assumptions = metrics["assumptions"]
        assert "4^3" in assumptions["max_alphabet_entropy"] or "64" in assumptions["max_alphabet_entropy"]
        assert "8" in assumptions["max_observed_categories"]
        assert "29" in assumptions["max_sample_windows"]

        # Relative entropy
        assert metrics["relative_entropy_alphabet_pct"] == pytest.approx(
            round((metrics["shannon_entropy"] / 6.0) * 100, 2), abs=0.1
        )
        assert metrics["relative_entropy_observed_pct"] == pytest.approx(
            round((metrics["shannon_entropy"] / 3.0) * 100, 2), abs=0.1
        )

    def test_underrepresented_kmers_ascending_order(self):
        """
        Verifies that underrepresented k-mers are sorted ascending by count
        (lowest count first), not repeating top frequent k-mers in descending order.
        """
        res = analyze_kmers(TEST_SEQUENCE, k=3)
        least_frequent = res["least_frequent"]
        top_frequent = res["top_frequent"]

        # Ascending count check: count_i <= count_{i+1}
        counts = [item["count"] for item in least_frequent]
        assert counts == sorted(counts), f"Underrepresented k-mers must be sorted ascending: {counts}"

        # First entry must be the single-occurrence k-mer 'GCA' (count: 1)
        assert least_frequent[0]["kmer"] == "GCA"
        assert least_frequent[0]["count"] == 1

        # Second entry must be 'GCG' (count: 2)
        assert least_frequent[1]["kmer"] == "GCG"
        assert least_frequent[1]["count"] == 2

        # Verify that least_frequent is NOT just a duplicate slice of top_frequent
        assert least_frequent[0]["kmer"] != top_frequent[0]["kmer"]
        assert top_frequent[0]["count"] == 6  # CGA or GAT

        # Verify uniform background comparison (1/64 = 0.015625 -> 1.56%)
        uniform_pct = round((1.0 / 64.0) * 100, 2)  # 1.56%
        assert least_frequent[0]["expected_percent"] == uniform_pct
        expected_count = round(29 * (1.0 / 64.0), 2)  # 0.45
        assert least_frequent[0]["expected_count"] == expected_count


class TestSuffixArrayAndLCPValidation:
    """Rigorous verification for Suffix Array, LCP, and Repeat Analysis module."""

    def test_suffix_array_lexicographical_sorting(self):
        """Verifies that SA produces strictly lexicographically ordered suffixes."""
        sa = build_suffix_array(TEST_SEQUENCE)
        n = len(TEST_SEQUENCE)

        assert len(sa) == n
        assert set(sa) == set(range(n))

        # Check lexicographical order of all consecutive suffixes
        for i in range(len(sa) - 1):
            s1 = TEST_SEQUENCE[sa[i] :]
            s2 = TEST_SEQUENCE[sa[i + 1] :]
            assert s1 <= s2, f"Suffix array not sorted at index {i}: '{s1}' > '{s2}'"

    def test_kasai_lcp_computation_correctness(self):
        """Verifies that Kasai LCP values equal the exact longest common prefix."""
        sa = build_suffix_array(TEST_SEQUENCE)
        lcp = build_lcp_kasai(TEST_SEQUENCE, sa)
        n = len(TEST_SEQUENCE)

        assert len(lcp) == n
        assert lcp[0] == 0  # LCP of first suffix is 0 by convention

        for i in range(1, n):
            s_prev = TEST_SEQUENCE[sa[i - 1] :]
            s_curr = TEST_SEQUENCE[sa[i] :]

            # Compute actual LCP by character comparison
            actual_common = 0
            while (
                actual_common < len(s_prev)
                and actual_common < len(s_curr)
                and s_prev[actual_common] == s_curr[actual_common]
            ):
                actual_common += 1

            assert lcp[i] == actual_common, (
                f"LCP mismatch at rank {i}: expected {actual_common}, got {lcp[i]}"
            )

    def test_longest_repeated_substring_and_coordinates(self):
        """
        Verifies Longest Repeated Substring (LRS) on TEST_SEQUENCE:
          - LRS: 'ATGCGATCGATCGATGC'
          - Length: 17 bp
          - Count: 2
          - 1-based biological coordinates: [1, 14]
          - Occurrence topology: 'Overlapping' (occurs at 1..17 and 14..30)
        """
        res = suffix_array_repeat_analysis(TEST_SEQUENCE, min_repeat_length=4, min_occurrences=2)
        lrs = res["longestRepeatedSubstring"]

        assert lrs is not None
        assert lrs["sequence"] == "ATGCGATCGATCGATGC"
        assert lrs["length"] == 17
        assert lrs["count"] == 2
        assert lrs["positions"] == [1, 14]  # 1-based biological coordinates
        assert lrs["type"] == "Overlapping"

        # Verify overlapping span: starts at 1..17 and 14..30
        # Overlap region: pos 14..17 is 'ATGC' (4 bp shared)
        occ1 = TEST_SEQUENCE[0:17]
        occ2 = TEST_SEQUENCE[13:30]
        assert occ1 == "ATGCGATCGATCGATGC"
        assert occ2 == "ATGCGATCGATCGATGC"

    def test_distinct_repeats_definition_and_counts(self):
        """
        Verifies the exact breakdown of repeats for minRepeatLength = 4, minOccurrences = 2:
          - Distinct Repeats (Unique patterns): 89
          - Total Repeat Occurrences: 209
          - Pairwise Repeat Pairs: 170
        """
        res = suffix_array_repeat_analysis(TEST_SEQUENCE, min_repeat_length=4, min_occurrences=2)
        metrics = res["metrics"]

        assert res["totalRepeatsFound"] == 89
        assert metrics["distinctRepeatsCount"] == 89
        assert metrics["totalRepeatOccurrences"] == 209
        assert metrics["pairwiseRepeatPairs"] == 170

        # Verify pattern length spectrum across all 89 distinct repeated sequences from 4 to 17
        all_repeats = res["allRepeats"]
        assert len(all_repeats) == 89
        lengths = {r["length"] for r in all_repeats}
        assert 17 in lengths
        assert 4 in lengths
        assert min(lengths) == 4
        assert max(lengths) == 17

    def test_repeat_topology_classification_rules(self):
        """
        Verifies explicit geometric coordinate criteria for repeat arrangements:
          - Tandem (Adjacent): diff == length
          - Overlapping: diff < length
          - Separated: diff > length
          - Mixed: multiple occurrences combining categories
        """
        # Tandem: CAGCAG (length 3, pos [1, 4] -> diff = 3)
        assert classify_repeat_topology([1, 4], 3) == "Tandem (Adjacent)"

        # Overlapping: ATGCGATCGATCGATGC (length 17, pos [1, 14] -> diff = 13 < 17)
        assert classify_repeat_topology([1, 14], 17) == "Overlapping"

        # Separated: AAAA...AAAA (length 4, pos [1, 12] -> diff = 11 > 4)
        assert classify_repeat_topology([1, 12], 4) == "Separated"

        # Mixed: tandem pair + separated occurrence (pos [1, 5, 20], length 4)
        assert "Mixed" in classify_repeat_topology([1, 5, 20], 4)

    def test_coordinate_convention_0based_vs_1based(self):
        """
        Verifies internal Suffix Array indices are 0-based in [0, N-1],
        while biological coordinates are 1-based (SA[i] + 1) in [1, N].
        """
        res = suffix_array_repeat_analysis(TEST_SEQUENCE, min_repeat_length=4, min_occurrences=2)
        preview = res["suffixArrayPreview"]

        for item in preview:
            s_idx_0 = item["suffixIndex0Based"]
            s_idx_1 = item["suffixIndex"]
            assert s_idx_1 == s_idx_0 + 1
            assert 0 <= s_idx_0 < len(TEST_SEQUENCE)
            assert 1 <= s_idx_1 <= len(TEST_SEQUENCE)

            # Check that suffix preview matches the sequence starting at s_idx_0
            expected_prefix = TEST_SEQUENCE[s_idx_0 : s_idx_0 + 16]
            assert item["suffixPreview"].startswith(expected_prefix)


class TestAlgorithmGeneralization:
    """Verifies algorithms generalize to other sequences without hardcoding."""

    def test_generalization_on_hbb_fragment(self):
        """Tests on human HBB exon 1 fragment."""
        hbb_seq = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGG"
        kmer_res = analyze_kmers(hbb_seq, k=3)

        assert kmer_res["total_observed_windows"] == len(hbb_seq) - 3 + 1
        assert kmer_res["shannon_entropy"] > 0
        assert len(kmer_res["least_frequent"]) > 0

        # Suffix array on HBB
        sa_res = suffix_array_repeat_analysis(hbb_seq, min_repeat_length=4, min_occurrences=2)
        assert sa_res["totalRepeatsFound"] > 0
        assert sa_res["longestRepeatedSubstring"] is not None
        assert sa_res["longestRepeatedSubstring"]["length"] >= 4
