import Papa from 'papaparse';
import { Trade } from '@/types';

export interface ParsedTrade {
  date: string;
  ticker: string;
  direction: 'long' | 'short';
  entry_price: number;
  exit_price: number;
  position_size: number;
  pnl: number;
  time_of_day: string | null;
  notes: string | null;
}

export function parseTradeCSV(file: File): Promise<ParsedTrade[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const trades: ParsedTrade[] = (results.data as any[]).map((row: any) => ({
            date: row['Date'] || row['date'] || '',
            ticker: (row['Ticker'] || row['ticker'] || row['Symbol'] || row['symbol'] || '').toUpperCase(),
            direction: ((row['Direction'] || row['direction'] || row['Side'] || row['side'] || 'long').toLowerCase()) as 'long' | 'short',
            entry_price: parseFloat(row['Entry Price'] || row['entry_price'] || row['EntryPrice'] || '0'),
            exit_price: parseFloat(row['Exit Price'] || row['exit_price'] || row['ExitPrice'] || '0'),
            position_size: parseFloat(row['Position Size'] || row['position_size'] || row['Qty'] || row['qty'] || '1'),
            pnl: parseFloat(row['PnL'] || row['pnl'] || row['P&L'] || row['Profit'] || '0'),
            time_of_day: row['Time'] || row['time_of_day'] || null,
            notes: row['Notes'] || row['notes'] || null,
          }));
          resolve(trades);
        } catch (err) {
          reject(err);
        }
      },
      error: reject,
    });
  });
}
