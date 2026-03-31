'use client';

import { Trade } from '@/types';

interface TradeTableProps {
  trades: Trade[];
  onDelete?: (id: string) => void;
}

export default function TradeTable({ trades, onDelete }: TradeTableProps) {
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (safeTrades.length === 0) {
    return (
      <div className="text-center py-14 text-zinc-600 text-sm">
        No trades yet. Add your first trade or import a CSV.
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: card list ──────────────────────────────── */}
      <div className="md:hidden space-y-3">
        {safeTrades.map((trade) => (
          <div key={trade.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-100 text-base">{trade.symbol}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                  trade.direction === 'long'
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>
                  {trade.direction === 'long' ? '↑ Long' : '↓ Short'}
                </span>
              </div>
              <span className={`text-base font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span>{trade.date}</span>
              {trade.entry_price != null && (
                <span>Entry {trade.entry_price.toLocaleString()}</span>
              )}
              {trade.exit_price != null && (
                <span>Exit {trade.exit_price.toLocaleString()}</span>
              )}
            </div>
            {trade.notes && (
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed line-clamp-2">{trade.notes}</p>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(trade.id)}
                className="mt-3 text-xs text-zinc-600 hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop: table ─────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800">
              {['Date', 'Symbol', 'Direction', 'Entry', 'Exit', 'P&L', ''].map((h) => (
                <th key={h} className="text-left py-3 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {safeTrades.map((trade) => (
              <tr key={trade.id} className="hover:bg-zinc-800/30 transition-colors group">
                <td className="py-3.5 px-3 text-zinc-400 font-mono text-xs">{trade.date}</td>
                <td className="py-3.5 px-3 font-semibold text-zinc-200 tracking-wide">{trade.symbol}</td>
                <td className="py-3.5 px-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                    trade.direction === 'long'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                  }`}>
                    {trade.direction === 'long' ? '↑ Long' : '↓ Short'}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-zinc-400 font-mono text-xs">
                  {trade.entry_price != null ? trade.entry_price.toLocaleString() : '—'}
                </td>
                <td className="py-3.5 px-3 text-zinc-400 font-mono text-xs">
                  {trade.exit_price != null ? trade.exit_price.toLocaleString() : '—'}
                </td>
                <td className={`py-3.5 px-3 font-semibold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trade.pnl >= 0 ? '+' : '-'}${Math.abs(trade.pnl).toFixed(2)}
                </td>
                <td className="py-3.5 px-3">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(trade.id)}
                      className="text-zinc-700 hover:text-red-400 text-xs transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
