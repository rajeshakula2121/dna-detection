"""
FastAPI v1 Endpoints for DNA Pattern Identification and Mutation Detection.
"""

from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse

from app.models.schemas import (
    ValidationRequest, ValidationResponse,
    KmpSearchRequest, KmpSearchResponse, PatternMatch,
    MultiPatternSearchRequest, MultiPatternSearchResponse,
    KmerAnalysisRequest, KmerAnalysisResponse,
    AlignmentRequest, AlignmentResponse, MutationItem,
    MotifDisruptionRequest, MotifDisruptionResponse, MotifDisruptionEvent,
    SixFrameTranslationRequest, SixFrameTranslationResponse,
    CodingComparisonRequest, CodingComparisonResponse,
    ExportReportRequest
)

from app.engine.validation import validate_dna
from app.engine.kmp import search_kmp_pattern
from app.engine.aho_corasick import aho_corasick_search
from app.engine.kmer import analyze_kmers
from app.engine.alignment import needleman_wunsch_align
from app.engine.mutations import detect_mutations
from app.engine.motif_disruption import evaluate_motif_disruptions
from app.engine.coding import translate_six_frames, compare_coding_sequences
from app.engine.reports import generate_csv_report, generate_json_report, generate_pdf_report

router = APIRouter(prefix="/v1", tags=["Bioinformatics V1"])


@router.post("/sequences/validate", response_model=ValidationResponse)
def validate_sequence(req: ValidationRequest):
    """Validate a sequence string and calculate basic nucleotide composition and GC/AT skews."""
    res = validate_dna(req.sequence, req.allow_ambiguous)
    return res


@router.post("/patterns/kmp", response_model=KmpSearchResponse)
def search_kmp(req: KmpSearchRequest):
    """Exact single-pattern matching using the Knuth-Morris-Pratt algorithm."""
    res = search_kmp_pattern(req.sequence, req.pattern, req.allow_overlapping)
    return res


@router.post("/patterns/aho-corasick", response_model=MultiPatternSearchResponse)
def search_aho_corasick(req: MultiPatternSearchRequest):
    """Simultaneous multi-pattern matching using the Aho-Corasick automaton."""
    res = aho_corasick_search(req.sequence, req.patterns)
    return res


@router.post("/sequences/kmers", response_model=KmerAnalysisResponse)
def compute_kmers(req: KmerAnalysisRequest):
    """Calculate k-mer frequency distribution, proportions, and Shannon entropy complexity."""
    res = analyze_kmers(req.sequence, req.k)
    return res


@router.post("/sequences/align", response_model=AlignmentResponse)
def align_sequences(req: AlignmentRequest):
    """
    Perform global sequence alignment via Needleman-Wunsch (+2 match, -1 mismatch, -2 gap)
    and detect substitutions, micro-insertions, micro-deletions with 1-based coordinates.
    """
    val_ref = validate_dna(req.ref_sequence)
    val_alt = validate_dna(req.alt_sequence)
    
    if not val_ref['isValid']:
        raise HTTPException(status_code=400, detail=f"Reference sequence invalid: {val_ref['error']}")
    if not val_alt['isValid']:
        raise HTTPException(status_code=400, detail=f"Alternate sequence invalid: {val_alt['error']}")
        
    aln = needleman_wunsch_align(
        req.ref_sequence,
        req.alt_sequence,
        match_score=req.match_score,
        mismatch_penalty=req.mismatch_penalty,
        gap_penalty=req.gap_penalty
    )
    
    mutations = detect_mutations(aln['refAligned'], aln['altAligned'])
    
    return {
        'refLength': aln['refLength'],
        'altLength': aln['altLength'],
        'alignmentScore': aln['alignmentScore'],
        'identity': aln['identity'],
        'similarity': aln['similarity'],
        'gapsCount': aln['gapsCount'],
        'matchesCount': aln['matchesCount'],
        'mismatchesCount': aln['mismatchesCount'],
        'refAligned': aln['refAligned'],
        'altAligned': aln['altAligned'],
        'matchString': aln['matchString'],
        'mutations': mutations
    }


@router.post("/motifs/disruptions", response_model=MotifDisruptionResponse)
def evaluate_motif_disruptions(req: MotifDisruptionRequest):
    """
    Analyze mutation-aware motif disruption. Classifies each motif into:
    RETAINED, DISRUPTED, LOST, GAINED, or SHIFTED.
    """
    # 1. Global alignment
    aln = needleman_wunsch_align(req.ref_sequence, req.alt_sequence)
    # 2. Mutation calling
    mutations = detect_mutations(aln['refAligned'], aln['altAligned'])
    # 3. Motif disruption
    motifs_dict = [{'name': m.name, 'pattern': m.pattern, 'description': m.description} for m in req.motifs]
    disruptions = evaluate_motif_disruptions(
        req.ref_sequence,
        req.alt_sequence,
        motifs_dict,
        aln['refAligned'],
        aln['altAligned'],
        mutations
    )
    return disruptions


@router.post("/coding/six-frames", response_model=SixFrameTranslationResponse)
def translate_frames(req: SixFrameTranslationRequest):
    """Translate sequence across all 6 reading frames and detect ORFs."""
    res = translate_six_frames(req.sequence, req.min_orf_length_aa)
    return res


@router.post("/coding/compare", response_model=CodingComparisonResponse)
def compare_coding(req: CodingComparisonRequest):
    """
    Compare reference and alternate coding sequences. Classify variants into
    synonymous, missense, nonsense, stop-lost, and indel frameshifts.
    """
    res = compare_coding_sequences(req.ref_sequence, req.alt_sequence, req.frame)
    return res


@router.post("/reports/export")
def export_report(req: ExportReportRequest):
    """Export analysis findings in PDF, CSV, or JSON format."""
    data = req.model_dump()
    fmt = req.format.lower()
    
    if fmt == "pdf":
        pdf_bytes = generate_pdf_report(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{req.title}.pdf"'}
        )
    elif fmt == "csv":
        csv_str = generate_csv_report(data)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{req.title}.csv"'}
        )
    elif fmt == "json":
        json_str = generate_json_report(data)
        return Response(
            content=json_str,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{req.title}.json"'}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Supported: pdf, csv, json")
