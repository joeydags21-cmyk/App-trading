'use client';

import { useState, useEffect } from 'react';
import { AIAnalysis } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import InsightCard from '@/components/analysis/InsightCard';
import Paywall from '@/components/Paywall';

export default function AnalysisPage() {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isPro, setIsPro] = useState<boolean | null>(null); // null = loading

  // Check subscription status on mount so paywall shows immediately
  useEffect(() => {
    fetch('/api/subscription')
      .then((r) => r.json())
      .then((d) => setIsPro(d?.isPro === true))
      .catch(() => setIsPro(false));
  }, []);

  async function runAnalysis() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analysis');
      const data = await res.json();

      if (res.status === 403) {
        setIsPro(false);
        setLoading(false);
        return;
      }

      if (data?.error === 'not_enough_trades') {
        setError(data.message);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Analysis failed. Please try again.');
      }

      setAnalysis(data);
    } catch (err: any) {
      setError(err?.message || 'Analysis failed. Make sure you have at least 3 trades and your API key is configured.');
    }
    setLoading(false);
  }

  // Still checking subscription
  if (isPro === null) {
    return (
      <div className="flex items-center gap-2 text-zinc-600 text-sm pt-8">
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading...
      </div>
    );
  }

  if (!isPro) return <Paywall />;

  const winProb = analysis?.nextTradePrediction.winProbability ?? 0;
  const winColor = winProb >= 60 ? 'bg-emerald-500' : winProb >= 45 ? 'bg-amber-400' : 'bg-red-500';
  const winTextColor = winProb >= 60 ? 'text-emerald-400' : winProb >= 45 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">AI Analysis</h1>
          <p className="text-zinc-500 mt-1 text-sm">Scans all your trades and finds the habits costing you money</p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="sm:flex-shrink-0">
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Analyzing...
            </>
          ) : 'Run Analysis'}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4">
          <p className="text-red-400 text-sm font-medium mb-0.5">Analysis failed</p>
          <p className="text-red-400/70 text-sm">{error}</p>
        </div>
      )}

      {/* Empty state — explain what each section does BEFORE running */}
      {!analysis && !loading && !error && (
        <div className="space-y-4">
          <Card className="border-dashed border-zinc-700">
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg width="22" height="22" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="#52525b" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="text-zinc-300 font-medium mb-1">No analysis run yet</p>
              <p className="text-zinc-500 text-sm">Click &ldquo;Run Analysis&rdquo; above — it takes about 5 seconds</p>
              <p className="text-zinc-600 text-xs mt-1">Works best with 10+ trades. More trades = better insights.</p>
            </div>
          </Card>

          {/* Preview of what you'll get */}
          <p className="text-xs font-medium text-zinc-600 uppercase tracking-wider px-1">What you&apos;ll see after running</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: 'Behavioral Insights',
                desc: 'Plain-English findings like "You lose 73% of trades before 10 AM" or "You overtrade after a loss."',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
              {
                title: 'Next Trade Odds',
                desc: 'Based on your recent performance, how likely is your next trade to be a win? Includes warnings for revenge trading.',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
              {
                title: 'Rules Compliance',
                desc: 'If you&apos;ve set rules (e.g. max 5 trades/day), this shows how often you broke them and how that affected P&L.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
            ].map((item) => (
              <Card key={item.title}>
                <div className={`w-7 h-7 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                    <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className={item.color}/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-zinc-200 mb-1.5">{item.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
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
            <p className="text-zinc-400 text-sm font-medium">Analyzing your trade history</p>
            <p className="text-zinc-600 text-xs mt-1">Reading patterns across all your trades...</p>
          </div>
        </Card>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Insights */}
          <Card>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-zinc-200">Behavioral Insights</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Patterns the AI found in your trades. These are observations, not predictions — use them to reflect on your habits.
              </p>
            </div>
            <div>
              {analysis.insights.map((insight, i) => (
                <InsightCard key={i} insight={insight} />
              ))}
            </div>
          </Card>

          {/* Next trade prediction */}
          <Card>
            <div className="mb-5">
              <h2 className="text-sm font-semibold text-zinc-200">Next Trade Probability</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Based on your recent trading patterns — <strong className="text-zinc-400">not a prediction of the future.</strong> Think of it as a gut-check based on your history.
              </p>
            </div>

            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${winColor}`}
                  style={{ width: `${winProb}%` }}
                />
              </div>
              <span className={`text-lg font-bold w-20 text-right ${winTextColor}`}>
                {winProb}% win
              </span>
            </div>
            <p className="text-xs text-zinc-600 mb-5">Estimated win likelihood based on your recent performance</p>

            <p className="text-sm text-zinc-400 leading-relaxed mb-5">{analysis.nextTradePrediction.summary}</p>

            {analysis.nextTradePrediction.warnings.length > 0 && (
              <div className="space-y-2.5 border-t border-zinc-800 pt-4">
                <p className="text-xs font-medium text-zinc-500 mb-2">Risk warnings</p>
                {analysis.nextTradePrediction.warnings.map((w, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                        <path d="M7.5 2L13.5 12.5H1.5L7.5 2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                        <path d="M7.5 6v3M7.5 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <p className="text-sm text-zinc-400">{w}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Rules analysis */}
          {(analysis.rulesAnalysis.violations.length > 0 || analysis.rulesAnalysis.correlations.length > 0) && (
            <Card>
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-zinc-200">Rules Compliance</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  How often you broke the rules you set — and whether those rule breaks are connected to your losses.
                </p>
              </div>
              <div className="space-y-3">
                {analysis.rulesAnalysis.violations.map((v, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                    <span className="text-red-400 flex-shrink-0 mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                        <path d="M3 3l9 9M12 3l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </span>
                    <p className="text-sm text-zinc-400">{v}</p>
                  </div>
                ))}
                {analysis.rulesAnalysis.correlations.map((c, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                    <span className="text-blue-400 flex-shrink-0 mt-0.5">
                      <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                        <path d="M2 7.5h11M9.5 4l3.5 3.5L9.5 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    <p className="text-sm text-zinc-400">{c}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
