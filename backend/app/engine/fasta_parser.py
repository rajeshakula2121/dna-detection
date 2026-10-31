"""
FASTA Parser Engine
Parses single or multi-record FASTA sequence files and raw text inputs (.fasta, .fa, .fna).
Ensures safe in-memory processing without writing unsanitized filenames to the filesystem.
Validates IUPAC DNA nucleotides, calculates composition metrics, and flags unsupported symbols.
"""

import io
import re
from typing import List, Dict, Any, Optional
from Bio import SeqIO
from .validation import validate_dna_sequence, calculate_nucleotide_metrics

# Maximum allowable FASTA text input size (15 MB) to prevent resource exhaustion
MAX_FASTA_SIZE_BYTES = 15 * 1024 * 1024


def sanitize_record_identifier(raw_id: str) -> str:
    """Sanitizes header identifiers by stripping unsafe characters and path separators."""
    if not raw_id:
        return "unnamed_sequence"
    # Remove control characters, backslashes, slashes, and SQL delimiters to prevent path traversal
    cleaned = re.sub(r'[\r\n\t\\/:"*?<>|;]', '_', raw_id.strip())
    # Strip directory traversal patterns
    cleaned = re.sub(r'\.\.+', '_', cleaned)
    return cleaned[:100]  # Cap ID length for UI safety


def parse_fasta_string(fasta_text: str, max_size_bytes: int = MAX_FASTA_SIZE_BYTES) -> List[Dict[str, Any]]:
    """
    Parse a FASTA-formatted string into structured sequence records.
    Supports single or multiple records (>header ... sequence).
    
    Security:
    - Enforces maximum payload size.
    - Operates purely in-memory using StringIO.
    - Never uses header strings or filenames as filesystem paths.
    - Never modifies invalid sequences silently.
    
    Returns a list of dicts:
        id: str
        name: str
        description: str
        sequence: str
        length: int
        gcContent: float
        atContent: float
        counts: Dict[str, int]
        hasAmbiguous: bool
        ambiguousCounts: Dict[str, int]
        isValidDna: bool
        validationError: str
        invalidCharacters: List[Dict]
    """
    if not fasta_text or not fasta_text.strip():
        return []

    if len(fasta_text.encode('utf-8')) > max_size_bytes:
        raise ValueError(f"FASTA payload exceeds maximum size limit of {max_size_bytes // (1024 * 1024)} MB.")

    records = []
    text_io = io.StringIO(fasta_text.strip())

    try:
        parsed_any = False
        for seq_record in SeqIO.parse(text_io, "fasta"):
            parsed_any = True
            raw_seq = str(seq_record.seq).upper().replace(" ", "").replace("\r", "")
            rec = _build_record_dict(
                rec_id=str(seq_record.id),
                rec_name=str(seq_record.name or seq_record.id),
                rec_desc=str(seq_record.description),
                sequence=raw_seq
            )
            records.append(rec)

        if not parsed_any:
            # Fallback to manual parser if SeqIO parsed 0 records (e.g. raw sequence without '>' or unusual formatting)
            records = _fallback_fasta_parse(fasta_text)

    except Exception:
        # Fallback manual parser for malformed FASTA or non-standard headers
        records = _fallback_fasta_parse(fasta_text)

    return records


def _build_record_dict(rec_id: str, rec_name: str, rec_desc: str, sequence: str) -> Dict[str, Any]:
    """Helper to validate sequence and calculate composition metrics for a FASTA record."""
    clean_id = sanitize_record_identifier(rec_id)
    clean_name = sanitize_record_identifier(rec_name)
    clean_desc = rec_desc.strip()[:250] if rec_desc else ""

    # Validate sequence without modifying invalid characters
    is_valid, cleaned, error_msg, invalid_chars = validate_dna_sequence(sequence, allow_ambiguous=True)
    metrics = calculate_nucleotide_metrics(sequence)

    has_ambiguous = bool(metrics.get("ambiguous_counts"))

    return {
        "id": clean_id,
        "name": clean_name,
        "description": clean_desc,
        "sequence": sequence,
        "length": len(sequence),
        "gcContent": metrics.get("gc_content", 0.0),
        "atContent": metrics.get("at_content", 0.0),
        "counts": metrics.get("counts", {}),
        "hasAmbiguous": has_ambiguous,
        "ambiguousCounts": metrics.get("ambiguous_counts", {}),
        "isValidDna": is_valid,
        "validationError": error_msg,
        "invalidCharacters": invalid_chars
    }


def _fallback_fasta_parse(fasta_text: str) -> List[Dict[str, Any]]:
    """Manual parser for FASTA text, handling multi-record files and header-less raw sequence blocks."""
    records = []
    lines = fasta_text.strip().splitlines()

    current_id = None
    current_desc = ""
    current_seq_lines = []

    has_header = any(line.strip().startswith(">") for line in lines)

    # Case 1: Raw sequence without '>' header
    if not has_header:
        raw_seq = "".join(line.strip() for line in lines).upper()
        if raw_seq:
            return [_build_record_dict("raw_sequence", "Raw Sequence Input", "User pasted raw DNA sequence", raw_seq)]
        return []

    # Case 2: Standard or multi-record FASTA with '>' headers
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith(">"):
            if current_id is not None:
                seq = "".join(current_seq_lines).upper()
                records.append(_build_record_dict(current_id, current_id, current_desc, seq))
            header_parts = line[1:].strip().split(maxsplit=1)
            current_id = header_parts[0] if header_parts else "unnamed_sequence"
            current_desc = header_parts[1] if len(header_parts) > 1 else ""
            current_seq_lines = []
        else:
            current_seq_lines.append(line)

    if current_id is not None and current_seq_lines:
        seq = "".join(current_seq_lines).upper()
        records.append(_build_record_dict(current_id, current_id, current_desc, seq))

    return records
