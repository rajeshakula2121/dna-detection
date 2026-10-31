'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { UploadCloud, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { checkBackendHealth } from '@/lib/api-client';

export default function GenomicsHeader({
  title,
  subtitle,
  actionButton
}: {
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}) {
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth()
      .then(res => setBackendOnline(res !== null))
      .catch(() => setBackendOnline(false));
    
    const interval = setInterval(() => {
      checkBackendHealth()
        .then(res => setBackendOnline(res !== null))
        .catch(() => setBackendOnline(false));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200/80">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>
          {backendOnline !== null && (
            <span
              className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                backendOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {backendOnline ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  API Connected (Port 8000)
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  Local Engine Mode
                </>
              )}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1 font-normal">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actionButton || (
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Sample</span>
          </Link>
        )}
      </div>
    </header>
  );
}

