"""
Knuth-Morris-Pratt (KMP) Pattern Matching Algorithm
Provides linear-time single-pattern exact string searching,
finding all matching positions including overlapping occurrences.
"""

from typing import List, Dict, Any
from .validation import clean_sequence, reverse_complement


def compute_lps_table(pattern: str) -> List[int]:
    """
    Computes the Longest Proper Prefix which is also Suffix (LPS) array for KMP.
    Time Complexity: O(M) where M is pattern length.
    """
    m = len(pattern)
    lps = [0] * m
    length = 0  # length of previous longest prefix suffix
    i = 1

    while i < m:
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        else:
            if length != 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1
    return lps


def kmp_search(
    sequence: str, 
    pattern: str, 
    include_reverse_complement: bool = False,
    allow_overlapping: bool = True
) -> List[Dict[str, Any]]:
    """
    Executes Knuth-Morris-Pratt exact pattern search on DNA sequence.
    Guarantees identification of all occurrences, including overlapping ones.
    
    Returns list of dicts with:
        pattern: str
        start: int (1-based biological coordinate)
        end: int (1-based inclusive)
        length: int
        strand: str ('+' for forward, '-' for reverse complement)
        matched_sequence: str
    """
    seq = clean_sequence(sequence)
    pat = clean_sequence(pattern)

    if not seq or not pat:
        return []

    n = len(seq)
    m = len(pat)

    if m > n:
        return []

    lps = compute_lps_table(pat)
    matches: List[Dict[str, Any]] = []

    # Forward strand search
    i = 0  # index for sequence
    j = 0  # index for pattern

    while i < n:
        if pat[j] == seq[i]:
            i += 1
            j += 1

        if j == m:
            start_pos = i - m + 1  # 1-based coordinate
            end_pos = i            # 1-based coordinate
            matches.append({
                "pattern": pat,
                "start": start_pos,
                "end": end_pos,
                "length": m,
                "strand": "+",
                "matched_sequence": seq[i - m:i]
            })
            # To find overlapping occurrences: reset j to lps[j-1]
            j = lps[j - 1]
        elif i < n and pat[j] != seq[i]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1

    # Optional Reverse Complement strand search
    if include_reverse_complement:
        rc_pat = reverse_complement(pat)
        # Avoid duplicate search if the pattern is a reverse palindromic motif (e.g. GAATTC)
        if rc_pat != pat:
            rc_lps = compute_lps_table(rc_pat)
            i = 0
            j = 0
            while i < n:
                if rc_pat[j] == seq[i]:
                    i += 1
                    j += 1

                if j == m:
                    start_pos = i - m + 1
                    end_pos = i
                    matches.append({
                        "pattern": pat,
                        "rc_pattern": rc_pat,
                        "start": start_pos,
                        "end": end_pos,
                        "length": m,
                        "strand": "-",
                        "matched_sequence": seq[i - m:i]
                    })
                    j = rc_lps[j - 1]
                elif i < n and rc_pat[j] != seq[i]:
                    if j != 0:
                        j = rc_lps[j - 1]
                    else:
                        i += 1

    # Sort matches deterministically by start position
    matches.sort(key=lambda x: (x["start"], x["strand"]))
    return matches


def search_kmp_pattern(sequence: str, pattern: str, allow_overlapping: bool = True) -> Dict[str, Any]:
    """
    Standard BioDNA API wrapper for KMP pattern matching returning KmpSearchResponse format.
    """
    raw_matches = kmp_search(sequence, pattern, include_reverse_complement=False, allow_overlapping=allow_overlapping)
    positions = [m["start"] for m in raw_matches]
    lps = compute_lps_table(clean_sequence(pattern))
    pattern_matches = [
        {
            "pattern": m["pattern"],
            "startPos": m["start"],
            "endPos": m["end"],
            "matchedSubsequence": m.get("matched_sequence", "")
        }
        for m in raw_matches
    ]
    return {
        "pattern": clean_sequence(pattern),
        "matchCount": len(positions),
        "positions": positions,
        "matches": pattern_matches,
        "longestPrefixSuffixTable": lps
    }

