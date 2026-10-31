"""
BioDNA Validation and Quality Metrics Module
Provides IUPAC nucleotide validation, base composition, GC/AT skew,
and handling of degenerate ambiguous nucleotides.
"""

from typing import Dict, Any, List, Tuple
import re

# Standard Watson-Crick DNA nucleotides
STANDARD_DNA_BASES = set("ACGT")

# Standard RNA nucleotides
STANDARD_RNA_BASES = set("ACGU")

# IUPAC Degenerate Nucleotide Code Table
IUPAC_AMBIGUITY_CODES = {
    'R': ['A', 'G'],        # puRine
    'Y': ['C', 'T'],        # pYrimidine
    'S': ['G', 'C'],        # Strong interaction (3 H bonds)
    'W': ['A', 'T'],        # Weak interaction (2 H bonds)
    'K': ['G', 'T'],        # Keto
    'M': ['A', 'C'],        # aMino
    'B': ['C', 'G', 'T'],   # not A
    'D': ['A', 'G', 'T'],   # not C
    'H': ['A', 'C', 'T'],   # not G
    'V': ['A', 'C', 'G'],   # not T
    'N': ['A', 'C', 'G', 'T'] # aNy base
}

ALL_VALID_IUPAC_DNA = STANDARD_DNA_BASES.union(set(IUPAC_AMBIGUITY_CODES.keys()))


def clean_sequence(seq: str) -> str:
    """Removes whitespace, digits, and line breaks, normalizing to uppercase."""
    if not seq:
        return ""
    return re.sub(r"[\s\d\r\n\t]+", "", seq).upper()


def validate_dna_sequence(raw_sequence: str, allow_ambiguous: bool = True) -> Tuple[bool, str, str, List[Dict[str, Any]]]:
    """
    Validates a DNA sequence against IUPAC standard and degenerate codes.
    Returns:
        is_valid: bool
        cleaned_sequence: str
        error_message: str (empty if valid)
        invalid_characters: List of {char: str, position: int} (1-based)
    """
    cleaned = clean_sequence(raw_sequence)
    if not cleaned:
        return False, "", "Sequence is empty. Please provide a valid DNA sequence.", []

    allowed_set = ALL_VALID_IUPAC_DNA if allow_ambiguous else STANDARD_DNA_BASES
    invalid_chars = []

    for idx, char in enumerate(cleaned):
        if char not in allowed_set:
            invalid_chars.append({"char": char, "position": idx + 1})

    if invalid_chars:
        summary_invalid = sorted(list(set(item["char"] for item in invalid_chars)))
        return False, cleaned, f"Invalid nucleotide characters detected: {', '.join(summary_invalid)}. Only valid IUPAC DNA symbols are allowed.", invalid_chars

    return True, cleaned, "", []


def calculate_nucleotide_metrics(sequence: str) -> Dict[str, Any]:
    """
    Calculates nucleotide frequencies, GC content, AT content, and strand skew.
    Clearly documents how ambiguous bases are treated:
    GC-content is calculated as (G + C) / (A + C + G + T) for canonical bases,
    and total length includes all IUPAC bases with explicit ambiguous counts.
    """
    seq = clean_sequence(sequence)
    total_len = len(seq)
    if total_len == 0:
        return {
            "length": 0,
            "counts": {"A": 0, "C": 0, "G": 0, "T": 0},
            "ambiguous_counts": {},
            "gc_content": 0.0,
            "at_content": 0.0,
            "gc_skew": 0.0,
            "at_skew": 0.0,
            "ambiguity_ratio": 0.0,
            "notes": "Sequence is empty."
        }

    counts = {
        "A": seq.count("A"),
        "C": seq.count("C"),
        "G": seq.count("G"),
        "T": seq.count("T"),
    }

    ambiguous_counts = {}
    for code in IUPAC_AMBIGUITY_CODES:
        c = seq.count(code)
        if c > 0:
            ambiguous_counts[code] = c

    canonical_sum = counts["A"] + counts["C"] + counts["G"] + counts["T"]
    ambiguous_sum = total_len - canonical_sum

    # Standard bioinformatics definition: GC % over canonical bases (or total if no ambiguous)
    denom = canonical_sum if canonical_sum > 0 else total_len
    gc_pct = round(((counts["G"] + counts["C"]) / denom) * 100.0, 2)
    at_pct = round(((counts["A"] + counts["T"]) / denom) * 100.0, 2)

    # Replication strand skews: (G - C)/(G + C) and (A - T)/(A + T)
    gc_sum = counts["G"] + counts["C"]
    gc_skew = round((counts["G"] - counts["C"]) / gc_sum, 4) if gc_sum > 0 else 0.0

    at_sum = counts["A"] + counts["T"]
    at_skew = round((counts["A"] - counts["T"]) / at_sum, 4) if at_sum > 0 else 0.0

    ambiguity_ratio = round((ambiguous_sum / total_len) * 100.0, 2)

    notes = "Calculated on standard canonical nucleotides."
    if ambiguous_sum > 0:
        notes = (
            f"Sequence contains {ambiguous_sum} ambiguous IUPAC base(s) ({ambiguity_ratio}% of total). "
            "GC and AT percentages represent canonical bases (A, C, G, T) to avoid bias."
        )

    return {
        "length": total_len,
        "counts": counts,
        "ambiguous_counts": ambiguous_counts,
        "gc_content": gc_pct,
        "at_content": at_pct,
        "gc_skew": gc_skew,
        "at_skew": at_skew,
        "ambiguity_ratio": ambiguity_ratio,
        "notes": notes
    }


def reverse_complement(sequence: str) -> str:
    """Computes Watson-Crick reverse complement, supporting standard & IUPAC DNA."""
    complement_map = {
        'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
        'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W',
        'K': 'M', 'M': 'K', 'B': 'V', 'V': 'B',
        'D': 'H', 'H': 'D', 'N': 'N',
        'a': 't', 't': 'a', 'c': 'g', 'g': 'c'
    }
    cleaned = clean_sequence(sequence)
    return "".join(complement_map.get(base, 'N') for base in reversed(cleaned))


def validate_dna(sequence: str, allow_ambiguous: bool = False) -> Dict[str, Any]:
    """
    Structured dictionary validation result for API endpoints and test assertions.
    """
    is_valid, cleaned, err_msg, invalid_chars = validate_dna_sequence(sequence, allow_ambiguous=allow_ambiguous)
    metrics = calculate_nucleotide_metrics(cleaned) if cleaned else {}
    has_ambiguous = any(c in IUPAC_AMBIGUITY_CODES for c in cleaned)
    ambiguous_count = sum(metrics.get("ambiguous_counts", {}).values()) if metrics else 0
    
    return {
        "isValid": is_valid,
        "sequenceLength": len(cleaned),
        "hasAmbiguousBases": has_ambiguous,
        "ambiguousBaseCount": ambiguous_count,
        "canonicalCounts": metrics.get("counts", {"A": 0, "C": 0, "G": 0, "T": 0}),
        "gcContent": metrics.get("gc_content", 0.0),
        "atContent": metrics.get("at_content", 0.0),
        "gcSkew": metrics.get("gc_skew", 0.0),
        "atSkew": metrics.get("at_skew", 0.0),
        "error": err_msg if not is_valid else None
    }

