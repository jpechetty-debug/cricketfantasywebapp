import { Crown, Trophy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Confetti from '../components/Confetti';
import { RowSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { Avatar, EmptyState, PageHeader, RankBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatPoints } from '../lib/format';
import { apiError, leaderboardApi, matchApi } from '../services/api';
import type { LeaderboardEntry, Match } from '../types';

/** Prefer the most recent match that has started; fall back to the newest one. */
function defaultMatch(list: Match[]) {
  return list.find((m) => m.status !== 'open') ?? list[0];
}

export default function LeaderboardPage() {
  const { auth } = useAuth();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [matches, setMatches] = useState<Match[]>([]);
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);

  const paramId = Number(params.get('match')) || null;
  const matchId = paramId ?? defaultMatch(matches)?.id ?? null;
  const match = matches.find((m) => m.id === matchId) ?? null;

  useEffect(() => {
    matchApi
      .list()
      .then(setMatches)
      .catch((err) => notify(apiError(err, 'Could not load matches'), 'error'))
      .finally(() => setLoadingMatches(false));
  }, [notify]);

  useEffect(() => {
    if (!matchId) return;
    setLoadingRows(true);
    leaderboardApi
      .get(matchId)
      .then(setRows)
      .catch((err) => notify(apiError(err, 'Could not load leaderboard'), 'error'))
      .finally(() => setLoadingRows(false));
  }, [matchId, notify]);

  const me = useMemo(() => rows.find((r) => r.user_id === auth?.userId) ?? null, [rows, auth?.userId]);
  const podium = rows.slice(0, 3);
  const loading = loadingMatches || loadingRows;
  // Winners are only crowned once the match is completed and someone actually scored.
  const finished = match?.status === 'closed' && rows.length > 0 && rows[0].points > 0;
  const isWinner = (row: LeaderboardEntry) => finished && row.rank === 1;

  // Celebrate once per completed match per visit, not on every re-render or refresh.
  const [celebrate, setCelebrate] = useState(false);
  const stopCelebrating = useCallback(() => setCelebrate(false), []);
  useEffect(() => {
    if (!finished || loadingRows || !matchId) return;
    const key = `celebrated-${matchId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // Storage can be blocked (private mode); celebrating again is harmless.
    }
    setCelebrate(true);
  }, [finished, loadingRows, matchId]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Standings"
        title="Leaderboard"
        subtitle={match ? `${match.team_a} vs ${match.team_b}` : 'Rankings for each match'}
        actions={match && <StatusBadge status={match.status} />}
      />

      {matches.length > 0 && (
        <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Choose match">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={m.id === matchId}
              onClick={() => setParams({ match: String(m.id) }, { replace: true })}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                m.id === matchId ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:text-ink'
              }`}
            >
              {m.match_name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <RowSkeleton rows={6} />
      ) : !match ? (
        <EmptyState icon={<Trophy className="h-6 w-6" />} title="No matches yet" body="Standings appear once the first match is scheduled." />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Trophy className="h-6 w-6" />} title="No squads entered" body="Be the first to pick a team for this match." />
      ) : (
        <div className="space-y-6">
          {/* Podium */}
          <section className="floodlit rounded-3xl px-4 pb-0 pt-6 text-white shadow-lift sm:px-8" aria-label="Top three">
            <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
              {[podium[1], podium[0], podium[2]].map((row, i) => {
                if (!row) return <div key={i} />;
                const first = row === podium[0];
                const heights = ['h-20', 'h-28', 'h-14'];
                return (
                  <div key={row.team_id} className="flex min-w-0 flex-col items-center text-center">
                    {first && isWinner(row) ? (
                      <span className="mb-1.5 animate-pop rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-ink shadow">🏆 Winner</span>
                    ) : (
                      first && <Crown className="mb-1 h-6 w-6 text-gold" aria-hidden="true" />
                    )}
                    <Avatar name={row.name} className={first ? 'h-16 w-16 text-xl ring-4 ring-gold' : 'h-12 w-12 text-sm'} />
                    <p className="mt-2 w-full truncate text-sm font-bold">
                      {row.name}
                      {row.user_id === auth?.userId && <span className="text-lime"> (you)</span>}
                    </p>
                    <p className="tabular font-display text-2xl font-extrabold text-lime">{formatPoints(row.points)}</p>
                    <div
                      className={`mt-2 flex w-full items-start justify-center rounded-t-xl pt-2 font-display text-3xl font-extrabold ${heights[i]} ${
                        first ? 'bg-gold text-ink' : 'bg-white/10 text-white/80'
                      }`}
                    >
                      {row.rank}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {me && (
            <div className="flex items-center gap-4 rounded-2xl border-2 border-pitch-500 bg-pitch-50 px-5 py-4">
              <RankBadge rank={me.rank} />
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Your position</p>
                <p className="text-xs font-medium text-slate-500">
                  {isWinner(me) ? 'You won this match! 🏆' : me.rank === 1 ? 'Top of the table!' : `${formatPoints(rows[0].points - me.points)} pts behind the leader`}
                </p>
              </div>
              <p className="tabular font-display text-3xl font-extrabold text-pitch-700">{formatPoints(me.points)}</p>
            </div>
          )}

          <ol className="card divide-y divide-slate-100 overflow-hidden p-0">
            {rows.map((row) => {
              const isMe = row.user_id === auth?.userId;
              return (
                <li key={row.team_id} className={`flex items-center gap-4 px-5 py-3.5 ${isMe ? 'bg-pitch-50/70' : ''}`}>
                  <RankBadge rank={row.rank} />
                  <Avatar name={row.name} className="h-9 w-9 text-xs" />
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    <p className="min-w-0 truncate font-bold text-ink">{row.name}</p>
                    {isMe && <span className="chip shrink-0 bg-pitch-600 px-2 py-0.5 text-[10px] text-white">You</span>}
                    {isWinner(row) && (
                      <span className="shrink-0 text-base leading-none" role="img" aria-label="Winner" title="Winner">
                        🏆
                      </span>
                    )}
                  </div>
                  <p className="tabular font-display text-xl font-extrabold text-ink">{formatPoints(row.points)}</p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {celebrate && <Confetti onDone={stopCelebrating} />}
    </div>
  );
}
