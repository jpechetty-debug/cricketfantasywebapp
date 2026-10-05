import { Minus, PenLine, Plus } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { RowSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, PageHeader, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { byPlayerName, formatPoints } from '../lib/format';
import { apiError, matchApi, playerApi, pointsApi } from '../services/api';
import type { Match, Player } from '../types';

export default function AdminScoringPage() {
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchId, setMatchId] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [savedScores, setSavedScores] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
        const next: Record<number, string> = {};
        for (const p of plist) next[p.id] = '0';
        for (const row of points) next[row.player_id] = String(row.points);
        setScores(next);
        setSavedScores(next);
      })
      .catch((err) => notify(apiError(err, 'Could not load scoring data'), 'error'))
      .finally(() => setLoading(false));
  }, [matchId, notify]);

  const match = matches.find((m) => m.id === matchId) ?? null;
  const changed = players.filter((p) => scores[p.id] !== savedScores[p.id]).length;
  const invalid = players.some((p) => scores[p.id] === '' || Number.isNaN(Number(scores[p.id])));

  const byTeam = useMemo(() => {
    if (!match) return [];
    return [match.team_a, match.team_b].map((team) => ({ team, players: players.filter((p) => p.team_name === team).sort(byPlayerName) }));
  }, [match, players]);

  function bump(id: number, delta: number) {
    setScores((prev) => ({ ...prev, [id]: String((Number(prev[id]) || 0) + delta) }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matchId || invalid) return;
    setSaving(true);
    try {
      await pointsApi.save({
        match_id: matchId,
        entries: players.map((p) => ({ player_id: p.id, points: Number(scores[p.id] || 0) })),
      });
      setSavedScores(scores);
      notify('Points saved. The leaderboard is updated.', 'success');
    } catch (err) {
      notify(apiError(err, 'Could not save points'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="pb-24">
      <PageHeader
        eyebrow="Admin console"
        title="Scoring"
        subtitle="Enter each player's fantasy points. Captains score 2× and vice-captains 1.5× on user squads automatically."
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
            {match.status === 'open' && <span className="text-xs font-medium text-amber-700">Squads are still editable</span>}
          </div>
        )}
      </div>

      {loading ? (
        <RowSkeleton rows={8} />
      ) : !match ? (
        <EmptyState icon={<PenLine className="h-6 w-6" />} title="No match selected" body="Schedule a match first." />
      ) : players.length === 0 ? (
        <EmptyState icon={<PenLine className="h-6 w-6" />} title="No players for this match" body="Add active players whose team names match this fixture." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {byTeam.map(({ team, players: teamPlayers }) => {
            const total = teamPlayers.reduce((sum, p) => sum + (Number(scores[p.id]) || 0), 0);
            return (
              <section key={team} className="card overflow-hidden p-0" aria-label={`${team} scores`}>
                <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                  <TeamCrest name={team} size="md" />
                  <h2 className="display flex-1 truncate text-2xl">{team}</h2>
                  <p className="tabular font-display text-2xl font-extrabold text-slate-400">{formatPoints(total)}</p>
                </header>
                <ul className="divide-y divide-slate-100">
                  {teamPlayers.map((p) => {
                    const dirty = scores[p.id] !== savedScores[p.id];
                    return (
                      <li key={p.id} className={`flex items-center gap-3 px-5 py-3 ${dirty ? 'bg-gold-soft/50' : ''}`}>
                        <div className="min-w-0 flex-1">
                          <label htmlFor={`score-${p.id}`} className="block truncate font-bold text-ink">
                            {p.player_name}
                          </label>
                          <p className="text-xs font-medium text-slate-500">{p.role}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => bump(p.id, -1)} aria-label={`Decrease ${p.player_name}`}>
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            id={`score-${p.id}`}
                            className="input tabular w-20 !px-2 !py-2 text-center font-display text-lg font-extrabold"
                            type="number"
                            inputMode="decimal"
                            step="0.5"
                            value={scores[p.id] ?? '0'}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => setScores((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          />
                          <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => bump(p.id, 1)} aria-label={`Increase ${p.player_name}`}>
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {players.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 md:bottom-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-ink p-2.5 pl-5 text-white shadow-lift">
            <p className="flex-1 text-sm font-semibold">
              {invalid ? (
                <span className="text-[#ff6b7d]">Fill in every score</span>
              ) : changed > 0 ? (
                <>
                  <span className="tabular font-bold text-gold">{changed}</span> unsaved change{changed === 1 ? '' : 's'}
                </>
              ) : (
                <span className="text-slate-400">All scores saved</span>
              )}
            </p>
            <button className="btn-lime" disabled={saving || changed === 0 || invalid}>
              {saving ? 'Saving…' : 'Save & update leaderboard'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
