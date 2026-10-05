import { ArrowRight, Shield } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, PageHeader, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatMatchDate, formatPoints, isMatchEditable } from '../lib/format';
import { apiError, matchApi, teamApi } from '../services/api';
import type { FantasyTeam, Match } from '../types';

export default function MyTeamsPage() {
  const { notify } = useToast();
  const [teams, setTeams] = useState<FantasyTeam[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([teamApi.mine(), matchApi.list()])
      .then(([t, m]) => {
        setTeams(t);
        setMatches(m);
      })
      .catch((err) => notify(apiError(err, 'Could not load teams'), 'error'))
      .finally(() => setLoading(false));
  }, [notify]);

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);
  const total = teams.reduce((sum, t) => sum + t.total_points, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Your squads"
        title="My teams"
        subtitle={teams.length > 0 ? `${teams.length} squad${teams.length === 1 ? '' : 's'} · ${formatPoints(total)} points all-time` : undefined}
      />

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          title="No squads yet"
          body="Open a match, pick 7 players and choose your captain."
          action={
            <Link to="/matches" className="btn-primary">
              Browse matches
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const match = matchById.get(team.match_id);
            const editable = match ? isMatchEditable(match) : false;
            return (
              <Link key={team.id} to={`/match/${team.match_id}`} className="card-interactive group flex flex-col p-0">
                <div className="flex items-start justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink">{team.match_name || `Match #${team.match_id}`}</p>
                    {match && <p className="mt-0.5 text-xs font-medium text-slate-500">{formatMatchDate(match.match_date)}</p>}
                  </div>
                  {match && <StatusBadge status={match.status} />}
                </div>
                {match && (
                  <div className="flex items-center gap-2 px-5">
                    <TeamCrest name={match.team_a} size="sm" />
                    <span className="truncate text-sm font-bold">{match.team_a}</span>
                    <span className="text-xs font-bold text-slate-400">vs</span>
                    <TeamCrest name={match.team_b} size="sm" />
                    <span className="truncate text-sm font-bold">{match.team_b}</span>
                  </div>
                )}
                <div className="mt-5 flex items-end justify-between border-t border-slate-100 px-5 py-4">
                  <div>
                    <p className="eyebrow text-[10px] text-slate-400">Points</p>
                    <p className="tabular font-display text-4xl font-extrabold leading-none text-ink">{formatPoints(team.total_points)}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-pitch-700">
                    {editable ? 'Edit squad' : 'View squad'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
