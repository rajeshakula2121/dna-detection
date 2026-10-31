'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Pill,
  Search,
  ExternalLink,
  ShieldAlert,
  Dna,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import {
  fetchSamplesApi,
  fetchPharmacogenomicsApi,
  Sample,
  PharmacogenomicGuideline
} from '@/lib/api-client';

const THERAPEUTIC_AREAS = [
  'All Areas',
  'Cardiology',
  'Oncology',
  'Pain Management',
  'Infectious Disease'
];

const COMMON_DRUGS = ['Clopidogrel', 'Warfarin', 'Codeine', 'Fluorouracil', 'Simvastatin', 'Abacavir', 'Tamoxifen'];

export default function DrugResponsePage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [drugSearch, setDrugSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('All Areas');

  const [loading, setLoading] = useState(false);
  const [guidelines, setGuidelines] = useState<PharmacogenomicGuideline[]>([]);
  const [disclaimer, setDisclaimer] = useState('');

  useEffect(() => {
    fetchSamplesApi()
      .then((data) => setSamples(data))
      .catch((err) => console.warn('Samples fetch error:', err));
  }, []);

  const handleQueryPgx = async (drugName?: string) => {
    setLoading(true);
    try {
      const d = drugName !== undefined ? drugName : drugSearch;
      const res = await fetchPharmacogenomicsApi({
        sample_id: selectedSampleId || undefined,
        drug: d.trim() || undefined,
        therapeutic_area: selectedArea !== 'All Areas' ? selectedArea : undefined
      });
      setGuidelines(res.guidelines);
      if (res.disclaimer) setDisclaimer(res.disclaimer);
    } catch (err) {
      console.warn('PGx query error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleQueryPgx();
  }, [selectedSampleId, selectedArea]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* Header */}
      <GenomicsHeader
        title="Drug Response / Pharmacogenomics"
        subtitle="Evidence-based gene-drug interactions, metabolic phenotypes, and CPIC dosing guidelines."
      />

      {/* Mandatory Pharmacogenomic Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold uppercase tracking-wider text-[11px] text-amber-800">
            Clinical Safety Notice:
          </span>
          <p className="leading-relaxed">
            {disclaimer || 'Research and educational use only. Never initiate, modify, or discontinue any prescription or over-the-counter medication without consulting a licensed physician or clinical pharmacologist.'} Pharmacogenetic evidence is compiled strictly from CPIC Level A and PharmGKB 1A consensus peer-reviewed guidelines.
          </p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sample Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Sample
            </label>
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="">-- All Screened Pharmacogenes --</option>
              {samples.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Drug or Gene */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Search Drug or Gene
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                placeholder="e.g. Clopidogrel, CYP2C19..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Therapeutic Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Therapeutic Area
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              {THERAPEUTIC_AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Drug Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-400">Quick Drugs:</span>
            {COMMON_DRUGS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDrugSearch(d);
                  handleQueryPgx(d);
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                  drugSearch.toLowerCase() === d.toLowerCase()
                    ? 'bg-rose-50 text-rose-700 border-rose-300'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => handleQueryPgx()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search Guidelines</span>
          </button>
        </div>
      </div>

      {/* Guidelines Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            CPIC & PharmGKB Guideline Profiles ({guidelines.length})
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Clinical Pharmacogenetics Implementation Consortium
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Querying pharmacogenomics catalog...
          </div>
        ) : guidelines.length > 0 ? (
          <div className="space-y-4">
            {guidelines.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 tracking-tight">
                        {item.drug}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">
                        {item.therapeuticArea}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                      Target: {item.gene}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      {item.evidenceLevel}
                    </span>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Alleles & Variants
                    </span>
                    <span className="font-mono font-bold text-slate-800">
                      {item.alleles}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Predicted Metabolizer Phenotype
                    </span>
                    <span className="font-bold text-rose-700">
                      {item.phenotype}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Clinical Implication
                    </span>
                    <span className="text-slate-700 leading-snug">
                      {item.implication}
                    </span>
                  </div>
                </div>

                {/* CPIC Recommendation */}
                <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200/80 text-xs">
                  <span className="font-bold text-teal-900 uppercase tracking-wider text-[10px] block mb-1">
                    Official CPIC Guideline Dosing Recommendation:
                  </span>
                  <p className="text-teal-950 font-medium leading-relaxed">
                    {item.cpicRecommendation}
                  </p>
                </div>

                {/* Citation & External Link */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                  <span>Citation: <em>{item.guidelineCitation}</em></span>
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-teal-600 hover:text-teal-700"
                    >
                      CPIC Guideline <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            No pharmacogenomic guidelines matched your query. Try searching for "Clopidogrel" or "CYP2C19".
          </div>
        )}
      </div>
    </div>
  );
}

