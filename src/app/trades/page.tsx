'use client';

import { useEffect, useState } from 'react';
import { Trade } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TradeTable from '@/components/trades/TradeTable';
import AddTradeForm from '@/components/trades/AddTradeForm';
import Link from 'next/link';

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch('/api/trades')
      .then((r) => r.json())
      .then((data) => setTrades(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(trade: any) {
    const res = await fetch('/api/trades', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(trade) });
    const [newTrade] = await res.json();
    setTrades((t) => [newTrade, ...t]);
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await fetch('/api/trades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setTrades((t) => t.filter((tr) => tr.id !== id));
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Trades</h1>
          <p className="text-zinc-500 mt-1 text-sm">{trades.length} trades recorded</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/trades/import"
            className="bg-zinc-800 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 border border-zinc-700 transition-all"
          >
            Import CSV
          </Link>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'}>
            {showForm ? 'Cancel' : '+ Add Trade'}
          </Button>
        </div>
      </div>

      {/* Add trade form */}
      {showForm && (
        <Card>
          <h2 className="text-sm font-semibold text-zinc-200 mb-5">New Trade</h2>
          <AddTradeForm onAdd={handleAdd} />
        </Card>
      )}

      {/* Trades table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-zinc-600 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading trades...
          </div>
        ) : (
          <TradeTable trades={trades} onDelete={handleDelete} />
        )}
      </Card>
    </div>
  );
}
