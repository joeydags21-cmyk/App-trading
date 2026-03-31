'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

interface EquityCurveProps {
  data: { date: string; equity: number }[];
}

export default function EquityCurve({ data }: EquityCurveProps) {
  if (data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-zinc-700 text-sm">
        No data yet
      </div>
    );
  }

  const lastEquity = data[data.length - 1]?.equity ?? 0;
  const isPositive = lastEquity >= 0;

  const lineColor = isPositive ? '#34d399' : '#f87171';
  const fillColor = isPositive ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)';

  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        data: data.map((d) => d.equity),
        borderColor: lineColor,
        backgroundColor: fillColor,
        borderWidth: 1.5,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: lineColor,
        pointHoverBorderColor: '#18181b',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#18181b',
        borderColor: '#27272a',
        borderWidth: 1,
        titleColor: '#a1a1aa',
        bodyColor: '#f4f4f5',
        titleFont: { size: 11, family: 'Inter' },
        bodyFont: { size: 12, family: 'Inter', weight: '600' as const },
        padding: 10,
        callbacks: {
          label: (ctx: any) => `  $${ctx.raw.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: { display: false },
      },
      y: {
        grid: {
          color: 'rgba(255,255,255,0.04)',
          drawBorder: false,
        },
        border: { display: false },
        ticks: {
          color: '#52525b',
          font: { size: 11, family: 'Inter' },
          callback: (v: any) => `$${Number(v).toLocaleString()}`,
          maxTicksLimit: 5,
        },
      },
    },
  };

  return (
    <div className="h-52">
      <Line data={chartData} options={options as any} />
    </div>
  );
}
