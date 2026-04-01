'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

// ─── Animation helpers ────────────────────────────────────────────────────────

function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const reduce = useReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Typing effect ────────────────────────────────────────────────────────────

const TYPING_TEXT = 'You let 4 losers run past your stop in the last 10 trades, costing you $620 in avoidable losses.';

function TypingText() {
  const [displayed, setDisplayed] = useState('');
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (idx >= TYPING_TEXT.length) { setDone(true); return; }
    const t = setTimeout(() => {
      setDisplayed(TYPING_TEXT.slice(0, idx + 1));
      setIdx((i) => i + 1);
    }, 28);
    return () => clearTimeout(t);
  }, [idx, done]);

  return (
    <span className="text-zinc-200">
      {displayed}
      {!done && <span className="inline-block w-0.5 h-3.5 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />}
    </span>
  );
}

// ─── Floating card ────────────────────────────────────────────────────────────

function FloatingCard() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={reduce ? {} : { y: [0, -10, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="w-full max-w-lg mx-auto"
    >
      <div className="bg-zinc-900/90 border border-zinc-700/60 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800/80">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-2 text-[11px] text-zinc-600 font-mono">Futures Edge AI — Coach</span>
        </div>

        <div className="p-5 space-y-3">
          {/* Trade summary row */}
          <div className="flex items-center gap-3 bg-zinc-800/60 rounded-xl px-4 py-3 border border-zinc-700/40">
            <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 15 15" fill="none">
                <path d="M2 10L6 5L9 8L13 2" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-300">ES — Long</p>
              <p className="text-xs text-zinc-600">Today, 09:45 AM</p>
            </div>
            <span className="text-sm font-bold text-red-400">−$312</span>
          </div>

          {/* AI insight cards */}
          <div className="grid grid-cols-1 gap-2.5">
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3.5">
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest mb-1.5">Strength</p>
              <p className="text-xs text-zinc-300 leading-relaxed">Your long entries before 10 AM have a 71% win rate — your morning reads are sharp.</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/15 rounded-xl p-3.5">
              <p className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-1.5">Watch out for</p>
              <p className="text-xs text-zinc-200 leading-relaxed">
                <TypingText />
              </p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/15 rounded-xl p-3.5">
              <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-1.5">Next trade focus</p>
              <p className="text-xs text-zinc-300 leading-relaxed">Exit immediately when price hits your stop — no exceptions on the next entry.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
            <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="font-semibold text-zinc-100 text-sm tracking-tight">Futures Edge AI</span>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
          Sign in
        </Link>
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/signup"
            className="bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-all"
          >
            Start free
          </Link>
        </motion.div>
      </div>
    </motion.nav>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Subtle radial glow behind hero */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10">
        <Nav />

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 sm:px-10 pt-16 pb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-1.5 mb-8">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-zinc-400 font-medium">AI-powered trade journal for futures traders</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-4xl sm:text-5xl md:text-[62px] font-bold tracking-tight text-zinc-100 leading-[1.08] mb-5"
          >
            Stop repeating the<br className="hidden sm:block" /> same trading mistakes.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-lg sm:text-xl text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto"
          >
            Futures Edge AI tells you exactly what to fix on your next trade — instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/signup"
                className="flex items-center justify-center w-full sm:w-auto bg-white text-zinc-950 font-semibold px-8 py-3.5 rounded-xl hover:bg-zinc-100 transition-all text-sm shadow-[0_0_24px_rgba(255,255,255,0.12)]"
              >
                Start Free Trial
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
              <Link
                href="/login"
                className="flex items-center justify-center w-full sm:w-auto bg-zinc-900 text-zinc-300 font-medium px-8 py-3.5 rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-all text-sm"
              >
                Sign in
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.55 }}
            className="text-xs text-zinc-600 mt-3"
          >
            3-day free trial &bull; Cancel anytime
          </motion.p>
        </section>

        {/* ── Floating product preview ──────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-6 sm:px-10 pb-28">
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <FloatingCard />
          </motion.div>
        </section>

        {/* ── Problem ──────────────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto px-6 sm:px-10 pb-28 text-center">
          <FadeUp>
            <p className="text-2xl sm:text-3xl font-semibold text-zinc-200 leading-snug tracking-tight">
              Most traders don&apos;t fail from lack of strategy — they fail from{' '}
              <span className="text-zinc-500">repeating the same mistakes.</span>
            </p>
            <p className="text-zinc-500 text-base mt-5 leading-relaxed">
              You know how to trade. What you&apos;re missing is a clear view of your own patterns — the ones quietly draining your account.
            </p>
          </FadeUp>
        </section>

        {/* ── How it works ─────────────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-6 sm:px-10 pb-28">
          <FadeUp>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest text-center mb-10">How it works</p>
          </FadeUp>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { num: '01', title: 'Add your trade', desc: 'Log any trade in seconds. Or import a CSV from Tradovate, NinjaTrader, or any broker.' },
              { num: '02', title: 'Get instant AI feedback', desc: 'AI reads your trade history and tells you your #1 strength, weakness, and one specific fix.' },
              { num: '03', title: 'Improve your next trade', desc: 'One concrete action — not vague advice. Something you can apply on your very next entry.' },
            ].map(({ num, title, desc }, i) => (
              <FadeUp key={num} delay={i * 0.08}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: '0 12px 40px -8px rgba(0,0,0,0.5)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full cursor-default"
                >
                  <p className="text-3xl font-bold text-zinc-800 mb-4 font-mono">{num}</p>
                  <p className="text-base font-semibold text-zinc-100 mb-2">{title}</p>
                  <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Value props ──────────────────────────────────────────────────── */}
        <section className="max-w-xl mx-auto px-6 sm:px-10 pb-28 text-center">
          <FadeUp>
            <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-8">What you get</p>
          </FadeUp>
          <div className="space-y-3">
            {[
              { icon: '⚡', text: 'Know your biggest mistake instantly' },
              { icon: '🎯', text: 'Get one clear focus for your next trade' },
              { icon: '📈', text: 'Build consistency faster' },
            ].map(({ icon, text }, i) => (
              <FadeUp key={text} delay={i * 0.07}>
                <motion.div
                  whileHover={{ x: 4 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-left cursor-default"
                >
                  <span className="text-xl flex-shrink-0">{icon}</span>
                  <span className="text-sm font-medium text-zinc-200">{text}</span>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────────────── */}
        <section className="max-w-xl mx-auto px-6 sm:px-10 pb-32">
          <FadeUp>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
                Start improving your trading today.
              </h2>
              <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
                Built for serious traders improving their edge daily.
              </p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center w-full bg-white text-zinc-950 font-semibold py-3.5 rounded-xl hover:bg-zinc-100 transition-all text-sm shadow-[0_0_24px_rgba(255,255,255,0.1)]"
                >
                  Start Free Trial
                </Link>
              </motion.div>
              <p className="text-xs text-zinc-600 mt-3">3-day free trial &bull; Cancel anytime &bull; No credit card required to start</p>
            </div>
          </FadeUp>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="border-t border-zinc-800/60 px-6 sm:px-10 py-8 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center flex-shrink-0">
              <svg width="9" height="9" viewBox="0 0 15 15" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-xs text-zinc-600 font-medium">Futures Edge AI</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Sign in</Link>
            <Link href="/signup" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Create account</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
