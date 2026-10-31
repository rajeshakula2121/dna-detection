# Core Bioinformatics Algorithms & Theoretical Foundations

This document provides the mathematical formulations, biological principles, and algorithmic implementation details for the **Smart Bioinformatics Application for DNA Pattern Identification and Mutation Detection**.

---

## 1. IUPAC Nucleotide Representation & Sequence Validation

Deoxyribonucleic acid (DNA) is fundamentally composed of four canonical nitrogenous bases:
- **Adenine ($A$)** - Purine
- **Thymine ($T$)** - Pyrimidine
- **Cytosine ($C$)** - Pyrimidine
- **Guanine ($G$)** - Purine

### Degenerate IUPAC Codes
In biological sequencing and consensus analysis, ambiguous positions are encoded according to the International Union of Pure and Applied Chemistry (IUPAC):

| IUPAC Symbol | Meaning | Bases Represented | Chemical Nature |
| :---: | :---: | :---: | :---: |
| **A** | Adenine | $A$ | Purine |
| **C** | Cytosine | $C$ | Pyrimidine |
| **G** | Guanine | $G$ | Purine |
| **T** | Thymine | $T$ | Pyrimidine |
| **R** | pu**R**ine | $A$ or $G$ | Purine |
| **Y** | p**Y**rimidine | $C$ or $T$ | Pyrimidine |
| **S** | **S**trong bond | $G$ or $C$ | 3 Hydrogen Bonds |
| **W** | **W**eak bond | $A$ or $T$ | 2 Hydrogen Bonds |
| **K** | **K**eto | $G$ or $T$ | Keto group at C6 |
| **M** | a**M**ino | $A$ or $C$ | Amino group at C6 |
| **B** | Not A | $C$, $G$, or $T$ | - |
| **D** | Not C | $A$, $G$, or $T$ | - |
| **H** | Not G | $A$, $C$, or $T$ | - |
| **V** | Not T | $A$, $C$, or $G$ | - |
| **N** | A**N**y | $A$, $C$, $G$, or $T$ | Any nucleotide |
| **-** | Gap | Indel position | Alignment spacer |

---

## 2. Nucleotide Composition & Strand Asymmetry (Skew)

### 2.1 GC-Content Percentage
The GC-content reflects the thermostability of the DNA double helix due to the three hydrogen bonds between Guanine and Cytosine (compared to two between Adenine and Thymine):

$$\text{GC\%} = \frac{\text{Count}(G) + \text{Count}(C)}{\text{Count}(A) + \text{Count}(T) + \text{Count}(G) + \text{Count}(C)} \times 100$$

### 2.2 Replication Strand Skew (Lobry, 1996)
Asymmetrical mutation rates between leading and lagging strands during DNA replication produce nucleotide skew:

$$\text{GC Skew} = \frac{G - C}{G + C}$$

$$\text{AT Skew} = \frac{A - T}{A + T}$$

- **$\text{GC Skew} > 0$:** Guanine abundance (characteristic of the leading replication strand in many bacterial and mitochondrial genomes).
- **$\text{GC Skew} < 0$:** Cytosine abundance (characteristic of the lagging strand).

---

## 3. Watson-Crick Reverse Complement

DNA strands are anti-parallel ($5' \to 3'$ and $3' \to 5'$). The complementary base pairing rules:
- $A \longleftrightarrow T$
- $C \longleftrightarrow G$

To search for regulatory motifs or primer binding sites on the opposite strand, the sequence is inverted and complemented:
$$\text{RevComp}(s_1 s_2 \dots s_n) = \text{Comp}(s_n) \dots \text{Comp}(s_2) \text{Comp}(s_1)$$

---

## 4. Pairwise Global Sequence Alignment (Needleman & Wunsch, 1970)

The Needleman-Wunsch algorithm finds the optimal global alignment across the entire length of two sequences $S_{\text{ref}}$ of length $n$ and $S_{\text{alt}}$ of length $m$.

### Dynamic Programming Recurrence Formulation:
Let $M(i, j)$ be the maximum alignment score for the prefixes $S_{\text{ref}}[1 \dots i]$ and $S_{\text{alt}}[1 \dots j]$:

$$M(i, 0) = i \cdot \gamma \quad (0 \le i \le n)$$
$$M(0, j) = j \cdot \gamma \quad (0 \le j \le m)$$

For $1 \le i \le n$ and $1 \le j \le m$:
$$M(i, j) = \max \begin{cases}
M(i-1, j-1) + \sigma(S_{\text{ref}}[i], S_{\text{alt}}[j]) & \text{(Match / Mismatch)} \\
M(i-1, j) + \gamma & \text{(Deletion / Gap in Alternate)} \\
M(i, j-1) + \gamma & \text{(Insertion / Gap in Reference)}
\end{cases}$$

Where:
- $\sigma(a, b) = +2$ if $a = b$ (Match score)
- $\sigma(a, b) = -1$ if $a \neq b$ (Mismatch penalty)
- $\gamma = -2$ (Linear gap penalty)

### Traceback:
From cell $(n, m)$, the optimal path is traced back to $(0, 0)$ to reconstruct the aligned sequences with inserted gap characters (`-`).

---

## 5. Mutation Detection & Classification Engine

Mutations are identified by scanning the aligned sequences $(S_{\text{ref}}^{\text{aligned}}, S_{\text{alt}}^{\text{aligned}})$:

### 5.1 Single Nucleotide Variants (SNVs / Substitutions)
When $S_{\text{ref}}^{\text{aligned}}[k] \neq S_{\text{alt}}^{\text{aligned}}[k]$ and neither base is a gap (`-`):

1. **Transitions:** Mutation between bases of the same chemical ring structure:
   - Purine $\longleftrightarrow$ Purine: $A \longleftrightarrow G$
   - Pyrimidine $\longleftrightarrow$ Pyrimidine: $C \longleftrightarrow T$
2. **Transversions:** Mutation between bases of different chemical ring structures:
   - Purine $\longleftrightarrow$ Pyrimidine: $A \longleftrightarrow C$, $A \longleftrightarrow T$, $G \longleftrightarrow C$, $G \longleftrightarrow T$

*(Note: Although there are twice as many possible transversions as transitions, transitions occur approximately twice as frequently in biological genomes due to molecular mechanisms such as cytosine deamination).*

### 5.2 Insertions and Deletions (Indels)
- **Insertion:** $S_{\text{ref}}^{\text{aligned}}[k] = \text{'-'}$ and $S_{\text{alt}}^{\text{aligned}}[k] \in \{A, C, G, T\}$
- **Deletion:** $S_{\text{ref}}^{\text{aligned}}[k] \in \{A, C, G, T\}$ and $S_{\text{alt}}^{\text{aligned}}[k] = \text{'-'}$

---

## 6. Real-World Case Study: Sickle Cell Disease ($HbS$)

- **Gene:** Human Hemoglobin Subunit Beta (*HBB*)
- **Genomic Coordinate:** Chromosome 11p15.4, Exon 1
- **Wildtype Codon 6:** `GAG` $\longrightarrow$ Encodes **Glutamic Acid (Glu, E)** (Hydrophilic, negatively charged amino acid on the external protein surface).
- **Mutant Codon 6 ($HbS$):** `GTG` $\longrightarrow$ Encodes **Valine (Val, V)** (Hydrophobic amino acid).
- **Nucleotide Variant:** Transversion mutation at cDNA position 20:
  $$\text{c.20A} > \text{T} \quad (\text{p.Glu6Val})$$
- **Pathology:** Hydrophobic Valine binds to complementary hydrophobic patches on adjacent deoxygenated hemoglobin tetramers, causing polymerization into rigid, sickle-shaped erythrocyte fibers.

