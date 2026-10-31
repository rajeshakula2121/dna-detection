'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  User, 
  Settings, 
  Shield, 
  Sliders, 
  Trash2, 
  LogOut, 
  CheckCircle2, 
  Dna, 
  Database,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ProfilePage() {
  const { user, logout, isDemoUser } = useAuth();
  const [matchScore, setMatchScore] = useState(2);
  const [mismatchPenalty, setMismatchPenalty] = useState(-1);
  const [gapPenalty, setGapPenalty] = useState(-2);
  const [defaultKmer, setDefaultKmer] = useState(3);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('biodna_settings', JSON.stringify({
        matchScore,
        mismatchPenalty,
        gapPenalty,
        defaultKmer
      }));
    }
    setStatusMsg("Preferences saved successfully!");
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleClearLocalData = () => {
    if (confirm("Clear local cache and temporary sequence history? This cannot be undone.")) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('biodna_local_history');
      }
      setStatusMsg("Local cache cleared.");
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-teal-600" />
          Researcher Profile &amp; Settings
        </h1>
        <p className="text-sm text-slate-500">
          Manage your account credentials, project metadata, and default algorithmic scoring parameters.
        </p>
      </div>

      {statusMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg uppercase shadow-sm">
              {(user?.displayName || user?.email || 'U')[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-navy-900">
                {user?.displayName || 'Bioinformatics Researcher'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {user?.email || 'Guest Session'}
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
            {isDemoUser ? 'Viva Demo Mode' : 'Firebase Authenticated'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <span className="text-slate-400 block text-[11px]">User UID</span>
            <span className="font-mono text-navy-900">{user?.uid || 'local-researcher'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Academic Project</span>
            <span className="font-semibold text-navy-900">B.Tech Bioinformatics Final Year</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => logout()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Algorithmic Parameters Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Sliders className="w-5 h-5 text-teal-600" />
          <h2 className="text-base font-bold text-navy-900">Default Alignment &amp; Algorithm Parameters</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Match Score
              </label>
              <input
                type="number"
                value={matchScore}
                onChange={(e) => setMatchScore(parseInt(e.target.value) || 2)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Default: +2</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mismatch Penalty
              </label>
              <input
                type="number"
                value={mismatchPenalty}
                onChange={(e) => setMismatchPenalty(parseInt(e.target.value) || -1)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Default: -1</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Linear Gap Penalty
              </label>
              <input
                type="number"
                value={gapPenalty}
                onChange={(e) => setGapPenalty(parseInt(e.target.value) || -2)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">Default: -2</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Default K-mer Window (k)
            </label>
            <input
              type="number"
              min={2}
              max={8}
              value={defaultKmer}
              onChange={(e) => setDefaultKmer(parseInt(e.target.value) || 3)}
              className="w-48 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            <span className="text-[10px] text-slate-400 block mt-1">Accepts k from 2 to 8 bp</span>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Local Data Storage Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-navy-900 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-600" />
          <span>Local Cache &amp; Temporary Storage</span>
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Clear cached browser history and local storage to ensure fresh demonstration runs.
        </p>
        <button
          onClick={handleClearLocalData}
          className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 rounded-lg text-xs font-semibold transition"
        >
          Clear Local Browser Cache
        </button>
      </div>
    </div>
  );
}

