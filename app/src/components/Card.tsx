import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  children,
  tone = 'paper',
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  tone?: 'paper' | 'ink' | 'sea' | 'sand';
  className?: string;
}) {
  const toneCls = {
    paper: 'bg-white text-ink',
    ink:   'bg-ink text-paper',
    sea:   'bg-sea text-paper',
    sand:  'bg-sand text-ink',
  }[tone];
  return (
    <section className={`rounded-2xl ${toneCls} shadow-card p-4 ${className}`}>
      {title && <h2 className="text-base font-semibold leading-tight">{title}</h2>}
      {subtitle && <p className="mt-0.5 text-xs opacity-80">{subtitle}</p>}
      {children && <div className={title ? 'mt-3' : ''}>{children}</div>}
    </section>
  );
}

export function StatBig({
  value,
  label,
  hint,
  accent = 'ink',
}: {
  value: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  accent?: 'ink' | 'sea' | 'amber' | 'rust' | 'sage';
}) {
  const accentCls = {
    ink:   'text-ink',
    sea:   'text-sea',
    amber: 'text-amber',
    rust:  'text-rust',
    sage:  'text-sage',
  }[accent];
  return (
    <div className="flex flex-col">
      <div className={`text-3xl font-bold tracking-tight ${accentCls}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
