# GenomicsAI — Bioinformatics Analysis Platform

An advanced, full-stack scientific bioinformatics web platform built with **React, Next.js 14 App Router, TypeScript, Tailwind CSS, and Python FastAPI**. GenomicsAI delivers deterministic sequence pattern analysis, pairwise Needleman-Wunsch global alignment, mutation detection, clinical disease association mapping (ClinVar & OMIM), pharmacogenomics (CPIC & PharmGKB), and an interactive scientific AI Assistant.

---

## 🔬 System Architecture

```text
├── web/                           # React / Next.js 14 App Router (TypeScript, Tailwind CSS, Lucide Icons)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # 1. Genomics Dashboard (KPI cards, Donut & Bar charts, Recent activity)
│   │   │   ├── upload/            # 2. Upload DNA Sample (Drag-and-drop FASTA, real-time validation preview)
│   │   │   ├── samples/           # 3. DNA Samples Library (Filters, detail modal, edit metadata, delete)
│   │   │   ├── pattern-analysis/  # 4. Pattern Analysis (Nucleotide distribution, dinucleotides, motif search)
│   │   │   ├── mutation-detection/# 5. Mutation Detection (Needleman-Wunsch alignment, SNPs, indels, HGVS)
│   │   │   ├── disease-association# 6. Disease Association (ClinVar, OMIM, disease mapping, disclaimer)
│   │   │   ├── drug-response/     # 7. Drug Response / PGx (CPIC Level A guidelines, metabolizer phenotypes)
│   │   │   ├── research-analytics/# 8. Research & Analytics (GC comparison, radar chart, PDF/CSV/JSON export)
│   │   │   └── ai-assistant/      # 9. AI Assistant (Grounded scientific LLM/rule-based research chat)
│   │   ├── components/            # Reusable UI Components
│   │   │   ├── GenomicsSidebar.tsx# Fixed dark navy/black sidebar with turquoise logo & collapse control
│   │   │   ├── GenomicsHeader.tsx # Header bar with backend health indicator & actions
│   │   │   └── charts/            # Responsive interactive SVG charts (Donut, Bar, Radar, Heatmap)
│   │   └── lib/api-client.ts      # Typed REST API Client with automatic fallback
│   └── package.json
│
├── backend/                       # Python 3.14 FastAPI Engine & SQLite Database
│   ├── app/
│   │   ├── api/
│   │   │   ├── platform_endpoints.py # REST API for Samples, Analysis, Disease, PGx, AI Chat, Reports
│   │   │   └── v1/endpoints.py       # Core bioinformatics algorithms endpoints
│   │   ├── database/
│   │   │   └── db.py              # SQLite thread-safe DB manager with pre-seeded biological records
│   │   ├── engine/                # Deterministic Scientific Engines
│   │   │   ├── alignment.py       # Needleman-Wunsch global pairwise alignment (+2, -1, -2)
│   │   │   ├── assistant.py       # Scientific AI Assistant engine with sample context grounding
│   │   │   ├── disease.py         # Curated ClinVar / OMIM clinical disease association knowledge base
│   │   │   ├── mutations.py       # Variant detection (transitions vs transversions, indels, HGVS)
│   │   │   ├── pattern_analysis.py# Dinucleotide frequencies, GC/AT skew, KMP motif matching
│   │   │   ├── pharmacogenomics.py# CPIC / PharmGKB drug-gene guideline profiles
│   │   │   ├── validation.py      # IUPAC nucleotide validation and GC content
│   │   │   └── reports.py         # Scientific PDF, CSV, and JSON report generator
│   │   ├── models/schemas.py      # Pydantic request & response models
│   │   └── main.py                # FastAPI entrypoint, lifespan DB initialization, CORS
│   ├── tests/                     # 27 Automated Pytest Tests (100% Passing)
│   │   ├── test_api.py            # Core engine endpoint tests
│   │   ├── test_engine.py         # Deterministic algorithm tests
│   │   └── test_platform.py       # CRUD, mutation detection, and analytics tests
│   └── requirements.txt
└── README.md
```

---

## 🧬 Application Modules & Reference Views

### 1. Genomics Dashboard (`/` & `/dashboard`)
- **4 Summary KPI Cards:** Total Samples, Analyzed pipelines, Mutations Found, and Average GC Content.
- **4 Quick Action Cards:** Upload Samples, Run Analysis, Detect Mutations, and Drug Response.
- **Visual Analytics:** Interactive Donut chart displaying Sample Status Distribution (`Analyzed`, `Pending`, `Processing`) and Bar chart showing Mutation Type Distribution (SNPs, Insertions, Deletions).
- **Recent Samples & Activity:** Live table with direct links to run analysis or view sequence details.

### 2. Upload DNA Sample (`/upload`)
- Dual input modes: **Paste Sequence** or **Upload File** (supports `.fasta`, `.fa`, `.fna`, `.fastq`, `.txt`).
- Quick benchmark presets: Human HBB (Sickle Cell), Human HBB Reference (Normal Beta-Globin), Human BRCA1, and SARS-CoV-2 Spike RBD.
- **Real-Time Live Preview & Validation:** Displays sequence length, base counts (A, T/U, C, G, IUPAC ambiguity codes), GC% and AT%, with validation badge.

### 3. DNA Samples Library (`/samples`)
- Repository browser displaying sample format, status badge, length (bp), GC content, and sequence preview.
- Search by sample name or organism with status and sample-type dropdown filters.
- **Sample Detail Modal:** View full nucleotide sequence, copy to clipboard, download FASTA file, edit metadata, or launch pattern/mutation analysis.
- Delete confirmation dialog with cascade cleanup.

### 4. DNA Pattern Analysis (`/pattern-analysis`)
- Calculates sequence length, nucleotide counts, individual nucleotide percentages, GC content, AT content, GC skew, and AT skew.
- **Dinucleotide Frequencies:** Full 16-pair base-step transition analysis ($k=2$) with interactive frequency bar chart.
- **Motif Detection:** Knuth-Morris-Pratt (KMP) exact string matching on both forward ($+$) and reverse-complement ($-$) strands with 1-based biological coordinates and highlighted sequence context.

### 5. Mutation Detection (`/mutation-detection`)
- Pairwise **Needleman-Wunsch global alignment** comparing query DNA against reference genomes.
- Reference options: Select saved reference sample, paste custom reference, or run a clearly-labeled synthetic demonstration benchmark.
- **Color-Coded Alignment Viewer:** Visualizes reference, match string (`|` match, `.` transition, `*` transversion, `-` gap), and query sequence broken into readable 60-bp blocks.
- **Variants Table:** Position (1-based), reference allele, alternate allele, variant type (SNP Transition vs Transversion, Insertion, Deletion), HGVS cDNA nomenclature (`c.20A>T`), and coding consequence.

### 6. Disease Association (`/disease-association`)
- Cross-references detected variants with curated evidence from **ClinVar, OMIM, and dbSNP**.
- Search by gene symbol (*HBB*, *BRCA1*, *BRCA2*, *CFTR*, *TP53*, *EGFR*, *APOE*, *LDLR*) or variant identifier (`c.20A>T`, `rs334`).
- Displays gene name, variant, associated clinical condition, inheritance pattern, clinical significance (Pathogenic, Risk Factor), evidence tier, and molecular mechanism.
- *Notice: "Research and educational use only. Results are not a medical diagnosis."*

### 7. Drug Response / Pharmacogenomics (`/drug-response`)
- Evaluates gene-drug interactions based on **CPIC (Level A)** and **PharmGKB (1A)** guidelines.
- Filter by therapeutic area (Cardiology, Oncology, Pain Management, Infectious Disease) or search specific medications (Warfarin, Clopidogrel, Codeine, Fluorouracil, Simvastatin, Abacavir, Tamoxifen).
- Displays target pharmacogene (*CYP2C19*, *CYP2D6*, *CYP2C9*, *VKORC1*, *DPYD*, *SLCO1B1*, *HLA-B*), variant alleles, predicted metabolizer phenotype (Poor, Intermediate, Normal, Ultra-rapid), clinical implication, and dosing recommendation.
- *Notice: "Research and educational use only. Never modify medication without consulting a physician."*

### 8. Research & Analytics (`/research-analytics`)
- Cohort-wide metrics: Total Samples, Total Mutations, Disease Analyses, and Drug Predictions.
- **GC Content Comparison:** Multi-sample bar chart comparing GC% across the repository.
- **Research Coverage Radar Chart:** 6-axis polygon evaluating coverage across Genomic DNA, Coding Exons, RNA Transcripts, Variant Calling, Disease Mapping, and Pharmacogenomics.
- Export engine: Download scientific analysis reports in **CSV**, **JSON**, or formatted **PDF** format.

### 9. AI Assistant (`/ai-assistant`)
- Context-aware scientific conversational assistant grounded in the user's uploaded samples and recorded mutations.
- Explains biological mechanisms, melting temperatures, transition vs transversion biochemistry, and algorithm mechanics.
- Suggested research prompt pills for one-click exploration.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested with Node 20 / 22)
- Python 3.10+ (tested with Python 3.14)

### 1. Python FastAPI Backend Setup & Execution

```powershell
cd "c:\DNA Detection APP\backend"

# Activate the virtual environment
.venv\Scripts\Activate.ps1

# Start the FastAPI server with Uvicorn
.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

- **Interactive Swagger API Documentation:** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`
- **Health Check Probe:** `http://127.0.0.1:8000/health`

### 2. Next.js Web Application Setup & Execution

```powershell
cd "c:\DNA Detection APP\web"

# Run development server
npm.cmd run dev
```

- Open your browser to: `http://localhost:3000`
- The application connects to the FastAPI backend at `http://127.0.0.1:8000/api`. If the backend is starting up or offline, the frontend seamlessly operates in Client Engine Mode so analysis, alignment, and reports remain 100% operational.

### 3. One-Click Simultaneous Startup (Windows)

Double-click `start.bat` in the project root to launch both the FastAPI backend and Next.js frontend simultaneously in dedicated console windows.

### 4. Running the Automated Pytest Test Suite

```powershell
cd "c:\DNA Detection APP"
backend\.venv\Scripts\pytest.exe backend\tests -v
```

All 45 automated tests cover:
- FASTA file parsing, multi-records, headers, and IUPAC ambiguous bases
- KMP string matching and LPS prefix tables
- Boyer-Moore Bad Character heuristics and sublinear scanning
- Suffix Array construction, Kasai LCP, and Longest Repeated Substrings (LRS)
- K-mer frequency distributions, proportions, and Shannon sequence entropy in bits
- Six-Frame in silico translation across reading frames and candidate ORF detection
- Real runtime performance measurement without simulated or hardcoded values
- Needleman-Wunsch global alignment and variant calling
- Ad-hoc and persistent CSV and PDF report generation
- Curated human gene benchmarks (HBB, BRCA1, CFTR) with verified HGVS 3'-normalization
- SQLite database CRUD, seeding, and sample persistence
- Disease association queries & CPIC pharmacogenomic screenings

---

## 🔒 Security & Data Integrity
- Strict sequence sanitization removing whitespace, illegal characters, and carriage returns.
- Standard biological 1-based coordinate mapping.
- SQLite foreign key constraints and transactional integrity.
- Clear distinction between synthetic demonstration benchmarks and clinical reference sequences.
