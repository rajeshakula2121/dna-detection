"""
Coding Sequence Analysis Engine
Translates nucleotide sequences across all 6 reading frames, detects ORFs,
and computes functional coding mutations:
  - Synonymous vs Missense vs Nonsense (stop-gained) vs Stop-lost
  - Indel-induced frameshift detection
  - Physicochemical residue impact (conservative vs radical)
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict

# Standard NCBI Genetic Code Table 1
STANDARD_CODON_TABLE: Dict[str, str] = {
    'ATA': 'I', 'ATC': 'I', 'ATT': 'I', 'ATG': 'M',
    'ACA': 'T', 'ACC': 'T', 'ACG': 'T', 'ACT': 'T',
    'AAC': 'N', 'AAT': 'N', 'AAA': 'K', 'AAG': 'K',
    'AGC': 'S', 'AGT': 'S', 'AGA': 'R', 'AGG': 'R',
    'CTA': 'L', 'CTC': 'L', 'CTG': 'L', 'CTT': 'L',
    'CCA': 'P', 'CCC': 'P', 'CCG': 'P', 'CCT': 'P',
    'CAC': 'H', 'CAT': 'H', 'CAA': 'Q', 'CAG': 'Q',
    'CGA': 'R', 'CGC': 'R', 'CGG': 'R', 'CGT': 'R',
    'GTA': 'V', 'GTC': 'V', 'GTG': 'V', 'GTT': 'V',
    'GCA': 'A', 'GCC': 'A', 'GCG': 'A', 'GCT': 'A',
    'GAC': 'D', 'GAT': 'D', 'GAA': 'E', 'GAG': 'E',
    'GGA': 'G', 'GGC': 'G', 'GGG': 'G', 'GGT': 'G',
    'TCA': 'S', 'TCC': 'S', 'TCG': 'S', 'TCT': 'S',
    'TTC': 'F', 'TTT': 'F', 'TTA': 'L', 'TTG': 'L',
    'TAC': 'Y', 'TAT': 'Y', 'TAA': '*', 'TAG': '*',
    'TGC': 'C', 'TGT': 'C', 'TGA': '*', 'TGG': 'W',
}

# 3-Letter amino acid codes
AMINO_ACID_NAMES: Dict[str, str] = {
    'A': 'Ala', 'R': 'Arg', 'N': 'Asn', 'D': 'Asp', 'C': 'Cys',
    'E': 'Glu', 'Q': 'Gln', 'G': 'Gly', 'H': 'His', 'I': 'Ile',
    'L': 'Leu', 'K': 'Lys', 'M': 'Met', 'F': 'Phe', 'P': 'Pro',
    'S': 'Ser', 'T': 'Thr', 'W': 'Trp', 'Y': 'Tyr', 'V': 'Val',
    '*': 'Ter', 'X': 'Unk'
}

# Amino acid groups for conservative vs radical classification
AA_GROUPS = {
    'aliphatic': {'A', 'I', 'L', 'V'},
    'aromatic': {'F', 'W', 'Y'},
    'polar_neutral': {'N', 'C', 'Q', 'M', 'S', 'T'},
    'basic_positive': {'R', 'H', 'K'},
    'acidic_negative': {'D', 'E'},
    'special': {'G', 'P'}
}

COMPLEMENT_MAP = str.maketrans('ACGTUacgtu', 'TGCAAtgcaa')


def get_reverse_complement(seq: str) -> str:
    """Return the reverse complement of a DNA sequence."""
    return seq.translate(COMPLEMENT_MAP)[::-1]


def translate_frame(sequence: str, frame: int) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Translate a sequence in a given reading frame (1, 2, or 3).
    Returns translated amino acid string and per-codon metadata.
    """
    offset = frame - 1
    seq = sequence.upper().replace('U', 'T')
    length = len(seq)
    
    aa_chars = []
    codons_meta = []
    
    aa_pos = 1
    for i in range(offset, length - 2, 3):
        codon = seq[i:i + 3]
        if len(codon) < 3:
            break
        aa = STANDARD_CODON_TABLE.get(codon, 'X')
        aa_chars.append(aa)
        codons_meta.append({
            'aaIndex': aa_pos,
            'aminoAcid': aa,
            'threeLetter': AMINO_ACID_NAMES.get(aa, 'Unk'),
            'codon': codon,
            'startNt': i + 1,
            'endNt': i + 3
        })
        aa_pos += 1
        
    return "".join(aa_chars), codons_meta


def find_orfs_in_translation(
    aa_seq: str,
    frame: int,
    strand: str,
    min_length_aa: int = 15
) -> List[Dict[str, Any]]:
    """
    Detect Open Reading Frames (ORFs) starting with 'M' (ATG) and ending with '*' (stop).
    """
    orfs = []
    start_idx = None
    
    for idx, aa in enumerate(aa_seq):
        if aa == 'M' and start_idx is None:
            start_idx = idx
        elif aa == '*' and start_idx is not None:
            orf_aa = aa_seq[start_idx:idx]
            if len(orf_aa) >= min_length_aa:
                orfs.append({
                    'frame': f"{strand}{frame}",
                    'strand': strand,
                    'startAa': start_idx + 1,
                    'endAa': idx + 1,
                    'lengthAa': len(orf_aa),
                    'sequence': orf_aa
                })
            start_idx = None
            
    return orfs


def translate_six_frames(sequence: str, min_orf_aa: int = 15) -> Dict[str, Any]:
    """
    Compute full 6-frame translation (+1, +2, +3, -1, -2, -3) and all ORFs.
    """
    clean_seq = sequence.upper().replace('U', 'T')
    rev_seq = get_reverse_complement(clean_seq)
    
    frames: Dict[str, Any] = {}
    all_orfs: List[Dict[str, Any]] = []
    
    # Forward strand (+1, +2, +3)
    for f in [1, 2, 3]:
        aa_str, codons = translate_frame(clean_seq, f)
        frame_id = f"+{f}"
        orfs = find_orfs_in_translation(aa_str, f, "+", min_orf_aa)
        all_orfs.extend(orfs)
        frames[frame_id] = {
            'frame': frame_id,
            'strand': '+',
            'aminoAcids': aa_str,
            'codons': codons,
            'orfCount': len(orfs)
        }
        
    # Reverse strand (-1, -2, -3)
    for f in [1, 2, 3]:
        aa_str, codons = translate_frame(rev_seq, f)
        frame_id = f"-{f}"
        orfs = find_orfs_in_translation(aa_str, f, "-", min_orf_aa)
        all_orfs.extend(orfs)
        frames[frame_id] = {
            'frame': frame_id,
            'strand': '-',
            'aminoAcids': aa_str,
            'codons': codons,
            'orfCount': len(orfs)
        }
        
    # Sort ORFs by length descending
    all_orfs.sort(key=lambda x: x['lengthAa'], reverse=True)
    
    return {
        'sequenceLength': len(clean_seq),
        'frames': frames,
        'openReadingFrames': all_orfs,
        'longestOrf': all_orfs[0] if all_orfs else None
    }


def is_conservative(ref_aa: str, alt_aa: str) -> bool:
    """Determine whether an amino acid substitution is conservative or radical."""
    if ref_aa == alt_aa:
        return True
    if ref_aa in ('*', 'X') or alt_aa in ('*', 'X'):
        return False
        
    for grp in AA_GROUPS.values():
        if ref_aa in grp and alt_aa in grp:
            return True
    return False


def compare_coding_sequences(
    ref_seq: str,
    alt_seq: str,
    frame: int = 1
) -> Dict[str, Any]:
    """
    Compare reference and alternate coding sequences in a specified frame (1, 2, or 3).
    Classifies variants into:
      - SYNONYMOUS
      - MISSENSE (conservative vs radical)
      - NONSENSE (stop-gained)
      - STOP_LOST
      - FRAMESHIFT
    """
    clean_ref = ref_seq.upper().replace('U', 'T')
    clean_alt = alt_seq.upper().replace('U', 'T')
    
    # Check for frameshift indel
    len_diff = len(clean_alt) - len(clean_ref)
    is_frameshift = (len_diff % 3) != 0
    
    ref_aa, ref_codons = translate_frame(clean_ref, frame)
    alt_aa, alt_codons = translate_frame(clean_alt, frame)
    
    variants = []
    min_codons = min(len(ref_codons), len(alt_codons))
    
    for i in range(min_codons):
        r_c = ref_codons[i]
        a_c = alt_codons[i]
        
        if r_c['codon'] != a_c['codon']:
            r_aa = r_c['aminoAcid']
            a_aa = a_c['aminoAcid']
            pos = i + 1
            
            if r_aa == a_aa:
                var_type = 'SYNONYMOUS'
                impact = 'Silent mutation'
                conservative = True
            elif a_aa == '*':
                var_type = 'NONSENSE'
                impact = 'Premature termination codon (stop-gained)'
                conservative = False
            elif r_aa == '*':
                var_type = 'STOP_LOST'
                impact = 'Stop codon lost (extended C-terminus)'
                conservative = False
            else:
                var_type = 'MISSENSE'
                conservative = is_conservative(r_aa, a_aa)
                impact = f"Conservative replacement ({r_c['threeLetter']} -> {a_c['threeLetter']})" if conservative else f"Radical replacement ({r_c['threeLetter']} -> {a_c['threeLetter']})"
                
            variants.append({
                'codonPosition': pos,
                'ntPosition': r_c['startNt'],
                'refCodon': r_c['codon'],
                'altCodon': a_c['codon'],
                'refAa': r_aa,
                'altAa': a_aa,
                'refAaName': r_c['threeLetter'],
                'altAaName': a_c['threeLetter'],
                'variantType': var_type,
                'isConservative': conservative,
                'hgvsProtein': f"p.{r_c['threeLetter']}{pos}{a_c['threeLetter']}",
                'impact': impact
            })
            
    summary = {
        'totalCodonsAnalyzed': min_codons,
        'variantCount': len(variants),
        'synonymousCount': sum(1 for v in variants if v['variantType'] == 'SYNONYMOUS'),
        'missenseCount': sum(1 for v in variants if v['variantType'] == 'MISSENSE'),
        'nonsenseCount': sum(1 for v in variants if v['variantType'] == 'NONSENSE'),
        'stopLostCount': sum(1 for v in variants if v['variantType'] == 'STOP_LOST'),
        'isFrameshift': is_frameshift,
        'frameshiftDescription': (
            f"Indel length change of {len_diff:+d} bp is not a multiple of 3, disrupting the downstream reading frame."
            if is_frameshift else None
        ),
        'refTranslation': ref_aa,
        'altTranslation': alt_aa,
        'variants': variants
    }
    
    return summary

