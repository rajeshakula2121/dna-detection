"""
Comprehensive Automated Tests for FASTA Parser, Benchmarks, Ad-Hoc Reports, and Real Runtimes
Verifies multi-record FASTA files, IUPAC support, algorithm performance measurements,
and PDF/CSV report generation endpoints.
"""

import pytest
from app.engine.fasta_parser import parse_fasta_string, sanitize_record_identifier
from app.engine.pattern_analysis import analyze_dna_pattern
from app.api.platform_endpoints import (
    parse_fasta_endpoint,
    get_benchmarks_endpoint,
    generate_report_endpoint
)
from app.models.schemas import FastaParseRequest, GenerateReportRequest


def test_fasta_parser_single_record():
    """Test parsing of a clean single-record canonical FASTA file."""
    fasta_text = ">seq1 Human Beta Globin Exon\nATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCC\n"
    records = parse_fasta_string(fasta_text)
    assert len(records) == 1
    rec = records[0]
    assert rec["id"] == "seq1"
    assert rec["length"] == 42
    assert rec["isValidDna"] is True
    assert rec["hasAmbiguous"] is False
    assert rec["counts"]["A"] == 8
    assert rec["counts"]["T"] == 10
    assert rec["counts"]["C"] == 12
    assert rec["counts"]["G"] == 12


def test_fasta_parser_multi_record_and_headers():
    """Test parsing multiple records within one FASTA stream."""
    multi_fasta = (
        ">gene_A Homo sapiens\nATGCGATCGATC\n"
        ">gene_B Mus musculus\nTTTTGGGGCCCCAAAA\n"
        ">gene_C Danio rerio\nGCGCGCGCGCGC\n"
    )
    records = parse_fasta_string(multi_fasta)
    assert len(records) == 3
    assert records[0]["id"] == "gene_A"
    assert records[0]["length"] == 12
    assert records[1]["id"] == "gene_B"
    assert records[1]["length"] == 16
    assert records[2]["id"] == "gene_C"
    assert records[2]["gcContent"] == 100.0


def test_fasta_parser_iupac_ambiguity_codes():
    """Test IUPAC ambiguous base symbols (R, Y, S, W, K, M, B, D, H, V, N)."""
    iupac_fasta = ">iupac_test Degenerate primers\nATGCRYWSKMBDHVN\n"
    records = parse_fasta_string(iupac_fasta)
    assert len(records) == 1
    rec = records[0]
    assert rec["isValidDna"] is True
    assert rec["hasAmbiguous"] is True
    assert len(rec["ambiguousCounts"]) > 0
    assert rec["length"] == 15


def test_fasta_parser_invalid_characters():
    """Test that non-IUPAC characters (numbers, symbols, protein letters) fail validation."""
    invalid_fasta = ">invalid_rec Broken sequence\nATGC123ZXQ!@#\n"
    records = parse_fasta_string(invalid_fasta)
    assert len(records) == 1
    rec = records[0]
    assert rec["isValidDna"] is False
    assert len(rec["invalidCharacters"]) > 0


def test_fasta_parser_sanitizer():
    """Verify security sanitizer prevents directory traversal or illegal characters in IDs."""
    dirty_header = "../../../etc/passwd; DROP TABLE; seq"
    clean_id = sanitize_record_identifier(dirty_header)
    assert "/" not in clean_id
    assert "\\" not in clean_id
    assert ";" not in clean_id
    assert ".." not in clean_id


def test_api_fasta_parse_endpoint():
    """Test POST /api/fasta/parse with valid FASTA payload."""
    req = FastaParseRequest(fasta_text=">HBB_Ref\nATGGTGCACCTGACTCCTGAGGAGAAGTCT\n")
    data = parse_fasta_endpoint(req)
    assert len(data) == 1
    assert data[0]["id"] == "HBB_Ref"
    assert data[0]["length"] == 30


def test_api_benchmarks_endpoint():
    """Test GET /api/benchmarks returns verified HBB, BRCA1, and CFTR benchmarks."""
    benchmarks = get_benchmarks_endpoint()
    assert len(benchmarks) == 3
    gene_symbols = [b["gene_symbol"] for b in benchmarks]
    assert "HBB" in gene_symbols
    assert "BRCA1" in gene_symbols
    assert "CFTR" in gene_symbols


def test_pattern_analysis_measured_runtimes():
    """Verify that pattern analysis measures and reports real execution runtimes without fabrication."""
    seq = "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGG"
    result = analyze_dna_pattern(seq, motif_pattern="CCTG")
    
    assert "benchmark" in result
    benchmark = result["benchmark"]
    assert len(benchmark) == 5
    
    alg_names = [b["algorithm"] for b in benchmark]
    assert "Knuth-Morris-Pratt (KMP)" in alg_names
    assert "Boyer-Moore (BM)" in alg_names
    assert "Suffix Array & Kasai LCP" in alg_names
    assert "K-mer Distribution & Shannon Entropy" in alg_names
    assert "Six-Frame Translation & ORF Detection" in alg_names

    for b in benchmark:
        assert isinstance(b["executionTimeMs"], (int, float))
        assert b["executionTimeMs"] >= 0.0
        assert "purpose" in b and len(b["purpose"]) > 5
        assert "timeComplexity" in b
        assert "limitations" in b


def test_ad_hoc_csv_report_generation():
    """Test POST /api/reports/generate produces valid CSV with standard columns."""
    sample_analysis = {
        "title": "HBB Mutation Analysis",
        "queryName": "Sickle Cell Test Sample",
        "referenceName": "NM_000518.5 Standard",
        "referenceAccession": "NM_000518.5",
        "alignment": {
            "queryName": "Sickle Cell Test Sample",
            "referenceName": "NM_000518.5 Standard",
            "score": 150,
            "identity": 98.5,
            "refAligned": "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCC",
            "altAligned": "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCC",
            "matchString": "|||||||||||||||||||.||||||||||||||||||||||",
            "mutations": [
                {
                    "type": "Single Nucleotide Variant",
                    "position": 20,
                    "localPosition": 20,
                    "cdsPosition": 20,
                    "refBase": "A",
                    "altBase": "T",
                    "hgvs": "NM_000518.5:c.20A>T",
                    "description": "Sickle cell pathogenic variant HBB:c.20A>T"
                }
            ]
        }
    }

    req = GenerateReportRequest(format="csv", analysis_data=sample_analysis)
    resp = generate_report_endpoint(req)
    assert resp.media_type == "text/csv"
    csv_content = resp.body.decode("utf-8")
    assert "Reference Accession" in csv_content or "Sequence IDs" in csv_content
    assert "NM_000518.5:c.20A>T" in csv_content


def test_ad_hoc_pdf_report_generation():
    """Test POST /api/reports/generate produces valid PDF byte stream."""
    sample_analysis = {
        "title": "BRCA1 HBOC Analysis",
        "queryName": "BRCA1 Test Sample",
        "referenceName": "NM_007294.4 Standard",
        "referenceAccession": "NM_007294.4",
        "alignment": {
            "queryName": "BRCA1 Test Sample",
            "referenceName": "NM_007294.4 Standard",
            "score": 300,
            "identity": 99.0,
            "refAligned": "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAGAGACTGATTTTCAG",
            "altAligned": "ATGGATTTATCTGCTCTTCGCGTTGAAGAAGTACAAAATGTCATTAATGCTATGCAGAAAATCTTAG--ACTGATTTTCAG",
            "matchString": "|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||--||||||||||||",
            "mutations": [
                {
                    "type": "Deletion",
                    "position": 68,
                    "localPosition": 68,
                    "cdsPosition": 68,
                    "refBase": "AG",
                    "altBase": "-",
                    "hgvs": "NM_007294.4:c.68_69delAG",
                    "description": "BRCA1 frame shift variant"
                }
            ]
        }
    }

    req = GenerateReportRequest(format="pdf", analysis_data=sample_analysis)
    resp = generate_report_endpoint(req)
    assert resp.media_type == "application/pdf"
    assert resp.body.startswith(b"%PDF")


def _extract_pdf_decompressed_text(pdf_bytes: bytes) -> str:
    """Extract plain, ASCII85, and Flate-decompressed text streams from a PDF byte stream."""
    import base64
    import zlib
    import re

    decompressed_chunks = []
    # Match stream...endstream content
    for m in re.finditer(rb'stream[\r\n]+(.*?)(?:[\r\n]*)endstream', pdf_bytes, re.DOTALL):
        st = m.group(1).strip()
        # Attempt Adobe ASCII85 + zlib decompress
        try:
            raw_a85 = st
            if not raw_a85.startswith(b'<~'):
                raw_a85 = b'<~' + raw_a85
            if not raw_a85.endswith(b'~>'):
                raw_a85 = raw_a85 + b'~>'
            a85 = base64.a85decode(raw_a85, adobe=True)
            decomp = zlib.decompress(a85)
            decompressed_chunks.append(decomp.decode("latin-1", errors="ignore"))
            continue
        except Exception:
            pass

        # Attempt direct zlib decompress
        try:
            decomp = zlib.decompress(st)
            decompressed_chunks.append(decomp.decode("latin-1", errors="ignore"))
            continue
        except Exception:
            pass

        decompressed_chunks.append(st.decode("latin-1", errors="ignore"))

    decompressed_chunks.append(pdf_bytes.decode("latin-1", errors="ignore"))
    raw_text = "\n".join(decompressed_chunks)
    return raw_text.replace(r'\(', '(').replace(r'\)', ')')


def test_user_exact_validation_case_pdf_and_csv():
    """
    Validation Test Case specified by user:
    Reference: CCTGACTCCTGAGGAGAAGTCTGC (24 bp)
    Query:     CCTGACTCCTGTGGAGAAGTCTGC (24 bp)
    Expected results:
    - Sequence length: 24 bp for each sequence
    - Sequence identity: 95.83%
    - Alignment score: 45
    - Total variants: 1
    - Variant type: substitution
    - Local position: 12
    - Reference allele: A
    - Alternate allele: T
    - Local fragment notation: c.12A>T
    - Classification: TRANSVERSION
    - Insertions: 0, Deletions: 0
    Both CSV and PDF exports must accurately report these verified values.
    """
    from app.engine.alignment import needleman_wunsch_align
    from app.engine.mutations import detect_mutations_from_alignment
    from app.engine.reports import generate_pdf_report, generate_csv_report

    ref = "CCTGACTCCTGAGGAGAAGTCTGC"
    query = "CCTGACTCCTGTGGAGAAGTCTGC"

    aln = needleman_wunsch_align(ref, query)
    assert aln["refLength"] == 24
    assert aln["altLength"] == 24
    assert aln["alignmentScore"] == 45
    assert aln["identity"] == 95.83
    assert aln["gapsCount"] == 0
    assert aln["matchesCount"] == 23
    assert aln["mismatchesCount"] == 1

    muts = detect_mutations_from_alignment(aln["refAligned"], aln["altAligned"])
    assert len(muts) == 1
    m = muts[0]
    assert m["type"] == "SUBSTITUTION"
    assert m["classification"] == "TRANSVERSION"
    assert m["ref_position"] == 12
    assert m["ref_sequence"] == "A"
    assert m["alt_sequence"] == "T"
    assert m["hgvs_notation"] == "c.12A>T"
    assert m["local_hgvs"] == "c.12A>T"

    analysis_payload = {
        "title": "Exact User Validation Case",
        "queryName": "Query Fragment",
        "referenceName": "Reference Fragment",
        "altLength": aln["altLength"],
        "refLength": aln["refLength"],
        "alignmentScore": aln["alignmentScore"],
        "identity": aln["identity"],
        "refAligned": aln["refAligned"],
        "altAligned": aln["altAligned"],
        "matchString": aln["matchString"],
        "mutations": muts,
        "alignment": aln
    }

    # 1. Verify CSV Export
    csv_text = generate_csv_report(analysis_payload)
    assert "Query Sequence Length (bp),24" in csv_text
    assert "Reference Sequence Length (bp),24" in csv_text
    assert "Alignment Score,45" in csv_text
    assert "Sequence Identity (%),95.83%" in csv_text
    assert "Total Mutations Detected,1" in csv_text
    assert "12,A,T,SUBSTITUTION,TRANSVERSION" in csv_text
    assert "c.12A>T" in csv_text

    # 2. Verify PDF Export
    pdf_bytes = generate_pdf_report(analysis_payload)
    assert pdf_bytes.startswith(b"%PDF")
    pdf_text = _extract_pdf_decompressed_text(pdf_bytes)

    assert "95.83%" in pdf_text
    assert "45" in pdf_text
    assert "c.12A>T" in pdf_text
    assert "TRANSVERSION" in pdf_text
    assert "SUBSTITUTION" in pdf_text
    assert "Identified Genetic Variations (1 events)" in pdf_text
    assert "No sequence variants identified" not in pdf_text


def test_identical_sequence_case_pdf_and_csv():
    """
    Test identical reference and query sequence:
    Both CSV and PDF exports must report 100.0% identity, score 48,
    and 'No sequence variants identified (100% pairwise sequence identity match)'.
    """
    from app.engine.alignment import needleman_wunsch_align
    from app.engine.mutations import detect_mutations_from_alignment
    from app.engine.reports import generate_pdf_report, generate_csv_report

    ref = "CCTGACTCCTGAGGAGAAGTCTGC"
    query = "CCTGACTCCTGAGGAGAAGTCTGC"

    aln = needleman_wunsch_align(ref, query)
    assert aln["refLength"] == 24
    assert aln["altLength"] == 24
    assert aln["alignmentScore"] == 48
    assert aln["identity"] == 100.0
    assert aln["gapsCount"] == 0
    assert aln["matchesCount"] == 24
    assert aln["mismatchesCount"] == 0

    muts = detect_mutations_from_alignment(aln["refAligned"], aln["altAligned"])
    assert len(muts) == 0

    analysis_payload = {
        "title": "Identical Pairwise Test",
        "queryName": "Identical Query",
        "referenceName": "Identical Reference",
        "altLength": aln["altLength"],
        "refLength": aln["refLength"],
        "alignmentScore": aln["alignmentScore"],
        "identity": aln["identity"],
        "refAligned": aln["refAligned"],
        "altAligned": aln["altAligned"],
        "matchString": aln["matchString"],
        "mutations": muts,
        "alignment": aln
    }

    # CSV Verification
    csv_text = generate_csv_report(analysis_payload)
    assert "Sequence Identity (%),100.0%" in csv_text
    assert "Alignment Score,48" in csv_text
    assert "Total Mutations Detected,0" in csv_text

    # PDF Verification
    pdf_bytes = generate_pdf_report(analysis_payload)
    pdf_text = _extract_pdf_decompressed_text(pdf_bytes)
    assert "100.0%" in pdf_text
    assert "48" in pdf_text
    assert "No sequence variants identified (100% pairwise sequence identity match)." in pdf_text
    assert "Identified Genetic Variations (0 events)" in pdf_text


def test_empty_or_invalid_report_request_raises_error():
    """Verify that empty or invalid analysis data raises ValueError instead of generating a misleading report."""
    from app.engine.reports import generate_pdf_report, generate_csv_report

    with pytest.raises(ValueError, match="Invalid or incomplete analysis data"):
        generate_pdf_report({})

    with pytest.raises(ValueError, match="Invalid or incomplete analysis data"):
        generate_csv_report({})
