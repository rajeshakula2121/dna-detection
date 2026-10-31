"use client";

import React from "react";
import Link from "next/link";
import { Dna, Search, GitCompare, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="w-full min-h-[calc(100vh-6rem)] flex flex-col items-center justify-start py-4 px-2 sm:px-4 relative select-none">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6336B5]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#35D5F2]/15 rounded-full blur-[130px] pointer-events-none" />

      {/* 1. TOP: DASHBOARD HEADER */}
      <header className="w-full max-w-5xl flex flex-col items-center justify-center pt-2 pb-6 z-10 text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-[#080B24] via-[#6336B5] to-[#9147FF] uppercase drop-shadow-sm">
          DASHBOARD
        </h1>
        {/* Elegant Separator */}
        <div className="mt-4 flex items-center justify-center w-64 sm:w-80 relative">
          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#35D5F2] to-transparent" />
          <div className="absolute w-2.5 h-2.5 rounded-full bg-[#35D5F2] shadow-[0_0_12px_#35D5F2]" />
        </div>
      </header>

      {/* 2. MIDDLE: LARGE GENOMICS AI HERO SECTION */}
      <section className="w-full max-w-5xl z-10 my-4">
        <div className="relative rounded-3xl bg-gradient-to-br from-[#080B24] via-[#241044] to-[#080B24] text-[#F5F5FF] border border-[#6336B5]/50 shadow-[0_15px_50px_rgba(36,16,68,0.45)] backdrop-blur-xl p-8 sm:p-12 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 min-h-[320px]">
          
          {/* Subtle Grid & Lighting inside Hero */}
          <div className="absolute inset-0 bg-[radial-gradient(#9147FF_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#35D5F2]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[#9147FF]/20 rounded-full blur-3xl pointer-events-none" />

          {/* LEFT SIDE: Circular DNA Logo + Title + Subtitle */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-6 z-10 text-center sm:text-left">
            {/* Circular Scientific DNA Logo */}
            <div className="relative group flex-shrink-0">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#35D5F2] via-[#9147FF] to-[#6336B5] blur-md opacity-80 group-hover:opacity-100 transition duration-500 animate-pulse" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#080B24] border-2 border-[#35D5F2]/80 flex items-center justify-center shadow-inner overflow-hidden">
                <svg
                  className="w-14 h-14 text-[#35D5F2] filter drop-shadow-[0_0_10px_#35D5F2]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 15c6.667-6 13.333 0 20-6" />
                  <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" />
                  <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" />
                  <path d="M17 6l-2.5-2.5" />
                  <path d="M14 8l-1-1" />
                  <path d="M7 18l2.5 2.5" />
                  <path d="M3.5 14.5l.5.5" />
                  <path d="M20 9.5l.5.5" />
                  <path d="M6.5 12.5l1 1" />
                  <path d="M16.5 10.5l1 1" />
                  <path d="M10 16l2.5 2.5" />
                  <circle cx="12" cy="12" r="1.5" fill="#9147FF" />
                </svg>
              </div>
            </div>

            {/* Typography */}
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#35D5F2] mb-1">
                Biotechnology Platform
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#F5F5FF] drop-shadow-md">
                Genomics <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#35D5F2] to-[#9147FF]">AI</span>
              </h2>
              <p className="text-lg sm:text-xl font-medium tracking-wide text-[#35D5F2] mt-1 flex items-center justify-center sm:justify-start gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#35D5F2] animate-ping" />
                DNA Analysis
              </p>
            </div>
          </div>

          {/* RIGHT SIDE: 3D Scientific DNA Double Helix Graphic */}
          <div className="relative w-full max-w-[340px] h-[220px] flex items-center justify-center z-10 flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-l from-[#9147FF]/30 via-[#35D5F2]/20 to-transparent rounded-2xl filter blur-xl" />
            <svg
              className="w-full h-full filter drop-shadow-[0_0_15px_rgba(53,213,242,0.6)]"
              viewBox="0 0 400 240"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="strandA" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#35D5F2" />
                  <stop offset="50%" stopColor="#9147FF" />
                  <stop offset="100%" stopColor="#35D5F2" />
                </linearGradient>
                <linearGradient id="strandB" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#9147FF" />
                  <stop offset="50%" stopColor="#6336B5" />
                  <stop offset="100%" stopColor="#35D5F2" />
                </linearGradient>
              </defs>

              {/* Rungs connecting base pairs */}
              <line x1="40" y1="60" x2="40" y2="180" stroke="#6336B5" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.7" />
              <line x1="80" y1="85" x2="80" y2="155" stroke="#9147FF" strokeWidth="3" opacity="0.8" />
              <line x1="120" y1="115" x2="120" y2="125" stroke="#35D5F2" strokeWidth="3.5" />
              <line x1="160" y1="155" x2="160" y2="85" stroke="#9147FF" strokeWidth="3" opacity="0.8" />
              <line x1="200" y1="180" x2="200" y2="60" stroke="#6336B5" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.7" />
              <line x1="240" y1="155" x2="240" y2="85" stroke="#9147FF" strokeWidth="3" opacity="0.8" />
              <line x1="280" y1="125" x2="280" y2="115" stroke="#35D5F2" strokeWidth="3.5" />
              <line x1="320" y1="85" x2="320" y2="155" stroke="#9147FF" strokeWidth="3" opacity="0.8" />
              <line x1="360" y1="60" x2="360" y2="180" stroke="#6336B5" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.7" />

              {/* Strands */}
              <path d="M 20 60 Q 100 20, 160 120 T 300 120 T 380 180" stroke="url(#strandA)" strokeWidth="5" strokeLinecap="round" />
              <path d="M 20 180 Q 100 220, 160 120 T 300 120 T 380 60" stroke="url(#strandB)" strokeWidth="5" strokeLinecap="round" />

              {/* Nucleotide Nodes */}
              <circle cx="40" cy="60" r="6" fill="#35D5F2" filter="drop-shadow(0 0 6px #35D5F2)" />
              <circle cx="80" cy="85" r="5" fill="#9147FF" />
              <circle cx="120" cy="118" r="6" fill="#35D5F2" filter="drop-shadow(0 0 6px #35D5F2)" />
              <circle cx="160" cy="155" r="5" fill="#9147FF" />
              <circle cx="200" cy="180" r="7" fill="#35D5F2" filter="drop-shadow(0 0 8px #35D5F2)" />
              <circle cx="240" cy="155" r="5" fill="#9147FF" />
              <circle cx="280" cy="122" r="6" fill="#35D5F2" filter="drop-shadow(0 0 6px #35D5F2)" />
              <circle cx="320" cy="85" r="5" fill="#9147FF" />
              <circle cx="360" cy="60" r="6" fill="#35D5F2" filter="drop-shadow(0 0 6px #35D5F2)" />

              {/* Complementary Nodes */}
              <circle cx="40" cy="180" r="6" fill="#9147FF" filter="drop-shadow(0 0 6px #9147FF)" />
              <circle cx="80" cy="155" r="5" fill="#35D5F2" />
              <circle cx="120" cy="122" r="5" fill="#9147FF" />
              <circle cx="160" cy="85" r="5" fill="#35D5F2" />
              <circle cx="200" cy="60" r="7" fill="#9147FF" filter="drop-shadow(0 0 8px #9147FF)" />
              <circle cx="240" cy="85" r="5" fill="#35D5F2" />
              <circle cx="280" cy="118" r="5" fill="#9147FF" />
              <circle cx="320" cy="155" r="5" fill="#35D5F2" />
              <circle cx="360" cy="180" r="6" fill="#9147FF" filter="drop-shadow(0 0 6px #9147FF)" />
            </svg>
          </div>
        </div>
      </section>

      {/* 3. BOTTOM: TWO MAIN NAVIGATION BUTTONS */}
      <nav className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 my-6 z-10">
        
        {/* BUTTON 1: DNA Pattern Analysis */}
        <Link
          href="/pattern-analysis"
          className="group relative rounded-2xl bg-gradient-to-br from-[#080B24] via-[#241044] to-[#080B24] border border-[#6336B5]/60 hover:border-[#35D5F2] p-8 transition-all duration-300 hover:shadow-[0_0_35px_rgba(53,213,242,0.35)] hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#35D5F2]/10 rounded-full blur-2xl group-hover:bg-[#35D5F2]/25 transition duration-300" />
          
          <div className="flex items-center gap-5">
            {/* Icon Container */}
            <div className="w-16 h-16 rounded-xl bg-[#080B24] border border-[#35D5F2]/50 flex items-center justify-center text-[#35D5F2] group-hover:scale-110 group-hover:shadow-[0_0_15px_#35D5F2] transition duration-300 flex-shrink-0">
              <Search className="w-8 h-8 text-[#35D5F2]" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-[#F5F5FF] group-hover:text-[#35D5F2] transition duration-300">
                DNA Pattern Analysis
              </h3>
              <p className="text-sm text-[#F5F5FF]/70 mt-1">
                Explore DNA motif and pattern analysis.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center text-xs font-semibold uppercase tracking-wider text-[#35D5F2]">
            Launch Module
            <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1.5 transition duration-200" />
          </div>
        </Link>

        {/* BUTTON 2: DNA Mutation */}
        <Link
          href="/mutation-detection"
          className="group relative rounded-2xl bg-gradient-to-br from-[#080B24] via-[#241044] to-[#080B24] border border-[#6336B5]/60 hover:border-[#9147FF] p-8 transition-all duration-300 hover:shadow-[0_0_35px_rgba(145,71,255,0.4)] hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#9147FF]/10 rounded-full blur-2xl group-hover:bg-[#9147FF]/25 transition duration-300" />
          
          <div className="flex items-center gap-5">
            {/* Icon Container */}
            <div className="w-16 h-16 rounded-xl bg-[#080B24] border border-[#9147FF]/50 flex items-center justify-center text-[#9147FF] group-hover:scale-110 group-hover:shadow-[0_0_15px_#9147FF] transition duration-300 flex-shrink-0">
              <GitCompare className="w-8 h-8 text-[#9147FF]" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-[#F5F5FF] group-hover:text-[#9147FF] transition duration-300">
                DNA Mutation
              </h3>
              <p className="text-sm text-[#F5F5FF]/70 mt-1">
                Explore DNA mutation analysis.
              </p>
            </div>
          </div>

          <div className="mt-8 flex items-center text-xs font-semibold uppercase tracking-wider text-[#9147FF]">
            Launch Module
            <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1.5 transition duration-200" />
          </div>
        </Link>

      </nav>
    </div>
  );
}
