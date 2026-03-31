import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex bg-zinc-950 min-h-screen">
      <Sidebar />
      {/* md:ml-56 = offset for desktop sidebar; pt-14 = offset for mobile top bar */}
      <main className="flex-1 min-h-screen md:ml-56 pt-14 md:pt-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
