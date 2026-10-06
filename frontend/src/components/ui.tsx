import type { ReactNode } from 'react';
import { initials, teamColor } from '../lib/format';
import { teamLogo } from '../lib/teamLogos';

export function Logo({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#0b1220" />
      <circle cx="24" cy="24" r="13" fill="#d7263d" />
      <path
        d="M15.5 14.5c5 5.5 5 13.5 0 19M32.5 14.5c-5 5.5-5 13.5 0 19"
        fill="none"
        stroke="#fde8eb"
        strokeWidth="1.6"
        strokeDasharray="2.2 2"
        strokeLinecap="round"
      />
      <circle cx="36" cy="12" r="3" fill="#c6f432" />
    </svg>
  );
}

const SIZES = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

/** Team crest: the team's logo when we have one, otherwise a coloured monogram derived from the team name. */
export function TeamCrest({ name, size = 'md', ring = false }: { name: string; size?: keyof typeof SIZES; ring?: boolean }) {
  const logo = teamLogo(name);
  if (logo) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden ${size === 'xs' ? 'rounded-md' : 'rounded-xl'} shadow-sm ring-1 ring-inset ring-slate-900/10 ${SIZES[size]} ${ring ? 'ring-4 ring-white/10' : ''}`}
        style={{ backgroundColor: logo.bg }}
        title={name}
        aria-hidden="true"
      >
        <img src={logo.src} alt="" className="h-full w-full object-contain" loading="lazy" decoding="async" />
      </span>
    );
  }
  const { bg, fg } = teamColor(name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-extrabold tracking-wide ${SIZES[size]} ${
        ring ? 'ring-4 ring-white/10' : ''
      }`}
      style={{ backgroundColor: bg, color: fg }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function Avatar({ name, className = 'h-9 w-9 text-sm' }: { name: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-lime font-bold text-ink ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-1 text-pitch-600">{eyebrow}</p>}
        <h1 className="display text-4xl text-ink sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pitch-50 text-pitch-600">{icon}</div>
      <p className="text-base font-bold text-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="display text-2xl text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function RankBadge({ rank }: { rank: number }) {
  const style =
    rank === 1
      ? 'bg-gold text-ink'
      : rank === 2
        ? 'bg-slate-300 text-ink'
        : rank === 3
          ? 'bg-[#d08b52] text-white'
          : 'bg-slate-100 text-slate-500';
  return (
    <span className={`tabular inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-base font-extrabold ${style}`}>
      {rank}
    </span>
  );
}
