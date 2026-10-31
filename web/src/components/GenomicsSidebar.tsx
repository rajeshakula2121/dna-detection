'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  Dna,
  Search,
  GitCompare,
  Activity,
  Pill,
  LineChart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  LogOut,
  LogIn,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Upload Samples', href: '/upload', icon: UploadCloud },
  { label: 'DNA Samples', href: '/samples', icon: Dna },
  { label: 'Pattern Analysis', href: '/pattern-analysis', icon: Search },
  { label: 'Mutation Detection', href: '/mutation-detection', icon: GitCompare },
  { label: 'Disease Association', href: '/disease-association', icon: Activity },
  { label: 'Drug Response', href: '/drug-response', icon: Pill },
  { label: 'Research & Analytics', href: '/research-analytics', icon: LineChart },
  { label: 'AI Assistant', href: '/ai-assistant', icon: Sparkles },
];

export default function GenomicsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    if (confirm('Sign out of GenomicsAI research session?')) {
      try {
        await logout();
      } catch (e) {
        console.warn('Logout:', e);
      }
      router.push('/login');
    }
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between bg-[#0B132B] text-white px-4 py-3 sticky top-0 z-50 border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-400 flex items-center justify-center text-teal-400 shadow-sm shadow-teal-500/30">
            <Dna className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="font-black text-lg tracking-tight text-white">Genomics<span className="text-teal-400">AI</span></span>
            <span className="block text-[9px] tracking-widest text-teal-400 font-semibold uppercase -mt-1">Bioinformatics</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!user ? (
            <Link
              href="/login"
              className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-teal-600 text-white"
            >
              Sign In
            </Link>
          ) : null}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar (Desktop fixed & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#0B132B] text-slate-300 border-r border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-72'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Section */}
        <div>
          <div className="h-20 flex items-center px-5 border-b border-slate-800/80">
            <Link href="/" className="flex items-center gap-3.5 group">
              <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-400/80 flex items-center justify-center text-teal-400 shadow-md shadow-teal-500/30 group-hover:scale-105 transition-transform flex-shrink-0">
                <Dna className="w-6 h-6" />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden transition-opacity duration-300">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xl tracking-tight text-white">
                      Genomics<span className="text-teal-400">AI</span>
                    </span>
                  </div>
                  <span className="block text-[10px] tracking-widest text-teal-400/90 font-bold uppercase">
                    Bioinformatics
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-14rem)]">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                    active
                      ? 'bg-teal-500 text-white font-semibold shadow-lg shadow-teal-500/30 translate-x-1'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      active ? 'text-white' : 'text-slate-400 group-hover:text-teal-400'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {active && !isCollapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: User status, Collapse Toggle & Auth */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2 bg-[#090F21]">
          {/* Active Researcher Profile Pill */}
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/40 border border-slate-800">
              <div className="w-7 h-7 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                <UserIcon className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <span className="block text-xs font-bold text-white truncate">
                  {user?.displayName || user?.email?.split('@')[0] || 'Guest Researcher'}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-teal-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  Active Workspace
                </span>
              </div>
            </div>
          )}

          {/* Collapse Button (Desktop Only) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center gap-3.5 w-full px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 text-slate-400" />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>

          {/* Sign In or Logout */}
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3.5 w-full px-3.5 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-3.5 w-full px-3.5 py-2 text-xs font-semibold text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded-xl transition-colors"
              title="Sign In / Register"
            >
              <LogIn className="w-4 h-4 flex-shrink-0" />
              {!isCollapsed && <span>Sign In / Register</span>}
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
