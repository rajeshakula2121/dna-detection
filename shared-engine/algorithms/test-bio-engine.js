/**
 * Smart Bioinformatics Application - Comprehensive Multi-Modality Test Suite
 * Validates DNA, RNA, 6-Frame Translation, ORFs, and Protein Characterization.
 */

const fs = require('fs');
const path = require('path');
const {
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
  alignProteinBlosum62
} = require('./bio-engine');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`  \x1b[32m✔ PASS:\x1b[0m ${testName}`);
    passedTests++;
  } else {
    console.error(`  \x1b[31m✖ FAIL:\x1b[0m ${testName}`);
    if (details) console.error(`    Details: ${details}`);
  }
}

console.log('\n======================================================');
console.log('🧬 MULTI-MODALITY BIOINFORMATICS ENGINE: TEST SUITE');
console.log('======================================================\n');

// Group 1: Sequence Type Auto-Detection
console.log('[Test Group 1: Sequence Type Auto-Detection]');
const dnaDetect = detectSequenceType('ATGGTGCACCTGACTCCTGAGGAGAAGTCT');
assert(dnaDetect.detectedType === 'DNA', 'Detects DNA sequence with Thymine', dnaDetect.reasoning);

const rnaDetect = detectSequenceType('AUGGUGCACCUGACUCCUGAGGAGAAGUCU');
assert(rnaDetect.detectedType === 'RNA', 'Detects RNA sequence with Uracil', rnaDetect.reasoning);

const proteinDetect = detectSequenceType('MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVV');
assert(proteinDetect.detectedType === 'PROTEIN', 'Detects Protein with unique amino acids (E, V, L, P)', proteinDetect.reasoning);

const invalidMix = detectSequenceType('ATGUCGATCG');
assert(invalidMix.detectedType === 'INVALID', 'Detects invalid mixture of T and U in nucleic acid', invalidMix.reasoning);

// Group 2: RNA Validation & Metrics
console.log('\n[Test Group 2: RNA Validation & Composition Metrics]');
const validRna = validateRnaSequence('AUGGCCAAAUUU');
assert(validRna.isValid === true, 'Accepts valid RNA sequence (AUGGCCAAAUUU)');

const invalidRnaWithT = validateRnaSequence('AUGGCCAAATTT');
assert(invalidRnaWithT.isValid === false && invalidRnaWithT.invalidChars.includes('T'), 'Rejects Thymine (T) in RNA sequence');

const rnaMetrics = calculateRnaMetrics('GGCCAAAUUU');
assert(rnaMetrics.counts.U === 3, 'Counts 3 Uracil bases');
assert(rnaMetrics.gcContent === 40.0, 'Calculates RNA GC% as 40.0%');
assert(rnaMetrics.auContent === 60.0, 'Calculates RNA AU% as 60.0%');

// Group 3: DNA <-> RNA Transcription
console.log('\n[Test Group 3: DNA <-> RNA Transcription]');
const codingDna = 'ATGGTGCACCTGACTCCTGAG';
const transcribedRna = transcribeDnaToRna(codingDna, false);
assert(transcribedRna === 'AUGGUGCACCUGACUCCUGAG', 'Coding DNA correctly transcribes to mRNA (T -> U)');

const revTranscribedDna = reverseTranscribeRnaToDna(transcribedRna);
assert(revTranscribedDna === codingDna, 'Reverse transcription converts mRNA back to cDNA (U -> T)');

// Group 4: 6-Frame Genetic Translation & ORF Finder
console.log('\n[Test Group 4: 6-Frame Genetic Translation & Beta-Globin Exon]');
const normalHbbDna = fs.readFileSync(path.join(__dirname, '../test-samples/normal_hbb.fasta'), 'utf-8');
const hbbRecords = parseFasta(normalHbbDna);
const hbbSeq = hbbRecords[0].sequence;

const translation = translateSixFrames(hbbSeq);
assert(translation.forwardFrames.length === 3, 'Generates 3 forward reading frames (+1, +2, +3)');
assert(translation.reverseFrames.length === 3, 'Generates 3 reverse-complement reading frames (-1, -2, -3)');

// Frame +1 of HBB Exon 1 begins with MVHLTPEEKSAVTALWGKVNVDEVGGEALGRLLVVYPWTQRFFESFGDLSTPDAVMGNPKVKAHGKKVLGAFSDGLAHLDNLKGTFATLSELHCDKLHVDPENFR
const frame1 = translation.forwardFrames[0].proteinSequence;
assert(frame1.startsWith('MVHLTPEEKS'), 'Frame +1 translates to canonical Beta-Globin peptide starting with MVHLTPEEKS...', `Got: ${frame1.slice(0, 15)}`);

assert(translation.orfs.length > 0, 'Detects Open Reading Frames (ORFs)');
assert(translation.orfs[0].hasStartCodon === true, 'Top ORF initiates with Methionine start codon');

// Group 5: Protein Physicochemical Metrics & Molecular Weight
console.log('\n[Test Group 5: Protein Characterization & Molecular Weight]');
// Human Insulin A-Chain: GIVEQCCTSICSLYQLENYCN (21 AA, theoretical MW ~ 2383.7 Da)
const insulinA = 'GIVEQCCTSICSLYQLENYCN';
const insulinMetrics = calculateProteinMetrics(insulinA);
assert(insulinMetrics.length === 21, 'Insulin A chain length is 21 residues');
assert(insulinMetrics.molecularWeightDaltons > 2380 && insulinMetrics.molecularWeightDaltons < 2390, `Molecular weight accurate (~2384 Da, got ${insulinMetrics.molecularWeightDaltons} Da)`);
assert(insulinMetrics.isoelectricPoint > 3.0 && insulinMetrics.isoelectricPoint < 6.0, `Isoelectric point estimated in acidic range (${insulinMetrics.isoelectricPoint})`);

// Group 6: BLOSUM62 Alignment & Conservative vs Radical Classification
console.log('\n[Test Group 6: BLOSUM62 Protein Alignment]');
// Wildtype HBB peptide vs Sickle Cell mutant peptide (Glu -> Val at pos 6)
const wtHbbPeptide = 'MVHLTPEEK';
const sickleHbbPeptide = 'MVHLTPVEK';

const protAlign = alignProteinBlosum62(wtHbbPeptide, sickleHbbPeptide);
assert(protAlign.substitutions.length === 1, 'Identifies single amino acid substitution');
assert(protAlign.substitutions[0].position === 7, 'Mutation is at position 7 (codon 6 accounting for initiator Met)');
assert(protAlign.substitutions[0].refResidue === 'E' && protAlign.substitutions[0].altResidue === 'V', 'Substitutes Glutamic Acid (E) for Valine (V)');
assert(protAlign.substitutions[0].isConservative === false, 'Glu -> Val classified as Radical substitution (BLOSUM62 score < 0)');

// Group 7: Baseline DNA Tests (Needleman-Wunsch & Indels)
console.log('\n[Test Group 7: Baseline Needleman-Wunsch DNA Validation]');
const sickleDna = fs.readFileSync(path.join(__dirname, '../test-samples/sickle_cell_hbb.fasta'), 'utf-8');
const sickleRecords = parseFasta(sickleDna);
const dnaAlign = needlemanWunsch(hbbRecords[0].sequence, sickleRecords[0].sequence);
const dnaMutations = detectMutations(dnaAlign.refAligned, dnaAlign.altAligned);

assert(dnaMutations.length === 1, 'Exactly one DNA mutation detected in Sickle Cell HBB');
assert(dnaMutations[0].position === 20, 'c.20A>T detected at cDNA pos 20');
assert(dnaMutations[0].subType === 'TRANSVERSION', 'Classified as Transversion (A to T)');

console.log('\n------------------------------------------------------');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('------------------------------------------------------\n');

if (passedTests === totalTests) {
  console.log('\x1b[32m✔ ALL MULTI-MODALITY BIOINFORMATICS TESTS PASSED!\x1b[0m\n');
  process.exit(0);
} else {
  console.error('\x1b[31m✖ SOME TESTS FAILED!\x1b[0m\n');
  process.exit(1);
}
