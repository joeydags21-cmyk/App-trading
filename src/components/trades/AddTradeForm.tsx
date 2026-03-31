'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface AddTradeFormProps {
  onAdd: (trade: any) => Promise<void>;
}

export default function AddTradeForm({ onAdd }: AddTradeFormProps) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: 'ES',
    direction: 'long',
    entry_price: '',
    exit_price: '',
    position_size: '1',
    pnl: '',
    time_of_day: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await onAdd({
      date: form.date,
      ticker: form.ticker.toUpperCase(),
      direction: form.direction,
      entry_price: parseFloat(form.entry_price),
      exit_price: parseFloat(form.exit_price),
      position_size: parseFloat(form.position_size),
      pnl: parseFloat(form.pnl),
      time_of_day: form.time_of_day || null,
      notes: form.notes || null,
    });
    setForm({ date: new Date().toISOString().split('T')[0], ticker: 'ES', direction: 'long', entry_price: '', exit_price: '', position_size: '1', pnl: '', time_of_day: '', notes: '' });
    setLoading(false);
  }

  const input = 'w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-500 transition-all';
  const label = 'block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
      <div>
        <label className={label}>Date</label>
        <input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} className={input} />
      </div>
      <div>
        <label className={label}>Ticker</label>
        <input type="text" required value={form.ticker} onChange={(e) => set('ticker', e.target.value)} className={input} placeholder="ES, NQ, CL..." />
      </div>
      <div>
        <label className={label}>Direction</label>
        <select value={form.direction} onChange={(e) => set('direction', e.target.value)} className={input}>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div>
        <label className={label}>Position Size</label>
        <input type="number" required step="0.01" value={form.position_size} onChange={(e) => set('position_size', e.target.value)} className={input} />
      </div>
      <div>
        <label className={label}>Entry Price</label>
        <input type="number" required step="0.01" value={form.entry_price} onChange={(e) => set('entry_price', e.target.value)} className={input} placeholder="4800.25" />
      </div>
      <div>
        <label className={label}>Exit Price</label>
        <input type="number" required step="0.01" value={form.exit_price} onChange={(e) => set('exit_price', e.target.value)} className={input} placeholder="4815.50" />
      </div>
      <div>
        <label className={label}>P&L ($)</label>
        <input type="number" required step="0.01" value={form.pnl} onChange={(e) => set('pnl', e.target.value)} className={input} placeholder="-250.00" />
      </div>
      <div>
        <label className={label}>Time of Day</label>
        <input type="time" value={form.time_of_day} onChange={(e) => set('time_of_day', e.target.value)} className={input} />
      </div>
      <div className="col-span-2">
        <label className={label}>Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          className={`${input} h-20 resize-none`}
          placeholder="What happened on this trade? FOMO? Followed your plan?"
        />
      </div>
      <div className="col-span-2 pt-1">
        <Button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Trade'}
        </Button>
      </div>
    </form>
  );
}
