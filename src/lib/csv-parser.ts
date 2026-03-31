import Papa from 'papaparse';

export interface ParsedTrade {
  date: string;
  symbol: string;
  direction: 'long' | 'short';
  entry_price: number | null;
  exit_price: number | null;
  pnl: number;
  notes: string | null;
}

export function parseTradeCSV(file: File): Promise<ParsedTrade[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const trades: ParsedTrade[] = (results.data as any[]).map((row: any) => {
            const rawDirection = (
              row['Direction'] || row['direction'] || row['Side'] || row['side'] || 'long'
            ).toLowerCase();

            const rawEntry = row['Entry Price'] || row['entry_price'] || row['EntryPrice'] || row['Entry'] || '';
            const rawExit = row['Exit Price'] || row['exit_price'] || row['ExitPrice'] || row['Exit'] || '';

            return {
              date: row['Date'] || row['date'] || '',
              symbol: (
                row['Symbol'] || row['symbol'] || row['Ticker'] || row['ticker'] || ''
              ).trim().toUpperCase(),
              direction: (rawDirection === 'short' ? 'short' : 'long') as 'long' | 'short',
              entry_price: rawEntry !== '' && !isNaN(parseFloat(rawEntry)) ? parseFloat(rawEntry) : null,
              exit_price: rawExit !== '' && !isNaN(parseFloat(rawExit)) ? parseFloat(rawExit) : null,
              pnl: parseFloat(row['PnL'] || row['pnl'] || row['P&L'] || row['Profit'] || row['profit'] || '0'),
              notes: row['Notes'] || row['notes'] || null,
            };
          });
          resolve(trades);
        } catch (err) {
          reject(err);
        }
      },
      error: reject,
    });
  });
}
