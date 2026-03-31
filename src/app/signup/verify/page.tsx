import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
      <div className="max-w-sm w-full text-center">
        <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-5">
          <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
            <path d="M1 3.5h13M1 11.5h13M1 3.5v8a1 1 0 001 1h11a1 1 0 001-1v-8M5.5 7l2 2 2-2" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight mb-2">Check your email</h1>
        <p className="text-zinc-500 text-sm leading-relaxed mb-6">
          We sent a verification link to your email address. Click it to activate your account and get started.
        </p>
        <p className="text-zinc-600 text-xs">
          Already verified?{' '}
          <Link href="/login" className="text-zinc-400 hover:text-zinc-200 transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
