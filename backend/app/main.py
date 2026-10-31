"""
GenomicsAI — Bioinformatics Analysis Platform FastAPI Backend
Core server providing deterministic algorithms for DNA pattern identification,
Needleman-Wunsch global alignment, mutation detection, motif disruption, disease association,
pharmacogenomics, AI assistant, and report exports.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.endpoints import router as v1_router
from app.api.platform_endpoints import router as platform_router
from app.database.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database and seed biological demo records on startup
    init_db()
    yield


app = FastAPI(
    title="GenomicsAI — Bioinformatics Analysis Platform API",
    description="Full-stack bioinformatics engine for sequence validation, pattern analysis, mutation detection, disease association, and pharmacogenomics.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS configuration to allow local Web development & external clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include both the standard /api platform routes and legacy /api/v1 routes
app.include_router(platform_router, prefix="/api")
app.include_router(v1_router, prefix="/api")


@app.get("/health", tags=["System"])
def health_check():
    """Health status probe for deployment and uptime checks."""
    return {
        "status": "healthy",
        "service": "smart-bioinformatics-backend",
        "platform": "GenomicsAI",
        "version": "2.0.0"
    }


@app.get("/", tags=["System"])
def root():
    """Root info page."""
    return {
        "project": "GenomicsAI — Bioinformatics Analysis Platform",
        "documentation": "/docs",
        "health": "/health",
        "endpoints": {
            "validation": "/api/v1/sequences/validate",
            "kmp": "/api/v1/patterns/kmp",
            "aho_corasick": "/api/v1/patterns/aho-corasick",
            "kmers": "/api/v1/sequences/kmers",
            "align": "/api/v1/sequences/align",
            "motif_disruptions": "/api/v1/motifs/disruptions",
            "six_frames": "/api/v1/coding/six-frames",
            "coding_compare": "/api/v1/coding/compare",
            "export_report": "/api/v1/reports/export"
        },
        "platform_endpoints": {
            "samples": "/api/samples",
            "pattern_analysis": "/api/analysis/pattern",
            "mutation_detection": "/api/analysis/mutations",
            "analysis_history": "/api/analysis/history",
            "dashboard_analytics": "/api/analytics/dashboard",
            "research_analytics": "/api/analytics/research",
            "disease_annotation": "/api/disease/annotate",
            "pharmacogenomics": "/api/pharmacogenomics/analyze",
            "ai_assistant": "/api/assistant/chat",
            "reports_export": "/api/reports/export"
        }
    }
