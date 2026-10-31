# Verified Genomics Dataset & Google Colab Demonstration

This directory contains the authoritative DNA reference and verified mutation test dataset for the **Smart Bioinformatics Application for DNA Pattern Identification and Mutation Detection**, designed for classroom and university project demonstrations.

---

## 1. Verified Human Gene Benchmark Summary

| Gene | Organism | RefSeq Accession | Analyzed Region | Length | Coordinate Offset to CDS | ClinVar Variation ID | dbSNP rsID | Canonical HGVS Variant | Clinical Phenotype |
|---|---|---|---|---|---|---|---|---|---|
| **HBB** | *Homo sapiens* | `NM_000518.5` | CDS (Exons 1–3) | 444 bp | 0 | **15147** (`VCV000015147.16`) | `rs334` | `c.20A>T` (`p.Glu7Val`) | Sickle Cell Anemia |
| **BRCA1** | *Homo sapiens* | `NM_007294.4` | Exon 2 (Coding Exon 1) | 175 bp | 0 | **17662** (`VCV000017662.66`) | `rs80357906` | `c.68_69delAG` (`p.Glu23fs`) | Hereditary Breast & Ovarian Cancer |
| **CFTR** | *Homo sapiens* | `NM_000492.4` | Exon 11 (Diagnostic Segment) | 106 bp | +1448 bp | **7105** (`VCV000007105.15`) | `rs113993960` | `c.1521_1523delCTT` (`p.Phe508del`) | Cystic Fibrosis |

### Primary Authoritative Data Sources
- **NCBI RefSeq (Nucleotide)**: https://www.ncbi.nlm.nih.gov/nuccore/
- **NCBI ClinVar**: https://www.ncbi.nlm.nih.gov/clinvar/
- **dbSNP**: https://www.ncbi.nlm.nih.gov/snp/
- **Ensembl Genome Browser**: https://www.ensembl.org/

---

## 2. Coordinate Systems & Offset Conventions

To guarantee mathematical consistency and biological correctness, coordinate systems are strictly documented:

1. **HBB (`NM_000518.5`)**:
   - The reference sequence covers the entire coding sequence (`c.1..444`, 444 bp).
   - **Local coordinates equal coding DNA coordinates** (Coordinate Offset = `0`).
   - Local position 20 is coding sequence position `c.20`. Substitution of A to T yields `c.20A>T`.

2. **BRCA1 (`NM_007294.4`)**:
   - The reference sequence covers Exon 2 (`c.1..175`, 175 bp), which begins with the translational start codon `ATG`.
   - **Local coordinates equal coding DNA coordinates** (Coordinate Offset = `0`).
   - Note: Exon 2 nucleotides 1..175 correspond to full transcript mRNA nucleotides 114..288. Coding coordinates (`c.`) are the universal clinical standard for variant reporting.

3. **CFTR (`NM_000492.4`)**:
   - The reference sequence is a 106 bp diagnostic segment of Exon 11 spanning coding positions **`c.1449` through `c.1554`**.
   - **Local position 1 is coding position `c.1449`** (Coordinate Offset = **`+1448 bp`**).
   - Local position 72 corresponds to $72 + 1448 = \text{c.}1520$.
   - Local positions 73–75 correspond to $73 + 1448 = \text{c.}1521$ through $75 + 1448 = \text{c.}1523$.

---

## 3. Equivalent Deletion Representations & HGVS 3'-Rule Normalization

Pairwise dynamic programming algorithms (such as Needleman-Wunsch) align sequences by optimizing an arbitrary scoring metric. In tandem repeats or homopolymer tracts, multiple alignment gap placements yield identical resulting sequences.

### CFTR Delta-F508 (`c.1521_1523delCTT`)
In the CFTR reference sequence, the local nucleotide context across codon 508 is:
```text
cDNA:   1518 1519 1520 1521 1522 1523 1524 1525 1526 1527
Ref:      A    T    C    A    T    C    T    T    T    G    G    T
Local:   70   71   72   73   74   75   76   77   78   79   80   81
```

- **Candidate A (`c.1520_1522delTCT`, local 72–74)**:
  Deleting `TCT` leaves `...ATCATTGGT...` (Patient Allele).
- **Candidate B (`c.1521_1523delCTT`, local 73–75)**:
  Deleting `CTT` leaves `...ATCATTGGT...` (Patient Allele).
- **Biological Invalidation Proof**:
  Deleting `TTT` at local 74–76 (`c.1522_1524delTTT`) produces `...ATCATCGGT...` (codons 506 `ATC`, 507 `ATC`, 508 `GGT`), which alters codon 507 to isoleucine and codon 508 to glycine. This is **biologically distinct** from cystic fibrosis $\Delta$F508.

**HGVS Standard Normalization**:
Under the **HGVS 3'-rule** (HGVS Sequence Variant Nomenclature guidelines), when multiple coordinate descriptions yield the identical mutant allele, the variant must be reported at the **most 3' (rightmost) position**.
- The raw alignment gap at local 72–74 (`c.1520_1522delTCT`) is normalized rightward by 1 base to **`c.1521_1523delCTT`** (local 73–75).
- Both forms are mathematically equivalent, but `c.1521_1523delCTT` is the official ClinVar and RefSeq canonical designation.

### BRCA1 Frameshift Deletion (`c.68_69delAG`)
The wild-type BRCA1 sequence contains an `AGAG` dinucleotide tandem repeat at coding positions 66–69:
```text
Ref:    ... T  T  A  G  A  G  A  C  T ...
cDNA:       63 64 65 66 67 68 69 70 71
```
- Deleting `AG` at positions 66–67 produces `...TTAGACT...`.
- Deleting `GA` at positions 67–68 produces `...TTAGACT...`.
- Deleting `AG` at positions 68–69 produces `...TTAGACT...`.
- Deleting `GA` at positions 69–70 produces `...TTAGACT...`.

All four deletions result in the identical mutant transcript. Applying the HGVS 3'-rule selects the 3'-most representation that preserves the characteristic repeat motif: **`c.68_69delAG`**.

---

## 4. Directory Contents

- **`verified_genomics_dataset.json`**: Complete structured JSON repository containing all verified metadata, coordinate offsets, ClinVar VCV accessions, GC/AT ratios, functional mechanisms, FASTA headers, and sequences.
- **`references.fasta`**: Multi-FASTA file containing wild-type reference sequences for HBB, BRCA1, and CFTR.
- **`variants.fasta`**: Multi-FASTA file containing the verified mutant alleles.
- **`hbb_sickle_cell.fasta`**: Paired FASTA (Ref + Mutant) for the HBB sickle cell demonstration.
- **`brca1_hboc.fasta`**: Paired FASTA (Ref + Mutant) for the BRCA1 frameshift deletion demonstration.
- **`cftr_cystic_fibrosis.fasta`**: Paired FASTA (Ref + Mutant) for the CFTR $\Delta$F508 demonstration.
- **`google_colab/GenomicsAI_Bioinformatics_Demonstration.ipynb`**: Complete, self-contained Jupyter Notebook ready to upload and execute on [Google Colab](https://colab.research.google.com).
- **`google_colab/colab_bio_demo.py`**: Standalone Python script executing the four bioinformatics algorithms with HGVS normalization and equivalent deletion analysis in standard Python without external dependencies.

---

## 5. How to Run in Google Colab

1. Open your web browser and navigate to [Google Colab](https://colab.research.google.com).
2. Click **Upload** and select `dataset/google_colab/GenomicsAI_Bioinformatics_Demonstration.ipynb`.
3. In the Colab menu, click **Runtime** > **Run all** (or press `Ctrl + F9`).
4. The notebook will:
   - Ingest and display the verified gene sequences.
   - Run the **Knuth-Morris-Pratt (KMP)** algorithm and display the computed $\pi$ (LPS) failure table.
   - Run the **Boyer-Moore (BM)** algorithm with Bad Character heuristic jumps and calculate comparison efficiency.
   - Build a **Suffix Array & Kasai LCP** to identify repeated sequence motifs and the Longest Repeated Substring (LRS).
   - Perform **Needleman-Wunsch Global Alignment** with contiguous indel grouping, coordinate offset resolution, and HGVS 3'-rule right-shift normalization, printing visual alignment windows and equivalent coordinate representations.

---

## 6. How to Run Locally via Command Line

Run the demonstration script using Python:

```bash
python dataset/google_colab/colab_bio_demo.py
```

---

## 7. Scope & Known Limitations

> **CRITICAL SCIENTIFIC DISTINCTION**:
> - **Computational Detection vs. Clinical Interpretation**:
>   The algorithms demonstrated here (KMP, Boyer-Moore, Suffix Arrays, Needleman-Wunsch) perform deterministic string matching, sequence alignment, and mathematical coordinate conversion. They identify differences between an arbitrary test string and a reference standard.
> - **Diagnostic Boundary**:
>   A computational match is an essential first step, but clinical diagnosis requires comprehensive context including read depth, base quality scores, variant allele fraction (VAF), zygosity, pedigree analysis, and ACMG/AMP clinical curation guidelines.
> - **Machine Learning / Dataset Scope**:
>   This three-gene curated benchmark consists of three verified reference transcripts and three documented pathogenic variants. It is designed strictly for **educational demonstrations, algorithm verification, and integration testing**. It does **NOT** constitute a training dataset for training or deploying clinical machine learning diagnostic models.
