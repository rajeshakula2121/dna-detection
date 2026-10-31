"""
Mutation-Aware Motif Disruption Engine
Analyzes how detected genomic variants (SNVs, indels) disrupt, abolish,
gain, retain, or coordinate-shift functional DNA sequence motifs.
"""

from typing import List, Dict, Any, Set
from enum import Enum
from .kmp import kmp_search
from .aho_corasick import multi_pattern_search
from .validation import clean_sequence


class DisruptionStatus(str, Enum):
    RETAINED = "RETAINED"            # Unchanged homologous motif across reference & sample
    DISRUPTED = "DISRUPTED"          # Reference motif broken by an overlapping mutation in sample
    LOST = "LOST"                    # Motif present in reference completely missing at aligned locus
    GAINED = "GAINED"                # New motif created in sample due to mutation
    SHIFTED = "SHIFTED"              # Motif conserved, but physical coordinate shifted due to upstream indel


def build_alignment_coordinate_maps(
    aligned_ref: str, 
    aligned_sample: str
) -> Dict[str, Any]:
    """
    Builds bidirectional lookup tables between:
    - 1-based reference position <-> 1-based alignment column
    - 1-based sample position <-> 1-based alignment column
    """
    ref_to_col: Dict[int, int] = {}
    col_to_ref: Dict[int, int] = {}

    sample_to_col: Dict[int, int] = {}
    col_to_sample: Dict[int, int] = {}

    ref_pos = 0
    sample_pos = 0

    for idx, (r, s) in enumerate(zip(aligned_ref, aligned_sample)):
        col = idx + 1
        if r != '-':
            ref_pos += 1
            ref_to_col[ref_pos] = col
            col_to_ref[col] = ref_pos

        if s != '-':
            sample_pos += 1
            sample_to_col[sample_pos] = col
            col_to_sample[col] = sample_pos

    return {
        "ref_to_col": ref_to_col,
        "col_to_ref": col_to_ref,
        "sample_to_col": sample_to_col,
        "col_to_sample": col_to_sample
    }


def analyze_motif_disruptions(
    ref_sequence: str,
    sample_sequence: str,
    aligned_ref: str,
    aligned_sample: str,
    mutations: List[Dict[str, Any]],
    motifs: List[str]
) -> List[Dict[str, Any]]:
    """
    Correlates motif occurrences in reference and sample sequences with detected mutations
    using alignment-aware coordinate projection.
    
    Returns structured disruption records with status, intersecting variants, and explanations.
    """
    ref_clean = clean_sequence(ref_sequence)
    smp_clean = clean_sequence(sample_sequence)
    cleaned_motifs = [clean_sequence(m) for m in motifs if clean_sequence(m)]

    if not cleaned_motifs or not ref_clean or not smp_clean:
        return []

    # 1. Multi-pattern scan on reference and sample
    ref_matches = multi_pattern_search(ref_clean, cleaned_motifs, include_reverse_complement=False)["matches"]
    smp_matches = multi_pattern_search(smp_clean, cleaned_motifs, include_reverse_complement=False)["matches"]

    # 2. Build coordinate mapping across global alignment columns
    coord_maps = build_alignment_coordinate_maps(aligned_ref, aligned_sample)
    ref_to_col = coord_maps["ref_to_col"]
    sample_to_col = coord_maps["sample_to_col"]

    # Annotate reference matches with alignment column spans
    for m in ref_matches:
        start_col = ref_to_col.get(m["start"], 0)
        end_col = ref_to_col.get(m["end"], 0)
        m["col_span"] = (start_col, end_col)

    # Annotate sample matches with alignment column spans
    for m in smp_matches:
        start_col = sample_to_col.get(m["start"], 0)
        end_col = sample_to_col.get(m["end"], 0)
        m["col_span"] = (start_col, end_col)

    disruption_events: List[Dict[str, Any]] = []

    # Map mutations to alignment columns
    mut_columns = {m.get("alignment_column", 0): m for m in mutations}

    # Track paired sample matches
    matched_smp_indices: Set[int] = set()

    # 3. Analyze Reference Motifs (Retained, Disrupted, Shifted, or Lost)
    for ref_m in ref_matches:
        motif_pat = ref_m["pattern"]
        r_start = ref_m["start"]
        r_end = ref_m["end"]
        r_col_start, r_col_end = ref_m["col_span"]

        # Check for direct overlap with any detected mutation
        overlapping_muts = []
        for mut in mutations:
            m_col = mut.get("alignment_column", 0)
            if r_col_start <= m_col <= r_col_end:
                overlapping_muts.append(mut)

        # Look for corresponding sample match at or near the homologous alignment span
        found_smp_idx = None
        for s_idx, smp_m in enumerate(smp_matches):
            if s_idx in matched_smp_indices:
                continue
            if smp_m["pattern"] != motif_pat:
                continue

            s_col_start, s_col_end = smp_m["col_span"]
            # Check column overlap or exact match
            if s_col_start == r_col_start and s_col_end == r_col_end:
                found_smp_idx = s_idx
                break
            # Close alignment column proximity (allow tolerance for small indels)
            if abs(s_col_start - r_col_start) <= 3 and abs(s_col_end - r_col_end) <= 3:
                found_smp_idx = s_idx
                break

        if found_smp_idx is not None:
            matched_smp_indices.add(found_smp_idx)
            smp_m = smp_matches[found_smp_idx]
            s_start = smp_m["start"]
            s_end = smp_m["end"]

            if overlapping_muts:
                # Mutation inside region but motif somehow still matches (rare degenerate case)
                status = DisruptionStatus.DISRUPTED.value
                explanation = (
                    f"Motif '{motif_pat}' at reference pos {r_start}-{r_end} overlaps with "
                    f"{len(overlapping_muts)} variant(s), altering local sequence architecture."
                )
            elif s_start != r_start:
                # Coordinate shifted due to upstream indel
                status = DisruptionStatus.SHIFTED.value
                explanation = (
                    f"Motif '{motif_pat}' is conserved but its biological coordinate shifted "
                    f"from ref pos {r_start}-{r_end} to sample pos {s_start}-{s_end} due to an upstream indel event."
                )
            else:
                status = DisruptionStatus.RETAINED.value
                explanation = (
                    f"Motif '{motif_pat}' is fully conserved across both reference and sample "
                    f"at homologous position {r_start}-{r_end}."
                )

            disruption_events.append({
                "motif": motif_pat,
                "status": status,
                "ref_position": f"{r_start}-{r_end}",
                "sample_position": f"{s_start}-{s_end}",
                "alignment_span": f"col {r_col_start}-{r_col_end}",
                "intersecting_mutations": [m["hgvs_notation"] for m in overlapping_muts],
                "explanation": explanation
            })
        else:
            # Reference motif is missing in the sample
            if overlapping_muts:
                status = DisruptionStatus.DISRUPTED.value
                mut_desc = ", ".join(m["hgvs_notation"] for m in overlapping_muts)
                explanation = (
                    f"Motif '{motif_pat}' at reference pos {r_start}-{r_end} is disrupted by mutation ({mut_desc}), "
                    "abolishing the binding pattern in the sample sequence."
                )
            else:
                status = DisruptionStatus.LOST.value
                explanation = (
                    f"Motif '{motif_pat}' at reference pos {r_start}-{r_end} is absent in the sample "
                    "at the corresponding homologous locus."
                )

            disruption_events.append({
                "motif": motif_pat,
                "status": status,
                "ref_position": f"{r_start}-{r_end}",
                "sample_position": "N/A (Abolished)",
                "alignment_span": f"col {r_col_start}-{r_col_end}",
                "intersecting_mutations": [m["hgvs_notation"] for m in overlapping_muts],
                "explanation": explanation
            })

    # 4. Analyze Sample-Only Motifs (Gained Motifs)
    for s_idx, smp_m in enumerate(smp_matches):
        if s_idx in matched_smp_indices:
            continue

        motif_pat = smp_m["pattern"]
        s_start = smp_m["start"]
        s_end = smp_m["end"]
        s_col_start, s_col_end = smp_m["col_span"]

        # Check if an overlapping mutation created this motif
        overlapping_muts = []
        for mut in mutations:
            m_col = mut.get("alignment_column", 0)
            if s_col_start <= m_col <= s_col_end:
                overlapping_muts.append(mut)

        mut_desc = ", ".join(m["hgvs_notation"] for m in overlapping_muts) if overlapping_muts else "sequence variation"
        explanation = (
            f"Novel motif '{motif_pat}' gained in the sample at position {s_start}-{s_end} "
            f"as a result of genomic variation ({mut_desc})."
        )

        disruption_events.append({
            "motif": motif_pat,
            "status": DisruptionStatus.GAINED.value,
            "ref_position": "N/A (Not in reference)",
            "sample_position": f"{s_start}-{s_end}",
            "alignment_span": f"col {s_col_start}-{s_col_end}",
            "intersecting_mutations": [m["hgvs_notation"] for m in overlapping_muts],
            "explanation": explanation
        })

    return disruption_events


def evaluate_motif_disruptions(
    ref_sequence: str,
    alt_sequence: str,
    motifs: List[Any],
    aligned_ref: str,
    aligned_alt: str,
    mutations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Evaluates motif disruptions across reference and alternate sequences and
    returns a dictionary matching the MotifDisruptionResponse schema.
    """
    # Extract patterns and names
    motif_items = []
    for m in motifs:
        if isinstance(m, dict):
            name = m.get('name', m.get('pattern', ''))
            pattern = m.get('pattern', '')
        else:
            name = str(m)
            pattern = str(m)
        motif_items.append({'name': name, 'pattern': pattern})

    patterns = [m['pattern'] for m in motif_items]
    raw_events = analyze_motif_disruptions(
        ref_sequence,
        alt_sequence,
        aligned_ref,
        aligned_alt,
        mutations,
        patterns
    )

    events: List[Dict[str, Any]] = []
    status_counts = {"DISRUPTED": 0, "RETAINED": 0, "LOST": 0, "GAINED": 0, "SHIFTED": 0}

    for item in motif_items:
        p = item['pattern']
        name = item['name']
        matching_events = [e for e in raw_events if e.get('motif') == p]

        # KMP search to get exact positions
        from .kmp import search_kmp_pattern
        ref_kmp = search_kmp_pattern(ref_sequence, p)
        alt_kmp = search_kmp_pattern(alt_sequence, p)

        if matching_events:
            primary_status = matching_events[0].get('status', 'RETAINED')
            desc = matching_events[0].get('explanation', '')
            intersecting = matching_events[0].get('intersecting_mutations', [])
        elif ref_kmp['matchCount'] > 0 and alt_kmp['matchCount'] == 0:
            primary_status = 'LOST'
            desc = f"Motif {name} ({p}) observed in reference but absent in alternate sequence."
            intersecting = []
        elif ref_kmp['matchCount'] == 0 and alt_kmp['matchCount'] > 0:
            primary_status = 'GAINED'
            desc = f"Motif {name} ({p}) not present in reference, gained in alternate sequence."
            intersecting = []
        elif ref_kmp['matchCount'] > 0 and ref_kmp['positions'] == alt_kmp['positions']:
            primary_status = 'RETAINED'
            desc = f"Motif {name} ({p}) completely conserved at identical coordinates."
            intersecting = []
        else:
            primary_status = 'SHIFTED'
            desc = f"Motif {name} ({p}) conserved with shifted coordinates."
            intersecting = []

        status_counts[primary_status] = status_counts.get(primary_status, 0) + 1

        events.append({
            "motifName": name,
            "pattern": p,
            "classification": primary_status,
            "refMatchCount": ref_kmp['matchCount'],
            "altMatchCount": alt_kmp['matchCount'],
            "refPositions": ref_kmp['positions'],
            "altPositions": alt_kmp['positions'],
            "overlappingVariants": [{'hgvs': h} for h in intersecting],
            "description": desc
        })

    return {
        "totalMotifsEvaluated": len(motif_items),
        "disruptedCount": status_counts.get("DISRUPTED", 0),
        "retainedCount": status_counts.get("RETAINED", 0),
        "lostCount": status_counts.get("LOST", 0),
        "gainedCount": status_counts.get("GAINED", 0),
        "shiftedCount": status_counts.get("SHIFTED", 0),
        "events": events
    }

