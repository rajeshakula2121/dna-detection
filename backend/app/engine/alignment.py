"""
Needleman-Wunsch Global Sequence Alignment Engine
Implements dynamic programming with optimal alignment matrix computation,
configurable scoring parameters, gap penalties, and traceback reconstruction.
"""

from typing import Dict, Any, Tuple
import numpy as np
from .validation import clean_sequence

DEFAULT_MATCH_SCORE = 2
DEFAULT_MISMATCH_SCORE = -1
DEFAULT_GAP_PENALTY = -2
DEFAULT_MAX_SEQUENCE_LENGTH = 10000


class SequenceTooLongError(ValueError):
    """Raised when sequence exceeds the configured computational length limit."""
    pass


def needleman_wunsch(
    reference: str,
    sample: str,
    match_score: int = DEFAULT_MATCH_SCORE,
    mismatch_score: int = DEFAULT_MISMATCH_SCORE,
    gap_penalty: int = DEFAULT_GAP_PENALTY,
    max_length: int = DEFAULT_MAX_SEQUENCE_LENGTH
) -> Dict[str, Any]:
    """
    Performs global pairwise alignment using the Needleman-Wunsch dynamic programming algorithm.
    
    Args:
        reference: Reference sequence string (5' -> 3').
        sample: Query / sample sequence string (5' -> 3').
        match_score: Score for matching identical nucleotides (default +2).
        mismatch_score: Penalty for nucleotide substitution (default -1).
        gap_penalty: Linear gap penalty for insertion or deletion (default -2).
        max_length: Safety threshold preventing memory exhaustion on huge inputs.
        
    Returns:
        Dict containing:
            score: int (optimal global alignment score)
            ref_aligned: str (reference with '-' gaps)
            sample_aligned: str (sample with '-' gaps)
            alignment_length: int
            identical_matches: int
            identity_percentage: float
            mismatches: int
            gaps: int
            parameters: Dict
    """
    ref = clean_sequence(reference)
    smp = clean_sequence(sample)

    n = len(ref)
    m = len(smp)

    if n > max_length or m > max_length:
        raise SequenceTooLongError(
            f"Input sequence length ({max(n, m)} bp) exceeds the configured limit of {max_length} bp. "
            "Please provide a shorter genomic sub-region for dynamic programming global alignment."
        )

    if n == 0 or m == 0:
        return {
            "score": 0,
            "ref_aligned": ref,
            "sample_aligned": smp,
            "alignment_length": max(n, m),
            "identical_matches": 0,
            "identity_percentage": 0.0,
            "mismatches": 0,
            "gaps": max(n, m),
            "parameters": {
                "match_score": match_score,
                "mismatch_score": mismatch_score,
                "gap_penalty": gap_penalty
            }
        }

    # Initialize dynamic programming score matrix using int32 for efficiency
    dp = np.zeros((n + 1, m + 1), dtype=np.int32)

    # Base cases (initialization with linear gap penalties)
    for i in range(1, n + 1):
        dp[i, 0] = dp[i - 1, 0] + gap_penalty
    for j in range(1, m + 1):
        dp[0, j] = dp[0, j - 1] + gap_penalty

    # Fill score matrix
    for i in range(1, n + 1):
        ref_char = ref[i - 1]
        for j in range(1, m + 1):
            smp_char = smp[j - 1]
            diag_score = dp[i - 1, j - 1] + (match_score if ref_char == smp_char else mismatch_score)
            up_score = dp[i - 1, j] + gap_penalty
            left_score = dp[i, j - 1] + gap_penalty
            dp[i, j] = max(diag_score, up_score, left_score)

    optimal_score = int(dp[n, m])

    # Traceback from (n, m) to (0, 0)
    aligned_ref_chars = []
    aligned_smp_chars = []

    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0:
            ref_char = ref[i - 1]
            smp_char = smp[j - 1]
            diag_val = dp[i - 1, j - 1] + (match_score if ref_char == smp_char else mismatch_score)
            
            if dp[i, j] == diag_val:
                aligned_ref_chars.append(ref_char)
                aligned_smp_chars.append(smp_char)
                i -= 1
                j -= 1
                continue

        if i > 0 and (j == 0 or dp[i, j] == dp[i - 1, j] + gap_penalty):
            aligned_ref_chars.append(ref[i - 1])
            aligned_smp_chars.append('-')
            i -= 1
        else:
            aligned_ref_chars.append('-')
            aligned_smp_chars.append(smp[j - 1])
            j -= 1

    aligned_ref = "".join(reversed(aligned_ref_chars))
    aligned_smp = "".join(reversed(aligned_smp_chars))

    alignment_len = len(aligned_ref)
    identical_matches = 0
    mismatches = 0
    gaps = 0

    for r_c, s_c in zip(aligned_ref, aligned_smp):
        if r_c == '-' or s_c == '-':
            gaps += 1
        elif r_c == s_c:
            identical_matches += 1
        else:
            mismatches += 1

    identity_pct = round((identical_matches / alignment_len) * 100.0, 2) if alignment_len > 0 else 0.0

    return {
        "score": optimal_score,
        "ref_aligned": aligned_ref,
        "sample_aligned": aligned_smp,
        "alignment_length": alignment_len,
        "identical_matches": identical_matches,
        "identity_percentage": identity_pct,
        "mismatches": mismatches,
        "gaps": gaps,
        "parameters": {
            "match_score": match_score,
            "mismatch_score": mismatch_score,
            "gap_penalty": gap_penalty,
            "max_length": max_length
        }
    }


def needleman_wunsch_align(
    reference: str,
    alternate: str,
    match_score: int = DEFAULT_MATCH_SCORE,
    mismatch_penalty: int = DEFAULT_MISMATCH_SCORE,
    gap_penalty: int = DEFAULT_GAP_PENALTY,
    max_length: int = DEFAULT_MAX_SEQUENCE_LENGTH
) -> Dict[str, Any]:
    """
    BioDNA API wrapper for Needleman-Wunsch alignment with matchString and camelCase keys.
    """
    raw = needleman_wunsch(
        reference,
        alternate,
        match_score=match_score,
        mismatch_score=mismatch_penalty,
        gap_penalty=gap_penalty,
        max_length=max_length
    )
    match_chars = []
    for r, a in zip(raw['ref_aligned'], raw['sample_aligned']):
        if r == '-' or a == '-':
            match_chars.append(' ')
        elif r == a:
            match_chars.append('|')
        else:
            match_chars.append('*')
            
    return {
        'refLength': len(clean_sequence(reference)),
        'altLength': len(clean_sequence(alternate)),
        'alignmentScore': raw['score'],
        'identity': raw['identity_percentage'],
        'similarity': raw['identity_percentage'],
        'gapsCount': raw['gaps'],
        'matchesCount': raw['identical_matches'],
        'mismatchesCount': raw['mismatches'],
        'refAligned': raw['ref_aligned'],
        'altAligned': raw['sample_aligned'],
        'matchString': "".join(match_chars)
    }

