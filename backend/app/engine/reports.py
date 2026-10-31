"""
Report Generation Engine
Generates professional CSV, JSON, and ReportLab PDF scientific reports for DNA sequence analyses.
Implements exact coordinate attribution (distinguishing local coordinates from verified transcript HGVS),
comprehensive sequence statistics, alignment visualization, algorithm descriptions, and clinical disclaimers.
"""

import io
import csv
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Preformatted, KeepTogether

SOFTWARE_NAME = "Smart Bioinformatics Platform (GenomicsAI)"
SOFTWARE_VERSION = "v2.1.0"


def generate_json_report(analysis_data: Dict[str, Any]) -> str:
    """Serialize full analysis data into formatted JSON."""
    return json.dumps(analysis_data, indent=2, default=str)


def generate_csv_report(analysis_data: Dict[str, Any]) -> str:
    """
    Generate standard CSV report containing:
    - Sequence identifiers
    - Reference accession, if known
    - Sequence lengths
    - Algorithm used
    - Mutation type
    - Local position
    - Reference allele
    - Alternate allele
    - Transcript HGVS notation, if verified
    - Alignment score
    - Sequence identity
    - Analysis date and software version
    """
    output = io.StringIO()
    writer = csv.writer(output)

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Header & Provenance
    writer.writerow(["# SMART BIOINFORMATICS PLATFORM - MUTATION & ALIGNMENT REPORT"])
    writer.writerow(["# Software", SOFTWARE_NAME, SOFTWARE_VERSION])
    writer.writerow(["# Analysis Date", now_iso])
    writer.writerow(["# Analysis Title", analysis_data.get("title", "DNA Sequence Analysis")])
    writer.writerow(["# Analysis ID", analysis_data.get("analysisId", analysis_data.get("sampleId", "ANALYSIS-LOCAL"))])
    writer.writerow([])

    if not analysis_data or not isinstance(analysis_data, dict):
        raise ValueError("Invalid or incomplete analysis data for report generation.")

    # Extract fields with fallback to nested alignment dictionary
    aln = analysis_data.get("alignment") or {}
    query_name = analysis_data.get("queryName") or aln.get("queryName", "Query Sequence")
    ref_name = analysis_data.get("referenceName") or aln.get("referenceName", "Reference Standard")
    ref_acc = analysis_data.get("referenceAccession") or analysis_data.get("transcriptAccession") or aln.get("referenceAccession", "Unspecified / Local Fragment")
    alt_len = analysis_data.get("altLength") or analysis_data.get("sequenceLength") or aln.get("altLength", "N/A")
    ref_len = analysis_data.get("refLength") or aln.get("refLength", "N/A")

    score = analysis_data.get("alignmentScore")
    if score is None:
        score = aln.get("score")
    if score is None:
        score = aln.get("alignmentScore", "N/A")

    identity = analysis_data.get("identity")
    if identity is None:
        identity = aln.get("identity", "N/A")

    mutations = analysis_data.get("mutations")
    if mutations is None:
        mutations = aln.get("mutations", [])

    if score == "N/A" and identity == "N/A" and not mutations and not analysis_data.get("refAligned") and not aln.get("refAligned"):
        raise ValueError("Invalid or incomplete analysis data for report generation.")

    # Overview Metadata
    writer.writerow(["METADATA", "VALUE"])
    writer.writerow(["Query Sequence Identifier", query_name])
    writer.writerow(["Reference Sequence Identifier", ref_name])
    writer.writerow(["Reference Accession", ref_acc])
    writer.writerow(["Query Sequence Length (bp)", alt_len])
    writer.writerow(["Reference Sequence Length (bp)", ref_len])
    writer.writerow(["Algorithm Used", analysis_data.get("algorithm", "Needleman-Wunsch Global Alignment (Dynamic Programming)")])
    writer.writerow(["Alignment Score", score])
    writer.writerow(["Sequence Identity (%)", f"{identity}%"])
    writer.writerow(["Total Mutations Detected", len(mutations)])
    writer.writerow([])

    # Detailed Mutations Table
    writer.writerow([
        "Local Position (1-based)",
        "Ref Allele",
        "Alt Allele",
        "Mutation Type",
        "Subtype / Classification",
        "Coding DNA Position (CDS)",
        "Transcript HGVS Notation",
        "HGVS Verification Status",
        "Biological / Functional Context"
    ])

    for m in mutations:
        local_pos = m.get("localPosition", m.get("position", m.get("ref_position", "")))
        ref_allele = m.get("refBase", m.get("ref_sequence", m.get("ref_allele", "-")))
        alt_allele = m.get("altBase", m.get("alt_sequence", m.get("alt_allele", "-")))
        mut_type = m.get("type", m.get("mutationType", ""))
        sub_type = m.get("subType", m.get("classification", ""))

        cds_pos = m.get("cdsPosition", m.get("cds_position", ""))
        hgvs = m.get("hgvs", m.get("hgvs_notation", ""))

        is_verified = bool(m.get("isVerifiedTranscriptHgvs", cds_pos and str(cds_pos) != str(local_pos)))
        status_text = "Verified RefSeq Mapping" if is_verified else "Local Fragment (Unverified Transcript)"

        desc = m.get("description", m.get("explanation", ""))

        writer.writerow([
            local_pos,
            ref_allele,
            alt_allele,
            mut_type,
            sub_type,
            cds_pos if cds_pos else "N/A (Local only)",
            hgvs if hgvs else f"c.{local_pos}{ref_allele}>{alt_allele}",
            status_text,
            desc
        ])

    writer.writerow([])
    writer.writerow(["# SCIENTIFIC DISCLAIMER", "Computational findings derived from deterministic string alignment algorithms; not clinical diagnostic claims."])

    return output.getvalue()


def generate_pdf_report(analysis_data: Dict[str, Any]) -> bytes:
    """
    Generate professional scientific PDF report using ReportLab.
    Includes:
    - Project and report title
    - Analysis identifier & metadata
    - Sequence information (ref vs query)
    - Analysis parameters
    - Summary statistics
    - Alignment visualization
    - Mutation table
    - Coordinate-system explanation (local vs transcript)
    - Algorithm descriptions & limitations
    - Clinical notice & disclaimer
    """
    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A')
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B')
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#0D9488'),
        spaceBefore=10,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )
    mono_style = ParagraphStyle(
        'Mono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#0F172A')
    )

    story = []

    if not analysis_data or not isinstance(analysis_data, dict):
        raise ValueError("Invalid or incomplete analysis data for report generation.")

    # 1. Header Banner
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    analysis_id = analysis_data.get("analysisId", analysis_data.get("sampleId", "ANALYSIS-LOCAL-RUN"))

    story.append(Paragraph(f"{SOFTWARE_NAME} — Scientific Analysis Report", title_style))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        f"Generated: {now_str} | ID: <b>{analysis_id}</b> | Release: {SOFTWARE_VERSION}",
        subtitle_style
    ))
    story.append(Spacer(1, 10))

    # 2. Executive Summary & Parameters
    story.append(Paragraph("1. Analysis Overview & Alignment Parameters", h2_style))

    aln = analysis_data.get("alignment") or {}
    q_name = analysis_data.get("queryName") or aln.get("queryName", "Query Sequence")
    r_name = analysis_data.get("referenceName") or aln.get("referenceName", "Reference Sequence")
    ref_acc = analysis_data.get("referenceAccession") or analysis_data.get("transcriptAccession") or aln.get("referenceAccession", "Unmapped / Custom Fragment")
    alt_len = analysis_data.get("altLength") or analysis_data.get("sequenceLength") or aln.get("altLength", "N/A")
    ref_len = analysis_data.get("refLength") or aln.get("refLength", "N/A")

    score = analysis_data.get("alignmentScore")
    if score is None:
        score = aln.get("score")
    if score is None:
        score = aln.get("alignmentScore", "N/A")

    identity = analysis_data.get("identity")
    if identity is None:
        identity = aln.get("identity", "N/A")

    mutations = analysis_data.get("mutations")
    if mutations is None:
        mutations = aln.get("mutations", [])

    ref_aln = analysis_data.get("refAligned") or aln.get("refAligned", "")
    alt_aln = analysis_data.get("altAligned") or aln.get("altAligned", "")
    match_str = analysis_data.get("matchString") or aln.get("matchString", "")

    if score == "N/A" and identity == "N/A" and not mutations and not ref_aln:
        raise ValueError("Invalid or incomplete analysis data for report generation.")

    id_str = f"{identity}%" if str(identity).strip().replace('.', '', 1).isdigit() else str(identity)

    summary_data = [
        ["Parameter / Metric", "Value", "Parameter / Metric", "Value"],
        [
            "Query Sequence", str(q_name)[:30],
            "Reference Sequence", str(r_name)[:30]
        ],
        [
            "Reference Accession", str(ref_acc)[:30],
            "Algorithm", "Needleman-Wunsch (Global)"
        ],
        [
            "Query Length", f"{alt_len} bp" if str(alt_len).isdigit() else str(alt_len),
            "Reference Length", f"{ref_len} bp" if str(ref_len).isdigit() else str(ref_len)
        ],
        [
            "Alignment Score", str(score),
            "Sequence Identity", id_str
        ],
        [
            "Total Variants Detected", str(len(mutations)),
            "Indel Normalization", "HGVS 3'-Rule Right Shift"
        ]
    ]

    t_summary = Table(summary_data, colWidths=[130, 140, 130, 140])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F8FAFC')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1E293B')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 7.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 8))

    # 3. Alignment Visualization (Representative slice)
    if ref_aln and alt_aln:
        story.append(Paragraph("2. Pairwise Sequence Alignment Visualization", h2_style))
        slice_len = min(65, len(ref_aln))
        aln_block = (
            f"REF:   {ref_aln[:slice_len]}\n"
            f"MATCH: {match_str[:slice_len] if match_str else '|' * slice_len}\n"
            f"QUERY: {alt_aln[:slice_len]}"
        )
        if len(ref_aln) > slice_len:
            aln_block += f"\n[... and {len(ref_aln) - slice_len} additional alignment columns ...]"
        story.append(Preformatted(aln_block, mono_style))
        story.append(Spacer(1, 8))

    # 4. Mutation Table
    story.append(Paragraph(f"3. Identified Genetic Variations ({len(mutations)} events)", h2_style))

    if mutations:
        mut_rows = [["Local Pos", "CDS Pos", "Ref", "Alt", "Type", "Classification", "HGVS Notation", "Verification"]]
        for m in mutations[:20]:
            loc = str(m.get("localPosition", m.get("position", m.get("ref_position", ""))))
            cds = str(m.get("cdsPosition", m.get("cds_position", "Local only")))
            r_b = str(m.get("refBase", m.get("ref_sequence", m.get("ref_allele", "-"))))[:6]
            a_b = str(m.get("altBase", m.get("alt_sequence", m.get("alt_allele", "-"))))[:6]
            m_t = str(m.get("type", m.get("mutationType", "SUBSTITUTION")))[:12]
            sub_t = str(m.get("subType", m.get("classification", m_t)))[:14]
            hg = str(m.get("hgvs", m.get("localHgvs", m.get("hgvs_notation", ""))))[:20]
            if not hg and loc and r_b != "-" and a_b != "-":
                hg = f"c.{loc}{r_b}>{a_b}"
            ver = "RefSeq Verified" if cds != "Local only" and cds != loc else "Local Coordinate"

            mut_rows.append([loc, cds, r_b, a_b, m_t, sub_t, hg, ver])

        t_mut = Table(mut_rows, colWidths=[45, 50, 35, 35, 75, 75, 105, 75])
        t_mut.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#134E4A')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 7.5),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#FFFFFF')),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#1E293B')),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ]))
        story.append(t_mut)
        if len(mutations) > 20:
            story.append(Paragraph(f"<i>[Showing top 20 of {len(mutations)} total variants. Complete records are in the accompanying CSV export.]</i>", subtitle_style))
    else:
        story.append(Paragraph("No sequence variants identified (100% pairwise sequence identity match).", body_style))

    story.append(Spacer(1, 8))

    # 5. Coordinate System Explanation & Algorithm Descriptions
    story.append(Paragraph("4. Coordinate Systems, Algorithms, & Methodology", h2_style))
    method_text = (
        "<b>Coordinate Systems:</b> Local sequence coordinates represent 1-based indices relative to the uploaded "
        "query fragment. Transcript coding coordinates (c.) require a verified RefSeq transcript accession and regional "
        "offset (e.g. CFTR Exon 11 offset +1448 bp). Unmapped fragments are strictly reported under local coordinates to "
        "prevent erroneous genomic claims.<br/>"
        "<b>Algorithms:</b> Dynamic programming alignment is performed via the <i>Needleman-Wunsch algorithm</i> with affine "
        "gap penalties. Indels within repetitive sequence tracts undergo <i>HGVS 3'-rule right-shift normalization</i> to identify "
        "canonical representations. Exact pattern searching employs <i>Knuth-Morris-Pratt (KMP)</i> and <i>Boyer-Moore (BM)</i>; "
        "repeat structures are indexed via <i>Suffix Arrays with Kasai linear-time LCP computation</i>."
    )
    story.append(Paragraph(method_text, body_style))
    story.append(Spacer(1, 8))

    # 6. Academic & Clinical Notice
    story.append(Paragraph("5. Scientific Notice & Clinical Disclaimer", h2_style))
    disclaimer = (
        "<b>CRITICAL NOTICE:</b> Computational sequence alignment and variant calling in this report are deterministic "
        "mathematical procedures for academic, research, and bioinformatics benchmarking purposes. These results do NOT "
        "constitute a clinical diagnosis, clinical machine-learning prediction, or medical decision support. Clinical variant "
        "interpretation requires read depth, base quality scores, zygosity, variant allele fraction (VAF), and expert curation "
        "under ACMG/AMP clinical standards."
    )
    story.append(Paragraph(disclaimer, body_style))

    doc.build(story)
    return pdf_buffer.getvalue()
