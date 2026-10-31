"""
GenomicsAI Core Platform Endpoints
Provides full REST API implementations for sample management, pattern analysis,
Needleman-Wunsch mutation detection, disease annotations, pharmacogenomics,
analytics aggregations, scientific AI assistant, and report exports.
"""

import os
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Response, UploadFile, File
from fastapi.responses import JSONResponse

from app.models.schemas import (
    SampleCreate, SampleUpdate, SampleResponse,
    PatternAnalysisApiRequest, MutationAnalysisApiRequest,
    DiseaseAnnotationApiRequest, PharmacogenomicsApiRequest,
    ChatApiRequest, ExportReportRequest,
    FastaParseRequest, GenerateReportRequest
)
from app.database.db import db_manager
from app.engine.validation import validate_dna
from app.engine.alignment import needleman_wunsch_align
from app.engine.mutations import detect_mutations
from app.engine.pattern_analysis import analyze_dna_pattern
from app.engine.disease import query_disease_associations, CLINICAL_DISCLAIMER
from app.engine.pharmacogenomics import analyze_pharmacogenomics, PGX_DISCLAIMER
from app.engine.assistant import generate_assistant_response
from app.engine.reports import generate_csv_report, generate_json_report, generate_pdf_report
from app.engine.fasta_parser import parse_fasta_string

router = APIRouter(tags=["GenomicsAI Platform"])


# ===================== SAMPLES API =====================
@router.post("/samples", response_model=Dict[str, Any])
def create_sample(req: SampleCreate):
    """Save a new biological sequence sample to the SQLite database."""
    val = validate_dna(req.sequence, allow_ambiguous=True)
    if not val["isValid"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid DNA/RNA sequence: {val.get('error', 'Contains disallowed characters.')}"
        )

    sample_dict = req.model_dump()
    created = db_manager.create_sample(sample_dict)
    return created


@router.get("/samples", response_model=List[Dict[str, Any]])
def list_samples(
    search: Optional[str] = None,
    status: Optional[str] = None,
    sample_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """Retrieve stored biological samples with optional filtering."""
    # Ensure string types if called via direct Python invocation
    search_str = search if isinstance(search, str) else None
    status_str = status if isinstance(status, str) else None
    type_str = sample_type if isinstance(sample_type, str) else None
    lim = limit if isinstance(limit, int) else 100
    off = offset if isinstance(offset, int) else 0

    return db_manager.get_samples(
        search=search_str,
        status=status_str,
        sample_type=type_str,
        limit=lim,
        offset=off
    )


@router.get("/samples/{sample_id}", response_model=Dict[str, Any])
def get_sample(sample_id: str):
    """Fetch sample details and associated analysis runs."""
    sample = db_manager.get_sample(sample_id)
    if not sample:
        raise HTTPException(status_code=404, detail="Sample not found")

    analyses = db_manager.get_analyses_for_sample(sample_id)
    sample_data = dict(sample)
    sample_data["analyses"] = analyses
    return sample_data


@router.put("/samples/{sample_id}", response_model=Dict[str, Any])
def update_sample(sample_id: str, req: SampleUpdate):
    """Update sample metadata or nucleotide sequence."""
    existing = db_manager.get_sample(sample_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Sample not found")

    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    if "sequence" in updates:
        val = validate_dna(updates["sequence"], allow_ambiguous=True)
        if not val["isValid"]:
            raise HTTPException(status_code=400, detail=f"Invalid sequence update: {val.get('error')}")

    updated = db_manager.update_sample(sample_id, updates)
    return updated


@router.delete("/samples/{sample_id}")
def delete_sample(sample_id: str):
    """Delete a sample and cascade delete all its analyses and mutation calls."""
    success = db_manager.delete_sample(sample_id)
    if not success:
        raise HTTPException(status_code=404, detail="Sample not found")
    return {"deleted": True, "id": sample_id}


# ===================== PATTERN ANALYSIS API =====================
@router.post("/analysis/pattern")
def run_pattern_analysis(req: PatternAnalysisApiRequest):
    """
    Perform nucleotide composition, GC/AT skew, dinucleotide frequency calculation,
    and forward/reverse motif search.
    """
    seq = req.sequence
    sample_id = req.sample_id

    if not seq and sample_id:
        sample = db_manager.get_sample(sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Sample not found")
        seq = sample["sequence"]

    if not seq:
        raise HTTPException(status_code=400, detail="Must provide sequence or valid sample_id")

    results = analyze_dna_pattern(
        sequence=seq,
        motif_pattern=req.motif or "TATA",
        allow_ambiguous=True
    )

    if sample_id:
        db_manager.record_analysis(
            sample_id=sample_id,
            analysis_type="PATTERN",
            parameters={"motif": req.motif},
            results=results
        )

    return results


# ===================== MUTATION DETECTION API =====================
@router.post("/analysis/mutations")
def run_mutation_detection(req: MutationAnalysisApiRequest):
    """
    Pairwise Needleman-Wunsch global sequence alignment and mutation detection:
    identifies SNPs (transitions/transversions), insertions, deletions, and frameshifts.
    """
    # 1. Resolve Query Sequence
    query_seq = req.query_sequence
    sample_id = req.sample_id
    sample_name = "Query Sample"

    if not query_seq and sample_id:
        sample = db_manager.get_sample(sample_id)
        if not sample:
            raise HTTPException(status_code=404, detail="Query sample not found")
        query_seq = sample["sequence"]
        sample_name = sample["name"]

    if not query_seq:
        raise HTTPException(status_code=400, detail="Query sequence or sample_id is required")

    # 2. Resolve Reference Sequence
    ref_seq = req.reference_sequence
    ref_name = "Reference Genome"

    if req.auto_generate_demo:
        # Generate synthetic mutated demonstration reference with explicit label
        ref_seq = list(query_seq)
        if len(ref_seq) > 20:
            # Introduce synthetic substitution at pos 20 and 50
            ref_seq[19] = "A" if ref_seq[19] != "A" else "T"
        if len(ref_seq) > 50:
            ref_seq[49] = "G" if ref_seq[49] != "G" else "C"
        ref_seq = "".join(ref_seq)
        ref_name = "Demonstration Reference (Synthetic Mutation Benchmark)"
    elif req.reference_id:
        ref_sample = db_manager.get_sample(req.reference_id)
        if not ref_sample:
            raise HTTPException(status_code=404, detail="Reference sample not found")
        ref_seq = ref_sample["sequence"]
        ref_name = ref_sample["name"]

    if not ref_seq:
        raise HTTPException(status_code=400, detail="Reference sequence, reference_id, or auto_generate_demo is required")

    # 3. Perform Global Alignment
    val_q = validate_dna(query_seq, allow_ambiguous=True)
    val_r = validate_dna(ref_seq, allow_ambiguous=True)
    if not val_q["isValid"]:
        raise HTTPException(status_code=400, detail=f"Query sequence invalid: {val_q['error']}")
    if not val_r["isValid"]:
        raise HTTPException(status_code=400, detail=f"Reference sequence invalid: {val_r['error']}")

    aln = needleman_wunsch_align(
        ref_seq,
        query_seq,
        match_score=req.match_score,
        mismatch_penalty=req.mismatch_penalty,
        gap_penalty=req.gap_penalty
    )

    # 4. Detect mutations from alignment with HGVS 3'-normalization and coordinate offset
    coord_offset = req.coordinate_offset if req.coordinate_offset is not None else 0
    tx_acc = req.transcript_accession or ""

    if req.coordinate_offset is None and (req.reference_id or ref_name):
        ref_lookup = f"{req.reference_id or ''} {ref_name}".lower()
        if "cftr" in ref_lookup:
            coord_offset = 1448
            tx_acc = tx_acc or "NM_000492.4"
        elif "brca1" in ref_lookup:
            coord_offset = 0
            tx_acc = tx_acc or "NM_007294.4"
        elif "hbb" in ref_lookup:
            coord_offset = 0
            tx_acc = tx_acc or "NM_000518.5"

    mutations = detect_mutations(
        aln["refAligned"],
        aln["altAligned"],
        coordinate_offset=coord_offset,
        transcript_accession=tx_acc,
        normalize_3prime=True
    )

    # Categorize mutation summary counts
    snp_count = sum(1 for m in mutations if "SNP" in m.get("mutationType", "").upper() or "SUBSTITUTION" in m.get("mutationType", "").upper())
    ins_count = sum(1 for m in mutations if "INSERTION" in m.get("mutationType", "").upper())
    del_count = sum(1 for m in mutations if "DELETION" in m.get("mutationType", "").upper())

    results = {
        "queryName": sample_name,
        "referenceName": ref_name,
        "isDemoReference": req.auto_generate_demo,
        "refLength": aln["refLength"],
        "altLength": aln["altLength"],
        "alignmentScore": aln["alignmentScore"],
        "identity": aln["identity"],
        "similarity": aln["similarity"],
        "gapsCount": aln["gapsCount"],
        "matchesCount": aln["matchesCount"],
        "mismatchesCount": aln["mismatchesCount"],
        "mutationCount": len(mutations),
        "snpCount": snp_count,
        "insertionCount": ins_count,
        "deletionCount": del_count,
        "refAligned": aln["refAligned"],
        "altAligned": aln["altAligned"],
        "matchString": aln["matchString"],
        "mutations": mutations
    }

    # Store analysis in DB if sample_id provided
    if sample_id:
        db_manager.record_analysis(
            sample_id=sample_id,
            analysis_type="MUTATION",
            parameters={
                "reference": ref_name,
                "isDemo": req.auto_generate_demo,
                "matchScore": req.match_score
            },
            results=results,
            mutations=mutations
        )

    return results


# ===================== ANALYSIS HISTORY =====================
@router.get("/analysis/history")
def get_analysis_history(sample_id: Optional[str] = None):
    """Retrieve historical analysis jobs."""
    sid = sample_id if isinstance(sample_id, str) else None
    if sid:
        return db_manager.get_analyses_for_sample(sid)
    # Return all mutations with sample names as general history
    return db_manager.get_all_mutations(limit=50)


# ===================== ANALYTICS DASHBOARD & RESEARCH =====================
@router.get("/analytics/dashboard")
def get_dashboard_analytics():
    """Retrieve aggregated dashboard metrics and distributions."""
    return db_manager.get_dashboard_metrics()


@router.get("/analytics/research")
def get_research_analytics():
    """Retrieve comprehensive cohort research analytics."""
    return db_manager.get_research_analytics()


# ===================== DISEASE ASSOCIATION =====================
@router.post("/disease/annotate")
def annotate_disease(req: DiseaseAnnotationApiRequest):
    """
    Cross-reference detected genomic variants with curated ClinVar and OMIM clinical evidence.
    """
    mutations = None
    if req.sample_id:
        with db_manager.get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM mutations WHERE sample_id = ?;", (req.sample_id,))
            mutations = [dict(r) for r in cursor.fetchall()]

    result = query_disease_associations(
        query_gene=req.gene,
        query_variant=req.variant,
        sample_mutations=mutations
    )

    if req.sample_id:
        db_manager.record_analysis(
            sample_id=req.sample_id,
            analysis_type="DISEASE",
            parameters={"gene": req.gene, "variant": req.variant},
            results={"totalFound": result["totalAssociations"]}
        )

    return result


# ===================== PHARMACOGENOMICS =====================
@router.post("/pharmacogenomics/analyze")
def analyze_pgx(req: PharmacogenomicsApiRequest):
    """
    Evaluate gene-drug relationships and metabolizer phenotypes based on CPIC and PharmGKB.
    """
    result = analyze_pharmacogenomics(
        sample_id=req.sample_id,
        drug_query=req.drug,
        therapeutic_area=req.therapeutic_area
    )

    if req.sample_id:
        db_manager.record_analysis(
            sample_id=req.sample_id,
            analysis_type="PHARMACOGENOMICS",
            parameters={"drug": req.drug, "therapeutic_area": req.therapeutic_area},
            results={"totalEvaluated": result["totalEvaluated"]}
        )

    return result


# ===================== AI ASSISTANT =====================
@router.post("/assistant/chat")
def assistant_chat(req: ChatApiRequest):
    """
    Conversational AI Assistant grounded in stored sample data, alignments, and bioinformatics literature.
    """
    resp = generate_assistant_response(
        query=req.message,
        context_sample_id=req.sample_id
    )

    # Persist turn
    db_manager.save_chat_message("user", req.message, req.sample_id)
    db_manager.save_chat_message("assistant", resp["response"], req.sample_id)

    return resp


# ===================== REPORTS EXPORT =====================
@router.get("/reports/export")
def export_report_endpoint(
    format: str = "csv",
    sample_id: Optional[str] = None
):
    """Generate and stream a scientific analysis report in CSV, JSON, or PDF format."""
    fmt = format if isinstance(format, str) else "csv"
    sid = sample_id if isinstance(sample_id, str) else None
    data: Dict[str, Any] = {
        "title": "GenomicsAI Analysis Export",
        "sampleId": sid or "Cohort Summary"
    }

    if sid:
        sample = db_manager.get_sample(sid)
        if sample:
            data.update({
                "title": f"Analysis Report - {sample['name']}",
                "sequenceLength": sample["length"],
                "gcContent": sample["gc_content"],
                "status": sample["status"]
            })
            analyses = db_manager.get_analyses_for_sample(sid)
            if analyses:
                latest = analyses[0]
                if isinstance(latest.get("results"), dict):
                    data.update(latest["results"])

    if fmt == "csv":
        csv_content = generate_csv_report(data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=genomics_report_{fmt}.csv"}
        )
    elif fmt == "pdf":
        pdf_bytes = generate_pdf_report(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=genomics_report_{fmt}.pdf"}
        )
    else:
        json_content = generate_json_report(data)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=genomics_report_{fmt}.json"}
        )


# ===================== FASTA UPLOAD & PARSER API =====================
@router.post("/fasta/parse", response_model=List[Dict[str, Any]])
def parse_fasta_endpoint(req: FastaParseRequest):
    """
    Parse a FASTA string (.fasta, .fa, .fna) containing single or multiple sequence records.
    Validates nucleotide composition, checks for IUPAC ambiguity codes, and reports sequence metrics.
    """
    try:
        records = parse_fasta_string(req.fasta_text)
        return records
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/fasta/upload", response_model=List[Dict[str, Any]])
async def upload_fasta_file_endpoint(file: UploadFile = File(...)):
    """
    Direct file upload endpoint for .fasta, .fa, and .fna files.
    Validates file extension, enforces size limits, and parses records safely in-memory.
    """
    allowed_exts = (".fasta", ".fa", ".fna", ".txt")
    filename = file.filename or ""
    if not any(filename.lower().endswith(ext) for ext in allowed_exts):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{filename}'. Supported formats are: .fasta, .fa, .fna, and .txt"
        )

    contents = await file.read()
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 15 MB limit.")

    try:
        text = contents.decode("utf-8", errors="replace")
        records = parse_fasta_string(text)
        return records
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse FASTA file: {str(e)}")


# ===================== BENCHMARK DATASET API =====================
@router.get("/benchmarks", response_model=List[Dict[str, Any]])
def get_benchmarks_endpoint():
    """
    Retrieve authoritative human gene benchmark examples (HBB, BRCA1, CFTR)
    directly from verified_genomics_dataset.json for one-click loading.
    """
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    dataset_file = os.path.join(root_dir, "dataset", "verified_genomics_dataset.json")

    if not os.path.exists(dataset_file):
        raise HTTPException(status_code=500, detail="Verified genomics dataset file not found.")

    with open(dataset_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    benchmarks = []
    for g in data.get("genes", []):
        ref = g.get("reference", {})
        var = g.get("verified_variant", {})
        benchmarks.append({
            "id": f"benchmark-{g['gene_symbol'].lower()}",
            "gene_symbol": g["gene_symbol"],
            "gene_name": g["gene_name"],
            "organism": g["organism"],
            "ref_accession": ref.get("accession"),
            "ref_region": ref.get("region_description"),
            "ref_length": ref.get("length_bp"),
            "coordinate_offset": ref.get("coordinate_offset_to_cds", 0),
            "ref_sequence": ref.get("sequence"),
            "variant_name": var.get("variant_name"),
            "clinvar_id": var.get("clinvar_variation_id"),
            "dbsnp_rsid": var.get("dbsnp_rsid"),
            "expected_hgvs": var.get("hgvs_coding"),
            "clinical_condition": var.get("clinical_condition"),
            "variant_sequence": var.get("sequence")
        })

    return benchmarks


# ===================== DYNAMIC AD-HOC REPORT GENERATION =====================
@router.post("/reports/generate")
def generate_report_endpoint(req: GenerateReportRequest):
    """
    Dynamically generate and stream a CSV or PDF report from submitted analysis results.
    Enables users to download professional reports immediately, even for unsaved/temporary runs.
    """
    fmt = req.format.lower()
    data = req.analysis_data

    if fmt == "csv":
        csv_text = generate_csv_report(data)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=genomics_analysis_report.csv"}
        )
    elif fmt == "pdf":
        pdf_bytes = generate_pdf_report(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=genomics_analysis_report.pdf"}
        )
    else:
        json_text = generate_json_report(data)
        return Response(
            content=json_text,
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=genomics_analysis_report.json"}
        )
