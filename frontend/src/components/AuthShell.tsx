import { CalendarClock, Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FEATURED, featuredIsLive } from '../lib/featured';
import { formatMatchDate } from '../lib/format';
import { Logo, TeamCrest } from './ui';

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  aside,
  teaser = true,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: { headline: ReactNode; body: string };
  /** Show the featured fixture (e.g. the Final) while it is coming up. */
  teaser?: boolean;
}) {
  const showTeaser = teaser && featuredIsLive();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="floodlit relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="font-display text-2xl font-extrabold uppercase tracking-tight">Bachpan Cricket League</span>
        </Link>
        <div>
          <h2 className="display text-7xl">
            {aside?.headline ?? (
              <>
                Every run
                <br />
                <span className="text-lime">counts.</span>
              </>
            )}
          </h2>
          <p className="mt-4 max-w-sm text-slate-300">
            {aside?.body ?? 'Captain 2×, vice-captain 1.5×. Pick wisely, then watch the table move.'}
          </p>
          {showTeaser && <FeaturedTeaser className="mt-10 max-w-sm" />}
        </div>
        <p className="text-sm text-slate-500">Local cricket, now with a fantasy experience</p>
      </div>

      <div className="flex min-w-0 flex-col">
        {/* Phones get a compact brand band instead of the side panel. */}
        <div className="floodlit px-4 pb-10 pt-6 text-white lg:hidden">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="font-display text-xl font-extrabold uppercase tracking-tight">Bachpan Cricket League</span>
          </Link>
          {showTeaser ? (
            <FeaturedTeaser className="mt-6" />
          ) : (
            <p className="mt-6 font-display text-3xl font-extrabold uppercase leading-none">
              You play the match. <span className="text-lime">We make it a fantasy.</span>
            </p>
          )}
        </div>

        <div className="-mt-5 flex flex-1 flex-col rounded-t-3xl bg-canvas px-4 py-8 sm:px-8 lg:mt-0 lg:rounded-none">
          <div className="m-auto w-full max-w-sm animate-slide-up">
            <p className="eyebrow text-pitch-600">{eyebrow}</p>
            <h1 className="display mt-1 text-5xl text-ink">{title}</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturedTeaser({ className = '' }: { className?: string }) {
  const [teamA, teamB] = FEATURED.teams;
  return (
    <div className={`flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-inset ring-white/10 ${className}`}>
      <div className="flex -space-x-2">
        <TeamCrest name={teamA} size="md" />
        <TeamCrest name={teamB} size="md" />
      </div>
      <div className="min-w-0">
        <p className="eyebrow text-lime">{FEATURED.title}</p>
        <p className="truncate text-sm font-bold">
          {teamA} vs {teamB}
        </p>
        <p className="flex items-center gap-1 text-xs font-medium text-slate-400">
          <CalendarClock className="h-3 w-3" aria-hidden="true" />
          {formatMatchDate(FEATURED.startsAt)}
        </p>
      </div>
    </div>
  );
}

type FieldProps = { label: string; hint?: string; icon?: ReactNode; prefix?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'>;

export function Field({ label, hint, icon, prefix, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative flex items-center">
        {icon && <span className="pointer-events-none absolute left-3.5 text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
        {prefix && (
          <span className={`pointer-events-none absolute text-base font-semibold text-slate-500 sm:text-sm ${icon ? 'left-10' : 'left-4'}`}>{prefix}</span>
        )}
        <input className={`input ${icon && prefix ? 'pl-[4.75rem]' : icon ? 'pl-10' : prefix ? 'pl-12' : ''}`} {...props} />
      </span>
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function PasswordField({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="relative block">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input className="input pl-10 pr-12" type={visible ? 'text' : 'password'} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {hint && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
