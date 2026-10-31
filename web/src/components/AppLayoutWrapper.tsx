'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import GenomicsSidebar from '@/components/GenomicsSidebar';

export default function AppLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isAuthPage =
    pathname.startsWith('/auth') ||
    pathname === '/login' ||
    pathname === '/signup';

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <GenomicsSidebar />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

