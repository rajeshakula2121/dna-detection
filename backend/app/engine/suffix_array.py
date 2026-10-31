"""
Suffix Array and LCP (Longest Common Prefix) Algorithm for DNA Sequences
Identifies repeated DNA sequences (tandem repeats, interspersed repeats)
and computes the Longest Repeated Substring (LRS).
"""

from typing import List, Dict, Any, Optional, Set
import time
from .validation import clean_sequence


def build_suffix_array(sequence: str) -> List[int]:
    """
    Constructs the Suffix Array SA for sequence.
    Returns 0-based starting indices of suffixes sorted lexicographically.
    """
    n = len(sequence)
    sa = list(range(n))
    sa.sort(key=lambda i: sequence[i:])
    return sa


def build_lcp_kasai(sequence: str, sa: List[int]) -> List[int]:
    """
    Computes Longest Common Prefix (LCP) array in linear O(N) time
    using Kasai's algorithm.
    """
    n = len(sequence)
    rank = [0] * n
    for i in range(n):
        rank[sa[i]] = i

    lcp = [0] * n
    h = 0

    for i in range(n):
        if rank[i] > 0:
            k = sa[rank[i] - 1]
            while i + h < n and k + h < n and sequence[i + h] == sequence[k + h]:
                h += 1
            lcp[rank[i]] = h
            if h > 0:
                h -= 1

    return lcp


def classify_repeat_topology(positions: List[int], repeat_len: int) -> str:
    """
    Classifies the spatial occurrence arrangement of repeated instances using
    explicit coordinate criteria:
      - Tandem (Adjacent): All consecutive pairs have p_{i+1} == p_i + L (0 bp gap, 0 bp overlap).
      - Overlapping: All consecutive pairs have p_i < p_{i+1} < p_i + L (share overlapping bases).
      - Separated: All consecutive pairs have p_{i+1} > p_i + L (separated by intervening bases).
      - Mixed: Combinations across >= 3 occurrences (e.g. contains both tandem and separated occurrences).
      
    Scientific Notice:
      This topology describes string coordinate arrangement only; it does not infer
      biological repeat classification (e.g. transposons, satellites, or segmental duplications).
    """
    if len(positions) < 2:
        return "Single Occurrence"

    has_tandem = False
    has_overlap = False
    has_separated = False

    for p in range(len(positions) - 1):
        diff = positions[p + 1] - positions[p]
        if diff == repeat_len:
            has_tandem = True
        elif diff < repeat_len:
            has_overlap = True
        else:
            has_separated = True

    types = []
    if has_tandem:
        types.append("Tandem (Adjacent)")
    if has_overlap:
        types.append("Overlapping")
    if has_separated:
        types.append("Separated")

    if len(types) == 1:
        return types[0]
    return f"Mixed ({' & '.join(types)})"


def suffix_array_repeat_analysis(
    sequence: str,
    min_repeat_length: int = 4,
    min_occurrences: int = 2
) -> Dict[str, Any]:
    """
    Identifies repeated DNA sequences using Suffix Array and LCP array.
    """
    t0 = time.perf_counter()
    seq = clean_sequence(sequence)
    n = len(seq)

    if n < min_repeat_length:
        return {
            "algorithm": "Suffix Array & LCP",
            "sequenceLength": n,
            "minRepeatLength": min_repeat_length,
            "minOccurrences": min_occurrences,
            "longestRepeatedSubstring": None,
            "repeats": [],
            "totalRepeatsFound": 0,
            "metrics": {
                "distinctRepeatsCount": 0,
                "distinctRepeatsDescription": f"Unique repeated substring patterns of length >= {min_repeat_length} bp occurring >= {min_occurrences} times",
                "totalRepeatOccurrences": 0,
                "pairwiseRepeatPairs": 0
            },
            "suffixArrayPreview": [],
            "executionTimeMs": 0.01,
            "complexity": "O(N log N) construction, O(N) Kasai LCP",
            "indexingConvention": "Suffix array internally 0-based SA[i]; biological coordinates displayed as 1-based (SA[i] + 1)."
        }

    # 1. Build Suffix Array (0-based indices sorted lexicographically)
    sa = build_suffix_array(seq)

    # 2. Build LCP array
    lcp = build_lcp_kasai(seq, sa)

    # 3. Identify repeated sequences
    substring_map: Dict[str, Set[int]] = {}

    for i in range(1, n):
        common_len = lcp[i]
        if common_len >= min_repeat_length:
            for length in range(min_repeat_length, common_len + 1):
                sub = seq[sa[i]:sa[i] + length]
                if sub not in substring_map:
                    substring_map[sub] = set()
                substring_map[sub].add(sa[i - 1] + 1)  # 1-based coordinate
                substring_map[sub].add(sa[i] + 1)

    repeats: List[Dict[str, Any]] = []
    longest_repeat: Optional[Dict[str, Any]] = None
    max_len = 0

    for sub, pos_set in substring_map.items():
        if len(pos_set) >= min_occurrences:
            positions = sorted(list(pos_set))
            topology = classify_repeat_topology(positions, len(sub))

            item = {
                "id": f"rep_{len(repeats) + 1}",
                "sequence": sub,
                "length": len(sub),
                "count": len(positions),
                "positions": positions,
                "type": topology,
                "classification": topology
            }
            repeats.append(item)

            if len(sub) > max_len or (
                len(sub) == max_len and longest_repeat and len(positions) > longest_repeat["count"]
            ):
                max_len = len(sub)
                longest_repeat = item

    # Sort repeats by length descending, then by count descending
    repeats.sort(key=lambda r: (-r["length"], -r["count"], r["sequence"]))

    # Summary metrics
    distinct_repeats_count = len(repeats)
    total_repeat_occurrences = sum(r["count"] for r in repeats)
    pairwise_repeat_pairs = sum((r["count"] * (r["count"] - 1)) // 2 for r in repeats)

    # Suffix Array Preview (Top 8 entries)
    preview_count = min(8, n)
    suffix_array_preview = [
        {
            "rank": rank_idx + 1,
            "suffixIndex": sa[rank_idx] + 1,  # 1-based biological coordinate
            "suffixIndex0Based": sa[rank_idx],  # 0-based internal index
            "lcp": lcp[rank_idx],
            "suffixPreview": seq[sa[rank_idx]:sa[rank_idx] + 16] + ("..." if sa[rank_idx] + 16 < n else "")
        }
        for rank_idx in range(preview_count)
    ]

    exec_time_ms = round((time.perf_counter() - t0) * 1000, 3)

    return {
        "algorithm": "Suffix Array & LCP",
        "sequenceLength": n,
        "minRepeatLength": min_repeat_length,
        "minOccurrences": min_occurrences,
        "longestRepeatedSubstring": longest_repeat,
        "repeats": repeats[:50],
        "allRepeats": repeats,
        "totalRepeatsFound": distinct_repeats_count,
        "metrics": {
            "distinctRepeatsCount": distinct_repeats_count,
            "distinctRepeatsDescription": f"Unique repeated substring sequences of length >= {min_repeat_length} bp occurring >= {min_occurrences} times",
            "totalRepeatOccurrences": total_repeat_occurrences,
            "pairwiseRepeatPairs": pairwise_repeat_pairs
        },
        "suffixArrayPreview": suffix_array_preview,
        "executionTimeMs": exec_time_ms,
        "complexity": "O(N log N) construction, O(N) Kasai LCP",
        "indexingConvention": "Suffix array internally constructed with 0-based indices SA[i] in [0, N-1]; biological start coordinates displayed as 1-based (SA[i] + 1)."
    }

