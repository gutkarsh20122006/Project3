import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { FileText, LogOut, User, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = status === 'authenticated';
  const user = session?.user;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 text-primary-700 font-bold text-xl">
            <FileText className="w-6 h-6" />
            <span>DocuChat</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-slate-600 hover:text-primary-700 font-medium">
              Home
            </Link>
            {isAuthenticated && (
              <Link href="/documents" className="text-slate-600 hover:text-primary-700 font-medium">
                Documents
              </Link>
            )}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User className="w-4 h-4" />
                  <span className="max-w-[160px] truncate">{user?.name || user?.email}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="text-slate-600 hover:text-primary-700 font-medium"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2 text-slate-600"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-3">
            <Link
              href="/"
              className="block px-2 py-2 text-slate-600 hover:text-primary-700 font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            {isAuthenticated && (
              <Link
                href="/documents"
                className="block px-2 py-2 text-slate-600 hover:text-primary-700 font-medium"
                onClick={() => setMobileOpen(false)}
              >
                Documents
              </Link>
            )}
            {isAuthenticated ? (
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="w-full text-left px-2 py-2 text-slate-600 hover:text-primary-700 font-medium"
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  href="/auth/signin"
                  className="block px-2 py-2 text-slate-600 hover:text-primary-700 font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="block px-2 py-2 text-primary-700 font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
