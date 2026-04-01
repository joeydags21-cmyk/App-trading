'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    hint: 'Your overview & stats',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 2h4v4H2V2zm7 0h4v4H9V2zm-7 7h4v4H2V9zm7 0h4v4H9V9z" fill="currentColor" fillOpacity=".8"/>
      </svg>
    ),
  },
  {
    href: '/trades',
    label: 'Trades',
    hint: 'Log & view all trades',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M1 3h13M1 7.5h13M1 12h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'AI Coach',
    hint: 'Find your mistake patterns',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: '/rules',
    label: 'My Rules',
    hint: 'Set daily trading limits',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M2 4h11M2 7.5h7M2 11h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    href: '/report',
    label: 'Daily Report',
    hint: 'End-of-day AI feedback',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M5 5h5M5 8h5M5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// Bottom nav tabs (4 visible, "Profile/More" opens drawer)
const bottomTabs = [
  {
    href: '/dashboard',
    label: 'Home',
    matchPrefix: false,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
        <path
          d="M2 2h4v4H2V2zm7 0h4v4H9V2zm-7 7h4v4H2V9zm7 0h4v4H9V9z"
          fill="currentColor"
          fillOpacity={active ? '1' : '0.5'}
        />
      </svg>
    ),
  },
  {
    href: '/trades',
    label: 'Trades',
    matchPrefix: true,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
        <path
          d="M1 3h13M1 7.5h13M1 12h13"
          stroke="currentColor"
          strokeWidth={active ? '1.8' : '1.3'}
          strokeLinecap="round"
          strokeOpacity={active ? '1' : '0.5'}
        />
      </svg>
    ),
  },
  {
    href: '/analysis',
    label: 'AI Coach',
    matchPrefix: false,
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
        <path
          d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z"
          stroke="currentColor"
          strokeWidth={active ? '1.5' : '1.1'}
          strokeLinejoin="round"
          strokeOpacity={active ? '1' : '0.5'}
        />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/');
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-100 ${
          active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
        }`}
      >
        <span className={`flex-shrink-0 ${active ? 'text-zinc-300' : 'text-zinc-600'}`}>
          {item.icon}
        </span>
        <div>
          <span className={`block text-sm ${active ? 'font-medium text-zinc-100' : 'text-zinc-400'}`}>
            {item.label}
          </span>
          <span className="block text-xs text-zinc-600 leading-tight mt-0.5">{item.hint}</span>
        </div>
      </Link>
    );
  };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────── */}
      <aside className="hidden md:flex w-56 h-screen bg-zinc-950 border-r border-zinc-800/60 flex-col fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="font-semibold text-zinc-100 text-sm tracking-tight block leading-tight">Futures Edge AI</span>
              <span className="text-zinc-600 text-xs">Trade journal</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-zinc-800/60">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="flex-shrink-0">
              <path d="M3 7.5h9M9 4.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-semibold text-zinc-100 text-sm">Futures Edge AI</span>
        </div>
        {/* Page context hint — subtle, no hamburger */}
        <span className="text-xs text-zinc-600 capitalize">
          {pathname.split('/')[1] || 'dashboard'}
        </span>
      </div>

      {/* ── Mobile bottom nav ────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center h-16 px-1">

          {/* Home, Trades */}
          {bottomTabs.slice(0, 2).map((tab) => {
            const active = tab.matchPrefix
              ? pathname.startsWith(tab.href)
              : pathname === tab.href;
            return (
              <motion.div
                key={tab.href}
                whileTap={{ scale: 0.85 }}
                className="flex-1"
              >
                <Link
                  href={tab.href}
                  className="flex flex-col items-center justify-center gap-1 py-2 w-full"
                >
                  <span className={active ? 'text-white' : 'text-zinc-500'}>
                    {tab.icon(active)}
                  </span>
                  <span
                    className={`text-[10px] font-medium leading-none tracking-wide ${
                      active ? 'text-white' : 'text-zinc-600'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {/* Center — Add Trade FAB */}
          <div className="flex-1 flex justify-center items-center">
            <motion.div whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.05 }}>
              <Link
                href="/trades"
                className="w-14 h-14 bg-white rounded-2xl flex flex-col items-center justify-center shadow-[0_4px_24px_rgba(255,255,255,0.15)] -mt-5 border-4 border-zinc-950 gap-0.5"
                aria-label="Add Trade"
              >
                <svg width="18" height="18" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1v13M1 7.5h13" stroke="#09090b" strokeWidth="2.2" strokeLinecap="round"/>
                </svg>
                <span className="text-[8px] font-bold text-zinc-800 leading-none tracking-wide uppercase">Add</span>
              </Link>
            </motion.div>
          </div>

          {/* AI Coach */}
          {bottomTabs.slice(2).map((tab) => {
            const active = tab.matchPrefix
              ? pathname.startsWith(tab.href)
              : pathname === tab.href;
            return (
              <motion.div
                key={tab.href}
                whileTap={{ scale: 0.85 }}
                className="flex-1"
              >
                <Link
                  href={tab.href}
                  className="flex flex-col items-center justify-center gap-1 py-2 w-full"
                >
                  <span className={active ? 'text-white' : 'text-zinc-500'}>
                    {tab.icon(active)}
                  </span>
                  <span
                    className={`text-[10px] font-medium leading-none tracking-wide ${
                      active ? 'text-white' : 'text-zinc-600'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {/* More / Profile */}
          <motion.div whileTap={{ scale: 0.85 }} className="flex-1">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-2 w-full"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 15 15"
                fill="none"
                className="text-zinc-500"
              >
                <circle cx="7.5" cy="3" r="1" fill="currentColor"/>
                <circle cx="7.5" cy="7.5" r="1" fill="currentColor"/>
                <circle cx="7.5" cy="12" r="1" fill="currentColor"/>
              </svg>
              <span className="text-[10px] font-medium leading-none tracking-wide text-zinc-600">
                More
              </span>
            </button>
          </motion.div>

        </div>
      </nav>

      {/* ── Mobile drawer overlay ────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Mobile drawer panel ──────────────────────────────── */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full w-72 z-50 bg-zinc-950 border-r border-zinc-800/60 flex flex-col transform transition-transform duration-250 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="px-5 py-5 border-b border-zinc-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M2 12L6 7L9 10L13 4" stroke="#09090b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-semibold text-zinc-100 text-sm">Futures Edge AI</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 transition-all"
            aria-label="Close menu"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
              <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>

        {/* Drawer footer */}
        <div className="px-3 py-4 border-t border-zinc-800/60">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2.5 w-full px-3 py-3 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" className="flex-shrink-0">
              <path d="M3 7.5h9M9 4.5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 2H2.5A1.5 1.5 0 001 3.5v8A1.5 1.5 0 002.5 13H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
