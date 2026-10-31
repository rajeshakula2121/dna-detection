'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Dna,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Edit2,
  X,
  Play,
  GitCompare,
  ExternalLink
} from 'lucide-react';
import GenomicsHeader from '@/components/GenomicsHeader';
import {
  fetchSamplesApi,
  deleteSampleApi,
  updateSampleApi,
  Sample
} from '@/lib/api-client';

export default function SamplesLibraryPage() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Selected sample for Detail Modal
  const [selectedSample, setSelectedSample] = useState<Sample | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editOrganism, setEditOrganism] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [copiedSeq, setCopiedSeq] = useState(false);

  // Delete confirmation modal state
  const [sampleToDelete, setSampleToDelete] = useState<Sample | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSamples = async () => {
    try {
      setLoading(true);
      const data = await fetchSamplesApi();
      setSamples(data);
    } catch (err) {
      console.warn('Failed to fetch from API, using fallback data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSamples();
  }, []);

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return samples.filter((s) => {
      const matchSearch =
        !searchQuery ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.organism && s.organism.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'All' || s.status === statusFilter;
      const matchType = typeFilter === 'All' || s.sample_type === typeFilter;

      return matchSearch && matchStatus && matchType;
    });
  }, [samples, searchQuery, statusFilter, typeFilter]);

  const handleOpenDetail = (s: Sample) => {
    setSelectedSample(s);
    setEditName(s.name);
    setEditOrganism(s.organism || 'Homo sapiens');
    setEditDescription(s.description || '');
    setIsEditing(false);
    setCopiedSeq(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedSample) return;
    try {
      const updated = await updateSampleApi(selectedSample.id, {
        name: editName,
        organism: editOrganism,
        description: editDescription
      });
      setSelectedSample(updated);
      setIsEditing(false);
      loadSamples();
    } catch (err) {
      alert('Failed to update sample.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!sampleToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSampleApi(sampleToDelete.id);
      setSampleToDelete(null);
      if (selectedSample?.id === sampleToDelete.id) {
        setSelectedSample(null);
      }
      loadSamples();
    } catch (err) {
      alert('Failed to delete sample.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopySequence = (seq: string) => {
    navigator.clipboard.writeText(seq);
    setCopiedSeq(true);
    setTimeout(() => setCopiedSeq(false), 2000);
  };

  const handleDownloadFasta = (s: Sample) => {
    const fastaContent = `>${s.id} | ${s.name} [organism=${s.organism || 'Homo sapiens'}] [type=${s.sample_type}]\n${s.sequence}\n`;
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.name.replace(/\s+/g, '_')}.fasta`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <GenomicsHeader
        title="DNA Samples"
        subtitle={`Repository of ${samples.length} saved biological sequences.`}
        actionButton={
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>New Sample</span>
          </Link>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sample name, organism, or description..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="All">All Statuses</option>
              <option value="Analyzed">Analyzed</option>
              <option value="Pending">Pending</option>
              <option value="Processing">Processing</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="All">All Types</option>
              <option value="Genomic DNA">Genomic DNA</option>
              <option value="Gene Sequence">Gene Sequence</option>
              <option value="Coding DNA">Coding DNA</option>
              <option value="RNA Sequence">RNA Sequence</option>
              <option value="Reference Sequence">Reference Sequence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Sample Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm animate-pulse space-y-4">
              <div className="h-5 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-16 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSamples.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSamples.map((sample) => (
            <div
              key={sample.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-bold text-slate-900 text-base truncate"
                      title={sample.name}
                    >
                      {sample.name}
                    </h3>
                    <p className="text-xs text-slate-400 italic">
                      {sample.organism || 'Homo sapiens'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                      sample.status === 'Analyzed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {sample.status}
                  </span>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1.5 my-3">
                  <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {sample.format}
                  </span>
                  <span className="text-[11px] font-semibold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-md">
                    {sample.sample_type}
                  </span>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400">Length:</span>{' '}
                    <span className="font-mono font-bold text-slate-800">
                      {sample.length.toLocaleString()} bp
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">GC Content:</span>{' '}
                    <span className="font-mono font-bold text-teal-700">
                      {sample.gc_content}%
                    </span>
                  </div>
                </div>

                {/* Quality Status Note */}
                <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="truncate">{sample.quality_status}</span>
                </div>

                {/* Short Sequence Preview */}
                <div className="mt-3 p-2.5 bg-slate-900 rounded-xl font-mono text-[11px] text-teal-400 overflow-hidden text-ellipsis whitespace-nowrap tracking-wider shadow-inner">
                  {sample.sequence.slice(0, 42)}...
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenDetail(sample)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-teal-700 hover:bg-slate-200/60 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Details</span>
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/mutation-detection?sample_id=${sample.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm shadow-teal-600/20 transition-all hover:scale-105 active:scale-95"
                    title="Get Mutation & Sequence Analysis Results"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Get Results</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSampleToDelete(sample)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Sample"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm max-w-md mx-auto">
          <Dna className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No samples found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            {searchQuery
              ? 'Try modifying your search or filters.'
              : 'Upload your first DNA sequence to begin analysis.'}
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold text-xs shadow-md shadow-teal-600/20"
          >
            <Plus className="w-4 h-4" /> Upload DNA Sample
          </Link>
        </div>
      )}

      {/* SAMPLE DETAIL MODAL */}
      {selectedSample && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Dna className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-slate-900 text-base truncate max-w-md">
                  {isEditing ? 'Edit Sample Metadata' : selectedSample.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSample(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Sample Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Organism
                    </label>
                    <input
                      type="text"
                      value={editOrganism}
                      onChange={(e) => setEditOrganism(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-1.5 rounded-lg border text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Meta stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Length</span>
                      <div className="font-mono font-bold text-slate-800 text-base">
                        {selectedSample.length.toLocaleString()} bp
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">GC Content</span>
                      <div className="font-mono font-bold text-teal-700 text-base">
                        {selectedSample.gc_content}%
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Type</span>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5">
                        {selectedSample.sample_type}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Organism</span>
                      <div className="font-semibold text-slate-800 text-xs mt-0.5 truncate">
                        {selectedSample.organism || 'Homo sapiens'}
                      </div>
                    </div>
                  </div>

                  {selectedSample.description && (
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                        Description
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {selectedSample.description}
                      </p>
                    </div>
                  )}

                  {/* Full Sequence Display */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Full Nucleotide Sequence
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopySequence(selectedSample.sequence)}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedSeq ? 'Copied!' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadFasta(selectedSample)}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>FASTA</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900 rounded-xl text-teal-300 font-mono text-xs max-h-48 overflow-y-auto tracking-widest break-all select-all shadow-inner leading-relaxed">
                      {selectedSample.sequence}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Link
                  href={`/pattern-analysis?sample_id=${selectedSample.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-all"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Pattern Search</span>
                </Link>
                <Link
                  href={`/mutation-detection?sample_id=${selectedSample.id}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all hover:scale-105"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Get Results</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {sampleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="font-bold text-base text-slate-900">
                Confirm Deletion
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">"{sampleToDelete.name}"</strong>? This will remove the sequence record, all associated analyses, and variant mappings.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSampleToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-md transition-all"
              >
                {isDeleting ? 'Deleting...' : 'Delete Sample'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

