import { CloudDownload, Lock, PenLine } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RowSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, PageHeader, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { byPlayerName, formatPoints } from '../lib/format';
import { apiError, matchApi, playerApi, pointsApi } from '../services/api';
import type { Match, Player } from '../types';

/** Read-only view of a match's player points. Points only come from a CricHeroes import, so nobody can type or change them here. */
export default function AdminScoringPage() {
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    matchApi
      .list()
      .then((list) => {
        setMatches(list);
        const first = list.find((m) => m.status !== 'open') ?? list[0];
        if (first) setMatchId(first.id);
      })
      .catch((err) => notify(apiError(err, 'Could not load matches'), 'error'));
  }, [notify]);

  useEffect(() => {
    if (!matchId) return;
    setLoading(true);
    Promise.all([playerApi.list(matchId), pointsApi.get(matchId)])
      .then(([plist, points]) => {
        setPlayers(plist);
        setScores(Object.fromEntries(points.map((row) => [row.player_id, row.points])));
      })
      .catch((err) => notify(apiError(err, 'Could not load scoring data'), 'error'))
      .finally(() => setLoading(false));
  }, [matchId, notify]);

  const match = matches.find((m) => m.id === matchId) ?? null;
  const scored = players.some((p) => p.id in scores);

  const byTeam = useMemo(() => {
    if (!match) return [];
    return [match.team_a, match.team_b].map((team) => ({ team, players: players.filter((p) => p.team_name === team).sort(byPlayerName) }));
  }, [match, players]);

  return (
    <div>
      <PageHeader
        eyebrow="Admin console"
        title="Scoring"
        subtitle="Points come only from the CricHeroes scorecard and can't be edited by hand. Captains score 2× and vice-captains 1.5× automatically."
      />

      <div className="card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="label">Match</span>
          <select className="input" value={matchId ?? ''} onChange={(e) => setMatchId(Number(e.target.value))} disabled={matches.length === 0}>
            {matches.length === 0 && <option value="">No matches available</option>}
            {matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.match_name} · {m.team_a} vs {m.team_b}
              </option>
            ))}
          </select>
        </label>
        {match && (
          <div className="flex items-center gap-3 sm:pt-5">
            <StatusBadge status={match.status} />
          </div>
        )}
      </div>

      {match && !loading && players.length > 0 && !scored && (
        <div className="card mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <p className="flex-1 text-sm font-medium text-slate-600">No points for this match yet. Import the CricHeroes scorecard after the game to score it.</p>
          <Link to="/admin/cricheroes" className="btn-primary">
            <CloudDownload className="h-4 w-4" aria-hidden="true" /> Import scorecard
          </Link>
        </div>
      )}

      {loading ? (
        <RowSkeleton rows={8} />
      ) : !match ? (
        <EmptyState icon={<PenLine className="h-6 w-6" />} title="No match selected" body="Schedule a match first." />
      ) : players.length === 0 ? (
        <EmptyState icon={<PenLine className="h-6 w-6" />} title="No players for this match" body="Add active players whose team names match this fixture." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {byTeam.map(({ team, players: teamPlayers }) => {
            const total = teamPlayers.reduce((sum, p) => sum + (scores[p.id] ?? 0), 0);
            return (
              <section key={team} className="card overflow-hidden p-0" aria-label={`${team} scores`}>
                <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <TeamCrest name={team} size="md" />
                  <h2 className="display flex-1 truncate text-2xl">{team}</h2>
                  <p className="tabular font-display text-2xl font-extrabold text-slate-400">{formatPoints(total)}</p>
                </header>
                <ul className="divide-y divide-slate-100">
                  {teamPlayers.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">{p.player_name}</p>
                        <p className="text-xs font-medium text-slate-500">{p.role}</p>
                      </div>
                      <p className="tabular flex items-center gap-1.5 font-display text-lg font-extrabold text-ink">
                        {p.id in scores ? formatPoints(scores[p.id]) : <span className="text-slate-300">–</span>}
                        <Lock className="h-3.5 w-3.5 text-slate-300" aria-label="Read-only" />
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
