'use client';

import { useState, useRef } from 'react';
import { parseTradeCSV } from '@/lib/csv-parser';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import TradeTable from '@/components/trades/TradeTable';
import { Trade } from '@/types';
import { useRouter } from 'next/navigation';

const BROKER_STEPS = [
  {
    name: 'Tradovate',
    steps: 'Go to Reports → Trade History → Export → CSV',
  },
  {
    name: 'NinjaTrader',
    steps: 'Control Center → Account Performance → Export → Trade List',
  },
  {
    name: 'Topstep / other',
    steps: 'Look for "Trade History", "Performance Report", or "Export" in your account dashboard',
  },
];

export default function ImportPage() {
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showBrokerHelp, setShowBrokerHelp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const parsed = await parseTradeCSV(file);
      setPreview(parsed);
    } catch {
      alert('Could not read this file. Make sure it is a .csv file exported from your broker.');
    }
    setLoading(false);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setImporting(true);
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preview),
    });
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push('/trades'), 1500);
    } else {
      alert('Import failed. Please try again.');
    }
    setImporting(false);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Import Trades</h1>
        <p className="text-zinc-500 mt-1 text-sm">Upload your trade history from your broker as a CSV file</p>
      </div>

      {/* What is a CSV? */}
      <Card className="bg-zinc-900/50 border-zinc-700/50">
        <div className="flex gap-3 items-start">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <circle cx="7.5" cy="7.5" r="5.5" stroke="#60a5fa" strokeWidth="1.3"/>
              <path d="M7.5 7v3.5M7.5 5v.5" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-zinc-300 mb-1">What is a CSV file?</p>
            <p className="text-sm text-zinc-500 leading-relaxed">
              A CSV is a spreadsheet-style file your broker lets you export. It contains your trade history — dates, prices, profits, etc. You don&apos;t need to edit it, just download and upload it here.
            </p>
            <button
              onClick={() => setShowBrokerHelp(!showBrokerHelp)}
              className="text-blue-400 text-xs mt-2 hover:text-blue-300 transition-colors"
            >
              {showBrokerHelp ? 'Hide broker instructions ↑' : 'How do I export from my broker? ↓'}
            </button>
            {showBrokerHelp && (
              <div className="mt-3 space-y-2.5">
                {BROKER_STEPS.map((b) => (
                  <div key={b.name} className="flex gap-2.5 items-start">
                    <span className="text-xs font-semibold text-zinc-400 w-24 flex-shrink-0 mt-0.5">{b.name}</span>
                    <span className="text-xs text-zinc-500">{b.steps}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Upload area */}
      <Card>
        <h2 className="text-sm font-semibold text-zinc-200 mb-1">Upload your CSV</h2>
        <p className="text-xs text-zinc-500 mb-4">
          The importer automatically reads common column names from Tradovate, NinjaTrader, and other platforms.
        </p>
        <div
          className="border-2 border-dashed border-zinc-700 rounded-xl p-10 text-center cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/30 transition-all duration-150"
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5v9M4.5 7.5l3-3 3 3" stroke="#71717a" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12.5h11" stroke="#71717a" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="text-zinc-300 text-sm font-medium">Click to choose a file</p>
          <p className="text-zinc-600 text-xs mt-1">.csv files only</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
        {loading && <p className="text-zinc-500 text-xs mt-3 text-center">Reading file...</p>}
      </Card>

      {/* CSV format reference (collapsed by default, just a detail) */}
      <details className="group">
        <summary className="text-xs text-zinc-600 hover:text-zinc-400 cursor-pointer select-none transition-colors">
          Show expected CSV column format
        </summary>
        <div className="mt-3 bg-zinc-950 rounded-lg p-4 border border-zinc-800 overflow-x-auto">
          <pre className="font-mono text-xs text-zinc-400 leading-relaxed whitespace-pre">{`Date,Symbol,Direction,PnL,Notes
2024-01-15,ES,long,612.50,Good momentum trade
2024-01-15,NQ,short,400.00,
2024-01-16,CL,long,-360.00,Stopped out`}</pre>
        </div>
        <p className="text-xs text-zinc-600 mt-2">Column names are flexible — the importer recognises common variations.</p>
      </details>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-sm font-semibold text-zinc-200">Preview</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {preview.length} trades detected — review before importing
              </p>
            </div>
            {success ? (
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                  <path d="M3 7.5L6 10.5L12 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Imported! Redirecting...
              </div>
            ) : (
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${preview.length} trades`}
              </Button>
            )}
          </div>
          <TradeTable trades={preview.map((t, i) => ({ ...t, id: String(i), user_id: '', created_at: '' } as Trade))} />
        </Card>
      )}
    </div>
  );
}
