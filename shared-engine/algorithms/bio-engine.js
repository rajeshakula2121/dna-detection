/**
 * Smart Bioinformatics Application - Core Multi-Modality Bio Engine
 * 
 * Supports:
 * - DNA, RNA, and Protein Validation & Auto-detection
 * - DNA/RNA GC/AU composition and skew calculations
 * - DNA <-> RNA Transcription & Reverse Transcription
 * - 6-Frame Genetic Translation (Standard & Vertebrate Mitochondrial)
 * - Open Reading Frame (ORF) Detection
 * - Protein Physicochemical Metrics (Molecular Weight, pI, GRAVY)
 * - Needleman-Wunsch Global Alignment for Nucleic Acids and BLOSUM62 for Proteins
 * - SNV, Indel, and Conservative/Radical Amino Acid Mutation Classification
 */

// -------------------------------------------------------------------------
// Genetic Constants & Reference Tables
// -------------------------------------------------------------------------

const DNA_COMPLEMENT = {
  'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C',
  'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W',
  'K': 'M', 'M': 'K', 'B': 'V', 'D': 'H',
  'H': 'D', 'V': 'B', 'N': 'N', '-': '-'
};

const RNA_COMPLEMENT = {
  'A': 'U', 'U': 'A', 'C': 'G', 'G': 'C',
  'R': 'Y', 'Y': 'R', 'S': 'S', 'W': 'W',
  'K': 'M', 'M': 'K', 'B': 'V', 'D': 'H',
  'H': 'D', 'V': 'B', 'N': 'N', '-': '-'
};

// Standard Genetic Code (NCBI Table 1)
const STANDARD_CODON_TABLE = {
  // Phenylalanine & Leucine
  'TTT': 'F', 'TTC': 'F', 'TTA': 'L', 'TTG': 'L',
  'UUU': 'F', 'UUC': 'F', 'UUA': 'L', 'UUG': 'L',
  // Leucine
  'CTT': 'L', 'CTC': 'L', 'CTA': 'L', 'CTG': 'L',
  'CUU': 'L', 'CUC': 'L', 'CUA': 'L', 'CUG': 'L',
  // Isoleucine & Methionine (Start)
  'ATT': 'I', 'ATC': 'I', 'ATA': 'I', 'ATG': 'M',
  'AUU': 'I', 'AUC': 'I', 'AUA': 'I', 'AUG': 'M',
  // Valine
  'GTT': 'V', 'GTC': 'V', 'GTA': 'V', 'GTG': 'V',
  'GUU': 'V', 'GUC': 'V', 'GUA': 'V', 'GUG': 'V',
  // Serine
  'TCT': 'S', 'TCC': 'S', 'TCA': 'S', 'TCG': 'S',
  'UCU': 'S', 'UCC': 'S', 'UCA': 'S', 'UCG': 'S',
  // Proline
  'CCT': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  'CCU': 'P', 'CCC': 'P', 'CCA': 'P', 'CCG': 'P',
  // Threonine
  'ACT': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  'ACU': 'T', 'ACC': 'T', 'ACA': 'T', 'ACG': 'T',
  // Alanine
  'GCT': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  'GCU': 'A', 'GCC': 'A', 'GCA': 'A', 'GCG': 'A',
  // Tyrosine & Stop
  'TAT': 'Y', 'TAC': 'Y', 'TAA': '*', 'TAG': '*',
  'UAU': 'Y', 'UAC': 'Y', 'UAA': '*', 'UAG': '*',
  // Histidine & Glutamine
  'CAT': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  'CAU': 'H', 'CAC': 'H', 'CAA': 'Q', 'CAG': 'Q',
  // Asparagine & Lysine
  'AAT': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  'AAU': 'N', 'AAC': 'N', 'AAA': 'K', 'AAG': 'K',
  // Aspartic Acid & Glutamic Acid
  'GAT': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  'GAU': 'D', 'GAC': 'D', 'GAA': 'E', 'GAG': 'E',
  // Cysteine, Stop & Tryptophan
  'TGT': 'C', 'TGC': 'C', 'TGA': '*', 'TGG': 'W',
  'UGU': 'C', 'UGC': 'C', 'UGA': '*', 'UGG': 'W',
  // Arginine
  'CGT': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  'CGU': 'R', 'CGC': 'R', 'CGA': 'R', 'CGG': 'R',
  // Serine & Arginine
  'AGT': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  'AGU': 'S', 'AGC': 'S', 'AGA': 'R', 'AGG': 'R',
  // Glycine
  'GGT': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G',
  'GGU': 'G', 'GGC': 'G', 'GGA': 'G', 'GGG': 'G'
};

const AMINO_ACID_NAMES = {
  'A': 'Alanine', 'R': 'Arginine', 'N': 'Asparagine', 'D': 'Aspartic Acid',
  'C': 'Cysteine', 'E': 'Glutamic Acid', 'Q': 'Glutamine', 'G': 'Glycine',
  'H': 'Histidine', 'I': 'Isoleucine', 'L': 'Leucine', 'K': 'Lysine',
  'M': 'Methionine', 'F': 'Phenylalanine', 'P': 'Proline', 'S': 'Serine',
  'T': 'Threonine', 'W': 'Tryptophan', 'Y': 'Tyrosine', 'V': 'Valine',
  '*': 'Stop Codon', 'X': 'Unknown / Ambiguous'
};

// Monoisotopic Amino Acid Residue Molecular Weights in Daltons (g/mol)
const AMINO_ACID_RESIDUE_MW = {
  'A': 71.0788,  'R': 156.1875, 'N': 114.1038, 'D': 115.0886,
  'C': 103.1388, 'E': 129.1155, 'Q': 128.1307, 'G': 57.0519,
  'H': 137.1411, 'I': 113.1594, 'L': 113.1594, 'K': 128.1741,
  'M': 131.1926, 'F': 147.1766, 'P': 97.1167,  'S': 87.0782,
  'T': 101.1051, 'W': 186.2132, 'Y': 163.1760, 'V': 99.1326
};

// Kyte-Doolittle Hydropathy Scale (for GRAVY index calculation)
const KYTE_DOOLITTLE = {
  'A': 1.8,  'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
  'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
  'L': 3.8,  'K': -3.9, 'M': 1.9,  'F': 2.8,  'P': -1.6,
  'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
};

// BLOSUM62 Scoring Matrix (Substitutions: >= 0 is conservative)
const BLOSUM62 = {
  'A': {'A':4,'R':-1,'N':-2,'D':-2,'C':0,'Q':-1,'E':-1,'G':0,'H':-2,'I':-1,'L':-1,'K':-1,'M':-1,'F':-2,'P':-1,'S':1,'T':0,'W':-3,'Y':-2,'V':0},
  'R': {'A':-1,'R':5,'N':0,'D':-2,'C':-3,'Q':1,'E':0,'G':-2,'H':0,'I':-3,'L':-2,'K':2,'M':-1,'F':-3,'P':-2,'S':-1,'T':-1,'W':-3,'Y':-2,'V':-3},
  'N': {'A':-2,'R':0,'N':6,'D':1,'C':-3,'Q':0,'E':0,'G':0,'H':1,'I':-3,'L':-3,'K':0,'M':-2,'F':-3,'P':-2,'S':1,'T':0,'W':-4,'Y':-2,'V':-3},
  'D': {'A':-2,'R':-2,'N':1,'D':6,'C':-3,'Q':0,'E':2,'G':-1,'H':-1,'I':-3,'L':-3,'K':-1,'M':-3,'F':-3,'P':-1,'S':0,'T':-1,'W':-4,'Y':-3,'V':-3},
  'C': {'A':0,'R':-3,'N':-3,'D':-3,'C':9,'Q':-3,'E':-4,'G':-3,'H':-3,'I':-1,'L':-1,'K':-3,'M':-1,'F':-2,'P':-3,'S':-1,'T':-1,'W':-2,'Y':-2,'V':-1},
  'Q': {'A':-1,'R':1,'N':0,'D':0,'C':-3,'Q':5,'E':2,'G':-2,'H':0,'I':-3,'L':-2,'K':1,'M':0,'F':-3,'P':-1,'S':0,'T':-1,'W':-2,'Y':-1,'V':-2},
  'E': {'A':-1,'R':0,'N':0,'D':2,'C':-4,'Q':2,'E':5,'G':-2,'H':0,'I':-3,'L':-3,'K':1,'M':-2,'F':-3,'P':-1,'S':0,'T':-1,'W':-3,'Y':-2,'V':-2},
  'G': {'A':0,'R':-2,'N':0,'D':-1,'C':-3,'Q':-2,'E':-2,'G':6,'H':-2,'I':-4,'L':-4,'K':-2,'M':-3,'F':-3,'P':-2,'S':0,'T':-2,'W':-2,'Y':-3,'V':-3},
  'H': {'A':-2,'R':0,'N':1,'D':-1,'C':-3,'Q':0,'E':0,'G':-2,'H':8,'I':-3,'L':-3,'K':-1,'M':-2,'F':-1,'P':-2,'S':-1,'T':-2,'W':-2,'Y':2,'V':-3},
  'I': {'A':-1,'R':-3,'N':-3,'D':-3,'C':-1,'Q':-3,'E':-3,'G':-4,'H':-3,'I':4,'L':2,'K':-3,'M':1,'F':0,'P':-3,'S':-2,'T':-1,'W':-3,'Y':-1,'V':3},
  'L': {'A':-1,'R':-2,'N':-3,'D':-3,'C':-1,'Q':-2,'E':-3,'G':-4,'H':-3,'I':2,'L':4,'K':-2,'M':2,'F':0,'P':-3,'S':-2,'T':-1,'W':-2,'Y':-1,'V':1},
  'K': {'A':-1,'R':2,'N':0,'D':-1,'C':-3,'Q':1,'E':1,'G':-2,'H':-1,'I':-3,'L':-2,'K':5,'M':-1,'F':-3,'P':-1,'S':0,'T':-1,'W':-3,'Y':-2,'V':-2},
  'M': {'A':-1,'R':-1,'N':-2,'D':-3,'C':-1,'Q':0,'E':-2,'G':-3,'H':-2,'I':1,'L':2,'K':-1,'M':5,'F':0,'P':-2,'S':-1,'T':-1,'W':-1,'Y':-1,'V':1},
  'F': {'A':-2,'R':-3,'N':-3,'D':-3,'C':-2,'Q':-3,'E':-3,'G':-3,'H':-1,'I':0,'L':0,'K':-3,'M':0,'F':6,'P':-4,'S':-2,'T':-2,'W':1,'Y':3,'V':-1},
  'P': {'A':-1,'R':-2,'N':-2,'D':-1,'C':-3,'Q':-1,'E':-1,'G':-2,'H':-2,'I':-3,'L':-3,'K':-1,'M':-2,'F':-4,'P':7,'S':-1,'T':-1,'W':-4,'Y':-3,'V':-2},
  'S': {'A':1,'R':-1,'N':1,'D':0,'C':-1,'Q':0,'E':0,'G':0,'H':-1,'I':-2,'L':-2,'K':0,'M':-1,'F':-2,'P':-1,'S':4,'T':1,'W':-3,'Y':-2,'V':-2},
  'T': {'A':0,'R':-1,'N':0,'D':-1,'C':-1,'Q':-1,'E':-1,'G':-2,'H':-2,'I':-1,'L':-1,'K':-1,'M':-1,'F':-2,'P':-1,'S':1,'T':5,'W':-2,'Y':-2,'V':0},
  'W': {'A':-3,'R':-3,'N':-4,'D':-4,'C':-2,'Q':-2,'E':-3,'G':-2,'H':-2,'I':-3,'L':-2,'K':-3,'M':-1,'F':1,'P':-4,'S':-3,'T':-2,'W':11,'Y':2,'V':-3},
  'Y': {'A':-2,'R':-2,'N':-2,'D':-3,'C':-2,'Q':-1,'E':-2,'G':-3,'H':2,'I':-1,'L':-1,'K':-2,'M':-1,'F':3,'P':-3,'S':-2,'T':-2,'W':2,'Y':7,'V':-1},
  'V': {'A':0,'R':-3,'N':-3,'D':-3,'C':-1,'Q':-2,'E':-2,'G':-3,'H':-3,'I':3,'L':1,'K':-2,'M':1,'F':-1,'P':-2,'S':-2,'T':0,'W':-3,'Y':-1,'V':4}
};

// -------------------------------------------------------------------------
// Sequence Auto-Detection & Validation
// -------------------------------------------------------------------------

/**
 * Automatically inspects a sequence and detects whether it is DNA, RNA, or Protein.
 * @param {string} rawSequence 
 * @returns {{ detectedType: 'DNA' | 'RNA' | 'PROTEIN' | 'AMBIGUOUS' | 'INVALID', suggestedType: 'DNA' | 'RNA' | 'PROTEIN', confidence: number, reasoning: string }}
 */
function detectSequenceType(rawSequence) {
  if (!rawSequence || typeof rawSequence !== 'string') {
    return { detectedType: 'INVALID', suggestedType: 'DNA', confidence: 0, reasoning: 'Empty sequence' };
  }

  const cleaned = rawSequence.replace(/\s+/g, '').toUpperCase();
  if (cleaned.length === 0) {
    return { detectedType: 'INVALID', suggestedType: 'DNA', confidence: 0, reasoning: 'Empty sequence' };
  }

  const hasT = cleaned.includes('T');
  const hasU = cleaned.includes('U');

  // Check unique amino acids not present in DNA/RNA (E, F, I, P, Q, V, W, Y)
  const uniqueProteinLetters = new Set(['E', 'F', 'I', 'P', 'Q', 'V', 'W', 'Y', 'L', 'M', 'K', 'H', 'D', 'R', 'S']);
  let proteinUniqueCount = 0;
  for (let ch of cleaned) {
    if (uniqueProteinLetters.has(ch) && ch !== 'A' && ch !== 'C' && ch !== 'G' && ch !== 'T' && ch !== 'U' && ch !== 'N') {
      proteinUniqueCount++;
    }
  }

  // Definite Protein: Contains letters strictly unique to amino acids
  if (proteinUniqueCount > 0) {
    return {
      detectedType: 'PROTEIN',
      suggestedType: 'PROTEIN',
      confidence: 0.99,
      reasoning: `Contains ${proteinUniqueCount} amino acid residues unique to proteins (e.g. E, F, P, Q, V, W, Y)`
    };
  }

  // RNA: Contains Uracil and no Thymine
  if (hasU && !hasT) {
    return {
      detectedType: 'RNA',
      suggestedType: 'RNA',
      confidence: 0.98,
      reasoning: 'Contains Uracil (U) and no Thymine (T)'
    };
  }

  // DNA: Contains Thymine and no Uracil
  if (hasT && !hasU) {
    return {
      detectedType: 'DNA',
      suggestedType: 'DNA',
      confidence: 0.98,
      reasoning: 'Contains Thymine (T) and no Uracil (U)'
    };
  }

  // Ambiguous case: Contains only A, C, G, N (valid in both DNA and RNA)
  if (!hasT && !hasU && /^[ACGN-]+$/.test(cleaned)) {
    return {
      detectedType: 'AMBIGUOUS',
      suggestedType: 'DNA',
      confidence: 0.60,
      reasoning: 'Contains only A, C, G; compatible with both DNA and RNA. Defaulting to DNA.'
    };
  }

  // Has both T and U: Invalid nucleic acid
  if (hasT && hasU) {
    return {
      detectedType: 'INVALID',
      suggestedType: 'DNA',
      confidence: 0.0,
      reasoning: 'Contains both Thymine (T) and Uracil (U), which is chemically impossible in standard nucleic acids'
    };
  }

  return {
    detectedType: 'AMBIGUOUS',
    suggestedType: 'PROTEIN',
    confidence: 0.50,
    reasoning: 'Standard amino acid or degenerate nucleotide mix'
  };
}

/**
 * Validates an RNA sequence.
 * @param {string} rawSequence 
 * @param {boolean} allowAmbiguous 
 * @returns {{ isValid: boolean, cleaned: string, invalidChars: string[] }}
 */
function validateRnaSequence(rawSequence, allowAmbiguous = false) {
  if (!rawSequence || typeof rawSequence !== 'string') {
    return { isValid: false, cleaned: '', invalidChars: ['EMPTY_INPUT'] };
  }
  const cleaned = rawSequence.replace(/\s+/g, '').toUpperCase();
  const validChars = allowAmbiguous ? 'ACGUURYMKWSBDHVN-' : 'ACGU-';
  const invalidChars = [];

  for (let ch of cleaned) {
    if (!validChars.includes(ch) && !invalidChars.includes(ch)) {
      invalidChars.push(ch);
    }
  }

  return {
    isValid: invalidChars.length === 0,
    cleaned,
    invalidChars
  };
}

/**
 * Validates a Protein sequence against standard 20 amino acids + ambiguous codes.
 * @param {string} rawSequence 
 * @param {boolean} allowAmbiguous - Allow B (D/N), Z (E/Q), J (I/L), X (Any), * (Stop)
 * @returns {{ isValid: boolean, cleaned: string, invalidChars: string[] }}
 */
function validateProteinSequence(rawSequence, allowAmbiguous = true) {
  if (!rawSequence || typeof rawSequence !== 'string') {
    return { isValid: false, cleaned: '', invalidChars: ['EMPTY_INPUT'] };
  }
  const cleaned = rawSequence.replace(/\s+/g, '').toUpperCase();
  const validChars = allowAmbiguous ? 'ACDEFGHIKLMNPQRSTVWYBZJX*-' : 'ACDEFGHIKLMNPQRSTVWY-';
  const invalidChars = [];

  for (let ch of cleaned) {
    if (!validChars.includes(ch) && !invalidChars.includes(ch)) {
      invalidChars.push(ch);
    }
  }

  return {
    isValid: invalidChars.length === 0,
    cleaned,
    invalidChars
  };
}

// -------------------------------------------------------------------------
// RNA Metrics & Transcription
// -------------------------------------------------------------------------

/**
 * Computes RNA nucleotide frequencies, GC%, AU%, and skew.
 * @param {string} sequence 
 */
function calculateRnaMetrics(sequence) {
  const { cleaned } = validateRnaSequence(sequence, true);
  const length = cleaned.length;
  const counts = { A: 0, U: 0, C: 0, G: 0, other: 0 };

  for (let ch of cleaned) {
    if (ch === 'A') counts.A++;
    else if (ch === 'U') counts.U++;
    else if (ch === 'C') counts.C++;
    else if (ch === 'G') counts.G++;
    else if (ch !== '-') counts.other++;
  }

  const validBases = counts.A + counts.U + counts.C + counts.G;
  const gcContent = validBases > 0 ? ((counts.G + counts.C) / validBases) * 100 : 0;
  const auContent = validBases > 0 ? ((counts.A + counts.U) / validBases) * 100 : 0;
  const gcSkew = (counts.G + counts.C) > 0 ? (counts.G - counts.C) / (counts.G + counts.C) : 0;
  const auSkew = (counts.A + counts.U) > 0 ? (counts.A - counts.U) / (counts.A + counts.U) : 0;

  return {
    length,
    counts,
    gcContent: parseFloat(gcContent.toFixed(2)),
    auContent: parseFloat(auContent.toFixed(2)),
    gcSkew: parseFloat(gcSkew.toFixed(4)),
    auSkew: parseFloat(auSkew.toFixed(4))
  };
}

/**
 * Transcribes coding DNA to mRNA (replaces T with U, preserving 5' to 3' orientation).
 * @param {string} dnaSequence 
 * @param {boolean} isTemplateStrand - If true, generates Watson-Crick complement with T->U
 * @returns {string}
 */
function transcribeDnaToRna(dnaSequence, isTemplateStrand = false) {
  const cleaned = dnaSequence.replace(/\s+/g, '').toUpperCase();
  if (!isTemplateStrand) {
    // Coding strand transcription (direct T -> U)
    return cleaned.replace(/T/g, 'U');
  } else {
    // Template strand transcription: invert and complement to generate 5' -> 3' mRNA
    const rna = [];
    for (let i = cleaned.length - 1; i >= 0; i--) {
      const ch = cleaned[i];
      if (ch === 'A') rna.push('U');
      else if (ch === 'T') rna.push('A');
      else if (ch === 'C') rna.push('G');
      else if (ch === 'G') rna.push('C');
      else rna.push(ch);
    }
    return rna.join('');
  }
}

/**
 * Reverse transcribes RNA into cDNA (replaces U with T).
 * @param {string} rnaSequence 
 * @returns {string}
 */
function reverseTranscribeRnaToDna(rnaSequence) {
  return rnaSequence.replace(/\s+/g, '').toUpperCase().replace(/U/g, 'T');
}

// -------------------------------------------------------------------------
// 6-Frame Genetic Translation & ORF Finder
// -------------------------------------------------------------------------

/**
 * Translates a nucleotide sequence in 6 reading frames (+1, +2, +3, -1, -2, -3).
 * @param {string} sequence - DNA or RNA sequence
 * @param {string} codonTable - 'STANDARD' | 'VERTEBRATE_MITOCHONDRIAL'
 * @returns {{ forwardFrames: Array, reverseFrames: Array, orfs: Array }}
 */
function translateSixFrames(sequence, codonTable = 'STANDARD') {
  // Normalize sequence: replace U with T for codon table lookup
  const dnaClean = sequence.replace(/\s+/g, '').toUpperCase().replace(/U/g, 'T');
  const len = dnaClean.length;

  // Build reverse complement
  const revCompChars = [];
  for (let i = len - 1; i >= 0; i--) {
    revCompChars.push(DNA_COMPLEMENT[dnaClean[i]] || 'N');
  }
  const revComp = revCompChars.join('');

  const translateFrame = (seq, frameNum, strand) => {
    const offset = Math.abs(frameNum) - 1;
    const codons = [];
    let protein = '';
    let stopCount = 0;

    for (let i = offset; i + 3 <= seq.length; i += 3) {
      const codon = seq.slice(i, i + 3);
      const aa = STANDARD_CODON_TABLE[codon] || 'X';
      const name = AMINO_ACID_NAMES[aa] || 'Unknown';
      
      if (aa === '*') stopCount++;
      protein += aa;

      codons.push({
        codon,
        aminoAcid: aa,
        name,
        position: codons.length + 1
      });
    }

    return {
      frame: frameNum,
      strand,
      proteinSequence: protein,
      codons,
      stopCount
    };
  };

  const forwardFrames = [
    translateFrame(dnaClean, 1, '+'),
    translateFrame(dnaClean, 2, '+'),
    translateFrame(dnaClean, 3, '+')
  ];

  const reverseFrames = [
    translateFrame(revComp, -1, '-'),
    translateFrame(revComp, -2, '-'),
    translateFrame(revComp, -3, '-')
  ];

  // Scan all frames for Open Reading Frames (ORFs)
  const orfs = [];
  const allFrames = [...forwardFrames, ...reverseFrames];

  allFrames.forEach((rf) => {
    const prot = rf.proteinSequence;
    const isForward = rf.strand === '+';
    const offset = Math.abs(rf.frame) - 1;

    let inOrf = false;
    let startIdx = -1;
    let currentAaSeq = '';

    for (let i = 0; i < prot.length; i++) {
      const aa = prot[i];
      if (aa === 'M' && !inOrf) {
        inOrf = true;
        startIdx = i;
        currentAaSeq = 'M';
      } else if (inOrf) {
        if (aa === '*') {
          // ORF ended with stop codon
          if (currentAaSeq.length >= 8) { // Minimum 8 AA filter
            const startNt = isForward 
              ? offset + (startIdx * 3) + 1 
              : len - (offset + (i * 3) + 3) + 1;
            const endNt = isForward 
              ? offset + (i * 3) + 3 
              : len - (offset + (startIdx * 3)) ;

            orfs.push({
              frame: rf.frame,
              strand: rf.strand,
              startNucleotide: Math.min(startNt, endNt),
              endNucleotide: Math.max(startNt, endNt),
              lengthNucleotides: (i - startIdx + 1) * 3,
              lengthAminoAcids: currentAaSeq.length,
              proteinSequence: currentAaSeq,
              hasStartCodon: true,
              hasStopCodon: true
            });
          }
          inOrf = false;
          currentAaSeq = '';
        } else {
          currentAaSeq += aa;
        }
      }
    }

    // Trailing ORF without stop codon at the end of the transcript
    if (inOrf && currentAaSeq.length >= 8) {
      orfs.push({
        frame: rf.frame,
        strand: rf.strand,
        startNucleotide: offset + (startIdx * 3) + 1,
        endNucleotide: offset + (prot.length * 3),
        lengthNucleotides: currentAaSeq.length * 3,
        lengthAminoAcids: currentAaSeq.length,
        proteinSequence: currentAaSeq,
        hasStartCodon: true,
        hasStopCodon: false
      });
    }
  });

  // Sort ORFs by descending protein length
  orfs.sort((a, b) => b.lengthAminoAcids - a.lengthAminoAcids);

  return {
    forwardFrames,
    reverseFrames,
    orfs,
    codonTable
  };
}

// -------------------------------------------------------------------------
// Protein Characterization & BLOSUM62 Alignment
// -------------------------------------------------------------------------

/**
 * Computes Protein composition, Molecular Weight, Isoelectric Point (pI), and GRAVY.
 * @param {string} proteinSequence 
 */
function calculateProteinMetrics(proteinSequence) {
  const { cleaned } = validateProteinSequence(proteinSequence, true);
  const length = cleaned.length;

  const aminoAcidCounts = {};
  const frequencies = {};

  for (let ch of cleaned) {
    if (ch === '-' || ch === '*') continue;
    aminoAcidCounts[ch] = (aminoAcidCounts[ch] || 0) + 1;
  }

  let totalValidAa = 0;
  for (let k in aminoAcidCounts) totalValidAa += aminoAcidCounts[k];

  for (let k in aminoAcidCounts) {
    frequencies[k] = parseFloat(((aminoAcidCounts[k] / totalValidAa) * 100).toFixed(2));
  }

  // Molecular Weight (Da): Sum of residue weights + water (18.015 Da) for intact ends
  let mw = 0;
  for (let ch of cleaned) {
    if (AMINO_ACID_RESIDUE_MW[ch]) {
      mw += AMINO_ACID_RESIDUE_MW[ch];
    }
  }
  if (totalValidAa > 1) {
    mw += 18.015; // Terminal H and OH (H2O)
  }

  // Isoelectric Point (pI) estimation via Bisection Method (Henderson-Hasselbalch)
  // Standard pKa values for N-term, C-term, and charged side chains
  const pKa = {
    nTerm: 9.69, cTerm: 2.34,
    'D': 3.86, 'E': 4.25, 'C': 8.33, 'Y': 10.07,
    'H': 6.00, 'K': 10.53, 'R': 12.48
  };

  const getNetCharge = (pH) => {
    let charge = 0;
    // N-terminus
    charge += 1 / (1 + Math.pow(10, pH - pKa.nTerm));
    // C-terminus
    charge -= 1 / (1 + Math.pow(10, pKa.cTerm - pH));

    // Positively charged side chains (H, K, R)
    if (aminoAcidCounts['H']) charge += aminoAcidCounts['H'] / (1 + Math.pow(10, pH - pKa['H']));
    if (aminoAcidCounts['K']) charge += aminoAcidCounts['K'] / (1 + Math.pow(10, pH - pKa['K']));
    if (aminoAcidCounts['R']) charge += aminoAcidCounts['R'] / (1 + Math.pow(10, pH - pKa['R']));

    // Negatively charged side chains (D, E, C, Y)
    if (aminoAcidCounts['D']) charge -= aminoAcidCounts['D'] / (1 + Math.pow(10, pKa['D'] - pH));
    if (aminoAcidCounts['E']) charge -= aminoAcidCounts['E'] / (1 + Math.pow(10, pKa['E'] - pH));
    if (aminoAcidCounts['C']) charge -= aminoAcidCounts['C'] / (1 + Math.pow(10, pKa['C'] - pH));
    if (aminoAcidCounts['Y']) charge -= aminoAcidCounts['Y'] / (1 + Math.pow(10, pKa['Y'] - pH));

    return charge;
  };

  let minPh = 0.0, maxPh = 14.0, estimatedPI = 7.0;
  for (let iter = 0; iter < 15; iter++) {
    estimatedPI = (minPh + maxPh) / 2;
    const charge = getNetCharge(estimatedPI);
    if (charge > 0) minPh = estimatedPI;
    else maxPh = estimatedPI;
  }

  // GRAVY (Grand Average of Hydropathicity)
  let gravySum = 0;
  let gravyCount = 0;
  for (let ch of cleaned) {
    if (KYTE_DOOLITTLE[ch] !== undefined) {
      gravySum += KYTE_DOOLITTLE[ch];
      gravyCount++;
    }
  }
  const gravyIndex = gravyCount > 0 ? parseFloat((gravySum / gravyCount).toFixed(3)) : 0;

  return {
    length: totalValidAa,
    aminoAcidCounts,
    frequencies,
    molecularWeightDaltons: parseFloat(mw.toFixed(2)),
    isoelectricPoint: parseFloat(estimatedPI.toFixed(2)),
    gravyIndex
  };
}

/**
 * Needleman-Wunsch Global Alignment for Protein Sequences using BLOSUM62.
 * @param {string} refSeq 
 * @param {string} altSeq 
 * @param {number} gapPenalty 
 */
function alignProteinBlosum62(refSeq, altSeq, gapPenalty = -4) {
  const ref = refSeq.replace(/\s+/g, '').toUpperCase();
  const alt = altSeq.replace(/\s+/g, '').toUpperCase();
  const n = ref.length;
  const m = alt.length;

  const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));

  for (let i = 0; i <= n; i++) dp[i][0] = i * gapPenalty;
  for (let j = 0; j <= m; j++) dp[0][j] = j * gapPenalty;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const r = ref[i - 1];
      const a = alt[j - 1];
      const score = (BLOSUM62[r] && BLOSUM62[r][a] !== undefined) ? BLOSUM62[r][a] : -2;

      const diag = dp[i - 1][j - 1] + score;
      const up = dp[i - 1][j] + gapPenalty;
      const left = dp[i][j - 1] + gapPenalty;

      dp[i][j] = Math.max(diag, up, left);
    }
  }

  let refAligned = '';
  let altAligned = '';
  let i = n, j = m;

  while (i > 0 || j > 0) {
    const r = i > 0 ? ref[i - 1] : null;
    const a = j > 0 ? alt[j - 1] : null;
    const score = (r && a && BLOSUM62[r] && BLOSUM62[r][a] !== undefined) ? BLOSUM62[r][a] : -2;

    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + score) {
      refAligned = r + refAligned;
      altAligned = a + altAligned;
      i--; j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gapPenalty) {
      refAligned = r + refAligned;
      altAligned = '-' + altAligned;
      i--;
    } else {
      refAligned = '-' + refAligned;
      altAligned = a + altAligned;
      j--;
    }
  }

  let identical = 0;
  let similar = 0;
  const substitutions = [];
  let refPos = 0;

  for (let k = 0; k < refAligned.length; k++) {
    const r = refAligned[k];
    const a = altAligned[k];

    if (r !== '-') refPos++;

    if (r === a && r !== '-') {
      identical++;
      similar++;
    } else if (r !== '-' && a !== '-') {
      const blosumScore = (BLOSUM62[r] && BLOSUM62[r][a] !== undefined) ? BLOSUM62[r][a] : -2;
      const isConservative = blosumScore >= 0;
      if (isConservative) similar++;

      substitutions.push({
        position: refPos,
        refResidue: r,
        altResidue: a,
        isConservative,
        score: blosumScore,
        description: `p.${AMINO_ACID_NAMES[r]?.slice(0, 3) || r}${refPos}${AMINO_ACID_NAMES[a]?.slice(0, 3) || a}`
      });
    }
  }

  const alignLen = refAligned.length;
  const identityPercent = alignLen > 0 ? (identical / alignLen) * 100 : 0;
  const similarityPercent = alignLen > 0 ? (similar / alignLen) * 100 : 0;

  return {
    score: dp[n][m],
    refAligned,
    altAligned,
    alignmentLength: alignLen,
    identicalMatches: identical,
    identityPercent: parseFloat(identityPercent.toFixed(2)),
    similarityPercent: parseFloat(similarityPercent.toFixed(2)),
    substitutions
  };
}

// -------------------------------------------------------------------------
// Existing DNA Alignments & Utilities (Preserved for compatibility)
// -------------------------------------------------------------------------

const PURINES = new Set(['A', 'G']);
const PYRIMIDINES = new Set(['C', 'T']);

function validateDnaSequence(rawSequence, allowAmbiguous = false) {
  if (!rawSequence || typeof rawSequence !== 'string') {
    return { isValid: false, cleaned: '', invalidChars: ['EMPTY_INPUT'] };
  }
  const cleaned = rawSequence.replace(/\s+/g, '').toUpperCase();
  const validChars = allowAmbiguous ? 'ACGTURYMKWSBDHVN-' : 'ACGT-';
  const invalidChars = [];

  for (let ch of cleaned) {
    if (!validChars.includes(ch) && !invalidChars.includes(ch)) {
      invalidChars.push(ch);
    }
  }

  return {
    isValid: invalidChars.length === 0,
    cleaned,
    invalidChars
  };
}

function parseFasta(fastaContent) {
  if (!fastaContent || typeof fastaContent !== 'string') return [];
  const lines = fastaContent.split(/\r?\n/);
  const records = [];
  let currentRecord = null;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith(';')) continue;

    if (line.startsWith('>')) {
      if (currentRecord) {
        currentRecord.length = currentRecord.sequence.length;
        records.push(currentRecord);
      }
      const header = line.slice(1).trim();
      const firstSpace = header.indexOf(' ');
      const id = firstSpace !== -1 ? header.slice(0, firstSpace) : header;
      const description = firstSpace !== -1 ? header.slice(firstSpace + 1).trim() : '';
      currentRecord = { id, description, sequence: '', length: 0 };
    } else if (currentRecord) {
      currentRecord.sequence += line.replace(/\s+/g, '').toUpperCase();
    } else {
      currentRecord = {
        id: 'Sequence_1',
        description: 'Direct sequence input',
        sequence: line.replace(/\s+/g, '').toUpperCase(),
        length: 0
      };
    }
  }
  if (currentRecord) {
    currentRecord.length = currentRecord.sequence.length;
    records.push(currentRecord);
  }
  return records;
}

function calculateNucleotideMetrics(sequence) {
  const { cleaned } = validateDnaSequence(sequence, true);
  const length = cleaned.length;
  const counts = { A: 0, T: 0, C: 0, G: 0, other: 0 };

  for (let ch of cleaned) {
    if (ch === 'A') counts.A++;
    else if (ch === 'T' || ch === 'U') counts.T++;
    else if (ch === 'C') counts.C++;
    else if (ch === 'G') counts.G++;
    else if (ch !== '-') counts.other++;
  }

  const validBases = counts.A + counts.T + counts.C + counts.G;
  const gcContent = validBases > 0 ? ((counts.G + counts.C) / validBases) * 100 : 0;
  const atContent = validBases > 0 ? ((counts.A + counts.T) / validBases) * 100 : 0;
  const gcSkew = (counts.G + counts.C) > 0 ? (counts.G - counts.C) / (counts.G + counts.C) : 0;
  const atSkew = (counts.A + counts.T) > 0 ? (counts.A - counts.T) / (counts.A + counts.T) : 0;

  return {
    length,
    counts,
    gcContent: parseFloat(gcContent.toFixed(2)),
    atContent: parseFloat(atContent.toFixed(2)),
    gcSkew: parseFloat(gcSkew.toFixed(4)),
    atSkew: parseFloat(atSkew.toFixed(4))
  };
}

function getReverseComplement(sequence) {
  const seq = sequence.replace(/\s+/g, '').toUpperCase();
  const complement = [];
  for (let i = seq.length - 1; i >= 0; i--) {
    complement.push(DNA_COMPLEMENT[seq[i]] || 'N');
  }
  return complement.join('');
}

function findMotifs(sequence, motif, searchBothStrands = true) {
  const seq = sequence.replace(/\s+/g, '').toUpperCase();
  const mot = motif.replace(/\s+/g, '').toUpperCase();
  if (!seq || !mot || mot.length > seq.length) return [];

  const matches = [];
  let startIndex = 0;
  while ((startIndex = seq.indexOf(mot, startIndex)) !== -1) {
    matches.push({
      start: startIndex + 1,
      end: startIndex + mot.length,
      strand: '+',
      matchedSequence: mot
    });
    startIndex += 1;
  }

  if (searchBothStrands) {
    const revMotif = getReverseComplement(mot);
    if (revMotif !== mot) {
      let revIdx = 0;
      while ((revIdx = seq.indexOf(revMotif, revIdx)) !== -1) {
        matches.push({
          start: revIdx + 1,
          end: revIdx + revMotif.length,
          strand: '-',
          matchedSequence: revMotif
        });
        revIdx += 1;
      }
    }
  }

  matches.sort((a, b) => a.start - b.start);
  return matches;
}

function needlemanWunsch(refSeq, altSeq, options = { match: 2, mismatch: -1, gap: -2 }) {
  const ref = refSeq.replace(/\s+/g, '').toUpperCase();
  const alt = altSeq.replace(/\s+/g, '').toUpperCase();
  const n = ref.length, m = alt.length;
  const match = options.match ?? 2;
  const mismatch = options.mismatch ?? -1;
  const gap = options.gap ?? -2;

  const scoreMatrix = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = 0; i <= n; i++) scoreMatrix[i][0] = i * gap;
  for (let j = 0; j <= m; j++) scoreMatrix[0][j] = j * gap;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const matchScore = (ref[i - 1] === alt[j - 1]) ? match : mismatch;
      const diag = scoreMatrix[i - 1][j - 1] + matchScore;
      const up = scoreMatrix[i - 1][j] + gap;
      const left = scoreMatrix[i][j - 1] + gap;
      scoreMatrix[i][j] = Math.max(diag, up, left);
    }
  }

  let refAligned = '', altAligned = '';
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j - 1] + ((ref[i - 1] === alt[j - 1]) ? match : mismatch)) {
      refAligned = ref[i - 1] + refAligned;
      altAligned = alt[j - 1] + altAligned;
      i--; j--;
    } else if (i > 0 && scoreMatrix[i][j] === scoreMatrix[i - 1][j] + gap) {
      refAligned = ref[i - 1] + refAligned;
      altAligned = '-' + altAligned;
      i--;
    } else {
      refAligned = '-' + refAligned;
      altAligned = alt[j - 1] + altAligned;
      j--;
    }
  }

  let identicalMatches = 0;
  for (let k = 0; k < refAligned.length; k++) {
    if (refAligned[k] === altAligned[k] && refAligned[k] !== '-') identicalMatches++;
  }

  const identity = refAligned.length > 0 ? (identicalMatches / refAligned.length) * 100 : 0;
  const mutations = detectMutations(refAligned, altAligned);

  return {
    score: scoreMatrix[n][m],
    refAligned,
    altAligned,
    alignmentLength: refAligned.length,
    identicalMatches,
    identity: parseFloat(identity.toFixed(2)),
    mutations
  };
}

function detectMutations(refAligned, altAligned) {
  const mutations = [];
  let refPos = 0;

  for (let i = 0; i < refAligned.length; i++) {
    const r = refAligned[i];
    const a = altAligned[i];

    if (r !== '-') refPos++;

    if (r !== a) {
      if (r !== '-' && a !== '-') {
        const isRefPurine = PURINES.has(r);
        const isAltPurine = PURINES.has(a);
        const isTransition = (isRefPurine && isAltPurine) || (PYRIMIDINES.has(r) && PYRIMIDINES.has(a));
        const subType = isTransition ? 'TRANSITION' : 'TRANSVERSION';

        mutations.push({
          type: 'SUBSTITUTION',
          position: refPos,
          refBase: r,
          altBase: a,
          subType,
          description: `c.${refPos}${r}>${a} (${subType.toLowerCase()})`
        });
      } else if (r === '-' && a !== '-') {
        mutations.push({
          type: 'INSERTION',
          position: refPos,
          refBase: '-',
          altBase: a,
          length: 1,
          description: `ins${a} at pos ${refPos}`
        });
      } else if (r !== '-' && a === '-') {
        mutations.push({
          type: 'DELETION',
          position: refPos,
          refBase: r,
          altBase: '-',
          length: 1,
          description: `del${r} at pos ${refPos}`
        });
      }
    }
  }

  return mutations;
}

// Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectSequenceType,
    validateDnaSequence,
    validateRnaSequence,
    validateProteinSequence,
    parseFasta,
    calculateNucleotideMetrics,
    calculateRnaMetrics,
    transcribeDnaToRna,
    reverseTranscribeRnaToDna,
    getReverseComplement,
    findMotifs,
    needlemanWunsch,
    detectMutations,
    translateSixFrames,
    calculateProteinMetrics,
    alignProteinBlosum62,
    STANDARD_CODON_TABLE,
    AMINO_ACID_NAMES
  };
}
