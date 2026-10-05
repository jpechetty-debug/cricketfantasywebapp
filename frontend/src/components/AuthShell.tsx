import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from './ui';

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  aside,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  aside?: { headline: ReactNode; body: string };
}) {
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
        </div>
        <p className="text-sm text-slate-500">Local cricket fantasy league</p>
      </div>

      <div className="flex flex-col px-4 py-8 sm:px-8">
        <Link to="/" className="mb-10 flex items-center gap-3 lg:hidden">
          <Logo className="h-9 w-9" />
          <span className="font-display text-xl font-extrabold uppercase tracking-tight">Bachpan Cricket League</span>
        </Link>
        <div className="m-auto w-full max-w-sm animate-slide-up">
          <p className="eyebrow text-pitch-600">{eyebrow}</p>
          <h1 className="display mt-1 text-5xl text-ink">{title}</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function Field({ label, hint, ...props }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
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
        <input className="input pr-12" type={visible ? 'text' : 'password'} {...props} />
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
