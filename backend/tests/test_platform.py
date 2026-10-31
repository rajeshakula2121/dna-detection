"""
Automated Pytest Suite for GenomicsAI Platform Endpoints and Database.
"""

import pytest
from app.database.db import db_manager, init_db
from app.api.platform_endpoints import (
    create_sample, list_samples, get_sample, update_sample, delete_sample,
    run_pattern_analysis, run_mutation_detection, get_dashboard_analytics,
    get_research_analytics, annotate_disease, analyze_pgx, assistant_chat
)
from app.models.schemas import (
    SampleCreate, SampleUpdate, PatternAnalysisApiRequest,
    MutationAnalysisApiRequest, DiseaseAnnotationApiRequest,
    PharmacogenomicsApiRequest, ChatApiRequest
)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_seed_and_list_samples():
    samples = list_samples()
    assert len(samples) >= 4
    hbb = next((s for s in samples if "HBB" in s["name"]), None)
    assert hbb is not None
    assert hbb["length"] > 100
    assert hbb["gc_content"] > 0


def test_create_and_delete_sample():
    req = SampleCreate(
        name="Synthetic Test Exon",
        organism="Homo sapiens",
        sample_type="Genomic DNA",
        format="Manual Entry",
        sequence="ATGCGATCGATCGATCGATC",
        description="Test sample for automated pytest"
    )
    created = create_sample(req)
    assert created["id"].startswith("sample-")
    assert created["length"] == 20
    assert created["gc_content"] == 50.0

    # Retrieve
    fetched = get_sample(created["id"])
    assert fetched["name"] == "Synthetic Test Exon"

    # Delete
    del_res = delete_sample(created["id"])
    assert del_res["deleted"] is True


def test_pattern_analysis():
    req = PatternAnalysisApiRequest(
        sequence="TATAAAAGGGCCCATATAAATCGATCG",
        motif="TATA"
    )
    res = run_pattern_analysis(req)
    assert res["sequenceLength"] == 27
    assert res["nucleotideCounts"]["A"] > 0
    assert res["motifSearch"]["totalMatches"] >= 2


def test_mutation_detection():
    # Compare Sickle Cell alt against normal ref
    samples = list_samples()
    alt_s = next(s for s in samples if "Sickle Cell" in s["name"])
    ref_s = next(s for s in samples if "Reference Standard" in s["name"])

    req = MutationAnalysisApiRequest(
        sample_id=alt_s["id"],
        reference_id=ref_s["id"],
        match_score=2,
        mismatch_penalty=-1,
        gap_penalty=-2
    )
    res = run_mutation_detection(req)
    assert res["alignmentScore"] > 800
    assert res["identity"] > 99.0
    assert res["mutationCount"] >= 1
    # Check that position 20 is detected
    pos20 = next((m for m in res["mutations"] if m["position"] == 20 or m.get("refPosition") == 20), None)
    assert pos20 is not None


def test_dashboard_and_research_analytics():
    dash = get_dashboard_analytics()
    assert dash["totalSamples"] >= 4
    assert dash["averageGcContent"] > 0
    assert len(dash["recentSamples"]) > 0

    research = get_research_analytics()
    assert research["totalSamples"] >= 4
    assert len(research["gcComparison"]) > 0
    assert len(research["radarCoverage"]) == 6


def test_disease_annotation():
    req = DiseaseAnnotationApiRequest(gene="HBB")
    res = annotate_disease(req)
    assert res["totalAssociations"] >= 1
    assert any("Sickle Cell" in a["condition"] for a in res["associations"])


def test_pharmacogenomics():
    req = PharmacogenomicsApiRequest(drug="Clopidogrel")
    res = analyze_pgx(req)
    assert res["totalEvaluated"] >= 1
    assert any(g["gene"] == "CYP2C19" for g in res["guidelines"])


def test_assistant_chat():
    req = ChatApiRequest(message="Explain transition and transversion mutations.")
    res = assistant_chat(req)
    assert "Transition" in res["response"]
    assert "Transversion" in res["response"]

