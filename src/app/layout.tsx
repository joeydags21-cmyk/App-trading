import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Futures Edge AI',
  description: 'Trade Journal + Mistake Detector for Futures Traders',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
