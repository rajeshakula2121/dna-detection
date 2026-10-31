/**
 * Smart Bioinformatics Application - Shared Type Definitions
 * Supports DNA, RNA, Protein, 6-Frame Translation, and Alignment
 */

export type SequenceType = 'DNA' | 'RNA' | 'PROTEIN';
export type MutationType = 'SUBSTITUTION' | 'INSERTION' | 'DELETION';
export type SubstitutionSubType = 'TRANSITION' | 'TRANSVERSION';

// -------------------------------------------------------------
// Sequence Validation & Classification
// -------------------------------------------------------------
export interface ValidationResult {
  isValid: boolean;
  detectedType: SequenceType | 'AMBIGUOUS' | 'INVALID';
  suggestedType: SequenceType;
  cleanedSequence: string;
  invalidCharacters: string[];
  warnings: string[];
}

export interface FastaRecord {
  id: string;
  name?: string;
  description: string;
  sequence: string;
  length: number;
  type?: SequenceType;
  gcContent?: number;
  atContent?: number;
  counts?: { A: number; T: number; C: number; G: number; other?: number };
  hasAmbiguous?: boolean;
  isValidDna?: boolean;
  validationError?: string;
}

export interface BenchmarkItem {
  id: string;
  gene_symbol: string;
  gene_name: string;
  organism: string;
  ref_accession: string;
  ref_region: string;
  ref_length: number;
  coordinate_offset: number;
  ref_sequence: string;
  variant_name: string;
  clinvar_id: string;
  dbsnp_rsid: string;
  expected_hgvs: string;
  clinical_condition: string;
  variant_sequence: string;
}

// -------------------------------------------------------------
// DNA & RNA Composition Metrics
// -------------------------------------------------------------
export interface DnaMetrics {
  length: number;
  counts: {
    A: number;
    T: number;
    C: number;
    G: number;
    other: number;
  };
  gcContent: number;
  atContent: number;
  gcSkew: number;
  atSkew: number;
}

export interface RnaMetrics {
  length: number;
  counts: {
    A: number;
    U: number;
    C: number;
    G: number;
    other: number;
  };
  gcContent: number;
  auContent: number;
  gcSkew: number;
  auSkew: number;
}

// Backwards compatibility alias
export type SequenceMetrics = DnaMetrics;

// -------------------------------------------------------------
// Motifs
// -------------------------------------------------------------
export interface MotifMatch {
  start: number;
  end: number;
  strand: '+' | '-';
  matchedSequence: string;
}

// -------------------------------------------------------------
// Alignment & Variation
// -------------------------------------------------------------
export interface DetectedMutation {
  type: MutationType;
  position: number;
  refBase: string;
  altBase: string;
  subType?: SubstitutionSubType;
  length?: number;
  description: string;
  localPosition?: number;
  cdsPosition?: number;
  localHgvs?: string;
  hgvs?: string;
  equivalentRepresentations?: Array<{
    local_start: number;
    local_end: number;
    deleted_sequence: string;
    cds_start: number;
    cds_end: number;
    hgvs_coding: string;
    local_hgvs: string;
  }>;
}

export interface AlignmentResult {
  score: number;
  refAligned: string;
  altAligned: string;
  alignmentLength: number;
  identicalMatches: number;
  identity: number;
  mutations: DetectedMutation[];
}

// -------------------------------------------------------------
// 6-Frame Translation & Codon Tables
// -------------------------------------------------------------
export interface CodonTranslation {
  codon: string;
  aminoAcid: string; // 1-letter code, or '*' for Stop
  name: string;      // e.g. "Methionine"
  position: number;  // 1-based codon position
}

export interface ReadingFrame {
  frame: 1 | 2 | 3 | -1 | -2 | -3;
  strand: '+' | '-';
  proteinSequence: string;
  codons: CodonTranslation[];
  stopCount: number;
}

export interface OpenReadingFrame {
  frame: number;
  startNucleotide: number;
  endNucleotide: number;
  lengthNucleotides: number;
  lengthAminoAcids: number;
  proteinSequence: string;
  hasStartCodon: boolean;
  hasStopCodon: boolean;
}

export interface SixFrameTranslationResult {
  forwardFrames: [ReadingFrame, ReadingFrame, ReadingFrame];
  reverseFrames: [ReadingFrame, ReadingFrame, ReadingFrame];
  orfs: OpenReadingFrame[];
  codonTable: 'STANDARD' | 'VERTEBRATE_MITOCHONDRIAL';
}

// -------------------------------------------------------------
// Protein Analysis & BLOSUM Alignment
// -------------------------------------------------------------
export interface ProteinMetrics {
  length: number;
  aminoAcidCounts: Record<string, number>;
  frequencies: Record<string, number>;
  molecularWeightDaltons: number;
  isoelectricPoint: number;
  gravyIndex: number;
}

export interface AminoAcidSubstitution {
  position: number;
  refResidue: string;
  altResidue: string;
  isConservative: boolean;
  score: number;
  description: string;
}

export interface ProteinAlignmentResult {
  score: number;
  refAligned: string;
  altAligned: string;
  alignmentLength: number;
  identityPercent: number;
  similarityPercent: number;
  substitutions: AminoAcidSubstitution[];
}

// -------------------------------------------------------------
// Cloud Firestore Polymorphic Record
// -------------------------------------------------------------
export interface AnalysisRecord {
  id?: string;
  userId: string;
  projectId?: string;
  title: string;
  sequenceType?: SequenceType;
  analysisType?: string;
  analysisCategory?: 'METRICS' | 'MOTIF' | 'ALIGNMENT' | 'TRANSLATION' | 'PROTEIN' | 'BLAST';
  sequenceLength: number;
  gcContent?: number;
  
  // Modality-specific payloads
  dnaMetrics?: DnaMetrics;
  rnaMetrics?: RnaMetrics;
  proteinMetrics?: ProteinMetrics;
  
  refSequence?: string;
  altSequence?: string;
  refAligned?: string;
  altAligned?: string;
  identity?: number;
  mutationCount?: number;
  mutationsSummary?: string;
  
  motifQuery?: string;
  motifCount?: number;
  
  translationResult?: {
    orfCount: number;
    longestOrfLength: number;
    codonTable: string;
  };
  
  externalAnnotations?: {
    geneSymbol?: string;
    organism?: string;
    accession?: string;
  };

  createdAt: any;
}

// -------------------------------------------------------------
// Pattern Analysis Specific Algorithms (KMP, Boyer-Moore, Suffix Array)
// -------------------------------------------------------------

export interface KmpMatch {
  matchNumber: number;
  strand: string;
  pattern: string;
  startCoordinate: number;
  endCoordinate: number;
  matchedSequence: string;
  context: string;
}

export interface KmpResult {
  algorithm: 'Knuth-Morris-Pratt';
  pattern: string;
  lpsTable: Array<{ index: number; char: string; lps: number }>;
  matches: KmpMatch[];
  totalMatches: number;
  forwardMatches: number;
  reverseMatches: number;
  comparisonsCount: number;
  executionTimeMs: number;
  complexity: string;
}

export interface BoyerMooreMatch {
  matchNumber: number;
  strand: string;
  pattern: string;
  startCoordinate: number;
  endCoordinate: number;
  matchedSequence: string;
  context: string;
}

export interface BoyerMooreResult {
  algorithm: 'Boyer-Moore';
  pattern: string;
  badCharTable: Array<{ char: string; lastIndex: number; shift: number }>;
  matches: BoyerMooreMatch[];
  totalMatches: number;
  forwardMatches: number;
  reverseMatches: number;
  comparisonsCount: number;
  totalShifts: number;
  executionTimeMs: number;
  sublinearRatio: number;
  complexity: string;
}

export interface RepeatedDnaSequence {
  id: string;
  sequence: string;
  length: number;
  count: number;
  positions: number[];
  type: string;
  classification?: string;
}

export interface SuffixArrayResult {
  algorithm: 'Suffix Array & LCP';
  sequenceLength: number;
  minRepeatLength?: number;
  minOccurrences?: number;
  longestRepeatedSubstring: RepeatedDnaSequence | null;
  repeats: RepeatedDnaSequence[];
  allRepeats?: RepeatedDnaSequence[];
  totalRepeatsFound: number;
  metrics?: {
    distinctRepeatsCount: number;
    distinctRepeatsDescription: string;
    totalRepeatOccurrences: number;
    pairwiseRepeatPairs: number;
  };
  suffixArrayPreview: Array<{
    rank: number;
    suffixIndex: number;
    suffixIndex0Based?: number;
    lcp: number;
    suffixPreview: string;
  }>;
  executionTimeMs: number;
  complexity: string;
  indexingConvention?: string;
}

export interface AlgorithmBenchmark {
  algorithm: string;
  purpose: string;
  matchesOrRepeatsFound: number;
  executionTimeMs: number;
  comparisonsOrOperations: number;
  timeComplexity: string;
  spaceComplexity: string;
  input?: string;
  result?: string;
  interpretation?: string;
  limitations?: string;
}

