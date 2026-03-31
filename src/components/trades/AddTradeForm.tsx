'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface AddTradeFormProps {
  onAdd: (trade: any) => Promise<void>;
}

export default function AddTradeForm({ onAdd }: AddTradeFormProps) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    direction: 'long',
    pnl: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!form.date) { setError('Date is required.'); return; }
    if (!form.symbol.trim()) { setError('Symbol is required (e.g. ES, NQ, CL).'); return; }
    if (form.pnl === '' || isNaN(parseFloat(form.pnl))) {
      setError('P&L must be a valid number (e.g. 250 or -150).'); return;
    }

    setLoading(true);
    try {
      await onAdd({
        date: form.date,
        symbol: form.symbol.trim().toUpperCase(),
        direction: form.direction as 'long' | 'short',
        pnl: parseFloat(form.pnl),
        notes: form.notes.trim() || null,
      });

      console.log('[AddTradeForm] Trade submitted successfully');
      setSuccess(true);
      setForm({
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        direction: 'long',
        pnl: '',
        notes: '',
      });
    } catch (err: any) {
      console.error('[AddTradeForm] Trade submission failed:', err);
      setError(err?.message || 'Failed to add trade. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const input = 'w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-all';
  const label = 'block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
      {/* Error banner */}
      {error && (
        <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm font-medium">Error</p>
          <p className="text-red-400/80 text-sm mt-0.5">{error}</p>
        </div>
      )}

      {/* Success banner */}
      {success && (
        <div className="col-span-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">
          <p className="text-emerald-400 text-sm font-medium">Trade added successfully</p>
        </div>
      )}

      <div>
        <label className={label}>Date</label>
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => set('date', e.target.value)}
          className={input}
        />
      </div>
      <div>
        <label className={label}>Symbol</label>
        <input
          type="text"
          required
          value={form.symbol}
          onChange={(e) => set('symbol', e.target.value)}
          className={input}
          placeholder="ES, NQ, CL..."
        />
      </div>
      <div>
        <label className={label}>Direction</label>
        <select
          value={form.direction}
          onChange={(e) => set('direction', e.target.value)}
          className={input}
        >
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div>
        <label className={label}>P&amp;L ($)</label>
        <input
          type="number"
          required
          step="0.01"
          value={form.pnl}
          onChange={(e) => set('pnl', e.target.value)}
          className={input}
          placeholder="-250.00"
        />
      </div>
      <div className="col-span-2">
        <label className={label}>Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className={`${input} h-20 resize-none`}
          placeholder="What happened? FOMO? Followed your plan?"
        />
      </div>
      <div className="col-span-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Adding...
            </>
          ) : 'Add Trade'}
        </Button>
      </div>
    </form>
  );
}
