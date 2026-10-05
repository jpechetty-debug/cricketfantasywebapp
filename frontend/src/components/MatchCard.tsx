import { ArrowRight, CalendarClock, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNow } from '../hooks/useNow';
import { formatCountdown, formatMatchDate, formatPoints, isMatchEditable } from '../lib/format';
import type { Match } from '../types';
import StatusBadge from './StatusBadge';
import { TeamCrest } from './ui';

interface Props {
  match: Match;
  to?: string;
  /** The user's team points for this match, if they have a team. */
  myPoints?: number | null;
  featured?: boolean;
}

export default function MatchCard({ match, to, myPoints, featured = false }: Props) {
  const now = useNow();
  const editable = isMatchEditable(match, now);
  const startsIn = new Date(match.match_date).getTime() - now;
  const hasTeam = myPoints !== undefined && myPoints !== null;

  const cta = editable ? (hasTeam ? 'Edit team' : 'Create team') : hasTeam ? 'View team' : 'View match';

  return (
    <Link
      to={to || `/match/${match.id}`}
      className={`group block overflow-hidden rounded-2xl border transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${
        featured ? 'floodlit border-ink text-white shadow-lift' : 'border-slate-200/80 bg-white shadow-card hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p className={`truncate text-sm font-bold ${featured ? 'text-slate-300' : 'text-slate-500'}`}>{match.match_name}</p>
        <StatusBadge status={match.status} dark={featured} />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-5">
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamCrest name={match.team_a} size={featured ? 'lg' : 'md'} ring={featured} />
          <span className={`w-full truncate font-display text-lg font-bold uppercase ${featured ? 'text-white' : 'text-ink'}`}>{match.team_a}</span>
        </div>
        <span className={`font-display text-sm font-extrabold uppercase ${featured ? 'text-lime' : 'text-slate-400'}`}>vs</span>
        <div className="flex min-w-0 flex-col items-center gap-2 text-center">
          <TeamCrest name={match.team_b} size={featured ? 'lg' : 'md'} ring={featured} />
          <span className={`w-full truncate font-display text-lg font-bold uppercase ${featured ? 'text-white' : 'text-ink'}`}>{match.team_b}</span>
        </div>
      </div>

      <div
        className={`flex items-center justify-between gap-3 border-t px-5 py-3 text-xs font-semibold ${
          featured ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-500'
        }`}
      >
        {editable ? (
          <span className={`flex items-center gap-1.5 ${featured ? 'text-lime' : 'text-pitch-700'}`}>
            <Timer className="h-3.5 w-3.5" aria-hidden="true" />
            Locks in {formatCountdown(startsIn)}
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            {formatMatchDate(match.match_date)}
          </span>
        )}
        {hasTeam && !editable ? (
          <span className={`tabular font-display text-base font-extrabold ${featured ? 'text-lime' : 'text-pitch-700'}`}>
            {formatPoints(myPoints)} pts
          </span>
        ) : (
          <span className={`flex items-center gap-1 font-bold ${featured ? 'text-white' : 'text-ink'}`}>
            {cta}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        )}
      </div>
    </Link>
  );
}
