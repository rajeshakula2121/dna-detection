"""
GenomicsAI — Standalone Bioinformatics Demonstration Script
For University Project Demonstrations & Google Colab Integration

Authoritative Scientific Sources:
- NCBI Nucleotide (RefSeq): NM_000518.5, NM_007294.4, NM_000492.4
- NCBI ClinVar: VCV000015147.16, VCV000017662.66, VCV000007105.15
- dbSNP: rs334, rs80357906, rs113993960
- Ensembl Genome Browser: ENSG00000244734, ENSG00000012048, ENSG00000001626

Algorithms Included:
1. Knuth-Morris-Pratt (KMP) exact pattern search with π (LPS) table construction
2. Boyer-Moore (BM) motif searching with Bad Character heuristic
3. Suffix Array & Kasai LCP construction for repetitive element & tandem repeat discovery
4. Needleman-Wunsch Dynamic Programming Global Sequence Alignment, Indel Grouping,
   HGVS 3'-Rule Normalization, and Equivalent Deletion Representation Discovery

Dataset:
- HBB: Normal (NM_000518.5:c.1..444) vs Sickle Cell Anemia (ClinVar 15147 / rs334 / c.20A>T)
- BRCA1: Normal Exon 2 (NM_007294.4:c.1..175) vs HBOC Frameshift (ClinVar 17662 / rs80357906 / c.68_69delAG)
- CFTR: Normal Exon 11 (NM_000492.4:c.1449..1554) vs Cystic Fibrosis (ClinVar 7105 / rs113993960 / c.1521_1523delCTT)
"""

import json
import os
import sys
from typing import List, Dict, Any, Tuple


# ==============================================================================
# 1. VERIFIED BENCHMARK DATASET (NCBI RefSeq & ClinVar Standard)
# ==============================================================================

BENCHMARK_GENES = {
    "HBB": {
        "gene_symbol": "HBB",
        "name": "Hemoglobin Subunit Beta",
        "organism": "Homo sapiens",
        "ref_accession": "NM_000518.5",
        "protein_accession": "NP_000509.1",
        "region": "Full Coding Sequence (CDS c.1..444)",
        "coord_offset": 0,
        "ref_seq": (
            "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGT"
            "GAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCT"
            "GATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCAC"
            "CTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTC"
            "AGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCC"
            "TATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA"
        ),
        "alt_name": "Sickle Cell Anemia Allele (HbS)",
        "clinvar_id": "15147",
        "clinvar_vcv": "VCV000015147.16",
        "dbsnp_rsid": "rs334",
        "hgvs_coding": "NM_000518.5:c.20A>T",
        "hgvs_protein": "NP_000509.1:p.Glu7Val",
        "clinical_condition": "Sickle Cell Disease / Sickle Cell Anemia",
        "alt_seq": (
            "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGT"
            "GAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCT"
            "GATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCAC"
            "CTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTC"
            "AGGCTCCTGGGCAACGTGCTGGTCTGTGTGCTGGCCCATCACTTTGGCAAAGAATTCACCCCACCAGTGCAGGCTGCC"
            "TATCAGAAAGTGGTGGCTGGTGTGGCTAATGCCCTGGCCCACAAGTATCACTAA"
        ),
        "target_motif": "CCTGTGGAG"  # Sickle allele specific motif harboring T at pos 20
    },
    "BRCA1": {
        "gene_symbol": "BRCA1",
        "name": "BRCA1 DNA Repair Associated",
        "organism": "Homo sapiens",
        "ref_accession": "NM_007294.4",
        "protein_accession": "NP_009225.1",
        "region": "Exon 2 (Coding Exon 1, c.1..175)",
        "coord_offset": 0,
        "ref_seq": (
            "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGACTGATTTTC"
            "AGGGTAAATGATGTGGTGAGAGCTTCAGTCACAGATTCAGTAAAATATACTCAGACATTTGGAGTATGCAAACAGCTAT"
            "ATACTAACCAGGAGAAG"
        ),
        "alt_name": "BRCA1 Frameshift Mutation (185delAG)",
        "clinvar_id": "17662",
        "clinvar_vcv": "VCV000017662.66",
        "dbsnp_rsid": "rs80357906",
        "hgvs_coding": "NM_007294.4:c.68_69delAG",
        "hgvs_protein": "NP_009225.1:p.Glu23ValfsTer17",
        "clinical_condition": "Hereditary Breast and Ovarian Cancer Syndrome (HBOC)",
        "alt_seq": (
            "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGACTGATTTTC"
            "AGGGTAAATGATGTGGTGAGAGCTTCAGTCACAGATTCAGTAAAATATACTCAGACATTTGGAGTATGCAAACAGCTAT"
            "ATACTAACCAGGAGAAG"
        ),
        "target_motif": "TCTTCGCGTT"
    },
    "CFTR": {
        "gene_symbol": "CFTR",
        "name": "CF Transmembrane Conductance Regulator",
        "organism": "Homo sapiens",
        "ref_accession": "NM_000492.4",
        "protein_accession": "NP_000483.3",
        "region": "Exon 11 Diagnostic Segment (c.1449..1554)",
        "coord_offset": 1448,  # Local position + 1448 = Coding DNA (c.) position
        "ref_seq": (
            "GCACATTGGAAGAATTTCATTCTGTTCTCAGTTTTCCTGGATTATGCCTGGCACCATTAAAGAAAATATCATCTTTGGT"
            "GTTTCCTATGATGAATATAGATACAGA"
        ),
        "alt_name": "CFTR Delta-F508 In-Frame Deletion",
        "clinvar_id": "7105",
        "clinvar_vcv": "VCV000007105.15",
        "dbsnp_rsid": "rs113993960",
        "hgvs_coding": "NM_000492.4:c.1521_1523delCTT",
        "hgvs_protein": "NP_000483.3:p.Phe508del",
        "clinical_condition": "Cystic Fibrosis (CF)",
        "alt_seq": (
            "GCACATTGGAAGAATTTCATTCTGTTCTCAGTTTTCCTGGATTATGCCTGGCACCATTAAAGAAAATATCATTGGTGTT"
            "TCCTATGATGAATATAGATACAGA"
        ),
        "target_motif": "ATCATTGGTG"
    }
}


# ==============================================================================
# 2. BIOINFORMATICS ALGORITHMS
# ==============================================================================

def compute_lps_table(pattern: str) -> List[int]:
    """Computes the Longest Proper Prefix which is also Suffix (LPS) table for KMP."""
    m = len(pattern)
    lps = [0] * m
    length = 0
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


def kmp_search(text: str, pattern: str) -> Dict[str, Any]:
    """Knuth-Morris-Pratt exact string matching algorithm. O(N + M) complexity."""
    n = len(text)
    m = len(pattern)
    if m == 0 or n == 0 or m > n:
        return {"matches": [], "occurrences": [], "count": 0, "comparisons": 0, "lps": []}

    lps = compute_lps_table(pattern)
    occurrences = []
    i = 0  # text index
    j = 0  # pattern index
    comparisons = 0

    while i < n:
        comparisons += 1
        if text[i] == pattern[j]:
            i += 1
            j += 1

        if j == m:
            start_0based = i - j
            occurrences.append({
                "start_0based": start_0based,
                "start_1based": start_0based + 1,
                "end_1based": i,
                "matched_text": text[start_0based:i]
            })
            j = lps[j - 1]
        elif i < n and text[i] != pattern[j]:
            if j != 0:
                j = lps[j - 1]
            else:
                i += 1

    return {
        "matches": [occ["start_0based"] for occ in occurrences],
        "occurrences": occurrences,
        "count": len(occurrences),
        "comparisons": comparisons,
        "lps": lps
    }


def build_bad_character_table(pattern: str) -> Dict[str, int]:
    """Precomputes rightmost occurrence of each nucleotide in pattern for Boyer-Moore."""
    m = len(pattern)
    table = {}
    for i in range(m):
        table[pattern[i]] = i
    return table


def boyer_moore_search(text: str, pattern: str) -> Dict[str, Any]:
    """Boyer-Moore pattern matching with Bad Character rule. O(N/M) average performance."""
    n = len(text)
    m = len(pattern)
    if m == 0 or n == 0 or m > n:
        return {"matches": [], "occurrences": [], "count": 0, "comparisons": 0, "bad_char_table": {}}

    bad_char = build_bad_character_table(pattern)
    occurrences = []
    comparisons = 0
    s = 0  # shift of pattern with respect to text

    while s <= (n - m):
        j = m - 1
        while j >= 0:
            comparisons += 1
            if pattern[j] == text[s + j]:
                j -= 1
            else:
                break

        if j < 0:
            occurrences.append({
                "start_0based": s,
                "start_1based": s + 1,
                "end_1based": s + m,
                "matched_text": text[s:s + m]
            })
            s += (m - bad_char.get(text[s + m], -1)) if (s + m < n) else 1
        else:
            mismatched_char = text[s + j]
            last_occurrence = bad_char.get(mismatched_char, -1)
            s += max(1, j - last_occurrence)

    return {
        "matches": [occ["start_0based"] for occ in occurrences],
        "occurrences": occurrences,
        "count": len(occurrences),
        "comparisons": comparisons,
        "bad_char_table": bad_char
    }


def build_suffix_array(text: str) -> List[int]:
    """Constructs lexicographically sorted Suffix Array for a sequence."""
    suffixes = [(text[i:], i) for i in range(len(text))]
    suffixes.sort(key=lambda x: x[0])
    return [suffix[1] for suffix in suffixes]


def kasai_lcp(text: str, sa: List[int]) -> List[int]:
    """Constructs Longest Common Prefix (LCP) array in linear time using Kasai's algorithm."""
    n = len(text)
    rank = [0] * n
    lcp = [0] * n

    for i in range(n):
        rank[sa[i]] = i

    k = 0
    for i in range(n):
        if rank[i] == 0:
            k = 0
            continue
        j = sa[rank[i] - 1]
        while i + k < n and j + k < n and text[i + k] == text[j + k]:
            k += 1
        lcp[rank[i]] = k
        if k > 0:
            k -= 1
    return lcp


def find_repeated_sequences(sequence: str, min_repeat_len: int = 6) -> Dict[str, Any]:
    """Finds repeated DNA sequence motifs and Longest Repeated Substring (LRS)."""
    sa = build_suffix_array(sequence)
    lcp = kasai_lcp(sequence, sa)
    repeats = []
    seen = set()

    for i in range(1, len(lcp)):
        length = lcp[i]
        if length >= min_repeat_len:
            motif = sequence[sa[i]:sa[i] + length]
            if motif not in seen:
                seen.add(motif)
                pos1 = sa[i - 1]
                pos2 = sa[i]
                repeats.append({
                    "motif": motif,
                    "length": length,
                    "positions": sorted([pos1 + 1, pos2 + 1])
                })

    repeats.sort(key=lambda x: x["length"], reverse=True)
    lrs = repeats[0] if repeats else None

    return {
        "suffix_array_sample": sa[:10],
        "lcp_sample": lcp[:10],
        "total_repeats_found": len(repeats),
        "longest_repeated_substring": lrs,
        "repeats": repeats[:5]
    }


def find_equivalent_deletions(
    unaligned_ref: str,
    unaligned_alt: str,
    raw_start: int,
    raw_end: int,
    coord_offset: int = 0,
    transcript_accession: str = ""
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Explores sliding windows around a deletion to find all coordinate representations
    that produce the identical mutant sequence. Canonicalizes according to the HGVS 3'-rule.
    """
    k = raw_end - raw_start + 1
    n = len(unaligned_ref)
    prefix = f"{transcript_accession}:" if transcript_accession else ""

    # Shift left to find left-most equivalent boundary
    s = raw_start
    e = raw_end
    while s > 1:
        if unaligned_ref[s - 2] == unaligned_ref[e - 1]:
            s -= 1
            e -= 1
        else:
            break

    equivs = []
    while e <= n:
        cand_alt = unaligned_ref[:s - 1] + unaligned_ref[e:]
        if cand_alt == unaligned_alt:
            cur_del = unaligned_ref[s - 1:e]
            cds_s = s + coord_offset
            cds_e = e + coord_offset
            hgvs = f"{prefix}c.{cds_s}_{cds_e}del{cur_del}" if k > 1 else f"{prefix}c.{cds_s}del{cur_del}"
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
        cds_s = raw_start + coord_offset
        cds_e = raw_end + coord_offset
        cur_del = unaligned_ref[raw_start - 1:raw_end]
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

    # HGVS 3'-rule selection
    raw_del = unaligned_ref[raw_start - 1:raw_end]
    matching = [x for x in equivs if x["deleted_sequence"] == raw_del]
    canonical = matching[-1] if len(matching) > 1 else equivs[-1]
    return canonical, equivs


def needleman_wunsch(
    ref: str,
    alt: str,
    match_score: int = 2,
    mismatch_penalty: int = -1,
    gap_penalty: int = -2,
    coord_offset: int = 0,
    transcript_accession: str = "",
    normalize_3prime: bool = True
) -> Dict[str, Any]:
    """
    Optimal Dynamic Programming Global Sequence Alignment (Needleman-Wunsch).
    Calculates alignment matrix, score, traceback, contiguous indel grouping,
    HGVS 3'-normalization, and coordinate offset mapping.
    """
    n = len(ref)
    m = len(alt)

    # Initialize (n+1) x (m+1) scoring grid
    dp = [[0] * (m + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        dp[i][0] = dp[i - 1][0] + gap_penalty
    for j in range(1, m + 1):
        dp[0][j] = dp[0][j - 1] + gap_penalty

    # Matrix fill
    for i in range(1, n + 1):
        r = ref[i - 1]
        for j in range(1, m + 1):
            a = alt[j - 1]
            match = dp[i - 1][j - 1] + (match_score if r == a else mismatch_penalty)
            delete = dp[i - 1][j] + gap_penalty
            insert = dp[i][j - 1] + gap_penalty
            dp[i][j] = max(match, delete, insert)

    # Traceback
    aligned_ref = []
    aligned_alt = []
    i = n
    j = m

    while i > 0 or j > 0:
        score = dp[i][j]
        r = ref[i - 1] if i > 0 else None
        a = alt[j - 1] if j > 0 else None

        if i > 0 and j > 0 and score == dp[i - 1][j - 1] + (match_score if r == a else mismatch_penalty):
            aligned_ref.append(ref[i - 1])
            aligned_alt.append(alt[j - 1])
            i -= 1
            j -= 1
        elif i > 0 and score == dp[i - 1][j] + gap_penalty:
            aligned_ref.append(ref[i - 1])
            aligned_alt.append('-')
            i -= 1
        else:
            aligned_ref.append('-')
            aligned_alt.append(alt[j - 1])
            j -= 1

    aligned_ref = "".join(reversed(aligned_ref))
    aligned_alt = "".join(reversed(aligned_alt))

    prefix = f"{transcript_accession}:" if transcript_accession else ""

    # Variant Calling & Statistics
    matches = 0
    mismatches = 0
    gaps = 0
    mutations = []

    ref_pos = 0
    alt_pos = 0

    idx = 0
    total_cols = len(aligned_ref)

    while idx < total_cols:
        r = aligned_ref[idx]
        a = aligned_alt[idx]

        if r != '-':
            ref_pos += 1
        if a != '-':
            alt_pos += 1

        if r == a:
            matches += 1
            idx += 1
        elif r != '-' and a != '-':
            mismatches += 1
            # SNV / Substitution
            sub_type = "TRANSITION" if (r, a) in [("A", "G"), ("G", "A"), ("C", "T"), ("T", "C")] else "TRANSVERSION"
            cds_pos = ref_pos + coord_offset
            mutations.append({
                "type": "SUBSTITUTION",
                "sub_type": sub_type,
                "local_position": ref_pos,
                "cds_position": cds_pos,
                "ref_base": r,
                "alt_base": a,
                "hgvs": f"{prefix}c.{cds_pos}{r}>{a}",
                "local_hgvs": f"c.{ref_pos}{r}>{a}",
                "equivalent_representations": []
            })
            idx += 1
        elif r != '-' and a == '-':
            # Group contiguous deletion columns
            del_start_ref = ref_pos
            del_chars = [r]
            gaps += 1
            k = idx + 1
            while k < total_cols and aligned_ref[k] != '-' and aligned_alt[k] == '-':
                ref_pos += 1
                del_chars.append(aligned_ref[k])
                gaps += 1
                k += 1
            raw_del_seq = "".join(del_chars)
            del_len = len(raw_del_seq)
            del_end_ref = ref_pos

            if normalize_3prime:
                canon_del, equiv_list = find_equivalent_deletions(
                    ref, alt,
                    del_start_ref, del_end_ref,
                    coord_offset=coord_offset,
                    transcript_accession=transcript_accession
                )
                final_local_start = canon_del["local_start"]
                final_local_end = canon_del["local_end"]
                final_del_seq = canon_del["deleted_sequence"]
                final_cds_start = canon_del["cds_start"]
                final_cds_end = canon_del["cds_end"]
                hgvs = canon_del["hgvs_coding"]
                local_hgvs = canon_del["local_hgvs"]
            else:
                final_local_start = del_start_ref
                final_local_end = del_end_ref
                final_del_seq = raw_del_seq
                final_cds_start = del_start_ref + coord_offset
                final_cds_end = del_end_ref + coord_offset
                hgvs = f"{prefix}c.{final_cds_start}_{final_cds_end}del{raw_del_seq}" if del_len > 1 else f"{prefix}c.{final_cds_start}del{raw_del_seq}"
                local_hgvs = f"c.{del_start_ref}_{del_end_ref}del{raw_del_seq}" if del_len > 1 else f"c.{del_start_ref}del{raw_del_seq}"
                equiv_list = [{
                    "local_start": del_start_ref,
                    "local_end": del_end_ref,
                    "deleted_sequence": raw_del_seq,
                    "cds_start": final_cds_start,
                    "cds_end": final_cds_end,
                    "hgvs_coding": hgvs,
                    "local_hgvs": local_hgvs
                }]

            mutations.append({
                "type": "DELETION",
                "sub_type": f"{del_len}bp deletion",
                "local_position": final_local_start,
                "local_end_position": final_local_end,
                "raw_local_position": del_start_ref,
                "raw_local_end_position": del_end_ref,
                "cds_position": final_cds_start,
                "cds_end_position": final_cds_end,
                "ref_base": final_del_seq,
                "raw_ref_base": raw_del_seq,
                "alt_base": "-",
                "hgvs": hgvs,
                "local_hgvs": local_hgvs,
                "equivalent_representations": equiv_list
            })
            idx = k
        else:
            # Insertion in sample (r == '-' and a != '-')
            ins_start = ref_pos
            ins_chars = [a]
            gaps += 1
            k = idx + 1
            while k < total_cols and aligned_ref[k] == '-' and aligned_alt[k] != '-':
                alt_pos += 1
                ins_chars.append(aligned_alt[k])
                gaps += 1
                k += 1
            ins_seq = "".join(ins_chars)
            cds_anchor = ins_start + coord_offset
            hgvs = f"{prefix}c.{cds_anchor}_{cds_anchor+1}ins{ins_seq}"
            mutations.append({
                "type": "INSERTION",
                "sub_type": f"{len(ins_seq)}bp insertion",
                "local_position": ins_start,
                "cds_position": cds_anchor,
                "ref_base": "-",
                "alt_base": ins_seq,
                "hgvs": hgvs,
                "local_hgvs": f"c.{ins_start}_{ins_start+1}ins{ins_seq}",
                "equivalent_representations": []
            })
            idx = k

    identity = round((matches / total_cols) * 100, 2)

    return {
        "score": dp[n][m],
        "identity_pct": identity,
        "matches": matches,
        "mismatches": mismatches,
        "gaps": gaps,
        "aligned_ref": aligned_ref,
        "aligned_alt": aligned_alt,
        "mutations": mutations
    }


# ==============================================================================
# 3. INTERACTIVE CLI RUNNER / DEMONSTRATION
# ==============================================================================

def run_bioinformatics_demonstration():
    print("=" * 80)
    print(" SMART BIOINFORMATICS APPLICATION — SCIENTIFIC BENCHMARK DEMONSTRATION")
    print("=" * 80)
    print("Authoritative Sources: NCBI Nucleotide (RefSeq), NCBI ClinVar, Ensembl, dbSNP")
    print("Evaluated Genes: HBB (Sickle Cell), BRCA1 (HBOC), CFTR (Cystic Fibrosis)")
    print("Note: Deterministic string matching for educational benchmarking;")
    print("      distinct from clinical interpretation or ML diagnostic models.")
    print()

    for gene_key, gene in BENCHMARK_GENES.items():
        print("-" * 80)
        print(f"GENE: {gene['gene_symbol']} — {gene['name']} ({gene['organism']})")
        print(f"Region: {gene['region']} | Ref Accession: {gene['ref_accession']} ({len(gene['ref_seq'])} bp)")
        print(f"Target Variant: {gene['alt_name']} | ClinVar: {gene['clinvar_id']} ({gene['clinvar_vcv']})")
        print(f"Associated Phenotype: {gene['clinical_condition']}")
        print(f"Verified Canonical HGVS: {gene['hgvs_coding']} ({gene['hgvs_protein']})")
        print("-" * 80)

        # 1. Knuth-Morris-Pratt Search
        motif = gene['target_motif']
        kmp_res = kmp_search(gene['alt_seq'], motif)
        print(f"\n[Algorithm 1: Knuth-Morris-Pratt (KMP)]")
        print(f"  Searching for diagnostic motif: '{motif}' ({len(motif)} bp)")
        print(f"  Computed LPS (pi) table: {kmp_res['lps']}")
        print(f"  Matches found: {kmp_res['count']}, Character comparisons: {kmp_res['comparisons']}")
        for m in kmp_res['occurrences']:
            print(f"  -> Found at 1-based coordinate: {m['start_1based']}..{m['end_1based']} ('{m['matched_text']}')")

        # 2. Boyer-Moore Search
        bm_res = boyer_moore_search(gene['alt_seq'], motif)
        print(f"\n[Algorithm 2: Boyer-Moore (BM)]")
        print(f"  Bad Character Jump Table: {bm_res['bad_char_table']}")
        print(f"  Matches found: {bm_res['count']}, Character comparisons: {bm_res['comparisons']}")
        print(f"  Efficiency ratio (BM comps / KMP comps): {bm_res['comparisons'] / max(1, kmp_res['comparisons']):.2f}")

        # 3. Suffix Array & Kasai LCP
        repeat_res = find_repeated_sequences(gene['ref_seq'], min_repeat_len=5)
        print(f"\n[Algorithm 3: Suffix Array & Kasai LCP]")
        print(f"  Total repetitive elements identified (>=5 bp): {repeat_res['total_repeats_found']}")
        if repeat_res['longest_repeated_substring']:
            lrs = repeat_res['longest_repeated_substring']
            print(f"  Longest Repeated Substring (LRS): '{lrs['motif']}' (length {lrs['length']} bp) at positions {lrs['positions']}")

        # 4. Global Alignment & Variant Calling (Needleman-Wunsch)
        print(f"\n[Algorithm 4: Needleman-Wunsch Global Alignment & HGVS Normalization]")
        aln = needleman_wunsch(
            gene['ref_seq'],
            gene['alt_seq'],
            match_score=2,
            mismatch_penalty=-1,
            gap_penalty=-2,
            coord_offset=gene['coord_offset'],
            transcript_accession=gene['ref_accession'],
            normalize_3prime=True
        )
        print(f"  Alignment Score: {aln['score']}")
        print(f"  Sequence Identity: {aln['identity_pct']}%")
        print(f"  Matches: {aln['matches']} | Mismatches: {aln['mismatches']} | Gaps: {aln['gaps']}")
        print(f"  Mutations Detected: {len(aln['mutations'])}")
        for mut in aln['mutations']:
            print(f"  ==> Detected HGVS: {mut['hgvs']} [{mut['type']} | {mut['sub_type']}]")
            print(f"      Coding Position: c.{mut['cds_position']} (Local: {mut['local_position']})")
            if mut.get("equivalent_representations") and len(mut["equivalent_representations"]) > 1:
                print(f"      Equivalent Deletion Windows (HGVS 3'-normalization applied):")
                for eq in mut["equivalent_representations"]:
                    print(f"        - {eq['hgvs_coding']} (local {eq['local_start']}..{eq['local_end']} del{eq['deleted_sequence']})")

        # Display window around the mutation
        mut_pos = aln['mutations'][0]['local_position'] if aln['mutations'] else 20
        win_start = max(0, mut_pos - 15)
        win_end = min(len(aln['aligned_ref']), mut_pos + 15)
        print(f"\n  Alignment Window (pos {win_start+1}..{win_end}):")
        print(f"  Ref:  {aln['aligned_ref'][win_start:win_end]}")
        match_bar = "".join("|" if aln['aligned_ref'][k] == aln['aligned_alt'][k] else (" " if '-' in (aln['aligned_ref'][k], aln['aligned_alt'][k]) else ".") for k in range(win_start, win_end))
        print(f"        {match_bar}")
        print(f"  Alt:  {aln['aligned_alt'][win_start:win_end]}")
        print("\n")


if __name__ == "__main__":
    run_bioinformatics_demonstration()
