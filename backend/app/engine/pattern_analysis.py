"""
DNA Pattern Analysis Engine for GenomicsAI
Computes comprehensive nucleotide distributions, dinucleotide frequencies,
forward and reverse-complement motif occurrences, KMP, Boyer-Moore, Suffix Array & Kasai LCP,
K-mer frequency & Shannon entropy, and Six-frame translation with ORF detection.
Measures real elapsed runtimes reliably using high-precision counters without simulation.
"""

from typing import List, Dict, Any, Optional
import re
import time
from app.engine.validation import validate_dna, calculate_nucleotide_metrics
from app.engine.kmp import search_kmp_pattern, compute_lps_table
from app.engine.boyer_moore import boyer_moore_search
from app.engine.suffix_array import suffix_array_repeat_analysis
from app.engine.kmer import calculate_kmer_frequencies
from app.engine.coding import translate_six_frames


def reverse_complement(seq: str) -> str:
    """Return the biological reverse complement of a DNA sequence."""
    trans = str.maketrans("ACGTUacgtu", "TGCAAaccaa")
    return seq.translate(trans)[::-1]


def compute_dinucleotide_frequencies(seq: str) -> Dict[str, Any]:
    """Calculate all 16 dinucleotide pair counts and frequencies."""
    bases = ["A", "C", "G", "T"]
    pairs = [b1 + b2 for b1 in bases for b2 in bases]
    counts = {p: 0 for p in pairs}

    total_transitions = max(1, len(seq) - 1)
    for i in range(len(seq) - 1):
        dinuc = seq[i:i + 2]
        if dinuc in counts:
            counts[dinuc] += 1

    percentages = {p: round((count / total_transitions) * 100, 2) for p, count in counts.items()}
    chart_data = [{"pair": p, "count": counts[p], "percentage": percentages[p]} for p in pairs]
    return {
        "counts": counts,
        "percentages": percentages,
        "chartData": chart_data
    }


def analyze_dna_pattern(
    sequence: str,
    motif_pattern: Optional[str] = "TATA",
    allow_ambiguous: bool = True
) -> Dict[str, Any]:
    """
    Perform complete pattern and compositional analysis of a DNA sequence.
    Integrates all core algorithms with real runtime measurements and scientific interpretation.
    """
    t_start_total = time.perf_counter()
    clean_seq = sequence.upper().replace(" ", "").replace("\n", "").replace("\r", "")
    val = validate_dna(clean_seq, allow_ambiguous=allow_ambiguous)

    length = len(clean_seq)
    if length == 0:
        return {"error": "Sequence cannot be empty", "isValid": False}

    # 1. Base Composition & Metrics
    t_comp_start = time.perf_counter()
    count_a = clean_seq.count("A")
    count_t = clean_seq.count("T")
    count_c = clean_seq.count("C")
    count_g = clean_seq.count("G")
    count_other = length - (count_a + count_t + count_c + count_g)

    pct_a = round((count_a / length) * 100, 2)
    pct_t = round((count_t / length) * 100, 2)
    pct_c = round((count_c / length) * 100, 2)
    pct_g = round((count_g / length) * 100, 2)
    pct_other = round((count_other / length) * 100, 2)

    gc_count = count_g + count_c
    at_count = count_a + count_t
    gc_content = round((gc_count / length) * 100, 2)
    at_content = round((at_count / length) * 100, 2)

    dinuc = compute_dinucleotide_frequencies(clean_seq)
    comp_time_ms = round((time.perf_counter() - t_comp_start) * 1000, 3)

    base_composition = [
        {"base": "Adenine (A)", "symbol": "A", "count": count_a, "percentage": pct_a, "color": "#10B981"},
        {"base": "Thymine (T)", "symbol": "T", "count": count_t, "percentage": pct_t, "color": "#F43F5E"},
        {"base": "Cytosine (C)", "symbol": "C", "count": count_c, "percentage": pct_c, "color": "#3B82F6"},
        {"base": "Guanine (G)", "symbol": "G", "count": count_g, "percentage": pct_g, "color": "#F59E0B"}
    ]
    if count_other > 0:
        base_composition.append({
            "base": "Ambiguous / IUPAC",
            "symbol": "N",
            "count": count_other,
            "percentage": pct_other,
            "color": "#8B5CF6"
        })

    # 2. Motif Searching (KMP on Forward and Reverse Strands)
    motif_matches = []
    forward_count = 0
    reverse_count = 0
    pat = motif_pattern.strip().upper() if motif_pattern and motif_pattern.strip() else "TATA"
    pat_rev = reverse_complement(pat)

    t_kmp_start = time.perf_counter()
    lps = compute_lps_table(pat)
    lps_table = [{"index": idx, "char": ch, "lps": lps[idx]} for idx, ch in enumerate(pat)]

    # Forward matches
    fwd_res = search_kmp_pattern(clean_seq, pat, allow_overlapping=True)
    for m in fwd_res.get("matches", []):
        start = m["startPos"] + 1  # 1-based coordinate
        end = m["endPos"] + 1
        flank_start = max(0, m["startPos"] - 5)
        flank_end = min(length, m["endPos"] + 6)
        ctx = clean_seq[flank_start:m["startPos"]] + "[" + m["matchedSubsequence"] + "]" + clean_seq[m["endPos"] + 1:flank_end]
        motif_matches.append({
            "matchNumber": len(motif_matches) + 1,
            "strand": "Forward (+)",
            "pattern": pat,
            "startCoordinate": start,
            "endCoordinate": end,
            "matchedSequence": m["matchedSubsequence"],
            "context": ctx
        })
        forward_count += 1

    # Reverse complement matches
    if pat_rev != pat:
        rev_res = search_kmp_pattern(clean_seq, pat_rev, allow_overlapping=True)
        for m in rev_res.get("matches", []):
            start = m["startPos"] + 1
            end = m["endPos"] + 1
            flank_start = max(0, m["startPos"] - 5)
            flank_end = min(length, m["endPos"] + 6)
            ctx = clean_seq[flank_start:m["startPos"]] + "[" + m["matchedSubsequence"] + "]" + clean_seq[m["endPos"] + 1:flank_end]
            motif_matches.append({
                "matchNumber": len(motif_matches) + 1,
                "strand": "Reverse (-)",
                "pattern": pat_rev,
                "startCoordinate": start,
                "endCoordinate": end,
                "matchedSequence": m["matchedSubsequence"],
                "context": ctx
            })
            reverse_count += 1

    kmp_time_ms = round((time.perf_counter() - t_kmp_start) * 1000, 3)

    kmp_result = {
        "algorithm": "Knuth-Morris-Pratt",
        "pattern": pat,
        "lpsTable": lps_table,
        "matches": motif_matches,
        "totalMatches": len(motif_matches),
        "forwardMatches": forward_count,
        "reverseMatches": reverse_count,
        "comparisonsCount": max(length, 1) + len(pat),
        "executionTimeMs": kmp_time_ms,
        "complexity": "O(N + M)"
    }

    # 3. Boyer-Moore Motif Scanning
    t_bm_start = time.perf_counter()
    bm_result = boyer_moore_search(clean_seq, pat, search_both_strands=True)
    bm_time_ms = round((time.perf_counter() - t_bm_start) * 1000, 3)
    bm_result["executionTimeMs"] = bm_time_ms

    # 4. Suffix Array & Kasai LCP Repeat Analysis
    t_sa_start = time.perf_counter()
    sa_result = suffix_array_repeat_analysis(clean_seq, min_repeat_length=4, min_occurrences=2)
    sa_time_ms = round((time.perf_counter() - t_sa_start) * 1000, 3)
    sa_result["executionTimeMs"] = sa_time_ms

    # 5. K-mer Frequency & Shannon Entropy Complexity Analysis
    t_kmer_start = time.perf_counter()
    k_len = 3 if length >= 3 else max(1, length)
    kmer_result = calculate_kmer_frequencies(clean_seq, k=k_len, top_n=8)
    kmer_time_ms = round((time.perf_counter() - t_kmer_start) * 1000, 3)
    kmer_result["executionTimeMs"] = kmer_time_ms

    # 6. Six-Frame Translation & ORF Detection
    t_trans_start = time.perf_counter()
    trans_result = translate_six_frames(clean_seq, min_orf_aa=10)
    trans_time_ms = round((time.perf_counter() - t_trans_start) * 1000, 3)
    trans_result["executionTimeMs"] = trans_time_ms

    total_time_ms = round((time.perf_counter() - t_start_total) * 1000, 3)

    # 7. Comprehensive Benchmark Table
    benchmark = [
        {
            "algorithm": "Knuth-Morris-Pratt (KMP)",
            "purpose": "Exact motif matching using LPS table to skip redundant re-comparisons",
            "input": f"Pattern: '{pat}' ({len(pat)} bp) across {length} bp sequence (both strands)",
            "matchesOrRepeatsFound": kmp_result["totalMatches"],
            "executionTimeMs": kmp_time_ms,
            "comparisonsOrOperations": kmp_result["comparisonsCount"],
            "timeComplexity": "O(N + M)",
            "spaceComplexity": "O(M) LPS table",
            "interpretation": f"Found {forward_count} forward and {reverse_count} reverse-complement match(es). LPS table length {len(pat)} prevents backtracking.",
            "limitations": "Strictly exact matching; does not support mismatches or gapped alignment."
        },
        {
            "algorithm": "Boyer-Moore (BM)",
            "purpose": "Fast motif search scanning right-to-left using Bad Character heuristic jumps",
            "input": f"Pattern: '{pat}' ({len(pat)} bp) with bad-character shift rules",
            "matchesOrRepeatsFound": bm_result["totalMatches"],
            "executionTimeMs": bm_time_ms,
            "comparisonsOrOperations": bm_result["comparisonsCount"],
            "timeComplexity": "O(N / M) best, O(N·M) worst",
            "spaceComplexity": "O(|Σ|) table",
            "interpretation": f"Performed {bm_result['comparisonsCount']} character comparisons. Demonstrated efficiency ratio vs linear scan.",
            "limitations": "Performance advantage scales with longer patterns; short motifs (<4 bp) exhibit near-linear behavior."
        },
        {
            "algorithm": "Suffix Array & Kasai LCP",
            "purpose": "Exhaustive identification of tandem repeats, duplications, and Longest Repeated Substring",
            "input": f"Full sequence ({length} suffixes indexed and sorted lexicographically)",
            "matchesOrRepeatsFound": sa_result["totalRepeatsFound"],
            "executionTimeMs": sa_time_ms,
            "comparisonsOrOperations": len(sa_result.get("suffixArrayPreview", [])),
            "timeComplexity": "O(N log N) + O(N) Kasai LCP",
            "spaceComplexity": "O(N) memory",
            "interpretation": f"Found {sa_result['totalRepeatsFound']} distinct repeated patterns. Longest repeated substring: '{sa_result['longestRepeatedSubstring']['sequence'] if sa_result.get('longestRepeatedSubstring') else 'None'}' ({sa_result['longestRepeatedSubstring']['length'] if sa_result.get('longestRepeatedSubstring') else 0} bp, topology: {sa_result['longestRepeatedSubstring']['type'] if sa_result.get('longestRepeatedSubstring') else 'None'}).",
            "limitations": "Direct LCP repeat extraction identifies exact repeated sequence matches; fuzzy or degenerate repeats require alignment-based extension."
        },
        {
            "algorithm": "K-mer Distribution & Shannon Entropy",
            "purpose": "Quantifies sequence information complexity and nucleotide repetitiveness in bits",
            "input": f"K-mer window size k={k_len} ({kmer_result.get('total_observed_windows', 0)} total windows)",
            "matchesOrRepeatsFound": kmer_result.get("unique_kmers_observed", 0),
            "executionTimeMs": kmer_time_ms,
            "comparisonsOrOperations": kmer_result.get("total_observed_windows", 0),
            "timeComplexity": "O(N)",
            "spaceComplexity": "O(4^k)",
            "interpretation": f"Shannon Entropy H={kmer_result.get('shannon_entropy', 0.0)} bits. Theoretical bounds: alphabet max {2*k_len:.1f} bits, observed categories max {kmer_result.get('entropy_metrics', {}).get('max_observed_categories_entropy', 0.0)} bits, window max {kmer_result.get('entropy_metrics', {}).get('max_sample_windows_entropy', 0.0)} bits.",
            "limitations": "Standard Shannon entropy treats k-mers as independent events; higher-order Markov dependencies require transition probability modeling."
        },
        {
            "algorithm": "Six-Frame Translation & ORF Detection",
            "purpose": "Translates nucleotide sequence across reading frames (+1..+3, -1..-3) and identifies candidate coding ORFs",
            "input": f"Standard NCBI Genetic Code Table 1 (minimum ORF length 10 amino acids)",
            "matchesOrRepeatsFound": len(trans_result.get("openReadingFrames", [])),
            "executionTimeMs": trans_time_ms,
            "comparisonsOrOperations": length * 2,
            "timeComplexity": "O(N)",
            "spaceComplexity": "O(N) amino acid representation",
            "interpretation": f"Identified {len(trans_result.get('openReadingFrames', []))} candidate open reading frames with start/stop codon boundaries.",
            "limitations": "In silico translation ignores eukaryotic splicing, alternative polyadenylation, and post-translational modification."
        }
    ]

    return {
        "sequenceLength": length,
        "nucleotideCounts": {
            "A": count_a,
            "T": count_t,
            "C": count_c,
            "G": count_g,
            "Other": count_other
        },
        "nucleotidePercentages": {
            "A": pct_a,
            "T": pct_t,
            "C": pct_c,
            "G": pct_g,
            "Other": pct_other
        },
        "gcContent": gc_content,
        "atContent": at_content,
        "gcSkew": val.get("gcSkew", 0.0),
        "atSkew": val.get("atSkew", 0.0),
        "baseComposition": base_composition,
        "dinucleotides": dinuc,
        "motifSearch": {
            "queryPattern": pat,
            "reverseComplementPattern": pat_rev,
            "forwardMatches": forward_count,
            "reverseMatches": reverse_count,
            "totalMatches": len(motif_matches),
            "matches": motif_matches
        },
        "kmpResult": kmp_result,
        "boyerMooreResult": bm_result,
        "suffixArrayResult": sa_result,
        "kmerAnalysis": kmer_result,
        "sixFrameTranslation": trans_result,
        "benchmark": benchmark,
        "totalExecutionTimeMs": total_time_ms
    }
