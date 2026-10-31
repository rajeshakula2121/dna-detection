'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Dna,
  Play,
  ArrowRight,
  RotateCcw,
  Info,
  Sparkles,
  GitCompare,
  Search,
  Layers,
  ShieldCheck,
  Check,
  ChevronRight
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import { createSampleApi, parseFastaApi, fetchBenchmarksApi } from '@/lib/api-client';
import { FastaRecord, BenchmarkItem } from '@/types/bio';

const SAMPLE_TYPES = [
  'Genomic DNA',
  'Gene Sequence',
  'Coding DNA',
  'RNA Sequence',
  'Reference Sequence',
  'Other'
];

export default function UploadPage() {
  const router = useRouter();

  const [inputMode, setInputMode] = useState<'upload' | 'paste' | 'benchmarks'>('upload');
  const [name, setName] = useState('');
  const [organism, setOrganism] = useState('Homo sapiens');
  const [sampleType, setSampleType] = useState('Genomic DNA');
  const [format, setFormat] = useState('FASTA');
  const [description, setDescription] = useState('');
  const [rawSequence, setRawSequence] = useState('');
  const [fileName, setFileName] = useState('');

  // Multi-record FASTA state
  const [parsedRecords, setParsedRecords] = useState<FastaRecord[]>([]);
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number>(0);
  const [refRecordIndex, setRefRecordIndex] = useState<number>(0);
  const [queryRecordIndex, setQueryRecordIndex] = useState<number>(1);

  // Benchmarks state
  const [benchmarks, setBenchmarks] = useState<BenchmarkItem[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resultsRevealed, setResultsRevealed] = useState(false);

  // Fetch benchmark examples on mount
  useEffect(() => {
    fetchBenchmarksApi()
      .then((data) => {
        setBenchmarks(data);
        if (data.length > 0) {
          setSelectedBenchmarkId(data[0].id);
        }
      })
      .catch((err) => console.warn('Benchmarks fetch warning:', err));
  }, []);

  // Parse sequence text whenever rawSequence changes
  useEffect(() => {
    if (!rawSequence.trim()) {
      setParsedRecords([]);
      return;
    }

    parseFastaApi(rawSequence)
      .then((records) => {
        setParsedRecords(records);
        if (records.length > 0) {
          setSelectedRecordIndex(0);
          setRefRecordIndex(0);
          setQueryRecordIndex(records.length > 1 ? 1 : 0);
          if (!name) {
            setName(records[0].name || records[0].id || 'Sequence_Record');
          }
        }
      })
      .catch((err) => {
        console.warn('FASTA parse warning:', err);
      });
  }, [rawSequence]);

  // Active sequence determined from selected parsed record or raw string
  const activeRecord = useMemo(() => {
    if (parsedRecords.length > 0 && selectedRecordIndex < parsedRecords.length) {
      return parsedRecords[selectedRecordIndex];
    }
    return null;
  }, [parsedRecords, selectedRecordIndex]);

  const normalizedSeq = useMemo(() => {
    if (activeRecord) {
      return activeRecord.sequence;
    }
    let clean = rawSequence.trim();
    if (clean.startsWith('>')) {
      const lines = clean.split('\n');
      clean = lines.slice(1).join('');
    }
    return clean.toUpperCase().replace(/\s+/g, '');
  }, [activeRecord, rawSequence]);

  // Real-time nucleotide composition & validation metrics
  const metrics = useMemo(() => {
    const isRna = sampleType === 'RNA Sequence';
    const validDnaChars = new Set(['A', 'C', 'G', 'T', 'R', 'Y', 'S', 'W', 'K', 'M', 'B', 'D', 'H', 'V', 'N']);
    const validRnaChars = new Set(['A', 'C', 'G', 'U', 'R', 'Y', 'S', 'W', 'K', 'M', 'B', 'D', 'H', 'V', 'N']);
    const validChars = isRna ? validRnaChars : validDnaChars;

    const invalidChars: string[] = [];
    let countA = 0;
    let countT = 0;
    let countU = 0;
    let countC = 0;
    let countG = 0;
    let countAmbiguous = 0;

    for (let i = 0; i < normalizedSeq.length; i++) {
      const ch = normalizedSeq[i];
      if (ch === 'A') countA++;
      else if (ch === 'T') countT++;
      else if (ch === 'U') countU++;
      else if (ch === 'C') countC++;
      else if (ch === 'G') countG++;
      else if (validChars.has(ch)) countAmbiguous++;
      else {
        if (!invalidChars.includes(ch)) invalidChars.push(ch);
      }
    }

    const length = normalizedSeq.length;
    const gcCount = countG + countC;
    const gcContent = length > 0 ? Number(((gcCount / length) * 100).toFixed(2)) : 0;
    const atCount = isRna ? countA + countU : countA + countT;
    const atContent = length > 0 ? Number(((atCount / length) * 100).toFixed(2)) : 0;
    const isValid = length > 0 && invalidChars.length === 0;

    return {
      length,
      countA,
      countT,
      countU,
      countC,
      countG,
      countAmbiguous,
      gcContent,
      atContent,
      isValid,
      invalidChars,
      isRna
    };
  }, [normalizedSeq, sampleType]);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Security: Validate file size (15MB maximum)
    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 15 MB limit.');
      return;
    }

    setFileName(file.name);
    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (file.name.endsWith('.fastq') || file.name.endsWith('.fq')) {
      setFormat('FASTQ');
    } else if (file.name.endsWith('.fasta') || file.name.endsWith('.fa') || file.name.endsWith('.fna')) {
      setFormat('FASTA');
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawSequence(content);
        setResultsRevealed(false);
        setErrorMessage(null);
      }
    };
    reader.readAsText(file);
  };

  // Load a verified benchmark example
  const handleLoadBenchmark = (b: BenchmarkItem) => {
    setName(`${b.gene_symbol} ${b.variant_name}`);
    setOrganism(b.organism);
    setSampleType('Coding DNA');
    setDescription(`Curated benchmark from ${b.ref_accession} with ClinVar ${b.clinvar_id} (${b.expected_hgvs})`);
    
    // Create dual-record FASTA content
    const fastaBlock = `>${b.ref_accession}_${b.gene_symbol}_Reference [organism=${b.organism}] [region=${b.ref_region}]\n${b.ref_sequence}\n>${b.gene_symbol}_${b.variant_name} [ClinVar=${b.clinvar_id}] [rsID=${b.dbsnp_rsid}]\n${b.variant_sequence}`;
    setRawSequence(fastaBlock);
    setResultsRevealed(true);
    setSuccessMessage(`Loaded ${b.gene_symbol} (${b.clinical_condition}) benchmark! Both reference and variant sequences ready.`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Direct Navigation to Mutation Detection / Alignment
  const handleLaunchMutationDetection = () => {
    if (parsedRecords.length >= 2) {
      const refRec = parsedRecords[refRecordIndex];
      const queryRec = parsedRecords[queryRecordIndex];
      
      const payload = {
        referenceSequence: refRec.sequence,
        referenceName: refRec.name || refRec.id,
        querySequence: queryRec.sequence,
        queryName: queryRec.name || queryRec.id
      };
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('temp_mutation_alignment_payload', JSON.stringify(payload));
      }
      router.push('/mutation-detection?mode=custom');
    } else if (normalizedSeq) {
      const payload = {
        querySequence: normalizedSeq,
        queryName: name || 'Uploaded Query'
      };
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('temp_mutation_alignment_payload', JSON.stringify(payload));
      }
      router.push('/mutation-detection?mode=custom');
    }
  };

  // Direct Navigation to Pattern Analysis
  const handleLaunchPatternAnalysis = () => {
    if (!normalizedSeq) return;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('temp_pattern_analysis_seq', normalizedSeq);
      sessionStorage.setItem('temp_pattern_analysis_name', name || 'Uploaded Sequence');
    }
    router.push('/pattern-analysis');
  };

  // Save Sample to SQLite / Local repository
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Sample name is required.');
      return;
    }
    if (normalizedSeq.length === 0) {
      setErrorMessage('DNA sequence cannot be empty.');
      return;
    }
    if (!metrics.isValid) {
      setErrorMessage(`Invalid sequence: contains disallowed characters: ${metrics.invalidChars.join(', ')}`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const created = await createSampleApi({
        name: name.trim(),
        organism: organism.trim() || 'Homo sapiens',
        sample_type: sampleType,
        format: format,
        sequence: normalizedSeq,
        description: description.trim()
      });

      setSuccessMessage(`Sample "${created.name}" saved successfully to repository!`);
      setTimeout(() => {
        router.push('/samples');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save sample to database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto pb-16">
      {/* Header */}
      <GenomicsHeader
        title="FASTA File Upload & Benchmark Loader"
        subtitle="Upload single or multi-record FASTA files (.fasta, .fa, .fna), load curated gene benchmarks, or paste raw DNA sequences for analysis."
      />

      {/* Main Form & Configuration */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          {/* Tab Selector: Upload vs Paste vs Curated Benchmarks */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 gap-3">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  inputMode === 'upload'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload File (.fasta, .fa, .fna)
              </button>

              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  inputMode === 'paste'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Paste Sequence
              </button>

              <button
                type="button"
                onClick={() => setInputMode('benchmarks')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  inputMode === 'benchmarks'
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Curated Benchmarks (HBB, BRCA1, CFTR)
              </button>
            </div>

            <span className="text-xs text-slate-400 font-mono">
              Pure In-Memory Processing &bull; No Persistent File Execution
            </span>
          </div>

          {/* Curated Benchmarks Panel */}
          {inputMode === 'benchmarks' && (
            <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-950">
                  Authoritative Human Gene Benchmarks (NCBI RefSeq & ClinVar)
                </h3>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Load scientifically verified reference and pathogenic variant pairs into the workspace with one click.
                Pre-calibrated with transcript accessions and coding coordinate offsets.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                {benchmarks.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => handleLoadBenchmark(b)}
                    className="p-3.5 rounded-xl bg-white border border-amber-200 hover:border-amber-400 hover:shadow-md cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-amber-700">
                        {b.gene_symbol} ({b.ref_accession})
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {b.ref_length} bp
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700">
                      {b.variant_name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {b.expected_hgvs}
                    </div>
                    <button
                      type="button"
                      className="w-full mt-2 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <span>Load Pair</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sample Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sample / Project Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. HBB_Sickle_Patient_01"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Organism
              </label>
              <input
                type="text"
                value={organism}
                onChange={(e) => setOrganism(e.target.value)}
                placeholder="e.g. Homo sapiens"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Sequence Modality
              </label>
              <select
                value={sampleType}
                onChange={(e) => setSampleType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              >
                {SAMPLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload File Mode */}
          {inputMode === 'upload' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Select Sequence File
              </label>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-teal-400 transition-colors bg-slate-50/50">
                <UploadCloud className="w-10 h-10 text-teal-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-800">
                  {fileName ? fileName : 'Choose a FASTA or FASTQ file or drag & drop here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports <strong>.fasta</strong>, <strong>.fa</strong>, <strong>.fna</strong>, <strong>.fastq</strong>, <strong>.txt</strong> up to 15MB
                </p>
                <input
                  type="file"
                  accept=".fasta,.fa,.fna,.fastq,.fq,.txt"
                  onChange={handleFileUpload}
                  className="mt-3 text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* DNA Sequence Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                FASTA Headers & Nucleotide Sequence <span className="text-rose-500">*</span>
              </label>
              <span className="text-xs font-mono text-slate-400">
                {metrics.length.toLocaleString()} bp active sequence
              </span>
            </div>
            <textarea
              rows={inputMode === 'upload' ? 4 : 6}
              value={rawSequence}
              onChange={(e) => {
                setRawSequence(e.target.value);
                setResultsRevealed(false);
                setErrorMessage(null);
              }}
              placeholder="Paste nucleotide sequence or multi-record FASTA block (>record1\nATGC...\n>record2\nATGC...)"
              required
              className="w-full p-3.5 font-mono text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all bg-slate-50/30 uppercase"
            />
          </div>

          {/* Multi-Record FASTA Table & Pair Selector */}
          {parsedRecords.length > 1 && (
            <div className="p-5 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-900">
                  <Layers className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold">
                    Multi-Record FASTA Detected ({parsedRecords.length} records)
                  </h3>
                </div>
                <span className="text-xs text-teal-700 font-semibold">
                  Select Reference and Query records for pairwise comparison
                </span>
              </div>

              <div className="overflow-x-auto border border-teal-200/80 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Record Identifier</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Length</th>
                      <th className="py-2.5 px-3">GC %</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-center">Reference</th>
                      <th className="py-2.5 px-3 text-center">Query</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {parsedRecords.map((r, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50 ${selectedRecordIndex === idx ? 'bg-teal-50/40' : ''}`}>
                        <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.id}</td>
                        <td className="py-2 px-3 text-slate-500 truncate max-w-xs">{r.description || '-'}</td>
                        <td className="py-2 px-3">{r.length} bp</td>
                        <td className="py-2 px-3 text-emerald-700 font-bold">{r.gcContent ?? '-'}%</td>
                        <td className="py-2 px-3">
                          {r.isValidDna ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="w-3 h-3" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200" title={r.validationError}>
                              <AlertCircle className="w-3 h-3" /> Invalid
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="radio"
                            name="ref_selector"
                            checked={refRecordIndex === idx}
                            onChange={() => {
                              setRefRecordIndex(idx);
                              setSelectedRecordIndex(idx);
                            }}
                            className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="radio"
                            name="query_selector"
                            checked={queryRecordIndex === idx}
                            onChange={() => setQueryRecordIndex(idx)}
                            className="text-teal-600 focus:ring-teal-500 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs text-teal-800">
                <span>
                  Reference: <strong>{parsedRecords[refRecordIndex]?.id}</strong> ({parsedRecords[refRecordIndex]?.length} bp)
                  &nbsp;&bull;&nbsp;
                  Query: <strong>{parsedRecords[queryRecordIndex]?.id}</strong> ({parsedRecords[queryRecordIndex]?.length} bp)
                </span>
                <button
                  type="button"
                  onClick={handleLaunchMutationDetection}
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <GitCompare className="w-3.5 h-3.5" />
                  <span>Compare Selected Pair</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Live Sequence Preview & Composition Metrics */}
        {normalizedSeq.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Dna className="w-4 h-4 text-teal-600" />
                Live Sequence Composition & Validation
              </h3>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  metrics.isValid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {metrics.isValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Valid DNA Sequence
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    Invalid Characters: {metrics.invalidChars.join(', ')}
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Length</span>
                <div className="text-lg font-black text-slate-800 font-mono mt-0.5">
                  {metrics.length} <span className="text-xs font-normal text-slate-400">bp</span>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-teal-600 uppercase">GC Content</span>
                <div className="text-lg font-black text-teal-600 font-mono mt-0.5">
                  {metrics.gcContent}%
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase">AT Content</span>
                <div className="text-lg font-black text-slate-700 font-mono mt-0.5">
                  {metrics.atContent}%
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">Adenine (A)</span>
                <div className="text-lg font-black text-emerald-600 font-mono mt-0.5">
                  {metrics.countA}
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-rose-600 uppercase">Thymine (T)</span>
                <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
                  {metrics.countT}
                </div>
              </div>
            </div>

            {/* Sequence Preview Box */}
            <div className="p-3 bg-slate-900 rounded-xl font-mono text-xs text-teal-400 tracking-wider truncate select-all">
              {normalizedSeq.slice(0, 120)}{normalizedSeq.length > 120 ? '...' : ''}
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Directly run research algorithms on this sequence without saving:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunchPatternAnalysis}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-all"
                >
                  <Search className="w-3.5 h-3.5 text-purple-600" />
                  <span>Pattern Analysis</span>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchMutationDetection}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 font-semibold text-xs transition-all"
                >
                  <GitCompare className="w-3.5 h-3.5 text-teal-600" />
                  <span>Pairwise Alignment</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Controls */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.push('/samples')}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !metrics.isValid}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span>Saving Record...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save to Repository</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
