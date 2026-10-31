'use client';

import React, { useState, useEffect } from 'react';
import {
  Dna,
  Upload,
  Search,
  GitCompare,
  FileDown,
  Sparkles,
  ArrowRight,
  Layers,
  Repeat,
  Binary,
  Atom,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { saveAnalysisResult } from '@/lib/firestore-service';
import {
  detectSequenceType,
  validateDnaSequence,
  validateRnaSequence,
  validateProteinSequence,
  parseFasta,
  calculateNucleotideMetrics,
  calculateRnaMetrics,
  calculateProteinMetrics,
  transcribeDnaToRna,
  reverseTranscribeRnaToDna,
  findMotifs,
  needlemanWunsch,
  alignProteinBlosum62,
  translateSixFrames,
  getReverseComplement
} from '@/lib/bio-engine';
import {
  SequenceType,
  DnaMetrics,
  RnaMetrics,
  ProteinMetrics,
  AlignmentResult,
  MotifMatch,
  SixFrameTranslationResult,
  ProteinAlignmentResult
} from '@/types/bio';
import { generateCsvReport, downloadCsv, generatePdfReport } from '@/lib/report-generator';

const PRESETS = {
  SICKLE_CELL: {
    type: 'DNA' as SequenceType,
    title: "Sickle Cell Anemia (HBB Exon 1 HbS Mutation)",
    ref: "ATGGTGCACCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGG",
    alt: "ATGGTGCACCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTGTGGGGCAAGGTGAACGTGGATGAAGTTGGTGGTGAGGCCCTGGGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTTGGGGATCTGTCCACTCCTGATGCTGTTATGGGCAACCCTAAGGTGAAGGCTCATGGCAAGAAAGTGCTCGGTGCCTTTAGTGATGGCCTGGCTCACCTGGACAACCTCAAGGGCACCTTTGCCACACTGAGTGAGCTGCACTGTGACAAGCTGCACGTGGATCCTGAGAACTTCAGG",
    motif: "CCTGAG"
  },
  HBB_RNA: {
    type: 'RNA' as SequenceType,
    title: "Beta-Globin mRNA Exon 1 Transcript",
    ref: "AUGGUGCACCUGACUCCUGAGGAGAAGUCUGCCGUUACUGCCCUGUGGGGCAAGGUGAA",
    alt: "AUGGUGCACCUGACUCCUGUGGAGAAGUCUGCCGUUACUGCCCUGUGGGGCAAGGUGAA",
    motif: "CUGAG"
  },
  INSULIN_PROTEIN: {
    type: 'PROTEIN' as SequenceType,
    title: "Human Insulin A-Chain",
    ref: "GIVEQCCTSICSLYQLENYCN",
    alt: "GIVEQCCTSICSLYQLENYCA", // C-term Asn -> Ala
    motif: "CCTSI"
  },
  INDEL_BENCHMARK: {
    type: 'DNA' as SequenceType,
    title: "Micro-Indel Benchmark Sequence",
    ref: "ATGCGATCGATCGATCGATCGATCGAATTCGATCGATCGATCGTAGCTAGCTAGCTA",
    alt: "ATGCGATCGATCGTCGATCGAATTCGATCGATCGAACGTGTAGCTAGCTAGCTA",
    motif: "GAATTC"
  }
};

export default function AnalyzePage() {
  const [selectedType, setSelectedType] = useState<SequenceType>('DNA');
  const [title, setTitle] = useState("");
  const [refSequence, setRefSequence] = useState("");
  const [altSequence, setAltSequence] = useState("");
  const [motifQuery, setMotifQuery] = useState("");

  const [activeTab, setActiveTab] = useState<'alignment' | 'metrics' | 'translation' | 'motifs'>('alignment');
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Results
  const [dnaMetrics, setDnaMetrics] = useState<DnaMetrics | null>(null);
  const [rnaMetrics, setRnaMetrics] = useState<RnaMetrics | null>(null);
  const [proteinMetrics, setProteinMetrics] = useState<ProteinMetrics | null>(null);
  const [motifs, setMotifs] = useState<MotifMatch[]>([]);
  const [alignment, setAlignment] = useState<AlignmentResult | null>(null);
  const [proteinAlignment, setProteinAlignment] = useState<ProteinAlignmentResult | null>(null);
  const [translation, setTranslation] = useState<SixFrameTranslationResult | null>(null);
  const [detectedSuggestion, setDetectedSuggestion] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Reset analysis when inputs change so results are not shown directly without clicking the button
  useEffect(() => {
    setHasAnalyzed(false);
  }, [refSequence, altSequence, motifQuery, selectedType]);

  const handleRunAnalysis = () => {
    if (!refSequence.trim()) {
      setStatusMessage("Please enter or paste a reference sequence to analyze.");
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    setIsAnalyzing(true);
    runFullAnalysis();
    setHasAnalyzed(true);
    setIsAnalyzing(false);
    setTimeout(() => {
      recordAnalysisHistory();
    }, 100);
    setStatusMessage("Sequence analysis completed successfully!");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const runFullAnalysis = () => {
    if (!refSequence.trim()) {
      setDnaMetrics(null);
      setRnaMetrics(null);
      setProteinMetrics(null);
      setMotifs([]);
      setAlignment(null);
      setProteinAlignment(null);
      setTranslation(null);
      setDetectedSuggestion(null);
      return;
    }

    // 1. Auto-detect sequence type suggestion
    const detection = detectSequenceType(refSequence);
    if (detection.suggestedType !== selectedType && detection.confidence > 0.8) {
      setDetectedSuggestion(detection.suggestedType);
    } else {
      setDetectedSuggestion(null);
    }

    // 2. Modality-specific metrics & validation
    if (selectedType === 'DNA') {
      const dMetrics = calculateNucleotideMetrics(refSequence);
      setDnaMetrics(dMetrics);
      setRnaMetrics(null);
      setProteinMetrics(null);

      // Translation for DNA
      const trans = translateSixFrames(refSequence);
      setTranslation(trans);

      // DNA Alignment
      if (altSequence.trim()) {
        const alignRes = needlemanWunsch(refSequence, altSequence);
        setAlignment(alignRes);
        setProteinAlignment(null);
      }
    } else if (selectedType === 'RNA') {
      const rMetrics = calculateRnaMetrics(refSequence);
      setRnaMetrics(rMetrics);
      setDnaMetrics(null);
      setProteinMetrics(null);

      // Translation for RNA
      const trans = translateSixFrames(refSequence);
      setTranslation(trans);

      // RNA Alignment (Needleman-Wunsch with Uracil support)
      if (altSequence.trim()) {
        const alignRes = needlemanWunsch(refSequence, altSequence);
        setAlignment(alignRes);
        setProteinAlignment(null);
      }
    } else if (selectedType === 'PROTEIN') {
      const pMetrics = calculateProteinMetrics(refSequence);
      setProteinMetrics(pMetrics);
      setDnaMetrics(null);
      setRnaMetrics(null);
      setTranslation(null);

      // Protein BLOSUM62 Alignment
      if (altSequence.trim()) {
        const pAlign = alignProteinBlosum62(refSequence, altSequence);
        setProteinAlignment(pAlign);
        setAlignment(null);
      }
    }

    // 3. Motif search
    if (motifQuery.trim()) {
      const foundMotifs = findMotifs(refSequence, motifQuery, selectedType !== 'PROTEIN');
      setMotifs(foundMotifs);
    } else {
      setMotifs([]);
    }

    // 4. Automatically persist completed analysis to Cloud Firestore
    setTimeout(() => {
      recordAnalysisHistory();
    }, 100);
  };

  const handleFastaUpload = (e: React.ChangeEvent<HTMLInputElement>, isAlternate = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const records = parseFasta(content);
      if (records.length > 0) {
        if (isAlternate) {
          setAltSequence(records[0].sequence);
        } else {
          setRefSequence(records[0].sequence);
          if (records.length > 1) {
            setAltSequence(records[1].sequence);
          }
          if (records[0].id) {
            setTitle(records[0].id + (records[0].description ? ` - ${records[0].description}` : ''));
          }
          // Auto-switch sequence type if confidently identified
          const det = detectSequenceType(records[0].sequence);
          if (det.confidence > 0.85) {
            setSelectedType(det.suggestedType);
          }
        }
        setStatusMessage(`Successfully imported ${records.length} record(s) from FASTA`);
        setTimeout(() => setStatusMessage(null), 3500);
      }
    };
    reader.readAsText(file);
  };

  const handleTranscriptionToggle = () => {
    if (selectedType === 'DNA') {
      const rna = transcribeDnaToRna(refSequence);
      setRefSequence(rna);
      if (altSequence) setAltSequence(transcribeDnaToRna(altSequence));
      setSelectedType('RNA');
      setStatusMessage('Transcribed DNA to RNA (T → U)');
    } else if (selectedType === 'RNA') {
      const dna = reverseTranscribeRnaToDna(refSequence);
      setRefSequence(dna);
      if (altSequence) setAltSequence(reverseTranscribeRnaToDna(altSequence));
      setSelectedType('DNA');
      setStatusMessage('Reverse-transcribed RNA to cDNA (U → T)');
    }
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const { user, isDemoUser } = useAuth();

  const recordAnalysisHistory = async () => {
    if (!refSequence.trim()) return;
    try {
      const summaryText = alignment && alignment.mutations && alignment.mutations.length > 0
        ? alignment.mutations.map(m => `${m.type} at pos ${m.position}`).slice(0, 3).join(', ')
        : proteinAlignment && proteinAlignment.substitutions && proteinAlignment.substitutions.length > 0
          ? proteinAlignment.substitutions.map(s => `${s.refResidue}${s.position}${s.altResidue} (${s.isConservative ? 'conservative' : 'radical'})`).slice(0, 3).join(', ')
          : 'Homologous sequence match (no variants detected)';

      const effectiveUid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('biodna_client_uid') : null) || 'guest-researcher';
      const saveRes = await saveAnalysisResult({
        userId: effectiveUid,
        userEmail: user?.email || 'researcher@biodna.local',
        isDemoUser: isDemoUser || !user,
        title: title || `${selectedType} Sequence Analysis`,
        module: 'PAIRWISE_ALIGNMENT',
        analysisType: `${selectedType} Sequence Analysis & Global Alignment`,
        algorithm: selectedType === 'PROTEIN' ? 'BLOSUM62 Alignment' : 'Needleman-Wunsch Global Alignment',
        sequenceLength: refSequence.length,
        sequence: refSequence,
        parameters: {
          sequenceType: selectedType,
          hasAlternate: Boolean(altSequence.trim()),
          motifQuery: motifQuery.trim() || null
        },
        summary: summaryText,
        status: 'COMPLETED',
        results: {
          identity: alignment ? alignment.identity : proteinAlignment ? proteinAlignment.identityPercent : 100,
          score: alignment ? alignment.score : proteinAlignment ? proteinAlignment.score : 0,
          mutationCount: alignment ? alignment.mutations.length : proteinAlignment ? proteinAlignment.substitutions.length : 0,
          gcContent: dnaMetrics ? dnaMetrics.gcContent : rnaMetrics ? rnaMetrics.gcContent : 0,
          mutations: alignment?.mutations || []
        }
      });
      if (saveRes.success) {
        setStatusMessage(`Saved to Cloud Firestore (analyses/${saveRes.id?.slice(0, 8)}...)`);
      }
    } catch (e) {
      console.warn("Auto-save silent record:", e);
    }
  };

  const handleExportCsv = () => {
    const csvData = generateCsvReport(title || 'Sequence_Analysis', dnaMetrics, alignment);
    downloadCsv(`${(title || 'Sequence_Analysis').replace(/[^a-zA-Z0-9_-]/g, '_')}_Analysis.csv`, csvData);
    recordAnalysisHistory();
  };

  const handleExportPdf = async () => {
    try {
      await generatePdfReport(title || 'Sequence_Analysis', dnaMetrics, alignment);
      recordAnalysisHistory();
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
            <Dna className="w-6 h-6 text-teal-600" />
            BioDNA Multi-Modality Workbench
          </h1>
          <p className="text-sm text-slate-500">
            Unified analysis of DNA, RNA, and Protein sequences with 6-frame translation and BLOSUM62 alignment.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedType !== 'PROTEIN' && (
            <button
              onClick={handleTranscriptionToggle}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-semibold shadow-sm transition"
              title="Toggle DNA/RNA representation"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{selectedType === 'DNA' ? 'Transcribe to RNA' : 'Reverse to DNA'}</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-semibold text-white shadow-sm transition"
          >
            <FileDown className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2.5 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Sequence Type Selector & Preset Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Modality Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Sequence Modality:
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50">
              {(['DNA', 'RNA', 'PROTEIN'] as SequenceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${selectedType === type
                      ? 'bg-navy-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-navy-900'
                    }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {detectedSuggestion && (
              <span className="ml-3 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" />
                Detected: {detectedSuggestion}?
                <button
                  onClick={() => setSelectedType(detectedSuggestion as SequenceType)}
                  className="underline hover:text-amber-900 ml-1"
                >
                  Switch
                </button>
              </span>
            )}
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Preset:</span>
            <button
              onClick={() => {
                setSelectedType(PRESETS.SICKLE_CELL.type);
                setTitle(PRESETS.SICKLE_CELL.title);
                setRefSequence(PRESETS.SICKLE_CELL.ref);
                setAltSequence(PRESETS.SICKLE_CELL.alt);
                setMotifQuery(PRESETS.SICKLE_CELL.motif);
              }}
              className="px-2.5 py-1 text-xs bg-navy-50 text-navy-800 hover:bg-navy-100 rounded-md font-medium border border-navy-200 transition"
            >
              Sickle Cell DNA
            </button>
            <button
              onClick={() => {
                setSelectedType(PRESETS.HBB_RNA.type);
                setTitle(PRESETS.HBB_RNA.title);
                setRefSequence(PRESETS.HBB_RNA.ref);
                setAltSequence(PRESETS.HBB_RNA.alt);
                setMotifQuery(PRESETS.HBB_RNA.motif);
              }}
              className="px-2.5 py-1 text-xs bg-purple-50 text-purple-800 hover:bg-purple-100 rounded-md font-medium border border-purple-200 transition"
            >
              HBB mRNA (RNA)
            </button>
            <button
              onClick={() => {
                setSelectedType(PRESETS.INSULIN_PROTEIN.type);
                setTitle(PRESETS.INSULIN_PROTEIN.title);
                setRefSequence(PRESETS.INSULIN_PROTEIN.ref);
                setAltSequence(PRESETS.INSULIN_PROTEIN.alt);
                setMotifQuery(PRESETS.INSULIN_PROTEIN.motif);
              }}
              className="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-md font-medium border border-emerald-200 transition"
            >
              Insulin (Protein)
            </button>
          </div>
        </div>

        {/* Title Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
            Analysis Title / Sample Label
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm font-semibold text-navy-900 border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Dual Sequence Inputs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          {/* Reference Sequence */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                Reference {selectedType} Sequence ({selectedType === 'PROTEIN' ? 'N → C' : "5' → 3'"})
              </label>
              <label className="cursor-pointer text-[11px] font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload FASTA</span>
                <input type="file" accept=".fasta,.fa,.txt" onChange={(e) => handleFastaUpload(e, false)} className="hidden" />
              </label>
            </div>
            <textarea
              rows={4}
              value={refSequence}
              onChange={(e) => setRefSequence(e.target.value)}
              placeholder={`Paste ${selectedType} sequence...`}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y uppercase"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Length: {refSequence.replace(/\s+/g, '').length} {selectedType === 'PROTEIN' ? 'aa' : 'bp'}</span>
              {selectedType !== 'PROTEIN' && (
                <button
                  onClick={() => setRefSequence(getReverseComplement(refSequence))}
                  className="hover:text-teal-600 transition"
                >
                  Reverse Complement
                </button>
              )}
            </div>
          </div>

          {/* Alternate Sequence */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                Alternate / Variant {selectedType} Sequence
              </label>
              <label className="cursor-pointer text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>Upload FASTA</span>
                <input type="file" accept=".fasta,.fa,.txt" onChange={(e) => handleFastaUpload(e, true)} className="hidden" />
              </label>
            </div>
            <textarea
              rows={4}
              value={altSequence}
              onChange={(e) => setAltSequence(e.target.value)}
              placeholder={`Paste alternate ${selectedType} sequence for comparison...`}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y uppercase"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Length: {altSequence.replace(/\s+/g, '').length} {selectedType === 'PROTEIN' ? 'aa' : 'bp'}</span>
            </div>
          </div>
        </div>

        {/* Motif Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-navy-900 whitespace-nowrap">
            <Search className="w-4 h-4 text-teal-600" />
            <span>Search {selectedType} Motif:</span>
          </div>
          <input
            type="text"
            value={motifQuery}
            onChange={(e) => setMotifQuery(e.target.value)}
            placeholder={`Enter ${selectedType} pattern...`}
            className="flex-1 text-xs font-mono px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg uppercase focus:ring-2 focus:ring-teal-500 focus:outline-none"
          />
        </div>

        {/* Action Button: Run Analysis */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunAnalysis}
              disabled={!refSequence.trim() || isAnalyzing}
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50 text-xs sm:text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAnalyzing ? "Computing Analysis..." : "Analyze Sequence"}</span>
            </button>

            {hasAnalyzed && (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Results Computed</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setRefSequence("");
              setAltSequence("");
              setMotifQuery("");
              setTitle("");
              setHasAnalyzed(false);
            }}
            className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition self-start sm:self-auto"
          >
            Clear All Inputs
          </button>
        </div>
      </div>

      {!hasAnalyzed ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center font-bold">
            <Dna className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-navy-900">Ready for Sequence Analysis</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Enter your sequence data above and click the <strong>&quot;Analyze Sequence&quot;</strong> button to compute alignments, mutation classifications, and composition metrics.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-200 space-x-4">
            <button
              onClick={() => setActiveTab('alignment')}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${activeTab === 'alignment'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>Alignment &amp; Variations</span>
            </button>

            <button
              onClick={() => setActiveTab('metrics')}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${activeTab === 'metrics'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Layers className="w-4 h-4" />
              <span>{selectedType === 'PROTEIN' ? 'Physicochemical Metrics (MW/pI)' : 'Nucleotide Composition'}</span>
            </button>

            {selectedType !== 'PROTEIN' && (
              <button
                onClick={() => setActiveTab('translation')}
                className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${activeTab === 'translation'
                    ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
              >
                <Binary className="w-4 h-4" />
                <span>6-Frame Translation &amp; ORFs</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('motifs')}
              className={`py-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${activeTab === 'motifs'
                  ? 'border-teal-600 text-teal-700 bg-teal-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Search className="w-4 h-4" />
              <span>Motif Matches ({motifs.length})</span>
            </button>
          </div>

          {/* Tab 1: Alignment & Variation (DNA/RNA vs Protein) */}
          {activeTab === 'alignment' && (
            <div className="space-y-6">
              {selectedType === 'PROTEIN' ? (
                /* Protein BLOSUM62 Alignment */
                proteinAlignment ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Sequence Identity</span>
                        <p className="text-2xl font-black text-teal-600">{proteinAlignment.identityPercent}%</p>
                        <span className="text-[10px] text-slate-400">Strict residue identity</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Sequence Similarity</span>
                        <p className="text-2xl font-black text-indigo-600">{proteinAlignment.similarityPercent}%</p>
                        <span className="text-[10px] text-slate-400">Conservative substitutions</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">BLOSUM62 Score</span>
                        <p className="text-2xl font-black text-navy-900">{proteinAlignment.score}</p>
                        <span className="text-[10px] text-slate-400">Global protein score</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Substitutions</span>
                        <p className="text-2xl font-black text-rose-600">{proteinAlignment.substitutions.length}</p>
                        <span className="text-[10px] text-slate-400">Residue changes</span>
                      </div>
                    </div>

                    {/* Substitutions Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-xs font-bold text-navy-900 uppercase">
                          Amino Acid Substitutions ({proteinAlignment.substitutions.length})
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-4">Position</th>
                              <th className="py-2 px-4">Ref Residue</th>
                              <th className="py-2 px-4">Alt Residue</th>
                              <th className="py-2 px-4">Class</th>
                              <th className="py-2 px-4">BLOSUM62 Score</th>
                              <th className="py-2 px-4">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {proteinAlignment.substitutions.map((sub, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2 px-4 font-bold text-navy-900">pos {sub.position}</td>
                                <td className="py-2 px-4">{sub.refResidue}</td>
                                <td className="py-2 px-4 text-teal-600 font-bold">{sub.altResidue}</td>
                                <td className="py-2 px-4 font-sans font-semibold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] ${sub.isConservative ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                    }`}>
                                    {sub.isConservative ? 'Conservative' : 'Radical'}
                                  </span>
                                </td>
                                <td className="py-2 px-4">{sub.score}</td>
                                <td className="py-2 px-4 text-slate-700">{sub.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Alignment Box */}
                    <div className="bg-navy-950 rounded-xl p-5 border border-navy-800 text-slate-200 font-mono text-xs overflow-x-auto">
                      <div className="text-teal-300">REF: {proteinAlignment.refAligned}</div>
                      <div className="text-indigo-300">ALT: {proteinAlignment.altAligned}</div>
                    </div>
                  </>
                ) : (
                  <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    Please enter both reference and alternate protein sequences to run BLOSUM62 alignment.
                  </div>
                )
              ) : (
                /* Nucleic Acid (DNA / RNA) Alignment */
                alignment ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Sequence Identity</span>
                        <p className="text-2xl font-black text-teal-600">{alignment.identity}%</p>
                        <span className="text-[10px] text-slate-400">{alignment.identicalMatches} / {alignment.alignmentLength} matches</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Alignment Score</span>
                        <p className="text-2xl font-black text-navy-900">{alignment.score}</p>
                        <span className="text-[10px] text-slate-400">Needleman-Wunsch Global</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Mutations</span>
                        <p className="text-2xl font-black text-rose-600">{alignment.mutations.length}</p>
                        <span className="text-[10px] text-slate-400">Detected variants</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase">Reference Length</span>
                        <p className="text-2xl font-black text-slate-800">{refSequence.replace(/\s+/g, '').length} bp</p>
                      </div>
                    </div>

                    {/* Mutations Table */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                        <h3 className="text-xs font-bold text-navy-900 uppercase">
                          Detected Genomic Variations ({alignment.mutations.length})
                        </h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-4">Type</th>
                              <th className="py-2.5 px-4">Position</th>
                              <th className="py-2.5 px-4">Ref Base</th>
                              <th className="py-2.5 px-4">Alt Base</th>
                              <th className="py-2.5 px-4">Classification</th>
                              <th className="py-2.5 px-4">HGVS Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {alignment.mutations.map((m, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-4 font-bold">
                                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${m.type === 'SUBSTITUTION' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800'
                                    }`}>
                                    {m.type}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-navy-900">pos {m.position}</td>
                                <td className="py-2.5 px-4 font-mono font-bold">{m.refBase}</td>
                                <td className="py-2.5 px-4 font-mono font-bold text-teal-600">{m.altBase}</td>
                                <td className="py-2.5 px-4 font-semibold text-slate-700">{m.subType || '-'}</td>
                                <td className="py-2.5 px-4 font-mono text-slate-600">{m.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Visual Alignment */}
                    <div className="bg-navy-950 rounded-xl p-5 border border-navy-800 text-slate-200 font-mono text-xs overflow-x-auto">
                      <div className="text-teal-300">REF: {alignment.refAligned}</div>
                      <div className="text-slate-500">
                        &nbsp;&nbsp;&nbsp;&nbsp;{alignment.refAligned.split('').map((r, i) => {
                          const a = alignment.altAligned[i];
                          return r === a ? '|' : (r === '-' || a === '-' ? ' ' : '*');
                        }).join('')}
                      </div>
                      <div className="text-indigo-300">ALT: {alignment.altAligned}</div>
                    </div>
                  </>
                ) : (
                  <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                    Please enter both reference and alternate sequences to compute global alignment.
                  </div>
                )
              )}
            </div>
          )}

          {/* Tab 2: Composition & Physicochemical Metrics */}
          {activeTab === 'metrics' && (
            <div className="space-y-6">
              {selectedType === 'PROTEIN' && proteinMetrics ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Molecular Weight</span>
                      <p className="text-2xl font-black text-teal-600">{proteinMetrics.molecularWeightDaltons} Da</p>
                      <span className="text-[10px] text-slate-400">{(proteinMetrics.molecularWeightDaltons / 1000).toFixed(2)} kDa</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Isoelectric Point (pI)</span>
                      <p className="text-2xl font-black text-navy-900">{proteinMetrics.isoelectricPoint}</p>
                      <span className="text-[10px] text-slate-400">Net neutral charge pH</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">GRAVY Hydropathy</span>
                      <p className="text-2xl font-black text-indigo-600">{proteinMetrics.gravyIndex}</p>
                      <span className="text-[10px] text-slate-400">Kyte-Doolittle scale</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Residue Count</span>
                      <p className="text-2xl font-black text-slate-800">{proteinMetrics.length} aa</p>
                    </div>
                  </div>

                  {/* Amino Acid Frequencies */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-navy-900 uppercase">Amino Acid Composition</h3>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {Object.entries(proteinMetrics.aminoAcidCounts).map(([aa, count]) => (
                        <div key={aa} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-center font-mono">
                          <span className="text-xs font-bold text-teal-600">{aa}</span>
                          <p className="text-sm font-bold text-navy-900">{count}</p>
                          <span className="text-[10px] text-slate-400">{proteinMetrics.frequencies[aa]}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : selectedType === 'RNA' && rnaMetrics ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Length</span>
                      <p className="text-2xl font-black text-navy-900">{rnaMetrics.length} nt</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">GC Content</span>
                      <p className="text-2xl font-black text-teal-600">{rnaMetrics.gcContent}%</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">AU Content</span>
                      <p className="text-2xl font-black text-indigo-600">{rnaMetrics.auContent}%</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">GC Skew</span>
                      <p className="text-2xl font-black text-slate-700">{rnaMetrics.gcSkew}</p>
                    </div>
                  </div>

                  {/* RNA Bases */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-800">Adenine (A)</span>
                      <p className="text-xl font-bold text-emerald-900">{rnaMetrics.counts.A}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <span className="text-xs font-bold text-purple-800">Uracil (U)</span>
                      <p className="text-xl font-bold text-purple-900">{rnaMetrics.counts.U}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <span className="text-xs font-bold text-blue-800">Cytosine (C)</span>
                      <p className="text-xl font-bold text-blue-900">{rnaMetrics.counts.C}</p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-xs font-bold text-amber-800">Guanine (G)</span>
                      <p className="text-xl font-bold text-amber-900">{rnaMetrics.counts.G}</p>
                    </div>
                  </div>
                </>
              ) : dnaMetrics ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">Length</span>
                      <p className="text-2xl font-black text-navy-900">{dnaMetrics.length} bp</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">GC Content</span>
                      <p className="text-2xl font-black text-teal-600">{dnaMetrics.gcContent}%</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">AT Content</span>
                      <p className="text-2xl font-black text-indigo-600">{dnaMetrics.atContent}%</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase">GC Skew</span>
                      <p className="text-2xl font-black text-slate-700">{dnaMetrics.gcSkew}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                  Please enter a reference sequence above to compute nucleotide and physicochemical composition metrics.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: 6-Frame Translation & ORFs (DNA/RNA only) */}
          {activeTab === 'translation' && (
            translation ? (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-navy-900 uppercase">
                    Open Reading Frames (ORFs) Detected ({translation.orfs.length})
                  </h3>
                  {translation.orfs.length === 0 ? (
                    <p className="text-xs text-slate-500">No Open Reading Frames exceeding minimum threshold found.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Frame</th>
                            <th className="py-2 px-3">Nucleotide Range</th>
                            <th className="py-2 px-3">Length (AA)</th>
                            <th className="py-2 px-3">Start / Stop</th>
                            <th className="py-2 px-3">Peptide Sequence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {translation.orfs.slice(0, 10).map((orf, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-navy-900">
                                {orf.frame > 0 ? `+${orf.frame}` : orf.frame}
                              </td>
                              <td className="py-2 px-3 text-slate-600">{orf.startNucleotide} - {orf.endNucleotide}</td>
                              <td className="py-2 px-3 text-teal-600 font-bold">{orf.lengthAminoAcids} aa</td>
                              <td className="py-2 px-3 font-sans text-[11px]">
                                {orf.hasStartCodon && orf.hasStopCodon ? 'Full ORF (M...*)' : 'Partial'}
                              </td>
                              <td className="py-2 px-3 max-w-xs truncate text-slate-700">{orf.proteinSequence}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* 6 Reading Frames Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Forward Frames */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-teal-700 uppercase">Forward Reading Frames (+1, +2, +3)</h4>
                    {translation.forwardFrames.map((rf) => (
                      <div key={rf.frame} className="p-3 bg-slate-50 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                          <span>Frame +{rf.frame}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{rf.proteinSequence.length} aa • {rf.stopCount} stop(s)</span>
                        </div>
                        <p className="text-xs font-mono break-all text-slate-700 leading-relaxed">
                          {rf.proteinSequence}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Reverse Frames */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-indigo-700 uppercase">Reverse Reading Frames (-1, -2, -3)</h4>
                    {translation.reverseFrames.map((rf) => (
                      <div key={rf.frame} className="p-3 bg-slate-50 rounded-lg space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-navy-900">
                          <span>Frame {rf.frame}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{rf.proteinSequence.length} aa • {rf.stopCount} stop(s)</span>
                        </div>
                        <p className="text-xs font-mono break-all text-slate-700 leading-relaxed">
                          {rf.proteinSequence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Please enter a reference nucleotide sequence above to compute 6-frame translation and detect Open Reading Frames (ORFs).
              </div>
            )
          )}

          {/* Tab 4: Motifs */}
          {activeTab === 'motifs' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-navy-900 uppercase">
                  {motifQuery ? `Motif Matches for "${motifQuery}" (${motifs.length} found)` : 'Motif Identification'}
                </h3>
              </div>
              {motifs.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">
                  {motifQuery.trim()
                    ? `No occurrences of motif pattern "${motifQuery}" found in the sequence.`
                    : 'Enter a motif query above to scan for exact and reverse-complement patterns.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-100 text-slate-700 font-bold font-sans">
                      <tr>
                        <th className="py-2.5 px-4">Start (1-based)</th>
                        <th className="py-2.5 px-4">End</th>
                        <th className="py-2.5 px-4">Strand</th>
                        <th className="py-2.5 px-4">Matched Sequence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {motifs.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-navy-900">{m.start}</td>
                          <td className="py-2.5 px-4 text-slate-600">{m.end}</td>
                          <td className="py-2.5 px-4 font-sans">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                              {m.strand === '+' ? '+ (Forward)' : '- (RevComp)'}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-teal-700">{m.matchedSequence}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
