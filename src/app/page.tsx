import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function Home() {
  // Authenticated users go straight to dashboard
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Nav ──────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto">
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
          <Link
            href="/signup"
            className="bg-white text-zinc-950 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-zinc-100 transition-all"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 sm:px-10 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3.5 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          <span className="text-xs text-zinc-400 font-medium">AI-powered trade journal for futures traders</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.1] mb-6">
          Stop repeating the<br className="hidden sm:block" /> same trading mistakes.
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed mb-10 max-w-2xl mx-auto">
          Futures Edge AI analyzes your trades and tells you exactly what to fix on your next trade.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            className="w-full sm:w-auto bg-white text-zinc-950 font-semibold px-7 py-3.5 rounded-xl hover:bg-zinc-100 transition-all text-sm text-center"
          >
            Start Free Trial
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto bg-zinc-900 text-zinc-300 font-medium px-7 py-3.5 rounded-xl hover:bg-zinc-800 border border-zinc-800 transition-all text-sm text-center"
          >
            Sign in
          </Link>
        </div>
        <p className="text-xs text-zinc-600 mt-3">3-day free trial &bull; Cancel anytime</p>
      </section>

      {/* ── Product preview ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 sm:px-10 pb-24">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-zinc-800/60">
            <span className="w-3 h-3 rounded-full bg-zinc-700"></span>
            <span className="w-3 h-3 rounded-full bg-zinc-700"></span>
            <span className="w-3 h-3 rounded-full bg-zinc-700"></span>
            <span className="ml-3 text-xs text-zinc-600 font-mono">Futures Edge AI — Trading Coach</span>
          </div>
          {/* Mock UI */}
          <div className="p-6 sm:p-8 grid sm:grid-cols-3 gap-4">
            {[
              {
                color: 'emerald',
                label: 'Strength',
                text: 'Your long trades on ES have a 68% win rate — you have a real edge going long in the morning session.',
              },
              {
                color: 'red',
                label: 'Watch out for',
                text: 'You average 2.3 trades after a loss, and those revenge trades have a 28% win rate — costing you $340 on average.',
              },
              {
                color: 'violet',
                label: 'Next trade focus',
                text: 'Set a hard rule: maximum 1 trade after any losing trade, then walk away for 30 minutes.',
              },
            ].map(({ color, label, text }) => {
              const colors: Record<string, string> = {
                emerald: 'border-emerald-500/20 bg-emerald-500/5',
                red: 'border-red-500/20 bg-red-500/5',
                violet: 'border-violet-500/20 bg-violet-500/5',
              };
              const textColors: Record<string, string> = {
                emerald: 'text-emerald-400',
                red: 'text-red-400',
                violet: 'text-violet-400',
              };
              return (
                <div key={label} className={`rounded-xl border p-4 ${colors[color]}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textColors[color]}`}>{label}</p>
                  <p className="text-sm text-zinc-300 leading-relaxed">{text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Problem ──────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 sm:px-10 pb-24 text-center">
        <p className="text-2xl sm:text-3xl font-semibold text-zinc-200 leading-snug tracking-tight">
          Most traders don&apos;t fail from lack of strategy — they fail from{' '}
          <span className="text-zinc-400">repeating the same mistakes.</span>
        </p>
        <p className="text-zinc-500 text-base mt-5 leading-relaxed">
          You know how to trade. What you're missing is a clear view of your own patterns — the ones that are quietly draining your account.
        </p>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 sm:px-10 pb-24">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest text-center mb-10">How it works</p>
        <div className="grid sm:grid-cols-3 gap-5">
          {[
            {
              num: '01',
              title: 'Add your trade',
              desc: 'Log any trade in seconds. Or import a CSV directly from Tradovate, NinjaTrader, or any broker.',
            },
            {
              num: '02',
              title: 'Get instant AI feedback',
              desc: 'The AI reads your trade history and tells you your #1 strength, weakness, and one specific thing to do differently.',
            },
            {
              num: '03',
              title: 'Improve your next trade',
              desc: 'You get one concrete action — not vague advice. Something you can apply on your very next entry.',
            },
          ].map(({ num, title, desc }) => (
            <div key={num} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-3xl font-bold text-zinc-800 mb-4 font-mono">{num}</p>
              <p className="text-base font-semibold text-zinc-100 mb-2">{title}</p>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Value props ──────────────────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-6 sm:px-10 pb-24 text-center">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-8">What you get</p>
        <ul className="space-y-4">
          {[
            { icon: '⚡', text: 'Know your biggest mistake instantly' },
            { icon: '🎯', text: 'Get one clear focus for your next trade' },
            { icon: '📈', text: 'Build consistency faster' },
          ].map(({ icon, text }) => (
            <li key={text} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4">
              <span className="text-xl flex-shrink-0">{icon}</span>
              <span className="text-sm font-medium text-zinc-200 text-left">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────────── */}
      <section className="max-w-xl mx-auto px-6 sm:px-10 pb-32 text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
            Start improving your trading today.
          </h2>
          <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
            Built for serious traders improving their edge daily.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center w-full bg-white text-zinc-950 font-semibold py-3.5 rounded-xl hover:bg-zinc-100 transition-all text-sm"
          >
            Start Free Trial
          </Link>
          <p className="text-xs text-zinc-600 mt-3">3-day free trial &bull; Cancel anytime &bull; No credit card required to start</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
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
  );
}
