"""
K-mer Frequency and Sequence Composition Module
Computes configurable k-mer distribution, frequency tables,
most and least frequent patterns, and sequence complexity.
"""

from typing import Dict, Any, List
import math
from .validation import clean_sequence


def calculate_kmer_frequencies(
    sequence: str, 
    k: int = 3, 
    top_n: int = 10
) -> Dict[str, Any]:
    """
    Calculates the frequency distribution of k-mers of length k across a DNA sequence.
    
    Args:
        sequence: Raw or cleaned DNA string.
        k: Length of k-mer (typically 2 to 8).
        top_n: Number of top/bottom k-mers to summarize.
        
    Returns:
        k: int
        total_possible_kmers: int (4^k for canonical bases)
        total_observed_windows: int (N - k + 1)
        unique_kmers_observed: int
        frequencies: Dict[kmer, count]
        proportions: Dict[kmer, float]
        top_frequent: List[Dict]
        least_frequent: List[Dict]
        shannon_entropy: float (sequence complexity measure)
    """
    seq = clean_sequence(sequence)
    n = len(seq)

    if k <= 0 or k > 16:
        raise ValueError("K-mer length k must be between 1 and 16.")

    if n < k:
        return {
            "k": k,
            "total_observed_windows": 0,
            "unique_kmers_observed": 0,
            "frequencies": {},
            "proportions": {},
            "top_frequent": [],
            "least_frequent": [],
            "shannon_entropy": 0.0,
            "notes": f"Sequence length ({n}) is shorter than k-mer window ({k})."
        }

    total_windows = n - k + 1
    freqs: Dict[str, int] = {}

    for i in range(total_windows):
        kmer = seq[i:i + k]
        freqs[kmer] = freqs.get(kmer, 0) + 1

    # Proportions and Shannon Entropy
    proportions: Dict[str, float] = {}
    entropy = 0.0

    for kmer, count in freqs.items():
        prob = count / total_windows
        proportions[kmer] = round(prob, 5)
        if prob > 0:
            entropy -= prob * math.log2(prob)

    # Sort k-mers by count descending for top frequent patterns
    descending_kmers = sorted(freqs.items(), key=lambda item: (-item[1], item[0]))

    top_frequent = [
        {"kmer": kmer, "count": count, "frequency_percent": round((count / total_windows) * 100, 2)}
        for kmer, count in descending_kmers[:top_n]
    ]

    # Sort k-mers by count ascending (lowest count first, alphabetical on tie) for underrepresented
    ascending_kmers = sorted(freqs.items(), key=lambda item: (item[1], item[0]))

    uniform_prob = 1.0 / (4 ** k) if k <= 8 else 0.0
    uniform_pct = round(uniform_prob * 100, 2)

    least_frequent = [
        {
            "kmer": kmer,
            "count": count,
            "frequency_percent": round((count / total_windows) * 100, 2),
            "expected_count": round(total_windows * uniform_prob, 2) if uniform_prob > 0 else 0.0,
            "expected_percent": uniform_pct,
            "representation_ratio": round((count / total_windows) / uniform_prob, 2) if uniform_prob > 0 else 1.0
        }
        for kmer, count in ascending_kmers[:top_n]
    ]

    # Contextual maximum entropies under explicit assumptions
    alphabet_max = round(2.0 * k, 4) if k <= 8 else 0.0  # log2(4^k) = 2k
    observed_cat_max = round(math.log2(max(len(freqs), 1)), 4)  # log2(V)
    window_max = round(math.log2(max(total_windows, 1)), 4)  # log2(W)

    entropy_val = round(entropy, 4)
    rel_alphabet = round((entropy / (2.0 * k)) * 100, 2) if k > 0 and alphabet_max > 0 else 0.0
    rel_observed = round((entropy / math.log2(len(freqs))) * 100, 2) if len(freqs) > 1 else 100.0

    entropy_metrics = {
        "shannon_entropy": entropy_val,
        "max_alphabet_entropy": alphabet_max,
        "max_observed_categories_entropy": observed_cat_max,
        "max_sample_windows_entropy": window_max,
        "alphabet_size": 4 ** k if k <= 8 else None,
        "observed_categories": len(freqs),
        "total_windows": total_windows,
        "relative_entropy_alphabet_pct": rel_alphabet,
        "relative_entropy_observed_pct": rel_observed,
        "assumptions": {
            "max_alphabet_entropy": f"Theoretical upper bound across all 4^{k} = {4**k if k<=8 else 'N/A'} possible DNA {k}-mers (log2({4**k if k<=8 else 'N/A'}) = {alphabet_max} bits)",
            "max_observed_categories": f"Theoretical upper bound across the {len(freqs)} observed {k}-mer classes (log2({len(freqs)}) = {observed_cat_max} bits)",
            "max_sample_windows": f"Theoretical upper bound for {total_windows} sample windows if each window were a unique k-mer (log2({total_windows}) = {window_max} bits)"
        }
    }

    return {
        "k": k,
        "total_observed_windows": total_windows,
        "unique_kmers_observed": len(freqs),
        "frequencies": freqs,
        "proportions": proportions,
        "top_frequent": top_frequent,
        "least_frequent": least_frequent,
        "underrepresented_method": "Observed k-mers sorted in ascending count order (lowest observed frequency first), compared against uniform theoretical background (1/4^k)",
        "shannon_entropy": entropy_val,
        "max_theoretical_entropy": window_max,
        "entropy_metrics": entropy_metrics,
        "notes": "Shannon entropy calculated directly from observed k-mer probabilities: H = -sum(p_i * log2(p_i))."
    }


def analyze_kmers(sequence: str, k: int = 3) -> Dict[str, Any]:
    """
    Convenience wrapper returning structured k-mer metrics matching API and schemas.
    """
    raw = calculate_kmer_frequencies(sequence, k=k)
    return {
        **raw,
        "totalKmers": raw["total_observed_windows"],
        "uniqueKmers": raw["unique_kmers_observed"],
        "shannonEntropy": raw["shannon_entropy"],
        "topKmers": raw["top_frequent"],
        "leastKmers": raw["least_frequent"],
    }

