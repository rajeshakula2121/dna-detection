"""
Pydantic Request and Response Schemas for the Bioinformatics API.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# ===================== Sequence Validation =====================
class ValidationRequest(BaseModel):
    sequence: str = Field(..., description="DNA or RNA sequence string", min_length=1)
    allow_ambiguous: bool = Field(default=False, description="Whether to allow IUPAC ambiguity symbols (R, Y, S, W, K, M, B, D, H, V, N)")

class ValidationResponse(BaseModel):
    isValid: bool
    sequenceLength: int
    hasAmbiguousBases: bool
    ambiguousBaseCount: int
    canonicalCounts: Dict[str, int]
    gcContent: float
    atContent: float
    gcSkew: float
    atSkew: float
    error: Optional[str] = None


# ===================== Pattern Matching (KMP & Aho-Corasick) =====================
class KmpSearchRequest(BaseModel):
    sequence: str = Field(..., min_length=1, description="Target sequence")
    pattern: str = Field(..., min_length=1, description="Motif pattern to match")
    allow_overlapping: bool = Field(default=True, description="Detect overlapping matches")

class PatternMatch(BaseModel):
    pattern: str
    startPos: int
    endPos: int
    matchedSubsequence: str

class KmpSearchResponse(BaseModel):
    pattern: str
    matchCount: int
    positions: List[int]
    matches: List[PatternMatch]
    longestPrefixSuffixTable: List[int]

class MultiPatternSearchRequest(BaseModel):
    sequence: str = Field(..., min_length=1)
    patterns: List[str] = Field(..., min_length=1)

class MultiPatternSearchResponse(BaseModel):
    sequenceLength: int
    totalPatternsSearched: int
    totalMatchesFound: int
    matchesByPattern: Dict[str, List[PatternMatch]]
    allMatchesChronological: List[Dict[str, Any]]


# ===================== K-mer Analysis =====================
class KmerAnalysisRequest(BaseModel):
    sequence: str = Field(..., min_length=2)
    k: int = Field(default=3, ge=2, le=8, description="Length of k-mer (2 to 8)")

class KmerAnalysisResponse(BaseModel):
    k: int
    totalKmers: int
    uniqueKmers: int
    shannonEntropy: float
    frequencies: Dict[str, int]
    proportions: Dict[str, float]
    topKmers: List[Dict[str, Any]]
    leastKmers: List[Dict[str, Any]]


# ===================== Alignment & Mutations =====================
class AlignmentRequest(BaseModel):
    ref_sequence: str = Field(..., min_length=1, description="Reference DNA sequence")
    alt_sequence: str = Field(..., min_length=1, description="Sample/Alternate DNA sequence")
    title: Optional[str] = Field(default="DNA Alignment Analysis")
    match_score: int = Field(default=2)
    mismatch_penalty: int = Field(default=-1)
    gap_penalty: int = Field(default=-2)

class MutationItem(BaseModel):
    position: int
    refPosition: int
    altPosition: Optional[int] = None
    refBase: str
    altBase: str
    mutationType: str
    subType: Optional[str] = None
    hgvs: str
    description: str
    flanking5Prime: str
    flanking3Prime: str

class AlignmentResponse(BaseModel):
    refLength: int
    altLength: int
    alignmentScore: int
    identity: float
    similarity: float
    gapsCount: int
    matchesCount: int
    mismatchesCount: int
    refAligned: str
    altAligned: str
    matchString: str
    mutations: List[MutationItem]


# ===================== Motif Disruption =====================
class MotifItem(BaseModel):
    name: str
    pattern: str
    description: Optional[str] = ""

class MotifDisruptionRequest(BaseModel):
    ref_sequence: str = Field(..., min_length=1)
    alt_sequence: str = Field(..., min_length=1)
    motifs: List[MotifItem] = Field(..., min_length=1)

class MotifDisruptionEvent(BaseModel):
    motifName: str
    pattern: str
    classification: str
    refMatchCount: int
    altMatchCount: int
    refPositions: List[int]
    altPositions: List[int]
    overlappingVariants: List[Dict[str, Any]]
    description: str

class MotifDisruptionResponse(BaseModel):
    totalMotifsEvaluated: int
    disruptedCount: int
    retainedCount: int
    lostCount: int
    gainedCount: int
    shiftedCount: int
    events: List[MotifDisruptionEvent]


# ===================== Coding Sequence Analysis =====================
class SixFrameTranslationRequest(BaseModel):
    sequence: str = Field(..., min_length=3)
    min_orf_length_aa: int = Field(default=15, ge=5)

class SixFrameTranslationResponse(BaseModel):
    sequenceLength: int
    frames: Dict[str, Any]
    openReadingFrames: List[Dict[str, Any]]
    longestOrf: Optional[Dict[str, Any]] = None

class CodingComparisonRequest(BaseModel):
    ref_sequence: str = Field(..., min_length=3)
    alt_sequence: str = Field(..., min_length=3)
    frame: int = Field(default=1, ge=1, le=3)

class CodingVariant(BaseModel):
    codonPosition: int
    ntPosition: int
    refCodon: str
    altCodon: str
    refAa: str
    altAa: str
    refAaName: str
    altAaName: str
    variantType: str
    isConservative: bool
    hgvsProtein: str
    impact: str

class CodingComparisonResponse(BaseModel):
    totalCodonsAnalyzed: int
    variantCount: int
    synonymousCount: int
    missenseCount: int
    nonsenseCount: int
    stopLostCount: int
    isFrameshift: bool
    frameshiftDescription: Optional[str] = None
    refTranslation: str
    altTranslation: str
    variants: List[CodingVariant]


# ===================== Export Reports =====================
class ExportReportRequest(BaseModel):
    format: str = Field(..., pattern="^(pdf|csv|json)$")
    title: str = Field(default="Sequence_Analysis")
    sequenceLength: Optional[int] = 0
    gcContent: Optional[float] = 0.0
    alignmentScore: Optional[int] = 0
    identity: Optional[float] = 100.0
    mutationCount: Optional[int] = 0
    refAligned: Optional[str] = ""
    altAligned: Optional[str] = ""
    mutations: Optional[List[Dict[str, Any]]] = []
    motifDisruptions: Optional[List[Dict[str, Any]]] = []


# ===================== GenomicsAI Platform Models =====================
class SampleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    organism: Optional[str] = Field(default="Homo sapiens")
    sample_type: str = Field(default="Genomic DNA")
    format: str = Field(default="Manual Entry")
    sequence: str = Field(..., min_length=1)
    description: Optional[str] = ""


class SampleUpdate(BaseModel):
    name: Optional[str] = None
    organism: Optional[str] = None
    sample_type: Optional[str] = None
    format: Optional[str] = None
    sequence: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class SampleResponse(BaseModel):
    id: str
    name: str
    organism: Optional[str] = None
    sample_type: str
    format: str
    sequence: str
    length: int
    gc_content: float
    at_content: float
    quality_status: str
    description: Optional[str] = None
    status: str
    created_at: str
    updated_at: str


class PatternAnalysisApiRequest(BaseModel):
    sequence: Optional[str] = None
    sample_id: Optional[str] = None
    motif: Optional[str] = "TATA"


class MutationAnalysisApiRequest(BaseModel):
    sample_id: Optional[str] = None
    query_sequence: Optional[str] = None
    reference_id: Optional[str] = None
    reference_sequence: Optional[str] = None
    auto_generate_demo: bool = False
    match_score: int = 2
    mismatch_penalty: int = -1
    gap_penalty: int = -2
    coordinate_offset: Optional[int] = None
    transcript_accession: Optional[str] = None


class DiseaseAnnotationApiRequest(BaseModel):
    sample_id: Optional[str] = None
    gene: Optional[str] = None
    variant: Optional[str] = None


class PharmacogenomicsApiRequest(BaseModel):
    sample_id: Optional[str] = None
    drug: Optional[str] = None
    therapeutic_area: Optional[str] = None


class ChatApiRequest(BaseModel):
    message: str = Field(..., min_length=1)
    sample_id: Optional[str] = None


class FastaParseRequest(BaseModel):
    fasta_text: str = Field(..., description="Raw FASTA text string containing single or multiple sequence records")


class GenerateReportRequest(BaseModel):
    format: str = "pdf"
    analysis_data: Dict[str, Any]

