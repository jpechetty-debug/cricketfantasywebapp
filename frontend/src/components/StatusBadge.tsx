import { Lock, Trophy } from 'lucide-react';
import type { MatchStatus } from '../types';

const styles: Record<MatchStatus, string> = {
  open: 'bg-pitch-50 text-pitch-700 ring-pitch-200',
  locked: 'bg-gold-soft text-amber-800 ring-amber-200',
  closed: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const darkStyles: Record<MatchStatus, string> = {
  open: 'bg-lime/15 text-lime ring-lime/30',
  locked: 'bg-gold/15 text-gold ring-gold/30',
  closed: 'bg-white/10 text-slate-300 ring-white/15',
};

const labels: Record<MatchStatus, string> = { open: 'Open', locked: 'Locked', closed: 'Completed' };

export default function StatusBadge({ status, dark = false }: { status: MatchStatus; dark?: boolean }) {
  return (
    <span className={`chip shrink-0 ring-1 ring-inset ${(dark ? darkStyles : styles)[status]}`}>
      {status === 'open' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {status === 'locked' && <Lock className="h-3 w-3" aria-hidden="true" />}
      {status === 'closed' && <Trophy className="h-3 w-3" aria-hidden="true" />}
      {labels[status]}
    </span>
  );
}
