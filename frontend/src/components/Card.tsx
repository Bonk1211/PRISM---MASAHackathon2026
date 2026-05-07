import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  eyebrow,
  children,
  tone = 'paper',
  className = '',
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
  tone?: 'paper' | 'ink' | 'sea' | 'sand' | 'plate';
  className?: string;
}) {
  const toneCls = {
    paper: 'bg-paper text-ink border border-rule',
    ink:   'bg-ink text-paper border border-ink',
    sea:   'bg-sea text-paper border border-sea',
    sand:  'bg-sand text-ink border border-rule',
    plate: 'bg-paper text-ink border border-rule shadow-plate',
  }[tone];
  return (
    <section className={`relative ${toneCls} px-5 py-5 ${className}`}>
      {eyebrow && (
        <p className={`eyebrow ${tone === 'ink' || tone === 'sea' ? 'text-paper/70' : 'text-muted'}`}>
          {eyebrow}
        </p>
      )}
      {title && (
        <h2
          className={[
            'text-[15px] font-semibold leading-tight',
            eyebrow ? 'mt-2' : '',
          ].join(' ')}
        >
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={['mt-1 text-[12px] leading-snug', tone === 'ink' || tone === 'sea' ? 'text-paper/75' : 'text-muted'].join(' ')}>
          {subtitle}
        </p>
      )}
      {children && <div className={title || subtitle || eyebrow ? 'mt-4' : ''}>{children}</div>}
    </section>
  );
}

export function StatBig({
  value,
  label,
  hint,
  accent = 'ink',
  size = 'md',
  align = 'left',
  onClick,
}: {
  value: ReactNode;
  label: ReactNode;
  hint?: ReactNode;
  accent?: 'ink' | 'sea' | 'amber' | 'rust' | 'sage' | 'paper';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  align?: 'left' | 'right';
  onClick?: () => void;
}) {
  const accentCls = {
    ink:   'text-ink',
    sea:   'text-sea',
    amber: 'text-amber',
    rust:  'text-rust',
    sage:  'text-sage',
    paper: 'text-paper',
  }[accent];
  const sizeCls = {
    sm:   'text-2xl',
    md:   'text-[34px]',
    lg:   'text-[44px]',
    hero: 'text-[64px]',
  }[size];
  return (
    <div
      onClick={onClick}
      className={['flex flex-col', align === 'right' ? 'items-end' : 'items-start', onClick ? 'evidence-tap' : ''].join(' ')}
    >
      <div className={`display tab-num ${sizeCls} ${accentCls}`}>{value}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-eyebrow text-muted">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

export function Hairline({ className = '', strong = false }: { className?: string; strong?: boolean }) {
  return <hr className={`border-0 ${strong ? 'hairline-strong' : 'hairline'} ${className}`} />;
}

export function Eyebrow({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ink' | 'paper' }) {
  const cls = { muted: 'text-muted', ink: 'text-ink', paper: 'text-paper/70' }[tone];
  return <p className={`eyebrow ${cls}`}>{children}</p>;
}
