'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Search,
  ExternalLink,
  ShieldAlert,
  Dna,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import {
  fetchSamplesApi,
  fetchDiseaseAssociationsApi,
  Sample,
  DiseaseAssociation
} from '@/lib/api-client';

const QUICK_GENES = ['HBB', 'BRCA1', 'BRCA2', 'CFTR', 'TP53', 'EGFR', 'APOE', 'LDLR'];

export default function DiseaseAssociationPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [geneSearch, setGeneSearch] = useState('');
  const [variantSearch, setVariantSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [disclaimer, setDisclaimer] = useState('Research and educational use only. Results are not a medical diagnosis.');
  const [associations, setAssociations] = useState<DiseaseAssociation[]>([]);

  // Load samples
  useEffect(() => {
    fetchSamplesApi()
      .then((data) => setSamples(data))
      .catch((err) => console.warn('Samples fetch error:', err));
  }, []);

  // Fetch associations
  const handleQueryAssociations = async (gene?: string) => {
    setLoading(true);
    try {
      const g = gene !== undefined ? gene : geneSearch;
      const res = await fetchDiseaseAssociationsApi({
        sample_id: selectedSampleId || undefined,
        gene: g.trim() || undefined,
        variant: variantSearch.trim() || undefined
      });
      setAssociations(res.associations);
      if (res.disclaimer) setDisclaimer(res.disclaimer);
    } catch (err) {
      console.warn('Disease query error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleQueryAssociations();
  }, [selectedSampleId]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <GenomicsHeader
        title="Disease Association"
        subtitle="Cross-reference detected genomic variants with curated clinical and pathological evidence."
      />

      {/* Prominent Clinical Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
            Scientific Notice:
          </span>
          <p className="leading-relaxed">
            {disclaimer} Disease associations are derived from peer-reviewed ClinVar, OMIM, and NCBI submissions for molecular genetics research. Never utilize computational findings for clinical diagnosis, patient management, or genetic counseling without validation by a certified molecular diagnostics laboratory.
          </p>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Select Sample */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Filter by Stored Sample
            </label>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">-- All Samples / Full Database --</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.sample_type})
                </option>
              ))}
            </select>
          </div>

          {/* Gene Search */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Search by Gene Symbol
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={geneSearch}
                onChange={(e) => setGeneSearch(e.target.value)}
                placeholder="e.g. HBB, BRCA1, TP53..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Variant / rsID Search */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Search by Variant or rsID
            </label>
            <input
              type="text"
              value={variantSearch}
              onChange={(e) => setVariantSearch(e.target.value)}
              placeholder="e.g. c.20A>T or rs334..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>

        {/* Quick Gene Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Curated Genes:</span>
            {QUICK_GENES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setGeneSearch(g);
                  handleQueryAssociations(g);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                  geneSearch.toUpperCase() === g
                    ? 'bg-teal-50 text-teal-700 border-teal-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleQueryAssociations()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Associations</span>
          </button>
        </div>
      </div>

      {/* Disease Association Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Curated Evidence Records ({associations.length})
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Source: ClinVar / OMIM / dbSNP
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Querying clinical variant knowledge base...
          </div>
        ) : associations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {associations.map((assoc, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Gene & Clinical Significance Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900 tracking-tight">
                          {assoc.gene}
                        </span>
                        <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                          {assoc.geneName}
                        </span>
                      </div>
                      <div className="text-xs font-mono font-bold text-teal-700 mt-0.5">
                        {assoc.variant} {assoc.rsId && `(${assoc.rsId})`}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                        assoc.clinicalSignificance === 'Pathogenic'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {assoc.clinicalSignificance}
                    </span>
                  </div>

                  {/* Associated Condition */}
                  <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Associated Pathological Condition
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {assoc.condition}
                    </span>
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Inheritance: {assoc.inheritance}
                    </span>
                  </div>

                  {/* Molecular Mechanism */}
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    <strong className="text-slate-800">Molecular Mechanism:</strong> {assoc.mechanism}
                  </p>
                </div>

                {/* Footer Citations & Source Links */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>Evidence: <strong>{assoc.evidenceStrength}</strong></span>
                    {assoc.evidenceDate && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" /> {assoc.evidenceDate}
                      </span>
                    )}
                  </div>
                  {assoc.sourceUrl && (
                    <a
                      href={assoc.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:text-teal-700"
                    >
                      ClinVar Record <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            No disease associations matched the specified query. Try searching for "HBB" or "BRCA1".
          </div>
        )}
      </div>
    </div>
  );
}

