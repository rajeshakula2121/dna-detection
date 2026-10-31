'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Dna, 
  GitCompare, 
  Search, 
  Layers, 
  Binary, 
  ShieldAlert, 
  HelpCircle,
  ArrowRight,
  Code2,
  FileText
} from 'lucide-react';

export default function HelpGuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title & Introduction */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center gap-2 text-teal-600 font-bold text-xs uppercase tracking-wider mb-2">
          <BookOpen className="w-4 h-4" />
          <span>Bioinformatics Algorithm Specification</span>
        </div>
        <h1 className="text-3xl font-black text-navy-900 tracking-tight">
          Algorithm Guide &amp; Technical Methodology
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl leading-relaxed">
          Comprehensive documentation of the deterministic sequence analysis algorithms, biological coordinate conventions, scoring parameters, and input constraints implemented across the BioDNA platform.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="text-xs font-bold text-navy-900 uppercase tracking-wider mb-3">Contents</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
          <a href="#validation" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            1. IUPAC Validation &amp; Skew
          </a>
          <a href="#kmp" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            2. Knuth-Morris-Pratt (KMP)
          </a>
          <a href="#aho-corasick" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            3. Aho-Corasick Automaton
          </a>
          <a href="#kmers" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            4. K-mer Analysis &amp; Entropy
          </a>
          <a href="#alignment" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            5. Needleman-Wunsch Alignment
          </a>
          <a href="#mutations" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            6. Mutation Calling &amp; HGVS
          </a>
          <a href="#motif-disruption" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            7. Motif Disruption Engine
          </a>
          <a href="#translation" className="text-teal-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
            8. 6-Frame Translation &amp; ORFs
          </a>
          <a href="#disclaimer" className="text-rose-700 hover:underline flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            9. Academic Notice &amp; Scope
          </a>
        </div>
      </div>

      {/* Section 1: Validation */}
      <section id="validation" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Dna className="w-5 h-5 text-teal-600" />
          1. Sequence Validation &amp; IUPAC Ambiguity Codes
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Input sequences are sanitized by stripping whitespace, digits, and carriage returns, then normalized to uppercase.
          Standard DNA sequences are evaluated against Watson-Crick canonical bases (<strong>A, C, G, T</strong>). When ambiguous bases are accepted, the engine supports standard IUPAC degenerate codes:
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-slate-200 rounded-lg">
            <thead className="bg-slate-100 text-slate-700 font-bold">
              <tr>
                <th className="py-2 px-3 text-left">Symbol</th>
                <th className="py-2 px-3 text-left">Meaning</th>
                <th className="py-2 px-3 text-left">Origin / Mnemonic</th>
                <th className="py-2 px-3 text-left">Treatment in GC%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-600">
              <tr><td className="py-1.5 px-3 font-mono font-bold">R</td><td className="py-1.5 px-3">A or G</td><td className="py-1.5 px-3">puRine</td><td className="py-1.5 px-3">Excluded from canonical GC%</td></tr>
              <tr><td className="py-1.5 px-3 font-mono font-bold">Y</td><td className="py-1.5 px-3">C or T</td><td className="py-1.5 px-3">pYrimidine</td><td className="py-1.5 px-3">Excluded from canonical GC%</td></tr>
              <tr><td className="py-1.5 px-3 font-mono font-bold">S</td><td className="py-1.5 px-3">G or C</td><td className="py-1.5 px-3">Strong interaction (3 H bonds)</td><td className="py-1.5 px-3">Reported in ambiguity breakdown</td></tr>
              <tr><td className="py-1.5 px-3 font-mono font-bold">W</td><td className="py-1.5 px-3">A or T</td><td className="py-1.5 px-3">Weak interaction (2 H bonds)</td><td className="py-1.5 px-3">Reported in ambiguity breakdown</td></tr>
              <tr><td className="py-1.5 px-3 font-mono font-bold">N</td><td className="py-1.5 px-3">A, C, G, or T</td><td className="py-1.5 px-3">aNy base</td><td className="py-1.5 px-3">Tracked with ambiguity percentage</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          <strong>GC and AT Skew:</strong> Calculated as <code className="bg-slate-100 px-1 py-0.5 rounded text-navy-900 font-mono">GC Skew = (G - C) / (G + C)</code> and <code className="bg-slate-100 px-1 py-0.5 rounded text-navy-900 font-mono">AT Skew = (A - T) / (A + T)</code>, indicating replication strand asymmetry.
        </p>
      </section>

      {/* Section 2: KMP */}
      <section id="kmp" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Search className="w-5 h-5 text-teal-600" />
          2. Knuth-Morris-Pratt (KMP) Algorithm
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The Knuth-Morris-Pratt algorithm provides exact single-pattern string matching in linear time <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">O(N + M)</code>, eliminating redundant comparisons by precomputing the <strong>Longest Proper Prefix which is also a Suffix (LPS)</strong> array.
        </p>
        <div className="bg-navy-900 text-teal-300 p-4 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
          <p className="text-slate-400">// LPS computation principle:</p>
          <p>Pattern:   A  A  B  A  A  C  A  A  B  A  A</p>
          <p>LPS Table: [0, 1, 0, 1, 2, 0, 1, 2, 3, 4, 5]</p>
        </div>
        <p className="text-xs text-slate-500">
          Overlapping occurrences (such as <code className="font-mono text-navy-900">AAA</code> within <code className="font-mono text-navy-900">AAAAA</code>) are fully detected by rewinding pattern indices via the LPS table rather than resetting to position 0. Coordinates are returned in <strong>1-based biological coordinates</strong>.
        </p>
      </section>

      {/* Section 3: Aho-Corasick */}
      <section id="aho-corasick" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Layers className="w-5 h-5 text-teal-600" />
          3. Aho-Corasick Multi-Pattern Automaton
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          When searching for a set of motifs simultaneously (e.g. TATA box, E-box, Kozak consensus), the Aho-Corasick automaton constructs a trie with BFS-computed failure transitions and dictionary output links.
          This enables simultaneous search of any number of patterns in a single linear scan of length <code className="font-mono bg-slate-100 px-1 rounded">N</code> with output time proportional to the total number of matches found.
        </p>
      </section>

      {/* Section 4: K-mer Analysis & Shannon Entropy */}
      <section id="kmers" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Binary className="w-5 h-5 text-teal-600" />
          4. K-mer Frequency &amp; Shannon Entropy
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          The sequence is partitioned into overlapping windows of configurable length <code className="font-mono bg-slate-100 px-1 rounded">k</code> (from 2 to 8 bp). Total observed windows equals <code className="font-mono bg-slate-100 px-1 rounded">N - k + 1</code>.
        </p>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2">
          <p className="font-bold text-navy-900">Sequence Complexity via Shannon Entropy:</p>
          <p className="font-mono text-teal-800 bg-white p-2 rounded border border-slate-200">
            H = - &sum; p(kmer) &times; log2( p(kmer) )
          </p>
          <p className="text-slate-500">
            Low entropy indicates low-complexity repeat regions (e.g., poly-A tracts or tandem dinucleotide repeats), while higher entropy reflects diverse informational content.
          </p>
        </div>
      </section>

      {/* Section 5: Needleman-Wunsch Alignment */}
      <section id="alignment" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <GitCompare className="w-5 h-5 text-teal-600" />
          5. Needleman-Wunsch Global Alignment
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Global sequence alignment computes the mathematically optimal end-to-end alignment between reference and alternate sequences using dynamic programming:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-center">
            <span className="font-bold text-emerald-800">Match Score</span>
            <p className="text-xl font-black text-emerald-600 mt-1">+2</p>
            <span className="text-[10px] text-slate-500">Identical nucleotide</span>
          </div>
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-center">
            <span className="font-bold text-amber-800">Mismatch Penalty</span>
            <p className="text-xl font-black text-amber-600 mt-1">-1</p>
            <span className="text-[10px] text-slate-500">Base substitution</span>
          </div>
          <div className="bg-rose-50 border border-rose-200 p-3 rounded-lg text-center">
            <span className="font-bold text-rose-800">Linear Gap Penalty</span>
            <p className="text-xl font-black text-rose-600 mt-1">-2</p>
            <span className="text-[10px] text-slate-500">Insertion or deletion</span>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Traceback is performed from cell <code className="font-mono bg-slate-100 px-1 rounded">(N, M)</code> back to <code className="font-mono bg-slate-100 px-1 rounded">(0, 0)</code>, producing aligned reference and sample strings with hyphens (<code className="font-mono">-</code>) denoting insertions and deletions.
        </p>
      </section>

      {/* Section 6: Mutation Detection & HGVS */}
      <section id="mutations" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Code2 className="w-5 h-5 text-teal-600" />
          6. Mutation Calling &amp; HGVS Coordinate Convention
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Mutations are identified strictly from aligned columns to prevent artifactual false-positives caused by unaligned coordinate shifts:
        </p>
        <ul className="text-xs text-slate-600 space-y-2 list-disc pl-5">
          <li><strong>Substitutions (SNVs):</strong> Classified into <em>Transitions</em> (purine &harr; purine A&harr;G or pyrimidine &harr; pyrimidine C&harr;T) and <em>Transversions</em> (purine &harr; pyrimidine). Format: <code className="bg-slate-100 px-1 rounded font-mono">c.X[ref]&gt;[alt]</code>.</li>
          <li><strong>Deletions:</strong> Contiguous gaps in the alternate sequence are grouped into a single deletion event. Format: <code className="bg-slate-100 px-1 rounded font-mono">c.X_Ydel[bases]</code>.</li>
          <li><strong>Insertions:</strong> Contiguous gaps in the reference sequence are anchored between reference coordinates. Format: <code className="bg-slate-100 px-1 rounded font-mono">c.X_Yins[bases]</code>.</li>
        </ul>
      </section>

      {/* Section 7: Mutation-Aware Motif Disruption */}
      <section id="motif-disruption" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Layers className="w-5 h-5 text-teal-600" />
          7. Mutation-Aware Motif Disruption Engine
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Rather than naively checking if a motif count changed, this research-focused module maps motif occurrences onto global alignment columns and classifies each motif into one of five states:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
            <span className="font-bold text-emerald-700 uppercase text-[11px]">RETAINED</span>
            <p className="text-slate-500 text-[11px] mt-1">Homologous motif conserved across both sequences without overlapping mutations.</p>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
            <span className="font-bold text-rose-700 uppercase text-[11px]">DISRUPTED</span>
            <p className="text-slate-500 text-[11px] mt-1">Motif in reference intersects directly with a detected substitution or indel in the sample.</p>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
            <span className="font-bold text-amber-700 uppercase text-[11px]">LOST</span>
            <p className="text-slate-500 text-[11px] mt-1">Motif present in reference is completely absent in the alternate sequence.</p>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
            <span className="font-bold text-indigo-700 uppercase text-[11px]">GAINED</span>
            <p className="text-slate-500 text-[11px] mt-1">Novel motif created de novo in the sample due to sequence variation.</p>
          </div>
          <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
            <span className="font-bold text-blue-700 uppercase text-[11px]">SHIFTED</span>
            <p className="text-slate-500 text-[11px] mt-1">Motif sequence is conserved but its physical coordinate has moved due to upstream indels.</p>
          </div>
        </div>
      </section>

      {/* Section 8: 6-Frame Translation & Coding Analysis */}
      <section id="translation" className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Binary className="w-5 h-5 text-teal-600" />
          8. 6-Frame Translation &amp; Coding Variant Effect
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Sequences are translated in all 3 forward frames (+1, +2, +3) and all 3 reverse-complement frames (-1, -2, -3) using the Standard NCBI Genetic Code Table 1.
          Open Reading Frames (ORFs) are detected from start codon <code className="font-mono bg-slate-100 px-1 rounded">M (ATG)</code> to stop codon <code className="font-mono bg-slate-100 px-1 rounded">* (TAA, TAG, TGA)</code>.
        </p>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-1">
          <p className="font-semibold text-navy-900">Functional Coding Classifications:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li><strong>Synonymous (Silent):</strong> Codon changes but translates to identical amino acid (e.g. GAA &rarr; GAG, both Glu).</li>
            <li><strong>Missense:</strong> Codon changes amino acid. Categorized as <em>conservative</em> (similar biochemical charge/polarity) or <em>radical</em>.</li>
            <li><strong>Nonsense (Stop-Gained):</strong> Sense codon mutated into a premature stop codon, leading to truncated protein.</li>
            <li><strong>Stop-Lost:</strong> Termination codon mutated to an amino acid, elongating the C-terminus.</li>
            <li><strong>Frameshift:</strong> Indel length not divisible by 3 (<code className="font-mono">&Delta;len % 3 &ne; 0</code>), altering downstream reading frames.</li>
          </ul>
        </div>
      </section>

      {/* Section 9: Academic Disclaimer */}
      <section id="disclaimer" className="space-y-4 pt-4 bg-rose-50 border border-rose-200 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          9. Academic Notice &amp; Scope of Interpretation
        </h2>
        <p className="text-xs text-rose-800 leading-relaxed">
          This software is engineered as an academic B.Tech Bioinformatics final-year platform.
          All sequence alignments, pattern matches, and variant calls are generated mathematically using deterministic algorithms.
          Reported variants represent sequence differences relative to the provided reference coordinates.
          <strong> Findings do not constitute clinical diagnoses or medical advice</strong> and should not be used as the sole basis for clinical intervention.
        </p>
      </section>

      {/* Back to Analyzer CTA */}
      <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
        <Link
          href="/analyze"
          className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md transition"
        >
          <Dna className="w-4 h-4" />
          <span>Launch Sequence Analyzer</span>
        </Link>
        <Link
          href="/history"
          className="text-xs font-semibold text-slate-600 hover:text-navy-900 inline-flex items-center gap-1"
        >
          <span>View Analysis History</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

