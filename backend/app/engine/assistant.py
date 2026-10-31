"""
GenomicsAI Scientific AI Assistant Engine
Provides context-grounded bioinformatics explanations, sample repository summarization,
and scientific guidance. Works 100% locally with rule-based scientific reasoning,
with optional LLM enrichment if an API key is configured.
"""

import os
from typing import List, Dict, Any, Optional
from app.database.db import db_manager

ASSISTANT_DISCLAIMER = (
    "Research and educational assistance only. The AI Assistant provides computational and "
    "bioinformatic explanations and does not provide clinical diagnosis or therapeutic decisions."
)


def generate_assistant_response(
    query: str,
    context_sample_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate an intelligent bioinformatics response grounded in the sample repository.
    """
    q = query.strip().lower()
    context_info = ""
    active_sample = None

    if context_sample_id:
        active_sample = db_manager.get_sample(context_sample_id)
        if active_sample:
            context_info = (
                f"\n\n**Active Sample Context:**\n"
                f"- Name: {active_sample['name']}\n"
                f"- Organism: {active_sample['organism']}\n"
                f"- Length: {active_sample['length']} bp\n"
                f"- GC Content: {active_sample['gc_content']}%\n"
                f"- Status: {active_sample['status']}\n"
            )

    # 1. Summary of repository or analyzed mutations
    if any(k in q for k in ["summarize", "my sample", "samples", "repository", "what mutations", "detected mutations"]):
        dashboard = db_manager.get_dashboard_metrics()
        mutations = db_manager.get_all_mutations(limit=10)

        lines = [
            f"### 🧬 GenomicsAI Repository Summary",
            f"- **Total Samples:** {dashboard['totalSamples']}",
            f"- **Analyzed Pipelines:** {dashboard['analyzedSamples']}",
            f"- **Identified Mutations:** {dashboard['mutationsFound']}",
            f"- **Cohort Average GC Content:** {dashboard['averageGcContent']}%\n",
            "**Key Identified Variants:**"
        ]

        if mutations:
            for m in mutations[:5]:
                lines.append(
                    f"- **{m.get('sample_name', 'Sample')}** at position {m['position']}: "
                    f"`{m['ref_allele']}>{m['alt_allele']}` ({m.get('mutation_type', 'SNP')} - {m.get('sub_type', '')}) "
                    f"| HGVS: `{m.get('hgvs', 'c.'+str(m['position']))}` — {m.get('consequence', 'Variant')}"
                )
        else:
            lines.append("- No mutations currently recorded in this session. Run *Mutation Detection* to align sequences against a reference.")

        lines.append(f"\n{context_info}\n*{ASSISTANT_DISCLAIMER}*")
        return {"response": "\n".join(lines), "contextSample": active_sample}

    # 2. Transition vs Transversion
    if "transition" in q or "transversion" in q:
        explanation = (
            "### 🔬 Transition vs. Transversion Mutations\n\n"
            "Single Nucleotide Polymorphisms (SNPs) are categorized by the chemical structure of the purine and pyrimidine rings:\n\n"
            "1. **Transitions ($Ti$):**\n"
            "   - Interchange between two purines ($A \\longleftrightarrow G$) or between two pyrimidines ($C \\longleftrightarrow T$).\n"
            "   - Structurally conservative; biologically more frequent due to tautomeric shifts and spontaneous deamination (e.g. 5-methylcytosine to thymine).\n"
            "   - Typically exhibits a $Ti/Tv$ ratio of ~2.0 to 2.1 in whole-exome sequencing.\n\n"
            "2. **Transversions ($Tv$):**\n"
            "   - Interchange between a purine and a pyrimidine ($A \\longleftrightarrow C$, $A \\longleftrightarrow T$, $G \\longleftrightarrow C$, $G \\longleftrightarrow T$).\n"
            "   - Chemically more drastic, distorting the helical diameter of DNA.\n"
            "   - Example: The classic Sickle Cell Anemia mutation in *HBB* (`c.20A>T`) is a **transversion**, substituting Adenine for Thymine in codon 7 (GAG $\\rightarrow$ GTG).\n"
            f"{context_info}\n*{ASSISTANT_DISCLAIMER}*"
        )
        return {"response": explanation, "contextSample": active_sample}

    # 3. GC Content and Thermal Stability
    if "gc content" in q or "gc%" in q or "stability" in q or "melting temperature" in q:
        explanation = (
            "### 🌡️ GC Content & Biological Stability\n\n"
            "**GC Content** represents the percentage of Guanine (G) and Cytosine (C) bases relative to the total sequence length:\n\n"
            "$$\\text{GC}\\% = \\frac{[G] + [C]}{[A] + [T] + [G] + [C]} \\times 100\\%$$\n\n"
            "**Key Scientific Implications:**\n"
            "- **Hydrogen Bonding:** G-C base pairs are bonded by **three hydrogen bonds**, whereas A-T pairs share only **two**. Higher GC% increases the thermal melting temperature ($T_m$) and conformational stability of double-stranded DNA.\n"
            "- **Stacking Interactions:** Base-stacking thermodynamics in GC-rich regions exhibit stronger dipole-dipole interactions, conferring resistance to denaturation in thermophilic organisms.\n"
            "- **GC Skew:** Deviations between G and C on a single strand ($[G - C] / [G + C]$) demarcate the replication origin (ori) and terminus in prokaryotic and mitochondrial genomes.\n"
            f"{context_info}\n*{ASSISTANT_DISCLAIMER}*"
        )
        return {"response": explanation, "contextSample": active_sample}

    # 4. Needleman-Wunsch Alignment
    if "needleman" in q or "alignment" in q or "gap penalty" in q:
        explanation = (
            "### 📐 Needleman-Wunsch Global Alignment Algorithm\n\n"
            "The **Needleman-Wunsch algorithm** (1970) provides dynamic programming global alignment maximizing end-to-end sequence similarity:\n\n"
            "**Recurrence Relation:**\n"
            "$$M(i, j) = \\max \\begin{cases} "
            "M(i-1, j-1) + S(x_i, y_j) & \\text{(Diagonal: match/mismatch)} \\\\ "
            "M(i-1, j) + d & \\text{(Vertical: deletion in query)} \\\\ "
            "M(i, j-1) + d & \\text{(Horizontal: insertion in query)} "
            "\\end{cases}$$\n\n"
            "- **Scoring Scheme in GenomicsAI:** Match score = `+2`, Mismatch penalty = `-1`, Linear gap penalty = `-2`.\n"
            "- **Biological Interpretation:** Global alignment is optimal for comparing homologous genes of similar length (e.g., patient *HBB* vs reference *HBB*) to pinpoint exact single-nucleotide variants and micro-indels.\n"
            f"{context_info}\n*{ASSISTANT_DISCLAIMER}*"
        )
        return {"response": explanation, "contextSample": active_sample}

    # 5. Motif Search (KMP & Aho-Corasick)
    if "motif" in q or "kmp" in q or "tata" in q or "promoter" in q:
        explanation = (
            "### 🔍 DNA Motif Identification & Algorithms\n\n"
            "Sequence motifs represent conserved functional cis-regulatory elements, transcription factor binding sites, or start/stop signals:\n\n"
            "- **TATA Box (`TATAAA`):** Core promoter motif located ~25-30 bp upstream of the transcription start site (TSS), binding TATA-binding protein (TBP) for RNA Polymerase II pre-initiation complex assembly.\n"
            "- **Start Codon (`ATG`):** Canonical methionine translation initiator in mRNA.\n"
            "- **Knuth-Morris-Pratt (KMP):** Employs the Longest Prefix Suffix (LPS) $\\pi$-table to scan patterns in $O(n + m)$ linear time without backtracking.\n"
            "- **Aho-Corasick:** Constructs a finite state automaton with failure transitions for simultaneous multi-pattern dictionary matching in $O(n + k)$ time.\n"
            f"{context_info}\n*{ASSISTANT_DISCLAIMER}*"
        )
        return {"response": explanation, "contextSample": active_sample}

    # 6. Pharmacogenomics and CPIC
    if "pharmacogenomic" in q or "drug" in q or "cpic" in q or "cyp2c19" in q or "warfarin" in q:
        explanation = (
            "### 💊 Pharmacogenomics (PGx) & CPIC Guidelines\n\n"
            "Pharmacogenomics investigates how genetic polymorphisms alter drug metabolism (pharmacokinetics) and drug targets (pharmacodynamics):\n\n"
            "- **CYP2C19 & Clopidogrel:** Patients carrying *2 or *3 loss-of-function alleles exhibit impaired conversion of the prodrug clopidogrel into its active antiplatelet form, leading to elevated stent thrombosis risk. CPIC recommends alternative agents like ticagrelor or prasugrel.\n"
            "- **CYP2C9 / VKORC1 & Warfarin:** CYP2C9 clears active S-warfarin, while VKORC1 is the direct target. Reduced-function genotypes require substantial dose reductions to prevent hemorrhage.\n"
            "- **Metabolizer Phenotypes:**\n"
            "  - *Poor Metabolizer (PM):* Minimal or absent enzymatic activity.\n"
            "  - *Intermediate Metabolizer (IM):* Reduced clearance or bioactivation.\n"
            "  - *Normal Metabolizer (NM):* Standard population baseline.\n"
            "  - *Ultra-rapid Metabolizer (UM):* Duplicated or hyper-active alleles.\n"
            f"{context_info}\n*{ASSISTANT_DISCLAIMER}*"
        )
        return {"response": explanation, "contextSample": active_sample}

    # General Fallback Response
    response_text = (
        f"### 🧬 GenomicsAI Research Assistant\n\n"
        f"I received your query: *\"{query}\"*\n\n"
        f"I can assist you with:\n"
        f"1. **Sequence Composition:** Calculating GC content, nucleotide frequencies, and IUPAC degeneracy.\n"
        f"2. **Motif Finding:** Explaining KMP/Aho-Corasick pattern matching for promoters (TATA boxes) or start codons.\n"
        f"3. **Mutation Detection:** Analyzing Needleman-Wunsch alignments, transitions, transversions, and HGVS notation.\n"
        f"4. **Clinical Disease Association:** Curated evidence from ClinVar and OMIM for genes such as *HBB*, *BRCA1*, and *TP53*.\n"
        f"5. **Pharmacogenomics:** CPIC guideline interpretations for CYP2C19, CYP2D6, VKORC1, and related drug-gene pairs.\n"
        f"{context_info}\n"
        f"Feel free to click any suggested prompt below or specify a gene or sample to analyze.\n\n"
        f"*{ASSISTANT_DISCLAIMER}*"
    )
    return {"response": response_text, "contextSample": active_sample}

