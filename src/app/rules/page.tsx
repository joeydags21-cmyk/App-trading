'use client';

import { useEffect, useState } from 'react';
import { Rules } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

export default function RulesPage() {
  const [rules, setRules] = useState<Partial<Rules>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('rules').select('*').eq('user_id', user.id).single();
      if (data) setRules(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('rules').upsert({
      user_id: user.id,
      max_trades_per_day: rules.max_trades_per_day || null,
      max_loss_per_day: rules.max_loss_per_day || null,
      max_position_size: rules.max_position_size || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const input = 'w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-all';
  const label = 'block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5';

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-zinc-600 text-sm">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">My Rules</h1>
        <p className="text-zinc-500 mt-1 text-sm">Set your trading discipline rules — AI will track compliance during analysis</p>
      </div>

      {/* Rules form */}
      <Card>
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className={label}>Max Trades Per Day</label>
            <p className="text-xs text-zinc-600 mb-2">AI will flag when you exceeded this and correlate it with losing days</p>
            <input
              type="number"
              min="1"
              value={rules.max_trades_per_day || ''}
              onChange={(e) => setRules((r) => ({ ...r, max_trades_per_day: e.target.value ? parseInt(e.target.value) : undefined }))}
              className={input}
              placeholder="e.g. 5"
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <label className={label}>Max Loss Per Day ($)</label>
            <p className="text-xs text-zinc-600 mb-2">Your hard daily stop-loss limit in dollars</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rules.max_loss_per_day || ''}
              onChange={(e) => setRules((r) => ({ ...r, max_loss_per_day: e.target.value ? parseFloat(e.target.value) : undefined }))}
              className={input}
              placeholder="e.g. 500"
            />
          </div>

          <div className="border-t border-zinc-800 pt-6">
            <label className={label}>Max Position Size (contracts)</label>
            <p className="text-xs text-zinc-600 mb-2">Maximum contracts per trade — oversizing is a common mistake</p>
            <input
              type="number"
              min="0"
              step="0.01"
              value={rules.max_position_size || ''}
              onChange={(e) => setRules((r) => ({ ...r, max_position_size: e.target.value ? parseFloat(e.target.value) : undefined }))}
              className={input}
              placeholder="e.g. 3"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Rules'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5L6 10.5L12 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved
              </span>
            )}
          </div>
        </form>
      </Card>

      {/* How it works */}
      <Card className="bg-zinc-900/50">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4">How Rules Work</h3>
        <div className="space-y-3">
          {[
            { icon: '01', text: 'Set your rules above and save them.' },
            { icon: '02', text: 'Run AI Analysis — it checks every trade against your rules.' },
            { icon: '03', text: 'See exactly what % of your losses happened when you broke a rule.' },
          ].map((item) => (
            <div key={item.icon} className="flex gap-3 items-start">
              <span className="text-xs font-mono text-zinc-700 mt-0.5 w-5 flex-shrink-0">{item.icon}</span>
              <p className="text-sm text-zinc-500">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
