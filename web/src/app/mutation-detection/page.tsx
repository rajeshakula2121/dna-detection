'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GitCompare,
  Dna,
  Play,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Info,
  ChevronRight,
  ShieldAlert,
  Download,
  Bookmark,
  Eye,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import {
  fetchSamplesApi,
  runMutationDetectionApi,
  fetchBenchmarksApi,
  generateAdHocReportApi,
  Sample,
  MutationAnalysisResult,
  BenchmarkItem
} from '@/lib/api-client';
import { useAuth } from '@/context/AuthContext';
import { saveAnalysisResult } from '@/lib/firestore-service';
import { validateDnaSequence } from '@/lib/bio-engine';

function MutationDetectionContent() {
  const searchParams = useSearchParams();
  const preselectedSampleId = searchParams.get('sample_id');
  const queryModeParam = searchParams.get('mode');

  const { user, isDemoUser } = useAuth();

  const [samples, setSamples] = useState<Sample[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);

  // Query selection
  const [queryChoice, setQueryChoice] = useState<'saved' | 'custom'>(queryModeParam === 'custom' ? 'custom' : 'saved');
  const [querySampleId, setQuerySampleId] = useState<string>(preselectedSampleId || '');
  const [customQuerySeq, setCustomQuerySeq] = useState<string>('');
  const [queryLabel, setQueryLabel] = useState<string>('Query Sequence');

  // Reference selection
  const [referenceChoice, setReferenceChoice] = useState<'saved' | 'custom' | 'benchmark' | 'demo'>('saved');
  const [referenceSampleId, setReferenceSampleId] = useState<string>('');
  const [customRefSequence, setCustomRefSequence] = useState<string>('');
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');
  const [referenceLabel, setReferenceLabel] = useState<string>('Reference Sequence');

  // Alignment Parameters
  const [matchScore, setMatchScore] = useState<number>(2);
  const [mismatchPenalty, setMismatchPenalty] = useState<number>(-1);
  const [gapPenalty, setGapPenalty] = useState<number>(-2);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MutationAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Interactive Variant Inspection
  const [inspectedMutationIndex, setInspectedMutationIndex] = useState<number | null>(null);

  // Check for preloaded payload in sessionStorage (from Upload page)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('temp_mutation_alignment_payload');
      if (stored) {
        try {
          const payload = JSON.parse(stored);
          if (payload.querySequence) {
            setQueryChoice('custom');
            setCustomQuerySeq(payload.querySequence);
            setQueryLabel(payload.queryName || 'Uploaded Query');
          }
          if (payload.referenceSequence) {
            setReferenceChoice('custom');
            setCustomRefSequence(payload.referenceSequence);
            setReferenceLabel(payload.referenceName || 'Uploaded Reference');
          }
          sessionStorage.removeItem('temp_mutation_alignment_payload');
        } catch (e) {
          console.warn('Session payload parse warning:', e);
        }
      }
    }
  }, []);

  // Fetch samples and benchmarks on mount
  useEffect(() => {
    fetchSamplesApi()
      .then((data) => {
        setSamples(data);
        if (!querySampleId && data.length > 0 && queryChoice === 'saved') {
          const defaultQuery = data.find((s) => s.name.includes('Sickle Cell')) || data[0];
          setQuerySampleId(defaultQuery.id);
        }
        const defaultRef = data.find((s) => s.sample_type === 'Reference Sequence' || s.name.includes('Reference'));
        if (defaultRef && referenceChoice === 'saved') {
          setReferenceSampleId(defaultRef.id);
        } else if (data.length > 1 && referenceChoice === 'saved') {
          setReferenceSampleId(data[1].id);
        }
      })
      .catch((err) => console.warn('Samples fetch warning:', err));

    fetchBenchmarksApi()
      .then((data) => {
        setBenchmarks(data);
        if (data.length > 0) {
          setSelectedBenchmarkId(data[0].id);
        }
      })
      .catch((err) => console.warn('Benchmarks fetch warning:', err));
  }, []);

  const handleQuerySelect = (selectedId: string) => {
    setQuerySampleId(selectedId);
    if (!selectedId) return;

    const q = samples.find((s) => s.id === selectedId);
    if (!q) return;
    setQueryLabel(q.name);

    // Auto-pair with corresponding wild-type reference
    if (q.name.includes('HBB') || q.id.includes('hbb')) {
      const match = samples.find(
        (s) => s.id === 'sample-hbb-ref-001' || (s.name.includes('HBB') && s.name.includes('Reference'))
      );
      if (match) setReferenceSampleId(match.id);
    } else if (q.name.includes('BRCA1') || q.id.includes('brca1')) {
      const match = samples.find(
        (s) => s.id === 'sample-brca1-ref-003' || (s.name.includes('BRCA1') && s.name.includes('Reference'))
      );
      if (match) setReferenceSampleId(match.id);
    } else if (q.name.includes('CFTR') || q.id.includes('cftr')) {
      const match = samples.find(
        (s) => s.id === 'sample-cftr-ref-005' || (s.name.includes('CFTR') && s.name.includes('Reference'))
      );
      if (match) setReferenceSampleId(match.id);
    }
  };

  const handleApplyBenchmark = (b: BenchmarkItem) => {
    setQueryChoice('custom');
    setCustomQuerySeq(b.variant_sequence);
    setQueryLabel(`${b.gene_symbol} ${b.variant_name}`);

    setReferenceChoice('custom');
    setCustomRefSequence(b.ref_sequence);
    setReferenceLabel(`${b.gene_symbol} Reference (${b.ref_accession})`);

    setSaveSuccessMsg(`Loaded benchmark ${b.gene_symbol} (${b.clinical_condition})! Ready for pairwise alignment.`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleRunDetection = async () => {
    setLoading(true);
    setErrorMsg(null);
    setSaveSuccessMsg(null);
    setInspectedMutationIndex(null);
    setResult(null); // Clear stale results before new analysis

    try {
      const payload: any = {
        match_score: matchScore,
        mismatch_penalty: mismatchPenalty,
        gap_penalty: gapPenalty
      };

      // 1. Resolve and Validate Query Sequence
      if (queryChoice === 'saved') {
        if (!querySampleId) throw new Error('Please select a query sample from the repository.');
        payload.sample_id = querySampleId;
        const s = samples.find((item) => item.id === querySampleId);
        if (s) {
          const valQ = validateDnaSequence(s.sequence, false);
          if (!valQ.isValid) {
            throw new Error(`Saved query sample contains invalid nucleotides: ${valQ.invalidChars.join(', ')}`);
          }
          payload.query_sequence = valQ.cleaned;
          payload.query_name = s.name;
        }
      } else {
        if (!customQuerySeq || !customQuerySeq.trim()) {
          throw new Error('Please enter or paste the query DNA sequence.');
        }
        const valQ = validateDnaSequence(customQuerySeq, false);
        if (!valQ.isValid) {
          throw new Error(`Query sequence invalid: unsupported characters [${valQ.invalidChars.join(', ')}]`);
        }
        payload.query_sequence = valQ.cleaned;
        payload.query_name = queryLabel || 'Custom Query DNA';
      }

      // 2. Resolve and Validate Reference Sequence
      if (referenceChoice === 'saved') {
        if (!referenceSampleId) throw new Error('Please select a reference sequence to compare against.');
        payload.reference_id = referenceSampleId;
        const refS = samples.find((item) => item.id === referenceSampleId);
        if (refS) {
          const valR = validateDnaSequence(refS.sequence, false);
          if (!valR.isValid) {
            throw new Error(`Saved reference sample contains invalid nucleotides: ${valR.invalidChars.join(', ')}`);
          }
          payload.reference_sequence = valR.cleaned;
          payload.reference_name = refS.name;
        }
      } else if (referenceChoice === 'benchmark') {
        const bm = benchmarks.find((b) => b.id === selectedBenchmarkId);
        if (bm) {
          const valR = validateDnaSequence(bm.ref_sequence, false);
          if (!valR.isValid) {
            throw new Error(`Benchmark reference contains invalid nucleotides: ${valR.invalidChars.join(', ')}`);
          }
          payload.reference_sequence = valR.cleaned;
          payload.coordinate_offset = bm.coordinate_offset;
          payload.transcript_accession = bm.ref_accession;
          payload.reference_name = `${bm.gene_symbol} Ref (${bm.ref_accession})`;
        }
      } else if (referenceChoice === 'custom') {
        if (!customRefSequence || !customRefSequence.trim()) {
          throw new Error('Please enter or paste the reference sequence.');
        }
        const valR = validateDnaSequence(customRefSequence, false);
        if (!valR.isValid) {
          throw new Error(`Reference sequence invalid: unsupported characters [${valR.invalidChars.join(', ')}]`);
        }
        payload.reference_sequence = valR.cleaned;
        payload.reference_name = referenceLabel || 'Custom Reference DNA';
      } else {
        payload.auto_generate_demo = true;
      }

      const res = await runMutationDetectionApi(payload);
      setResult(res);
      if (res.mutations && res.mutations.length > 0) {
        setInspectedMutationIndex(0); // Auto-inspect first variant
      }

      // Auto-save to Cloud Firestore (supports authenticated users, demo, and guests)
      const effectiveUid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('biodna_client_uid') : null) || 'guest-researcher';
      const summary = `${res.mutationCount} sequence variant(s) detected (${res.snpCount} SNPs, ${res.insertionCount} Ins, ${res.deletionCount} Del); Identity: ${res.identity}%, Alignment Score: ${res.alignmentScore}.`;
      const saveRes = await saveAnalysisResult({
        userId: effectiveUid,
        userEmail: user?.email || 'researcher@biodna.local',
        isDemoUser: isDemoUser || !user,
        title: `Mutation Detection: ${res.queryName} vs. ${res.referenceName}`,
        module: 'MUTATION_DETECTION',
        analysisType: 'Pairwise Needleman-Wunsch Alignment & Mutation Detection',
        algorithm: 'Needleman-Wunsch Global Alignment & HGVS 3-Prime Normalization',
        sequenceLength: res.altLength,
        sequence: res.altAligned.replace(/-/g, ''),
        parameters: {
          match_score: matchScore,
          mismatch_penalty: mismatchPenalty,
          gap_penalty: gapPenalty,
          queryName: res.queryName,
          referenceName: res.referenceName
        },
        summary,
        status: 'COMPLETED',
        mutationDetails: res.mutations || [],
        results: {
          alignmentScore: res.alignmentScore,
          identity: res.identity,
          similarity: res.similarity,
          matchesCount: res.matchesCount,
          mismatchesCount: res.mismatchesCount,
          gapsCount: res.gapsCount,
          mutationCount: res.mutationCount,
          snpCount: res.snpCount,
          insertionCount: res.insertionCount,
          deletionCount: res.deletionCount,
          refAligned: res.refAligned,
          altAligned: res.altAligned,
          matchString: res.matchString,
          mutations: res.mutations
        }
      });

      if (saveRes.success) {
        setSaveSuccessMsg(`Analysis saved to Cloud Firestore (Collection: analyses, ID: ${saveRes.id})`);
        setTimeout(() => setSaveSuccessMsg(null), 5000);
      } else {
        setSaveSuccessMsg(`Saved locally (${saveRes.error})`);
        setTimeout(() => setSaveSuccessMsg(null), 8000);
      }
    } catch (err: any) {
      setResult(null);
      setInspectedMutationIndex(null);
      setErrorMsg(err.message || 'Mutation detection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically on first mount if preselected from samples
  useEffect(() => {
    if (querySampleId && referenceSampleId && referenceChoice === 'saved' && queryChoice === 'saved' && !result) {
      handleRunDetection();
    }
  }, [querySampleId, referenceSampleId]);

  // Format aligned sequences into readable 60-bp blocks
  const alignmentBlocks = useMemo(() => {
    if (!result) return [];
    const blockSize = 60;
    const blocks = [];
    const totalLen = result.refAligned.length;

    for (let i = 0; i < totalLen; i += blockSize) {
      const end = Math.min(i + blockSize, totalLen);
      blocks.push({
        startCol: i + 1,
        endCol: end,
        refChunk: result.refAligned.slice(i, end),
        matchChunk: result.matchString.slice(i, end),
        altChunk: result.altAligned.slice(i, end)
      });
    }
    return blocks;
  }, [result]);

  // Selected mutation for deep inspection
  const inspectedMutation = useMemo(() => {
    if (!result || inspectedMutationIndex === null) return null;
    return result.mutations[inspectedMutationIndex] || null;
  }, [result, inspectedMutationIndex]);

  // Save analysis to User's Research Workspace
  const handleSaveAnalysisToWorkspace = async () => {
    if (!result) return;
    setSaveSuccessMsg(null);

    const summary = `${result.mutationCount} sequence variant(s) detected (${result.snpCount} SNPs, ${result.insertionCount} Ins, ${result.deletionCount} Del); Identity: ${result.identity}%, Score: ${result.alignmentScore}.`;
    const effectiveUid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('biodna_client_uid') : null) || 'guest-researcher';
    const saveRes = await saveAnalysisResult({
      userId: effectiveUid,
      userEmail: user?.email || 'researcher@biodna.local',
      isDemoUser: isDemoUser || !user,
      title: `Alignment: ${result.queryName} vs. ${result.referenceName}`,
      module: 'MUTATION_DETECTION',
      analysisType: 'Pairwise Needleman-Wunsch Alignment & Mutation Detection',
      algorithm: 'Needleman-Wunsch Global Alignment & HGVS 3-Prime Normalization',
      sequenceLength: result.altLength,
      sequence: result.altAligned.replace(/-/g, ''),
      parameters: {
        match_score: matchScore,
        mismatch_penalty: mismatchPenalty,
        gap_penalty: gapPenalty,
        queryName: result.queryName,
        referenceName: result.referenceName
      },
      summary,
      status: 'COMPLETED',
      mutationDetails: result.mutations || [],
      results: {
        alignmentScore: result.alignmentScore,
        identity: result.identity,
        mutationCount: result.mutationCount,
        snpCount: result.snpCount,
        insertionCount: result.insertionCount,
        deletionCount: result.deletionCount,
        refAligned: result.refAligned,
        altAligned: result.altAligned,
        matchString: result.matchString,
        mutations: result.mutations
      }
    });

    if (saveRes.success) {
      setSaveSuccessMsg(`Analysis saved to Cloud Firestore (ID: ${saveRes.id})!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } else {
      setErrorMsg(saveRes.error || 'Failed to save record to workspace.');
    }
  };

  // Export CSV Report
  const handleDownloadCsv = async () => {
    if (!result) {
      setErrorMsg('No alignment results available. Please run mutation detection first before exporting CSV.');
      return;
    }
    setIsExporting('csv');
    try {
      const reportPayload = {
        title: `Mutation Report - ${result.queryName} vs. ${result.referenceName}`,
        queryName: result.queryName,
        referenceName: result.referenceName,
        referenceAccession: result.referenceName.includes('NM_') ? result.referenceName : undefined,
        altLength: result.altLength,
        refLength: result.refLength,
        alignmentScore: result.alignmentScore,
        identity: result.identity,
        refAligned: result.refAligned,
        altAligned: result.altAligned,
        matchString: result.matchString,
        mutations: result.mutations,
        totalMutations: result.mutationCount ?? result.mutations?.length ?? 0,
        alignment: {
          score: result.alignmentScore,
          identity: result.identity,
          refAligned: result.refAligned,
          altAligned: result.altAligned,
          matchString: result.matchString,
          mutations: result.mutations
        }
      };

      const blob = await generateAdHocReportApi(reportPayload, 'csv');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GenomicsAI_Mutation_Report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg('CSV Export error: ' + err.message);
    } finally {
      setIsExporting(null);
    }
  };

  // Export PDF Report
  const handleDownloadPdf = async () => {
    if (!result) {
      setErrorMsg('No alignment results available. Please run mutation detection first before exporting PDF.');
      return;
    }
    setIsExporting('pdf');
    try {
      const reportPayload = {
        title: `Mutation Report - ${result.queryName} vs. ${result.referenceName}`,
        queryName: result.queryName,
        referenceName: result.referenceName,
        referenceAccession: result.referenceName.includes('NM_') ? result.referenceName : undefined,
        altLength: result.altLength,
        refLength: result.refLength,
        alignmentScore: result.alignmentScore,
        identity: result.identity,
        refAligned: result.refAligned,
        altAligned: result.altAligned,
        matchString: result.matchString,
        mutations: result.mutations,
        totalMutations: result.mutationCount ?? result.mutations?.length ?? 0,
        alignment: {
          score: result.alignmentScore,
          identity: result.identity,
          refAligned: result.refAligned,
          altAligned: result.altAligned,
          matchString: result.matchString,
          mutations: result.mutations
        }
      };

      const blob = await generateAdHocReportApi(reportPayload, 'pdf');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GenomicsAI_Scientific_Report_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorMsg('PDF Export error: ' + err.message);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto pb-16">
      {/* Header */}
      <GenomicsHeader
        title="Pairwise Sequence Alignment & Mutation Detection"
        subtitle="Align query and reference DNA sequences with Needleman-Wunsch dynamic programming, detect SNVs and indels, apply HGVS 3'-rule normalization, and generate scientific reports."
      />

      {/* Configuration & Input Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
        {/* Curated Benchmark Quick-Select Bar */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-bold">One-Click Benchmark Pairs:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {benchmarks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => handleApplyBenchmark(b)}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 hover:border-amber-500 hover:bg-amber-100/50 text-amber-900 font-semibold transition-all shadow-xs"
              >
                {b.gene_symbol} ({b.expected_hgvs})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Query Selection (Left Panel) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Query Sequence (Patient / Test DNA)
              </label>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setQueryChoice('saved')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    queryChoice === 'saved' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Saved Sample
                </button>
                <button
                  type="button"
                  onClick={() => setQueryChoice('custom')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    queryChoice === 'custom' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Paste Raw / Uploaded
                </button>
              </div>
            </div>

            {queryChoice === 'saved' ? (
              <select
                value={querySampleId}
                onChange={(e) => handleQuerySelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800"
              >
                <option value="">-- Choose Query Sample --</option>
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.length} bp | {s.sample_type})
                  </option>
                ))}
              </select>
            ) : (
              <textarea
                rows={3}
                value={customQuerySeq}
                onChange={(e) => setCustomQuerySeq(e.target.value.toUpperCase())}
                placeholder="Paste query nucleotide sequence (A, C, G, T)..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            )}
          </div>

          {/* Reference Selection (Right Panel) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Reference Sequence Source
              </label>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setReferenceChoice('saved')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    referenceChoice === 'saved' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Saved Ref
                </button>
                <button
                  type="button"
                  onClick={() => setReferenceChoice('custom')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    referenceChoice === 'custom' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Paste Ref
                </button>
                <button
                  type="button"
                  onClick={() => setReferenceChoice('demo')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    referenceChoice === 'demo' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Synthetic Demo
                </button>
              </div>
            </div>

            {referenceChoice === 'saved' && (
              <select
                value={referenceSampleId}
                onChange={(e) => setReferenceSampleId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium text-slate-800"
              >
                <option value="">-- Choose Reference Sequence --</option>
                {samples.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.length} bp | {s.sample_type})
                  </option>
                ))}
              </select>
            )}

            {referenceChoice === 'custom' && (
              <textarea
                rows={3}
                value={customRefSequence}
                onChange={(e) => setCustomRefSequence(e.target.value.toUpperCase())}
                placeholder="Paste reference nucleotide sequence (A, C, G, T)..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            )}

            {referenceChoice === 'demo' && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span>
                  <strong>Synthetic Benchmark Mode:</strong> Generates a synthetic reference with simulated SNPs for testing alignment algorithms.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Alignment Parameters & Execution */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>Algorithm: <strong className="text-slate-800">Needleman-Wunsch</strong></span>
            <span>Match: <strong className="text-emerald-600 font-mono">+{matchScore}</strong></span>
            <span>Mismatch: <strong className="text-rose-600 font-mono">{mismatchPenalty}</strong></span>
            <span>Gap Penalty: <strong className="text-amber-600 font-mono">{gapPenalty}</strong></span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-teal-700 font-semibold">HGVS 3'-Rule Normalization Active</span>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={handleRunDetection}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span>Aligning Sequences...</span>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Run Pairwise Alignment</span>
              </>
            )}
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {saveSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Results Workspace */}
      {result && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Bar: Save to Workspace & Download Reports */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Alignment Results: {result.queryName} vs. {result.referenceName}
              </h2>
              <p className="text-xs text-slate-500">
                Deterministic dynamic programming alignment with HGVS variant calling
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveAnalysisToWorkspace}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              >
                <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                <span>Save to Workspace</span>
              </button>

              <button
                type="button"
                disabled={isExporting !== null}
                onClick={handleDownloadCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" />
                <span>{isExporting === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
              </button>

              <button
                type="button"
                disabled={isExporting !== null}
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isExporting === 'pdf' ? 'Generating PDF...' : 'Download PDF Report'}</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Alignment Score</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-1">
                {result.alignmentScore}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Sequence Identity</span>
              <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                {result.identity}%
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 uppercase">Total Variants</span>
              <div className="text-xl font-black text-amber-600 font-mono mt-1">
                {result.mutationCount}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold text-blue-600 uppercase">SNVs / Substitutions</span>
              <div className="text-xl font-black text-blue-600 font-mono mt-1">
                {result.snpCount}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">Insertions</span>
              <div className="text-xl font-black text-emerald-600 font-mono mt-1">
                {result.insertionCount}
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
              <span className="text-[10px] font-bold text-rose-600 uppercase">Deletions</span>
              <div className="text-xl font-black text-rose-600 font-mono mt-1">
                {result.deletionCount}
              </div>
            </div>
          </div>

          {/* Interactive Alignment Viewer with Accessible Legend */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-600" />
                  Visual Sequence Alignment Viewer
                </h3>
                <p className="text-xs text-slate-500">
                  Ref ({result.refLength} bp) vs. Query ({result.altLength} bp) &bull; Scrollable 60-bp blocks with 1-based coordinates
                </p>
              </div>

              {/* Accessible Color-Blind Friendly Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="font-bold">|</span> Match
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  <span className="font-bold">.</span> Substitution / SNP
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                  <span className="font-bold">-</span> Deletion Gap
                </span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  <span className="font-bold">+</span> Insertion
                </span>
              </div>
            </div>

            {/* Alignment Blocks */}
            <div className="p-5 bg-slate-950 font-mono text-xs text-slate-300 space-y-4 overflow-x-auto select-all shadow-inner">
              {alignmentBlocks.map((b, idx) => (
                <div key={idx} className="space-y-0.5 border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                  <div className="text-[10px] text-slate-400 font-semibold mb-1">
                    Columns {b.startCol} - {b.endCol}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-slate-400 select-none">Ref:</span>
                    <span className="tracking-widest text-slate-200">{b.refChunk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-slate-400 select-none">     </span>
                    <span className="tracking-widest text-teal-400 font-bold">{b.matchChunk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 text-slate-400 select-none">Query:</span>
                    <span className="tracking-widest text-amber-300 font-bold">{b.altChunk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Variant Inspector Card */}
          {inspectedMutation && (
            <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-teal-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-teal-700" />
                  <h4 className="text-sm font-bold text-teal-950">
                    Variant Inspector: {inspectedMutation.hgvs || `Position ${inspectedMutation.position}`}
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300">
                  {inspectedMutation.mutationType}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                <div className="bg-white p-3 rounded-xl border border-teal-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Local Position</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    pos {inspectedMutation.localPosition || inspectedMutation.position}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-teal-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Coding DNA (c.)</span>
                  <div className="font-mono font-bold text-slate-900 mt-0.5">
                    {inspectedMutation.cdsPosition ? `c.${inspectedMutation.cdsPosition}` : 'Local only'}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-teal-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Allele Change</span>
                  <div className="font-mono font-bold text-teal-700 mt-0.5">
                    {inspectedMutation.refBase} &rarr; {inspectedMutation.altBase}
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-teal-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Classification</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {inspectedMutation.subType || inspectedMutation.classification || 'Indel event'}
                  </div>
                </div>
              </div>

              {/* Equivalent Deletion Windows */}
              {inspectedMutation.equivalentRepresentations && inspectedMutation.equivalentRepresentations.length > 1 && (
                <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2">
                  <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-teal-600" />
                    Mathematically Equivalent Deletion Windows (HGVS 3'-Rule Right Shift Applied):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    {inspectedMutation.equivalentRepresentations.map((eq: any, i: number) => (
                      <div key={i} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                        <span>{eq.hgvs_coding}</span>
                        <span className="text-[10px] text-slate-500">local {eq.local_start}..{eq.local_end}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-teal-900/90 leading-relaxed">
                <strong>Biological Context:</strong> {inspectedMutation.description || inspectedMutation.explanation || 'Pairwise alignment identified this variation relative to the standard reference sequence.'}
              </p>
            </div>
          )}

          {/* Detailed Variants Table with Click-to-Inspect */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Identified Genomic Variants Table
                </h3>
                <p className="text-xs text-slate-500">
                  Click any variant row to inspect its local sequence context and coordinate attribution
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {result.mutations.length} Detected Events
              </span>
            </div>

            {result.mutations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">Local Pos</th>
                      <th className="py-3 px-4">CDS Pos</th>
                      <th className="py-3 px-4">Ref</th>
                      <th className="py-3 px-4">Alt</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Subtype</th>
                      <th className="py-3 px-4 font-mono">HGVS Notation</th>
                      <th className="py-3 px-4">Transcript Status</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.mutations.map((mut, idx) => {
                      const isInspected = inspectedMutationIndex === idx;
                      const hasCds = mut.cdsPosition && mut.cdsPosition !== mut.localPosition;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setInspectedMutationIndex(idx)}
                          className={`cursor-pointer transition-colors ${
                            isInspected ? 'bg-teal-50/70 font-semibold' : 'hover:bg-slate-50/70'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {mut.localPosition || mut.position || mut.refPosition}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {mut.cdsPosition ? `c.${mut.cdsPosition}` : 'Local only'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100">
                              {mut.refBase || mut.ref_allele || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-teal-700">
                            <span className="px-1.5 py-0.5 rounded bg-teal-50">
                              {mut.altBase || mut.alt_allele || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {mut.mutationType || mut.type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            {mut.subType || mut.classification || '-'}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {mut.hgvs || mut.hgvs_notation || `c.${mut.position}${mut.refBase}>${mut.altBase}`}
                          </td>
                          <td className="py-3 px-4">
                            {hasCds ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <Check className="w-3 h-3" /> RefSeq Mapped
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                Local Fragment
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedMutationIndex(idx);
                              }}
                              className="px-2.5 py-1 rounded bg-white border border-slate-200 hover:border-teal-500 hover:text-teal-700 text-slate-600 font-bold text-[10px] shadow-xs"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No variants identified. The query sequence perfectly matches the reference standard.
              </div>
            )}
          </div>

          {/* Academic Notice & Clinical Disclaimer */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <p className="leading-relaxed">
              <strong>Notice on Computational Variant Calling:</strong> Alignment outputs identify nucleotide differences relative to the designated reference sequence.
              These computational calls do not replace clinical laboratory sequencing protocols, read depth validation, or ACMG/AMP clinical curation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MutationDetectionPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Mutation Detection Workspace...</div>}>
      <MutationDetectionContent />
    </Suspense>
  );
}
