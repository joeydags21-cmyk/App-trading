import { AIInsight } from '@/types';

const icons = {
  critical: (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2L13.5 12.5H1.5L7.5 2Z" stroke="#f87171" strokeWidth="1.3" strokeLinejoin="round"/>
      <path d="M7.5 6v3M7.5 10.5v.5" stroke="#f87171" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="#fbbf24" strokeWidth="1.3"/>
      <path d="M7.5 4.5v3.5M7.5 9.5v.5" stroke="#fbbf24" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="#60a5fa" strokeWidth="1.3"/>
      <path d="M7.5 7v3.5M7.5 5v.5" stroke="#60a5fa" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
};

const badgeStyles = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

const iconBg = {
  critical: 'bg-red-500/10',
  warning: 'bg-amber-500/10',
  info: 'bg-blue-500/10',
};

export default function InsightCard({ insight }: { insight: AIInsight }) {
  return (
    <div className="flex gap-4 py-5 border-b border-zinc-800/50 last:border-0">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg[insight.type]}`}>
        {icons[insight.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${badgeStyles[insight.type]}`}>
            {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
          </span>
          <span className="font-medium text-sm text-zinc-200">{insight.title}</span>
        </div>
        <p className="text-sm text-zinc-500 leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}
