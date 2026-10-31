'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Dna, 
  History, 
  LogIn, 
  UserPlus, 
  LogOut, 
  User, 
  Menu, 
  X, 
  CheckCircle2,
  BookOpen,
  Settings
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout, isDemoUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/analyze', label: 'Sequence Analyzer', icon: Dna },
    { href: '/history', label: 'History', icon: History },
    { href: '/help', label: 'Algorithm Guide', icon: BookOpen },
    { href: '/profile', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-navy-900 border-b border-navy-700 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={user ? "/analyze" : "/"} className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                BioDNA <span className="text-teal-400 font-semibold text-xs px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800">PRO</span>
              </span>
              <p className="text-[11px] text-slate-400">Pattern &amp; Mutation Platform</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-md text-sm font-medium transition ${
                    isActive
                      ? 'bg-navy-700 text-teal-300 border border-teal-500/30 shadow-sm'
                      : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Auth Section (Desktop) */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 bg-navy-800/80 border border-navy-700 rounded-lg p-1.5 pl-3">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-white leading-tight">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-teal-400 font-mono">
                    {isDemoUser ? 'Viva Demo Mode' : user.email}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-inner">
                  {(user.displayName || user.email || 'U')[0]}
                </div>

                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-md transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/"
                  className="inline-flex items-center space-x-1.5 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-navy-800 transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/auth/register"
                  className="inline-flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-sm transition"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Sign Up</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white focus:outline-none p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-navy-800 border-b border-navy-700 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium ${
                  isActive
                    ? 'bg-navy-700 text-teal-300'
                    : 'text-slate-300 hover:bg-navy-700/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{link.label}</span>
              </Link>
            );
          })}

          <div className="pt-3 border-t border-navy-700">
            {user ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-300 px-3">
                  Signed in as <span className="font-bold text-teal-300">{user.email}</span>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 text-rose-400 text-sm px-3 py-2 hover:bg-navy-700/50 rounded-md"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-2 text-slate-300 text-sm px-3 py-2 hover:bg-navy-700/50 rounded-md"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center space-x-2 bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
