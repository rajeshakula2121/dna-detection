'use client';

import React, { useState } from 'react';

// ===================== DONUT CHART (SAMPLE STATUS DISTRIBUTION) =====================
export function StatusDonutChart({
  data
}: {
  data: Array<{ status: string; count: number }>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const colors: Record<string, string> = {
    Analyzed: '#10B981', // emerald
    Pending: '#F59E0B',  // amber
    Processing: '#3B82F6', // blue
    Other: '#8B5CF6'
  };

  const total = data.reduce((acc, d) => acc + d.count, 0) || 1;
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-2">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {data.map((item, i) => {
            const strokeDasharray = `${(item.count / total) * circumference} ${circumference}`;
            const strokeDashoffset = -accumulatedPercent * circumference;
            accumulatedPercent += item.count / total;
            const color = colors[item.status] || colors.Other;
            const isHovered = hovered === i;

            return (
              <circle
                key={item.status}
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-2xl font-black text-slate-800">
            {hovered !== null ? data[hovered].count : total}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {hovered !== null ? data[hovered].status : 'Total'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 w-full sm:w-auto">
        {data.map((item, i) => {
          const color = colors[item.status] || colors.Other;
          const pct = Math.round((item.count / total) * 100);
          return (
            <div
              key={item.status}
              className={`flex items-center justify-between gap-4 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                hovered === i ? 'bg-slate-50 border-slate-300 shadow-sm' : 'border-transparent'
              }`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-sm font-medium text-slate-700">{item.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">{item.count}</span>
                <span className="text-xs text-slate-400 font-mono">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===================== BAR CHART (MUTATION TYPE DISTRIBUTION) =====================
export function MutationBarChart({
  data
}: {
  data: Array<{ type_group: string; count: number }>;
}) {
  const maxCount = Math.max(...data.map(d => d.count), 5);
  const colors: Record<string, string> = {
    SNPs: '#3B82F6',        // Blue
    Insertions: '#10B981',  // Emerald
    Deletions: '#F43F5E',   // Rose
    Other: '#8B5CF6'
  };

  return (
    <div className="flex flex-col h-56 justify-end gap-3 pt-6 px-2">
      <div className="flex items-end justify-around h-40 gap-4 border-b border-slate-200 pb-2">
        {data.map(item => {
          const heightPct = Math.max(8, Math.round((item.count / maxCount) * 100));
          const color = colors[item.type_group] || colors.Other;
          return (
            <div key={item.type_group} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <span className="text-xs font-bold text-slate-700 opacity-90 group-hover:scale-110 transition-transform">
                {item.count}
              </span>
              <div
                className="w-full max-w-[48px] rounded-t-lg transition-all duration-500 hover:brightness-110 shadow-sm"
                style={{ height: `${heightPct}%`, backgroundColor: color }}
              />
              <span className="text-xs font-semibold text-slate-600 truncate max-w-[70px] text-center">
                {item.type_group}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block"/> SNPs</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"/> Insertions</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"/> Deletions</span>
      </div>
    </div>
  );
}

// ===================== GC CONTENT COMPARISON HORIZONTAL BARS =====================
export function GcComparisonChart({
  data
}: {
  data: Array<{ name: string; gc_content: number; at_content: number }>;
}) {
  return (
    <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800 truncate max-w-[220px]" title={item.name}>
              {item.name}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-teal-700">{item.gc_content}% GC</span>
              <span className="text-slate-400 font-mono">({item.at_content}% AT)</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex shadow-inner">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-3 transition-all duration-500"
              style={{ width: `${item.gc_content}%` }}
              title={`GC: ${item.gc_content}%`}
            />
            <div
              className="bg-slate-200 h-3 transition-all duration-500"
              style={{ width: `${item.at_content}%` }}
              title={`AT: ${item.at_content}%`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ===================== DINUCLEOTIDE FREQUENCY BAR CHART =====================
export function DinucleotideBarChart({
  chartData
}: {
  chartData: Array<{ pair: string; count: number; percentage: number }>;
}) {
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 items-end h-32 border-b border-slate-200 pb-2">
        {chartData.map(d => {
          const heightPct = Math.max(6, Math.round((d.count / maxCount) * 100));
          return (
            <div key={d.pair} className="flex flex-col items-center h-full justify-end group">
              <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {d.count}
              </span>
              <div
                className="w-full bg-gradient-to-t from-teal-600 to-cyan-400 rounded-t transition-all duration-300 hover:brightness-125"
                style={{ height: `${heightPct}%` }}
                title={`${d.pair}: ${d.count} occurrences (${d.percentage}%)`}
              />
              <span className="text-[10px] font-mono font-bold text-slate-700 mt-1">
                {d.pair}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-right text-[11px] text-slate-400 font-mono">
        16 Dinucleotide Transitions ($k=2$)
      </div>
    </div>
  );
}

