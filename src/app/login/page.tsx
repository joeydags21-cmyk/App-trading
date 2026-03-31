'use client';

import { useState, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const verificationFailed = searchParams.get('error') === 'verification_failed';
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); }
    else router.push('/dashboard');
  }

  const inputClass = 'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-all';

  return (
    <div className="min-h-screen flex bg-zinc-950">
      {/* Left — value props */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-[480px] border-r border-zinc-800/60 flex-shrink-0">
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-100 text-base">Futures Edge AI</span>
        </div>
        <h2 className="text-2xl font-semibold text-zinc-100 tracking-tight mb-3">
          Stop guessing.<br />Start improving.
        </h2>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
          Upload your trades and let AI find the patterns costing you money — revenge trading, bad timing, oversizing, and more.
        </p>
        <div className="space-y-5">
          {[
            { title: 'Track every trade', desc: 'Log trades manually or import a CSV from your broker in seconds.' },
            { title: 'AI spots your mistakes', desc: 'Detects patterns like "you lose 68% of trades after 2 consecutive losses."' },
            { title: 'Daily coaching report', desc: 'End each session with 3 things to fix and 3 things you did right.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <div className="w-5 h-5 bg-emerald-500/10 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="10" height="10" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5L6 10.5L12 4.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-300">{item.title}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 15 15" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-zinc-100 text-base">Futures Edge AI</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Welcome back</h1>
            <p className="text-zinc-500 mt-1.5 text-sm">Sign in to your account</p>
          </div>

          {verificationFailed && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5 mb-5">
              <p className="text-red-400 text-sm font-medium">Verification failed</p>
              <p className="text-red-400/70 text-sm mt-0.5">The link may have expired. Try signing in or signing up again.</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-white text-zinc-950 rounded-lg py-2.5 text-sm font-semibold hover:bg-zinc-100 disabled:opacity-40 transition-all duration-150 mt-2">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-600">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-zinc-300 font-medium hover:text-white transition-colors">Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
