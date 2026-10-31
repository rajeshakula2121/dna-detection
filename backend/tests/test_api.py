"""
Automated Pytest Suite for FastAPI REST API Endpoint Functions and Schemas.
Directly exercises endpoint request validation, execution, and response payloads.
"""

import pytest
from app.models.schemas import (
    ValidationRequest, KmpSearchRequest, MultiPatternSearchRequest,
    AlignmentRequest, ExportReportRequest
)
from app.api.v1.endpoints import (
    validate_sequence, search_kmp, search_aho_corasick,
    align_sequences, export_report
)
from app.main import health_check, root


def test_health_check_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    assert res["service"] == "smart-bioinformatics-backend"


def test_root_endpoint():
    res = root()
    assert "endpoints" in res
    assert res["endpoints"]["align"] == "/api/v1/sequences/align"


def test_validation_endpoint():
    req = ValidationRequest(sequence="ATGCGTAC", allow_ambiguous=False)
    res = validate_sequence(req)
    assert res["isValid"] is True
    assert res["sequenceLength"] == 8
    assert res["gcContent"] == 50.0


def test_kmp_endpoint():
    req = KmpSearchRequest(sequence="GATTACAGATTACA", pattern="GATTACA", allow_overlapping=True)
    res = search_kmp(req)
    assert res["matchCount"] == 2
    assert res["positions"] == [1, 8]


def test_aho_corasick_endpoint():
    req = MultiPatternSearchRequest(sequence="ATGCGATCGATCA", patterns=["ATGC", "GATC"])
    res = search_aho_corasick(req)
    assert res["totalMatchesFound"] >= 3


def test_align_endpoint():
    req = AlignmentRequest(
        ref_sequence="AGCTACGT",
        alt_sequence="AGCTTCGT",
        match_score=2,
        mismatch_penalty=-1,
        gap_penalty=-2
    )
    res = align_sequences(req)
    assert res["alignmentScore"] == 13
    assert len(res["mutations"]) == 1
    assert res["mutations"][0]["hgvs"] == "c.5A>T"


def test_export_report_csv():
    req = ExportReportRequest(
        format="csv",
        title="Test_Report",
        sequenceLength=100,
        gcContent=45.5,
        alignmentScore=180,
        identity=98.0,
        mutationCount=1,
        mutations=[
            {
                "position": 5,
                "refBase": "A",
                "altBase": "T",
                "mutationType": "SUBSTITUTION",
                "subType": "TRANSVERSION",
                "hgvs": "c.5A>T",
                "description": "A to T transversion"
            }
        ]
    )
    res = export_report(req)
    assert res.media_type == "text/csv"
    assert "Test_Report" in res.body.decode("utf-8")


def test_export_report_pdf():
    req = ExportReportRequest(
        format="pdf",
        title="Test_Report_PDF",
        sequenceLength=100,
        gcContent=45.5,
        alignmentScore=180,
        identity=98.0,
        mutationCount=1,
        mutations=[
            {
                "position": 5,
                "refBase": "A",
                "altBase": "T",
                "mutationType": "SUBSTITUTION",
                "subType": "TRANSVERSION",
                "hgvs": "c.5A>T",
                "description": "A to T transversion"
            }
        ]
    )
    res = export_report(req)
    assert res.media_type == "application/pdf"
    assert len(res.body) > 100  # Generated valid binary PDF stream
