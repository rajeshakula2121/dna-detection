'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart,
  Download,
  Dna,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Pill,
  FileSpreadsheet,
  FileText,
  FileCode,
  Filter,
  Layers,
  Sparkles
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import {
  GcComparisonChart,
  MutationBarChart
} from '@/components/charts/Charts';
import {
  fetchResearchAnalyticsApi,
  getReportDownloadUrl,
  ResearchAnalytics
} from '@/lib/api-client';

export default function ResearchAnalyticsPage() {
  const [data, setData] = useState<ResearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  useEffect(() => {
    fetchResearchAnalyticsApi()
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Research analytics fetch error, using local fallback:', err);
        setData({
          totalSamples: 6,
          totalMutations: 3,
          diseaseAnalyses: 4,
          drugPredictions: 5,
          gcComparison: [
            { id: '1', name: 'Human HBB Sickle Cell Allele', gc_content: 53.06, at_content: 46.94, length: 441, sample_type: 'Coding DNA' },
            { id: '2', name: 'Human HBB Reference Standard', gc_content: 52.83, at_content: 47.17, length: 441, sample_type: 'Reference Sequence' },
            { id: '3', name: 'Human TP53 Tumor Suppressor', gc_content: 56.75, at_content: 43.25, length: 236, sample_type: 'Genomic DNA' },
            { id: '4', name: 'Human BRCA1 Exon 11 Fragment', gc_content: 38.69, at_content: 61.31, length: 336, sample_type: 'Gene Sequence' },
            { id: '5', name: 'SARS-CoV-2 Spike RBD Fragment', gc_content: 34.00, at_content: 66.00, length: 160, sample_type: 'RNA Sequence' },
            { id: '6', name: 'CYP2C19 Pharmacogene Exon 5', gc_content: 29.50, at_content: 70.50, length: 170, sample_type: 'Genomic DNA' },
          ],
          mutationSubtypes: [
            { sub_type: 'Transition', count: 1 },
            { sub_type: 'Transversion', count: 1 },
            { sub_type: 'Microdeletion', count: 1 }
          ],
          radarCoverage: [
            { subject: 'Genomic DNA', coverage: 85 },
            { subject: 'Coding Exons', coverage: 95 },
            { subject: 'RNA Transcripts', coverage: 70 },
            { subject: 'Variant Calling', coverage: 90 },
            { subject: 'Disease Mapping', coverage: 80 },
            { subject: 'Pharmacogenomics', coverage: 75 },
          ]
        });
        setLoading(false);
      });
  }, []);

  const handleDownload = (format: 'pdf' | 'csv' | 'json') => {
    setDownloadingFormat(format);
    const url = getReportDownloadUrl(format);
    window.open(url, '_blank');
    setTimeout(() => setDownloadingFormat(null), 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <GenomicsHeader
        title="Research & Analytics"
        subtitle="Comprehensive cohort statistics, GC content profiles, and multi-sample variant distribution."
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload('csv')}
              disabled={downloadingFormat === 'csv'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => handleDownload('json')}
              disabled={downloadingFormat === 'json'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs shadow-sm transition-colors"
            >
              <FileCode className="w-4 h-4 text-blue-600" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloadingFormat === 'pdf'}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          </div>
        }
      />

      {/* 4 Research Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Samples
            </span>
            <div className="text-3xl font-black text-slate-900 mt-2">
              {loading ? '-' : data?.totalSamples ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active sequence repository
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Dna className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Mutations
            </span>
            <div className="text-3xl font-black text-amber-600 mt-2">
              {loading ? '-' : data?.totalMutations ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Needleman-Wunsch variant calls
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Disease Analyses
            </span>
            <div className="text-3xl font-black text-blue-600 mt-2">
              {loading ? '-' : data?.diseaseAnalyses ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ClinVar clinical correlations
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Drug Predictions
            </span>
            <div className="text-3xl font-black text-purple-600 mt-2">
              {loading ? '-' : data?.drugPredictions ?? 0}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              CPIC Level A pharmacogenes
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
            <Pill className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Visualization: GC Content Comparison */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              GC Content Comparison Across Samples
            </h3>
            <span className="text-xs font-mono text-teal-700 font-bold bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              {data?.gcComparison?.length ?? 0} Samples
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Comparative G-C base equilibrium vs. human reference standard (~41%)
          </p>
        </div>

        {data?.gcComparison && data.gcComparison.length > 0 ? (
          <GcComparisonChart data={data.gcComparison} />
        ) : (
          <div className="p-8 text-center text-slate-400 text-xs">
            No samples available for GC comparison
          </div>
        )}
      </div>

      {/* Mutation Subtypes Breakdown & Export Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mutation Subtypes Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200/80">
            <h3 className="text-base font-bold text-slate-900">
              Cohort Mutation Classification Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of transitions, transversions, and micro-indels across analyzed sequences
            </p>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              {data?.mutationSubtypes?.map((sub, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-xs font-bold text-slate-600 block uppercase">
                    {sub.sub_type}
                  </span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-1 block">
                    {sub.count}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {sub.sub_type === 'Transition'
                      ? 'Purine↔Purine / Pyr↔Pyr'
                      : sub.sub_type === 'Transversion'
                      ? 'Purine↔Pyrimidine'
                      : 'Frameshift / In-frame'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Export Details Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Export Methodology & Compliance
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed space-y-2">
              Exported CSV, JSON, and PDF reports incorporate:
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 mt-2 list-disc list-inside">
              <li>1-based biological coordinate mapping</li>
              <li>HGVS standard cDNA nomenclature</li>
              <li>Alignment parameters (match +2, mismatch -1, gap -2)</li>
              <li>ISO 8601 UTC analysis timestamping</li>
              <li>ClinVar and CPIC evidence citations</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => handleDownload('pdf')}
              className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Generate PDF Summary</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

