"""
Test suite for Verified Genomics Dataset (HBB, BRCA1, CFTR)
Verifies:
1. Dataset file integrity and RefSeq/ClinVar metadata accuracy.
2. Pairwise Needleman-Wunsch dynamic programming alignment and mutation calling.
3. Actual sequence changes, reconstruction of mutant alleles, and coordinate mapping.
4. Contiguous indel grouping, HGVS 3'-normalization, and equivalent deletion representations.
5. Negative tests: non-homologous sequences, corrupted bases, and non-equivalent deletions.
6. KMP, Boyer-Moore, and Suffix Array pattern matching on verified sequences.
7. SQLite database seeding and sample retrieval.
"""

import json
import os
import pytest
from app.engine.alignment import needleman_wunsch
from app.engine.mutations import detect_mutations_from_alignment, find_equivalent_deletions, MutationType
from app.engine.validation import validate_dna_sequence
from app.engine.kmp import kmp_search
from app.engine.boyer_moore import boyer_moore_search
from app.engine.suffix_array import suffix_array_repeat_analysis
from app.database.db import DatabaseManager, get_connection

DATASET_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "dataset", "verified_genomics_dataset.json")


def test_dataset_json_structure_and_accessions():
    """Verify that dataset/verified_genomics_dataset.json exists and contains all required scientific metadata."""
    assert os.path.exists(DATASET_PATH), f"Dataset file not found at {DATASET_PATH}"
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    genes = {g["gene_symbol"]: g for g in data["genes"]}
    assert "HBB" in genes
    assert "BRCA1" in genes
    assert "CFTR" in genes

    # HBB
    hbb = genes["HBB"]
    assert hbb["reference"]["accession"] == "NM_000518.5"
    assert hbb["reference"]["length_bp"] == 444
    assert len(hbb["reference"]["sequence"]) == 444
    assert hbb["reference"]["coordinate_offset_to_cds"] == 0
    assert hbb["verified_variant"]["clinvar_variation_id"] == "15147"
    assert hbb["verified_variant"]["dbsnp_rsid"] == "rs334"
    assert hbb["verified_variant"]["hgvs_coding"] == "NM_000518.5:c.20A>T"
    assert hbb["verified_variant"]["mutation_type"] == "SUBSTITUTION"

    # BRCA1
    brca1 = genes["BRCA1"]
    assert brca1["reference"]["accession"] == "NM_007294.4"
    assert brca1["reference"]["length_bp"] == 175
    assert len(brca1["reference"]["sequence"]) == 175
    assert brca1["reference"]["coordinate_offset_to_cds"] == 0
    assert brca1["verified_variant"]["clinvar_variation_id"] == "17662"
    assert brca1["verified_variant"]["dbsnp_rsid"] == "rs80357906"
    assert brca1["verified_variant"]["hgvs_coding"] == "NM_007294.4:c.68_69del"
    assert brca1["verified_variant"]["mutation_type"] == "DELETION"

    # CFTR
    cftr = genes["CFTR"]
    assert cftr["reference"]["accession"] == "NM_000492.4"
    assert cftr["reference"]["length_bp"] == 106
    assert len(cftr["reference"]["sequence"]) == 106
    assert cftr["reference"]["coordinate_offset_to_cds"] == 1448
    assert cftr["verified_variant"]["clinvar_variation_id"] == "7105"
    assert cftr["verified_variant"]["dbsnp_rsid"] == "rs113993960"
    assert cftr["verified_variant"]["hgvs_coding"] == "NM_000492.4:c.1521_1523del"
    assert cftr["verified_variant"]["mutation_type"] == "DELETION"


def test_hbb_sickle_cell_alignment_and_variant_calling():
    """Verify Needleman-Wunsch pairwise alignment and variant calling for HBB Sickle Cell (c.20A>T)."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    hbb = [g for g in data["genes"] if g["gene_symbol"] == "HBB"][0]
    ref_seq = hbb["reference"]["sequence"]
    alt_seq = hbb["verified_variant"]["sequence"]

    aln = needleman_wunsch(ref_seq, alt_seq)
    assert aln["gaps"] == 0
    assert aln["mismatches"] == 1
    assert aln["identity_percentage"] > 99.5

    muts = detect_mutations_from_alignment(aln["ref_aligned"], aln["sample_aligned"], coordinate_offset=0, transcript_accession="NM_000518.5")
    assert len(muts) == 1
    m = muts[0]
    assert m["type"] == MutationType.SUBSTITUTION.value
    assert m["ref_position"] == 20
    assert m["cds_position"] == 20
    assert m["ref_sequence"] == "A"
    assert m["alt_sequence"] == "T"
    assert m["classification"] == "TRANSVERSION"
    assert m["hgvs_notation"] == "NM_000518.5:c.20A>T"
    assert m["local_hgvs"] == "c.20A>T"

    # Biological sequence reconstruction test: applying substitution reconstructs exact mutant sequence
    reconstructed = list(ref_seq)
    reconstructed[m["ref_position"] - 1] = m["alt_sequence"]
    assert "".join(reconstructed) == alt_seq


def test_brca1_hboc_alignment_and_variant_calling():
    """Verify Needleman-Wunsch pairwise alignment and variant calling for BRCA1 Frameshift deletion."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    brca1 = [g for g in data["genes"] if g["gene_symbol"] == "BRCA1"][0]
    ref_seq = brca1["reference"]["sequence"]
    alt_seq = brca1["verified_variant"]["sequence"]

    aln = needleman_wunsch(ref_seq, alt_seq)
    assert aln["gaps"] == 2
    assert aln["mismatches"] == 0

    muts = detect_mutations_from_alignment(aln["ref_aligned"], aln["sample_aligned"], coordinate_offset=0, transcript_accession="NM_007294.4")
    assert len(muts) == 1
    m = muts[0]
    assert m["type"] == MutationType.DELETION.value
    assert m["classification"] == "DELETION_2BP"
    assert len(m["ref_sequence"]) == 2
    assert m["ref_sequence"] == "AG"

    # HGVS 3'-normalization: raw alignment gives c.66_67delAG, normalized gives c.68_69delAG
    assert m["raw_ref_position"] == 66
    assert m["raw_ref_end_position"] == 67
    assert m["ref_position"] == 68
    assert m["ref_end_position"] == 69
    assert m["cds_position"] == 68
    assert m["cds_end_position"] == 69
    assert m["hgvs_notation"] == "NM_007294.4:c.68_69delAG"
    assert m["local_hgvs"] == "c.68_69delAG"

    # Sequence reconstruction: deleting canonical 68..69 OR raw 66..67 from ref produces alt_seq
    del_canon = ref_seq[:67] + ref_seq[69:]
    del_raw = ref_seq[:65] + ref_seq[67:]
    assert del_canon == alt_seq
    assert del_raw == alt_seq


def test_cftr_delta_f508_alignment_and_variant_calling():
    """Verify Needleman-Wunsch pairwise alignment and variant calling for CFTR Delta-F508 3bp deletion."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    cftr = [g for g in data["genes"] if g["gene_symbol"] == "CFTR"][0]
    ref_seq = cftr["reference"]["sequence"]
    alt_seq = cftr["verified_variant"]["sequence"]

    aln = needleman_wunsch(ref_seq, alt_seq)
    assert aln["gaps"] == 3
    assert aln["mismatches"] == 0

    # Passing coordinate_offset=1448 transforms local 73..75 to cDNA c.1521..1523
    muts = detect_mutations_from_alignment(aln["ref_aligned"], aln["sample_aligned"], coordinate_offset=1448, transcript_accession="NM_000492.4")
    assert len(muts) == 1
    m = muts[0]
    assert m["type"] == MutationType.DELETION.value
    assert m["classification"] == "DELETION_3BP"
    assert len(m["ref_sequence"]) == 3

    # Local coordinates: raw is 72..74 (TCT), normalized is 73..75 (CTT)
    assert m["raw_ref_position"] == 72
    assert m["raw_ref_end_position"] == 74
    assert m["ref_position"] == 73
    assert m["ref_end_position"] == 75

    # Coding sequence coordinates: 73 + 1448 = 1521, 75 + 1448 = 1523
    assert m["cds_position"] == 1521
    assert m["cds_end_position"] == 1523
    assert m["hgvs_notation"] == "NM_000492.4:c.1521_1523delCTT"
    assert m["local_hgvs"] == "c.73_75delCTT"

    # Equivalent representations list verification
    equiv_notations = [e["hgvs_coding"] for e in m["equivalent_representations"]]
    assert "NM_000492.4:c.1520_1522delTCT" in equiv_notations
    assert "NM_000492.4:c.1521_1523delCTT" in equiv_notations


def test_equivalent_deletion_proofs_and_biological_invalidation():
    """
    Scientifically proves equivalent deletion representations for CFTR and BRCA1,
    and proves that candidate deletions which change codon identity (e.g. delTTT) are biologically invalid.
    """
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    genes = {g["gene_symbol"]: g for g in data["genes"]}

    # CFTR local context: 70..81 is 'ATCATCTTTGGT'
    # cDNA coordinates: 1518..1529
    ref = genes["CFTR"]["reference"]["sequence"]
    alt = genes["CFTR"]["verified_variant"]["sequence"]

    # 1. Deleting TCT at local 72..74 (c.1520_1522delTCT)
    cand_tct = ref[:71] + ref[74:]
    assert cand_tct == alt, "Candidate c.1520_1522delTCT must produce the exact patient sequence"

    # 2. Deleting CTT at local 73..75 (c.1521_1523delCTT)
    cand_ctt = ref[:72] + ref[75:]
    assert cand_ctt == alt, "Candidate c.1521_1523delCTT must produce the exact patient sequence"

    # 3. Candidate deletion of TTT at local 74..76 (c.1522_1524delTTT)
    # This leaves ATCATCGGT (isoleucine + isoleucine + glycine) instead of ATCATTGGT (isoleucine + isoleucine + valine)
    cand_ttt = ref[:73] + ref[76:]
    assert cand_ttt != alt, "Candidate c.1522_1524delTTT is biologically INVALID and must NOT match the patient allele"


def test_negative_cases_mismatched_reference_and_corrupted_inputs():
    """Negative tests: non-homologous references, corrupted sequences, and coordinate offsets."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    genes = {g["gene_symbol"]: g for g in data["genes"]}

    hbb_ref = genes["HBB"]["reference"]["sequence"]
    brca1_ref = genes["BRCA1"]["reference"]["sequence"]
    cftr_alt = genes["CFTR"]["verified_variant"]["sequence"]

    # 1. Non-homologous sequence alignment yields low identity (< 55%)
    aln_diff = needleman_wunsch(hbb_ref, brca1_ref)
    assert aln_diff["identity_percentage"] < 55.0, "Non-homologous genes must have low alignment identity"

    # 2. Aligning CFTR mutant against HBB reference fails homology (< 55% identity)
    aln_mismatch = needleman_wunsch(hbb_ref, cftr_alt)
    assert aln_mismatch["identity_percentage"] < 55.0

    # 3. Corrupted DNA sequence with non-IUPAC characters is rejected by validator
    is_valid, cleaned, err, invalid_chars = validate_dna_sequence("ATGCXYZ123!@#")
    assert not is_valid
    assert len(invalid_chars) > 0

    # 4. Impact of coordinate offset: omitting offset for CFTR leaves local coordinates
    aln_cftr = needleman_wunsch(genes["CFTR"]["reference"]["sequence"], cftr_alt)
    muts_no_offset = detect_mutations_from_alignment(aln_cftr["ref_aligned"], aln_cftr["sample_aligned"], coordinate_offset=0)
    assert muts_no_offset[0]["cds_position"] == 73, "Without offset, cds_position must equal local position"


def test_pattern_algorithms_on_hbb_sickle_motif():
    """Verify KMP, Boyer-Moore, and Suffix Array on the diagnostic HBB sickle cell motif."""
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    hbb_alt = [g for g in data["genes"] if g["gene_symbol"] == "HBB"][0]["verified_variant"]["sequence"]
    motif = "CCTGTGGAG"

    # 1. KMP Search
    kmp_matches = kmp_search(hbb_alt, motif)
    assert len(kmp_matches) >= 1
    assert kmp_matches[0]["start"] == 16
    assert kmp_matches[0]["end"] == 24

    # 2. Boyer-Moore Search
    bm_res = boyer_moore_search(hbb_alt, motif)
    assert bm_res["totalMatches"] >= 1
    assert bm_res["matches"][0]["startCoordinate"] == 16
    assert bm_res["comparisonsCount"] > 0

    # 3. Suffix Array & Kasai LCP
    repeat_res = suffix_array_repeat_analysis(hbb_alt, min_repeat_length=6)
    assert repeat_res["totalRepeatsFound"] > 0
    assert repeat_res["longestRepeatedSubstring"] is not None


def test_database_seeding_contains_all_verified_benchmarks():
    """Verify that DatabaseManager seeds and retrieves all verified human gene benchmarks."""
    db = DatabaseManager()
    db.init_db()

    samples = {s["id"]: s for s in db.get_samples()}
    expected_ids = [
        "sample-hbb-ref-001",
        "sample-hbb-sickle-002",
        "sample-brca1-ref-003",
        "sample-brca1-mut-004",
        "sample-cftr-ref-005",
        "sample-cftr-mut-006",
    ]
    for exp_id in expected_ids:
        assert exp_id in samples, f"Missing benchmark sample {exp_id} in database"
        assert len(samples[exp_id]["sequence"]) > 50
