'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Trash2, 
  Dna, 
  Calendar, 
  ArrowRight, 
  RefreshCw,
  Search,
  FileSpreadsheet,
  History as HistoryIcon,
  Eye,
  CheckCircle2,
  AlertCircle,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
  X,
  Clock,
  Activity,
  FileText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  fetchUserAnalyses, 
  deleteAnalysisRecord, 
  testFirestoreConnection,
  SavedAnalysisRecord,
  AnalysisModuleType 
} from '@/lib/firestore-service';

export default function HistoryPage() {
  const { user, isDemoUser } = useAuth();
  const [records, setRecords] = useState<SavedAnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [isFromFirestore, setIsFromFirestore] = useState<boolean>(false);
  const [activeModalRecord, setActiveModalRecord] = useState<SavedAnalysisRecord | null>(null);

  const loadRecords = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const effectiveUid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('biodna_client_uid') : null) || 'guest-researcher';
      const res = await fetchUserAnalyses(effectiveUid, isDemoUser || !user);
      setRecords(res.records);
      setIsFromFirestore(res.fromFirestore);
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      console.error('Failed to load analysis history:', err);
      setErrorMsg('Failed to load analysis history: ' + (err.message || 'Network error'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestFirestore = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testFirestoreConnection();
      if (res.success) {
        setTestResult({
          success: true,
          message: `Test record successfully written to Cloud Firestore! Document ID: ${res.docId}. The collection "analyses" is now live in your Firebase Console.`
        });
        await loadRecords();
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Failed to connect to Cloud Firestore.'
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Firestore connection error.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [user, isDemoUser]);

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    
    // Optimistic UI update
    setRecords((prev) => prev.filter((r) => r.id !== id));
    if (activeModalRecord?.id === id) {
      setActiveModalRecord(null);
    }

    if (user && user.uid) {
      await deleteAnalysisRecord(user.uid, id, isDemoUser);
    }
  };

  // Filter records by search text and module category
  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.algorithm.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.analysisType && r.analysisType.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchesModule = 
      selectedModuleFilter === 'ALL' || 
      r.module === selectedModuleFilter;

    return matchesSearch && matchesModule;
  });

  const getModuleBadgeColor = (module: AnalysisModuleType | string) => {
    switch (module) {
      case 'MUTATION_DETECTION':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'DNA_PATTERN_ANALYSIS':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'KMER_ANALYSIS':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PAIRWISE_ALIGNMENT':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'ORF_ANALYSIS':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'QUALITY_CONTROL':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'FASTA_ANALYSIS':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getTargetToolUrl = (module: AnalysisModuleType | string) => {
    switch (module) {
      case 'DNA_PATTERN_ANALYSIS':
      case 'KMER_ANALYSIS':
      case 'ORF_ANALYSIS':
        return '/pattern-analysis';
      case 'MUTATION_DETECTION':
        return '/mutation-detection';
      case 'PAIRWISE_ALIGNMENT':
        return '/analyze';
      case 'QUALITY_CONTROL':
      case 'FASTA_ANALYSIS':
        return '/upload';
      default:
        return '/pattern-analysis';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <HistoryIcon className="w-6 h-6 text-teal-600" />
              Analysis History &amp; Research Archive
            </h1>
            {user && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isFromFirestore 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {isFromFirestore ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Cloud Firestore Synced
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    Local Workspace Cache
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Persisted record archive for DNA pattern analyses, k-mer entropy, pairwise alignments, and mutation detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestFirestore}
            disabled={testingConnection}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition"
            title="Send test benchmark record to verify Cloud Firestore connection and rules"
          >
            <Sparkles className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
            <span>{testingConnection ? 'Testing DB...' : 'Test Cloud Firestore'}</span>
          </button>

          <button
            onClick={loadRecords}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            title="Refresh history from Cloud Firestore"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/pattern-analysis"
            className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm transition"
          >
            <Dna className="w-4 h-4 text-teal-400" />
            <span>New Analysis</span>
          </Link>
        </div>
      </div>

      {/* Test Result Diagnostic Banner */}
      {testResult && (
        <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${
          testResult.success
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : 'bg-rose-50 border-rose-300 text-rose-950'
        }`}>
          <div className="flex items-start gap-3 text-xs leading-relaxed">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold text-sm">
                {testResult.success ? 'Cloud Firestore Verified & Synced!' : 'Cloud Firestore Permission Warning'}
              </p>
              <p>{testResult.message}</p>
              {!testResult.success && testResult.message.includes('PERMISSION_DENIED') && (
                <div className="mt-2 p-3 bg-white/90 rounded-xl border border-rose-200 font-mono text-[11px] text-slate-800 space-y-1">
                  <p className="font-bold text-rose-700">How to fix in Firebase Console:</p>
                  <p>1. In Firebase Console, click the <strong>Rules</strong> tab (next to Data).</p>
                  <p>2. Set rules to: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-semibold">allow read, write: if true;</code></p>
                  <p>3. Click <strong>Publish</strong>.</p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setTestResult(null)} 
            className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unauthenticated Alert Prompt */}
      {!user && (
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              You are currently viewing local session history. <strong>Sign in with your account</strong> to permanently sync and protect your analysis records in Cloud Firestore.
            </span>
          </div>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadRecords}
            className="underline font-bold hover:text-rose-950"
          >
            Retry Sync
          </button>
        </div>
      )}

      {/* Search & Module Filter Controls */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full bg-white rounded-xl border border-slate-200 shadow-sm flex items-center px-3 py-2">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search by analysis title, motif query, gene symbol, or algorithm..."
            className="w-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {searchFilter && (
            <button onClick={() => setSearchFilter('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Modules' },
            { id: 'DNA_PATTERN_ANALYSIS', label: 'Pattern Analysis' },
            { id: 'MUTATION_DETECTION', label: 'Mutation Detection' },
            { id: 'PAIRWISE_ALIGNMENT', label: 'Alignment' },
            { id: 'KMER_ANALYSIS', label: 'K-mers' },
            { id: 'ORF_ANALYSIS', label: 'ORFs' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedModuleFilter(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                selectedModuleFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analysis Records Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-16 text-center text-slate-500 border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            <span className="text-sm font-medium text-slate-700">Synchronizing records with Cloud Firestore...</span>
            <p className="text-xs text-slate-400">Retrieving securely partitioned user records</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-2xl p-14 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {records.length === 0 ? 'No Analysis Records Saved Yet' : 'No Matching Analyses Found'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {records.length === 0
                  ? 'Run a DNA Pattern Analysis, K-mer Decomposition, or Mutation Alignment to automatically record results in your Cloud Firestore repository.'
                  : 'Try adjusting your search keywords or switching module filter categories.'}
              </p>
            </div>
            {records.length === 0 && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/pattern-analysis"
                  className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Pattern Analysis</span>
                </Link>
                <Link
                  href="/mutation-detection"
                  className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
                >
                  <Dna className="w-4 h-4" />
                  <span>Mutation Detection</span>
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => setActiveModalRecord(record)}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-pointer space-y-3 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0"></span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                      {record.title}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getModuleBadgeColor(record.module)}`}>
                      {record.module.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {record.id.slice(0, 8)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400 shrink-0">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(record.timestamp || record.createdAt).toLocaleDateString()} at{' '}
                      {new Date(record.timestamp || record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={(e) => handleDelete(record.id, e)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete Record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Summary Description */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {record.summary}
                </p>

                {/* Metrics Pill Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Sequence Length</span>
                    <span className="font-bold text-slate-800 font-mono">{record.sequenceLength} bp</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Algorithm</span>
                    <span className="font-bold text-indigo-700 truncate block text-[11px]">{record.algorithm}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {record.status}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Preview</span>
                    <span className="font-mono text-slate-500 text-[10px] truncate block">
                      {record.sequencePreview || `${record.sequenceLength} bp analysed`}
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="inline-flex items-center gap-1 text-teal-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Click to view detailed analysis results</span>
                  </span>

                  <Link
                    href={getTargetToolUrl(record.module)}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-slate-900 transition"
                  >
                    <span>Open Module</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interactive Detail Modal */}
      {activeModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
              <div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${getModuleBadgeColor(activeModalRecord.module)}`}>
                  {activeModalRecord.module.replace(/_/g, ' ')}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  {activeModalRecord.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Algorithm: <strong>{activeModalRecord.algorithm}</strong> • Recorded on{' '}
                  {new Date(activeModalRecord.timestamp || activeModalRecord.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                onClick={() => setActiveModalRecord(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Executive Summary */}
              <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80">
                <span className="font-bold text-teal-950 block text-xs">Analysis Summary</span>
                <p className="text-teal-900 mt-1 leading-relaxed">
                  {activeModalRecord.summary}
                </p>
              </div>

              {/* Parameters Breakdown */}
              {activeModalRecord.parameters && Object.keys(activeModalRecord.parameters).length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2">Analysis Parameters</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(activeModalRecord.parameters).map(([k, v]) => (
                      <div key={k} className="p-2 rounded-xl bg-slate-50 border border-slate-100 font-mono text-[11px]">
                        <span className="text-slate-400 text-[10px] block font-sans">{k}</span>
                        <span className="font-bold text-slate-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Module-Specific Deep Dive: Mutation Detection */}
              {activeModalRecord.module === 'MUTATION_DETECTION' && activeModalRecord.mutationDetails && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center justify-between">
                    <span>Identified Sequence Variants ({activeModalRecord.mutationDetails.length})</span>
                    <span className="text-slate-500 font-normal">
                      Identity: {activeModalRecord.results?.identity ?? '—'}% • Score: {activeModalRecord.results?.alignmentScore ?? '—'}
                    </span>
                  </h4>

                  {activeModalRecord.mutationDetails.length > 0 ? (
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left font-mono text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Position</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Ref &gt; Alt</th>
                            <th className="py-2 px-3">HGVS Notation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {activeModalRecord.mutationDetails.map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-slate-700">{m.position ?? m.cdsPosition ?? m.localPosition}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  m.type === 'SUBSTITUTION' || m.mutationType === 'SNP'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {m.type || m.mutationType}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-800">
                                {m.refBase ?? m.ref_base ?? m.ref_sequence} &gt; {m.altBase ?? m.alt_base ?? m.alt_sequence}
                              </td>
                              <td className="py-2 px-3 font-bold text-indigo-700">
                                {m.hgvs || m.hgvs_notation || m.localHgvs || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl">
                      100% Sequence Identity: No mutations detected.
                    </div>
                  )}
                </div>
              )}

              {/* Module-Specific Deep Dive: Pattern Analysis */}
              {activeModalRecord.module === 'DNA_PATTERN_ANALYSIS' && activeModalRecord.results && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs">Pattern Matches &amp; Repetitive Structures</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                      <span className="font-bold text-indigo-900 block text-xs">Knuth-Morris-Pratt (KMP)</span>
                      <p className="text-slate-600 mt-1">
                        Matches found: <strong>{activeModalRecord.results.kmpResult?.matchesCount ?? 0}</strong>
                      </p>
                      <p className="font-mono text-indigo-700 text-[11px] truncate">
                        Positions: [{(activeModalRecord.results.kmpResult?.positions || []).join(', ')}]
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                      <span className="font-bold text-purple-900 block text-xs">Boyer-Moore Motif Search</span>
                      <p className="text-slate-600 mt-1">
                        Matches found: <strong>{activeModalRecord.results.boyerMooreResult?.matchesCount ?? 0}</strong>
                      </p>
                      <p className="font-mono text-purple-700 text-[11px] truncate">
                        Positions: [{(activeModalRecord.results.boyerMooreResult?.positions || []).join(', ')}]
                      </p>
                    </div>
                  </div>

                  {activeModalRecord.results.suffixArrayResult?.longestRepeatedSubstring && (
                    <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1">
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                        Longest Repeated Substring (LRS)
                      </span>
                      <div className="font-mono text-emerald-400 font-bold truncate">
                        {activeModalRecord.results.suffixArrayResult.longestRepeatedSubstring.sequence}
                      </div>
                      <span className="text-slate-400 text-[11px]">
                        Length: {activeModalRecord.results.suffixArrayResult.longestRepeatedSubstring.length} bp • 
                        Occurrences: {activeModalRecord.results.suffixArrayResult.longestRepeatedSubstring.count} • 
                        Positions: [{activeModalRecord.results.suffixArrayResult.longestRepeatedSubstring.positions.join(', ')}]
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Sequence Snippet Preview */}
              {activeModalRecord.sequencePreview && (
                <div>
                  <span className="font-bold text-slate-800 text-xs block mb-1">Sequence Context Snippet</span>
                  <div className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs break-all border border-slate-800">
                    {activeModalRecord.sequencePreview}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={(e) => handleDelete(activeModalRecord.id, e)}
                className="px-4 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-bold transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Record</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModalRecord(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition"
                >
                  Close
                </button>
                <Link
                  href={getTargetToolUrl(activeModalRecord.module)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <span>Reopen Module</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
