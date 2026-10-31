"""
Mutation Detection and Variant Classification Engine
Analyzes aligned pairwise sequence columns to classify genomic variants:
- Single Nucleotide Variants (Substitutions: Transitions vs Transversions)
- Contiguous Insertions and Deletions (Micro-indels)
- HGVS 3'-Rule Normalization (Right-shifting indels in repetitive tracts)
- Transcript Coding Coordinate Mapping (via coordinate offset)
- Identification of Mathematically & Biologically Equivalent Representations
"""

from typing import List, Dict, Any, Optional, Tuple
from enum import Enum


class MutationType(str, Enum):
    SUBSTITUTION = "SUBSTITUTION"
    INSERTION = "INSERTION"
    DELETION = "DELETION"


class SubstitutionClass(str, Enum):
    TRANSITION = "TRANSITION"
    TRANSVERSION = "TRANSVERSION"
    COMPLEX = "COMPLEX"


# Transition definitions: purine <-> purine (A <-> G) or pyrimidine <-> pyrimidine (C <-> T)
TRANSITIONS = {
    ("A", "G"), ("G", "A"),
    ("C", "T"), ("T", "C")
}


def classify_substitution(ref_base: str, alt_base: str) -> SubstitutionClass:
    """Classifies a single base substitution as transition or transversion."""
    pair = (ref_base.upper(), alt_base.upper())
    if pair in TRANSITIONS:
        return SubstitutionClass.TRANSITION
    return SubstitutionClass.TRANSVERSION


def find_equivalent_deletions(
    unaligned_ref: str,
    unaligned_alt: str,
    raw_start: int,
    raw_end: int,
    coord_offset: int = 0,
    transcript_accession: str = ""
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Identifies all mathematically and biologically equivalent deletion coordinate windows
    that produce the identical mutated alternate sequence in repetitive tracts,
    and determines the canonical HGVS 3'-normalized representation.
    """
    k = raw_end - raw_start + 1
    n = len(unaligned_ref)
    equivs: List[Dict[str, Any]] = []

    # 1. Expand leftward (5') as far as identity is preserved
    s, e = raw_start, raw_end
    while s > 1 and unaligned_ref[s - 2] == unaligned_ref[e - 1]:
        s -= 1
        e -= 1

    # 2. Collect all valid windows moving rightward (3')
    prefix = f"{transcript_accession}:" if transcript_accession else ""
    while e <= n:
        cur_del = unaligned_ref[s - 1 : e]
        # Verify exact sequence equivalence
        if unaligned_ref[:s - 1] + unaligned_ref[e:] == unaligned_alt:
            cds_s = s + coord_offset
            cds_e = e + coord_offset
            hgvs = (
                f"{prefix}c.{cds_s}_{cds_e}del{cur_del}"
                if k > 1
                else f"{prefix}c.{cds_s}del{cur_del}"
            )
            local_hgvs = f"c.{s}_{e}del{cur_del}" if k > 1 else f"c.{s}del{cur_del}"
            equivs.append({
                "local_start": s,
                "local_end": e,
                "deleted_sequence": cur_del,
                "cds_start": cds_s,
                "cds_end": cds_e,
                "hgvs_coding": hgvs,
                "local_hgvs": local_hgvs
            })

        if e < n and unaligned_ref[s - 1] == unaligned_ref[e]:
            s += 1
            e += 1
        else:
            break

    if not equivs:
        # Fallback to raw if slice verification edge case occurs
        cds_s = raw_start + coord_offset
        cds_e = raw_end + coord_offset
        cur_del = unaligned_ref[raw_start - 1 : raw_end]
        hgvs = f"{prefix}c.{cds_s}_{cds_e}del{cur_del}" if k > 1 else f"{prefix}c.{cds_s}del{cur_del}"
        local_hgvs = f"c.{raw_start}_{raw_end}del{cur_del}" if k > 1 else f"c.{raw_start}del{cur_del}"
        raw_eq = {
            "local_start": raw_start,
            "local_end": raw_end,
            "deleted_sequence": cur_del,
            "cds_start": cds_s,
            "cds_end": cds_e,
            "hgvs_coding": hgvs,
            "local_hgvs": local_hgvs
        }
        return raw_eq, [raw_eq]

    # HGVS 3'-rule selection:
    # If the original raw deletion motif occurs in multiple windows (e.g., dinucleotide repeat 'AG'),
    # select the 3'-most window that preserves the characteristic repeat motif (e.g. c.68_69delAG).
    # Otherwise, select the rightmost window overall (e.g. c.1521_1523delCTT).
    raw_del = unaligned_ref[raw_start - 1 : raw_end]
    matching = [x for x in equivs if x["deleted_sequence"] == raw_del]
    if len(matching) > 1:
        canonical = matching[-1]
    else:
        canonical = equivs[-1]

    return canonical, equivs


def detect_mutations_from_alignment(
    aligned_ref: str, 
    aligned_sample: str, 
    flank_size: int = 5,
    coordinate_offset: int = 0,
    transcript_accession: str = "",
    normalize_3prime: bool = True
) -> List[Dict[str, Any]]:
    """
    Parses Needleman-Wunsch aligned sequences column-by-column to detect, group,
    and classify all substitutions, insertions, and deletions.
    
    Supports:
    - 1-based biological coordinates (local and transcript CDS via coordinate_offset).
    - HGVS 3'-rule indel normalization for repetitive sequence tracts.
    - Identification of equivalent deletion representations.
    """
    mutations: List[Dict[str, Any]] = []

    unaligned_ref = aligned_ref.replace('-', '')
    unaligned_sample = aligned_sample.replace('-', '')

    ref_pos = 0     # 1-based local position in reference
    sample_pos = 0  # 1-based local position in sample
    col_idx = 0     # 1-based alignment column

    i = 0
    total_cols = len(aligned_ref)
    prefix = f"{transcript_accession}:" if transcript_accession else ""

    while i < total_cols:
        r_char = aligned_ref[i]
        s_char = aligned_sample[i]
        col_idx = i + 1

        if r_char != '-':
            ref_pos += 1
        if s_char != '-':
            sample_pos += 1

        # Case 1: Identical match
        if r_char == s_char:
            i += 1
            continue

        # Case 2: Substitution (Both columns have nucleotides, but they differ)
        if r_char != '-' and s_char != '-':
            sub_class = classify_substitution(r_char, s_char)
            
            # Extract local flanking context from unaligned reference
            start_flank = max(0, i - flank_size)
            end_flank = min(total_cols, i + flank_size + 1)
            ref_context = aligned_ref[start_flank:end_flank].replace('-', '')
            sample_context = aligned_sample[start_flank:end_flank].replace('-', '')

            cds_pos = ref_pos + coordinate_offset
            hgvs = f"{prefix}c.{cds_pos}{r_char}>{s_char}"
            local_hgvs = f"c.{ref_pos}{r_char}>{s_char}"

            explanation = (
                f"Single nucleotide substitution at reference position {cds_pos} "
                f"(local position {ref_pos}). "
                f"Reference base '{r_char}' is replaced by sample base '{s_char}' "
                f"({sub_class.value.lower()})."
            )

            mutations.append({
                "type": MutationType.SUBSTITUTION.value,
                "ref_position": ref_pos,
                "ref_end_position": ref_pos,
                "cds_position": cds_pos,
                "cds_end_position": cds_pos,
                "sample_position": sample_pos,
                "sample_end_position": sample_pos,
                "alignment_column": col_idx,
                "ref_sequence": r_char,
                "alt_sequence": s_char,
                "classification": sub_class.value,
                "hgvs_notation": hgvs,
                "local_hgvs": local_hgvs,
                "flank_ref": ref_context,
                "flank_sample": sample_context,
                "explanation": explanation,
                "coordinate_offset": coordinate_offset,
                "equivalent_representations": [{
                    "local_start": ref_pos,
                    "local_end": ref_pos,
                    "cds_start": cds_pos,
                    "cds_end": cds_pos,
                    "hgvs_coding": hgvs,
                    "local_hgvs": local_hgvs
                }]
            })
            i += 1
            continue

        # Case 3: Deletion (Reference has base, Sample has gap '-')
        if r_char != '-' and s_char == '-':
            del_start_ref = ref_pos
            del_chars = [r_char]
            del_cols = [col_idx]
            anchor_sample_pos = sample_pos

            # Group contiguous deletion columns
            j = i + 1
            while j < total_cols and aligned_ref[j] != '-' and aligned_sample[j] == '-':
                ref_pos += 1
                del_chars.append(aligned_ref[j])
                del_cols.append(j + 1)
                j += 1

            del_end_ref = ref_pos
            raw_deleted_seq = "".join(del_chars)
            del_len = len(raw_deleted_seq)

            start_flank = max(0, i - flank_size)
            end_flank = min(total_cols, j + flank_size)
            ref_context = aligned_ref[start_flank:end_flank].replace('-', '')
            sample_context = aligned_sample[start_flank:end_flank].replace('-', '')

            # HGVS 3'-normalization and equivalent window search
            if normalize_3prime:
                canon_del, equiv_list = find_equivalent_deletions(
                    unaligned_ref, unaligned_sample,
                    del_start_ref, del_end_ref,
                    coord_offset=coordinate_offset,
                    transcript_accession=transcript_accession
                )
                norm_del_start = canon_del["local_start"]
                norm_del_end = canon_del["local_end"]
                norm_deleted_seq = canon_del["deleted_sequence"]
                cds_del_start = canon_del["cds_start"]
                cds_del_end = canon_del["cds_end"]
                hgvs = canon_del["hgvs_coding"]
                local_hgvs = canon_del["local_hgvs"]
            else:
                norm_del_start = del_start_ref
                norm_del_end = del_end_ref
                norm_deleted_seq = raw_deleted_seq
                cds_del_start = del_start_ref + coordinate_offset
                cds_del_end = del_end_ref + coordinate_offset
                hgvs = (
                    f"{prefix}c.{cds_del_start}_{cds_del_end}del{raw_deleted_seq}"
                    if del_len > 1
                    else f"{prefix}c.{cds_del_start}del{raw_deleted_seq}"
                )
                local_hgvs = (
                    f"c.{del_start_ref}_{del_end_ref}del{raw_deleted_seq}"
                    if del_len > 1
                    else f"c.{del_start_ref}del{raw_deleted_seq}"
                )
                equiv_list = [{
                    "local_start": del_start_ref,
                    "local_end": del_end_ref,
                    "deleted_sequence": raw_deleted_seq,
                    "cds_start": cds_del_start,
                    "cds_end": cds_del_end,
                    "hgvs_coding": hgvs,
                    "local_hgvs": local_hgvs
                }]

            if del_len == 1:
                explanation = (
                    f"Single base deletion of '{norm_deleted_seq}' at coding position {cds_del_start} "
                    f"(local position {norm_del_start})."
                )
            else:
                explanation = (
                    f"Contiguous deletion of {del_len} bp ('{norm_deleted_seq}') spanning coding positions "
                    f"{cds_del_start} through {cds_del_end} (local positions {norm_del_start} through {norm_del_end})."
                )

            mutations.append({
                "type": MutationType.DELETION.value,
                "ref_position": norm_del_start,
                "ref_end_position": norm_del_end,
                "raw_ref_position": del_start_ref,
                "raw_ref_end_position": del_end_ref,
                "cds_position": cds_del_start,
                "cds_end_position": cds_del_end,
                "sample_position": anchor_sample_pos,
                "sample_end_position": anchor_sample_pos,
                "alignment_column": del_cols[0],
                "ref_sequence": norm_deleted_seq,
                "raw_ref_sequence": raw_deleted_seq,
                "alt_sequence": "-",
                "classification": f"DELETION_{del_len}BP",
                "hgvs_notation": hgvs,
                "local_hgvs": local_hgvs,
                "flank_ref": ref_context,
                "flank_sample": sample_context,
                "explanation": explanation,
                "coordinate_offset": coordinate_offset,
                "equivalent_representations": equiv_list
            })
            i = j
            continue

        # Case 4: Insertion (Reference has gap '-', Sample has base)
        if r_char == '-' and s_char != '-':
            ins_anchor_ref = ref_pos
            ins_start_sample = sample_pos
            ins_chars = [s_char]
            ins_cols = [col_idx]

            # Group contiguous insertion columns
            j = i + 1
            while j < total_cols and aligned_ref[j] == '-' and aligned_sample[j] != '-':
                sample_pos += 1
                ins_chars.append(aligned_sample[j])
                ins_cols.append(j + 1)
                j += 1

            ins_end_sample = sample_pos
            inserted_seq = "".join(ins_chars)
            ins_len = len(inserted_seq)
            cds_anchor = ins_anchor_ref + coordinate_offset

            if ins_anchor_ref == 0:
                hgvs = f"{prefix}c.0_1ins{inserted_seq}"
                local_hgvs = f"c.0_1ins{inserted_seq}"
                explanation = f"5'-terminal insertion of {ins_len} bp ('{inserted_seq}') before reference position 1."
            else:
                hgvs = f"{prefix}c.{cds_anchor}_{cds_anchor + 1}ins{inserted_seq}"
                local_hgvs = f"c.{ins_anchor_ref}_{ins_anchor_ref + 1}ins{inserted_seq}"
                explanation = (
                    f"Contiguous insertion of {ins_len} bp ('{inserted_seq}') inserted "
                    f"between coding positions {cds_anchor} and {cds_anchor + 1} "
                    f"(local positions {ins_anchor_ref} and {ins_anchor_ref + 1})."
                )

            start_flank = max(0, i - flank_size)
            end_flank = min(total_cols, j + flank_size)
            ref_context = aligned_ref[start_flank:end_flank].replace('-', '')
            sample_context = aligned_sample[start_flank:end_flank].replace('-', '')

            mutations.append({
                "type": MutationType.INSERTION.value,
                "ref_position": ins_anchor_ref,
                "ref_end_position": ins_anchor_ref,
                "cds_position": cds_anchor,
                "cds_end_position": cds_anchor,
                "sample_position": ins_start_sample,
                "sample_end_position": ins_end_sample,
                "alignment_column": ins_cols[0],
                "ref_sequence": "-",
                "alt_sequence": inserted_seq,
                "classification": f"INSERTION_{ins_len}BP",
                "hgvs_notation": hgvs,
                "local_hgvs": local_hgvs,
                "flank_ref": ref_context,
                "flank_sample": sample_context,
                "explanation": explanation,
                "coordinate_offset": coordinate_offset,
                "equivalent_representations": [{
                    "local_anchor": ins_anchor_ref,
                    "cds_anchor": cds_anchor,
                    "inserted_sequence": inserted_seq,
                    "hgvs_coding": hgvs,
                    "local_hgvs": local_hgvs
                }]
            })
            i = j
            continue

    return mutations


def detect_mutations(
    aligned_ref: str, 
    aligned_sample: str, 
    coordinate_offset: int = 0,
    transcript_accession: str = "",
    normalize_3prime: bool = True
) -> List[Dict[str, Any]]:
    """
    BioDNA API wrapper returning structured mutations matching MutationItem schema.
    """
    raw_mutations = detect_mutations_from_alignment(
        aligned_ref, 
        aligned_sample,
        coordinate_offset=coordinate_offset,
        transcript_accession=transcript_accession,
        normalize_3prime=normalize_3prime
    )
    formatted = []
    for m in raw_mutations:
        formatted.append({
            "position": m.get("cds_position", m["ref_position"]),
            "refPosition": m.get("cds_position", m["ref_position"]),
            "localPosition": m["ref_position"],
            "altPosition": m.get("sample_position"),
            "refBase": m["ref_sequence"],
            "altBase": m["alt_sequence"],
            "mutationType": m["type"],
            "subType": m.get("classification"),
            "hgvs": m.get("hgvs_notation", ""),
            "localHgvs": m.get("local_hgvs", ""),
            "description": m.get("explanation", ""),
            "flanking5Prime": m.get("flank_ref", "")[:5],
            "flanking3Prime": m.get("flank_ref", "")[-5:],
            "equivalentRepresentations": m.get("equivalent_representations", []),
            "coordinateOffset": m.get("coordinate_offset", 0)
        })
    return formatted
