interface BadgeProps {
  type: 'warning' | 'info' | 'critical' | 'success';
  children: React.ReactNode;
}

export function Badge({ type, children }: BadgeProps) {
  const styles = {
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    info: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    critical: 'bg-red-500/10 text-red-400 border border-red-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  };
  const labels = {
    warning: 'Warning',
    info: 'Info',
    critical: 'Critical',
    success: 'Good',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium tracking-wide ${styles[type]}`}>
      {labels[type]}
    </span>
  );
}
