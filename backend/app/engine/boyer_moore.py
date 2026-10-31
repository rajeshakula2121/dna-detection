"""
Boyer-Moore Pattern Matching Algorithm for DNA Sequences
Efficiently searches for DNA motifs or patterns using Bad Character heuristic
and right-to-left window scanning for sublinear average performance.
"""

from typing import List, Dict, Any
import time
from .validation import clean_sequence
from .kmp import reverse_complement


def build_bad_char_table(pattern: str) -> Dict[str, int]:
    """
    Builds the Bad Character lookup table for DNA alphabet.
    Maps each nucleotide to its rightmost 0-based index in the pattern.
    """
    bad_char: Dict[str, int] = {b: -1 for b in ["A", "C", "G", "T", "N", "U"]}
    for i, ch in enumerate(pattern):
        bad_char[ch] = i
    return bad_char


def boyer_moore_search(
    sequence: str,
    pattern: str,
    search_both_strands: bool = True
) -> Dict[str, Any]:
    """
    Executes Boyer-Moore pattern matching on a DNA sequence.
    Returns:
        algorithm: 'Boyer-Moore'
        pattern: str
        badCharTable: List[Dict[str, Any]]
        matches: List[Dict[str, Any]]
        totalMatches: int
        forwardMatches: int
        reverseMatches: int
        comparisonsCount: int
        totalShifts: int
        executionTimeMs: float
        sublinearRatio: float
        complexity: str
    """
    t0 = time.perf_counter()
    seq = clean_sequence(sequence)
    pat = clean_sequence(pattern)

    matches: List[Dict[str, Any]] = []
    comparisons_count = 0
    total_shifts = 0
    forward_matches = 0
    reverse_matches = 0

    bad_char = build_bad_char_table(pat) if pat else {}
    bad_char_formatted = [
        {
            "char": ch,
            "lastIndex": idx,
            "shift": len(pat) if idx == -1 else max(1, len(pat) - 1 - idx)
        }
        for ch, idx in bad_char.items()
    ]

    if pat and len(seq) >= len(pat):
        def search_strand(target_seq: str, strand_name: str, pattern_str: str):
            nonlocal comparisons_count, total_shifts, forward_matches, reverse_matches
            m = len(pattern_str)
            n = len(target_seq)
            bc = build_bad_char_table(pattern_str)
            s = 0

            while s <= n - m:
                j = m - 1
                while j >= 0:
                    comparisons_count += 1
                    if pattern_str[j] != target_seq[s + j]:
                        break
                    j -= 1

                if j < 0:
                    start_coord = s + 1
                    end_coord = s + m
                    flank_start = max(0, s - 6)
                    flank_end = min(n, s + m + 6)
                    context = (
                        target_seq[flank_start:s]
                        + "["
                        + target_seq[s:s + m]
                        + "]"
                        + target_seq[s + m:flank_end]
                    )

                    matches.append({
                        "matchNumber": len(matches) + 1,
                        "strand": strand_name,
                        "pattern": pattern_str,
                        "startCoordinate": start_coord,
                        "endCoordinate": end_coord,
                        "matchedSequence": target_seq[s:s + m],
                        "context": context
                    })

                    if "+" in strand_name:
                        forward_matches += 1
                    else:
                        reverse_matches += 1

                    shift_by = (
                        m - bc.get(target_seq[s + m], -1)
                        if s + m < n
                        else 1
                    )
                    s += max(1, shift_by)
                    total_shifts += 1
                else:
                    mismatch_char = target_seq[s + j]
                    last_idx = bc.get(mismatch_char, -1)
                    shift_by = max(1, j - last_idx)
                    s += shift_by
                    total_shifts += 1

        search_strand(seq, "Forward (+)", pat)

        if search_both_strands:
            rc_pat = reverse_complement(pat)
            if rc_pat != pat:
                search_strand(seq, "Reverse (-)", rc_pat)

    exec_time_ms = round((time.perf_counter() - t0) * 1000, 3)
    sublinear_ratio = round(comparisons_count / max(1, len(seq)), 3)

    return {
        "algorithm": "Boyer-Moore",
        "pattern": pat,
        "badCharTable": bad_char_formatted,
        "matches": matches,
        "totalMatches": len(matches),
        "forwardMatches": forward_matches,
        "reverseMatches": reverse_matches,
        "comparisonsCount": comparisons_count,
        "totalShifts": total_shifts,
        "executionTimeMs": exec_time_ms,
        "sublinearRatio": sublinear_ratio,
        "complexity": "O(N / M) average, O(N * M) worst"
    }

