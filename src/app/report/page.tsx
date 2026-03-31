'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function ReportPage() {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generateReport() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/report');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setReport(data.report);
    } catch {
      setError('Failed to generate report. Check your API key and make sure you have trades logged today.');
    }
    setLoading(false);
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Daily Report</h1>
          <p className="text-zinc-500 mt-1 text-sm">{today}</p>
        </div>
        <Button onClick={generateReport} disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Generating...
            </>
          ) : 'Generate Report'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <Card className="border-dashed border-zinc-700">
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg width="20" height="20" viewBox="0 0 15 15" fill="none">
                <rect x="2" y="1.5" width="11" height="12" rx="1.5" stroke="#52525b" strokeWidth="1.2"/>
                <path d="M5 5h5M5 8h5M5 11h3" stroke="#52525b" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-zinc-300 font-medium mb-1">No report yet</p>
            <p className="text-zinc-600 text-sm">Generate a report to see today&apos;s performance summary</p>
            <p className="text-zinc-700 text-xs mt-1">Based on trades logged today</p>
          </div>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <div className="text-center py-12">
            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="animate-spin w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
            <p className="text-zinc-400 text-sm font-medium">Generating your report</p>
            <p className="text-zinc-600 text-xs mt-1">Takes a few seconds</p>
          </div>
        </Card>
      )}

      {/* Report output */}
      {report && (
        <Card>
          <div className="flex items-center gap-2 mb-5 pb-5 border-b border-zinc-800">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                <path d="M3 7.5L6 10.5L12 4.5" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-zinc-300">Report generated</span>
            <span className="text-xs text-zinc-600 ml-auto">{today}</span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-zinc-400 leading-relaxed font-[inherit]">
            {report}
          </div>
        </Card>
      )}
    </div>
  );
}
