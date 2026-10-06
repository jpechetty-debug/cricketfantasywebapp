import { ArrowLeft, Lock, Search, Timer, Trophy, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Modal from '../components/Modal';
import PlayerRow from '../components/PlayerRow';
import { RowSkeleton } from '../components/Skeleton';
import SquadPanel from '../components/SquadPanel';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, TeamCrest } from '../components/ui';
import { useNow } from '../hooks/useNow';
import { useToast } from '../hooks/useToast';
import { byPlayerName, formatCountdown, formatMatchDate, formatPoints, isMatchEditable } from '../lib/format';
import { MAX_PER_TEAM, SQUAD_SIZE, teamTotal } from '../lib/squad';
import { apiError, matchApi, playerApi, pointsApi, teamApi } from '../services/api';
import type { Match, Player } from '../types';

const ROLES = ['ALL', 'WK', 'BAT', 'AR', 'BOWL'] as const;

interface Saved {
  selected: number[];
  captain: number | null;
  vice: number | null;
}

export default function MatchPage() {
  const { id } = useParams();
  const matchId = Number(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const now = useNow(15000);

  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [points, setPoints] = useState<Record<number, number> | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [captain, setCaptain] = useState<number | null>(null);
  const [vice, setVice] = useState<number | null>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<(typeof ROLES)[number]>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [m, p, team] = await Promise.all([matchApi.get(matchId), playerApi.list(matchId), teamApi.forMatch(matchId)]);
        setMatch(m);
        setPlayers([...p].sort((a, b) => a.team_name.localeCompare(b.team_name) || byPlayerName(a, b)));
        if (team) {
          setSelected(team.selected_players);
          setCaptain(team.captain_id);
          setVice(team.vice_captain_id);
          setSaved({ selected: team.selected_players, captain: team.captain_id, vice: team.vice_captain_id });
        }
        const rows = await pointsApi.get(matchId).catch(() => [] as Awaited<ReturnType<typeof pointsApi.get>>);
        if (rows.length > 0) setPoints(Object.fromEntries(rows.map((r) => [r.player_id, r.points])));
      } catch (err) {
        notify(apiError(err, 'Could not load match'), 'error');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [matchId, notify]);

  const editable = match ? isMatchEditable(match, now) : false;
  const selectedPlayers = useMemo(() => players.filter((p) => selected.includes(p.id)), [players, selected]);

  const dirty =
    !saved ||
    saved.captain !== captain ||
    saved.vice !== vice ||
    saved.selected.length !== selected.length ||
    saved.selected.some((pid) => !selected.includes(pid));
  const perTeam = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of selectedPlayers) counts[p.team_name] = (counts[p.team_name] ?? 0) + 1;
    return counts;
  }, [selectedPlayers]);
  const balanced = Object.values(perTeam).every((n) => n <= MAX_PER_TEAM);
  const complete = selected.length === SQUAD_SIZE && captain !== null && vice !== null && balanced;

  const visiblePlayers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter(
      (p) =>
        (teamFilter === 'ALL' || p.team_name === teamFilter) &&
        (roleFilter === 'ALL' || p.role === roleFilter) &&
        (!q || p.player_name.toLowerCase().includes(q)),
    );
  }, [players, teamFilter, roleFilter, query]);

  const toggle = useCallback(
    (playerId: number) => {
      if (!editable) return;
      if (selected.includes(playerId)) {
        setSelected(selected.filter((pid) => pid !== playerId));
        if (captain === playerId) setCaptain(null);
        if (vice === playerId) setVice(null);
        return;
      }
      if (selected.length >= SQUAD_SIZE) {
        notify(`Your squad is full. Remove a player to add another.`, 'info');
        return;
      }
      const team = players.find((p) => p.id === playerId)?.team_name;
      if (team && (perTeam[team] ?? 0) >= MAX_PER_TEAM) {
        notify(`You can pick at most ${MAX_PER_TEAM} players from ${team}.`, 'info');
        return;
      }
      setSelected([...selected, playerId]);
    },
    [editable, selected, captain, vice, notify, players, perTeam],
  );

  function pickCaptain(pid: number) {
    setCaptain(pid);
    if (vice === pid) setVice(null);
  }

  function pickVice(pid: number) {
    setVice(pid);
    if (captain === pid) setCaptain(null);
  }

  async function saveTeam() {
    if (!complete || captain === null || vice === null) return;
    setSaving(true);
    try {
      await teamApi.save({ match_id: matchId, captain_id: captain, vice_captain_id: vice, selected_players: selected });
      notify(saved ? 'Squad updated. Good luck!' : 'Squad saved. Good luck!', 'success');
      setSaved({ selected, captain, vice });
      setSheetOpen(false);
    } catch (err) {
      notify(apiError(err, 'Could not save team'), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-3xl bg-ink/90" />
        <RowSkeleton rows={6} />
      </div>
    );
  }

  if (!match) {
    return (
      <EmptyState
        icon={<Trophy className="h-6 w-6" />}
        title="Match not found"
        body="It may have been removed by the organiser."
        action={
          <Link to="/matches" className="btn-primary">
            Back to matches
          </Link>
        }
      />
    );
  }

  const startsIn = new Date(match.match_date).getTime() - now;
  const hasTeam = saved !== null;
  const myTotal = hasTeam && points ? teamTotal(selectedPlayers, captain, vice, points) : null;
  const saveLabel = saving ? 'Saving…' : !dirty ? 'Squad saved' : hasTeam ? 'Update squad' : 'Save squad';

  const panel = (
    <SquadPanel
      players={selectedPlayers}
      captain={captain}
      vice={vice}
      readOnly={!editable}
      points={points}
      teamA={match.team_a}
      teamB={match.team_b}
      onCaptain={pickCaptain}
      onVice={pickVice}
      onRemove={toggle}
    />
  );

  const saveButton = (
    <button type="button" className="btn-primary w-full !py-3.5 text-base" disabled={!complete || !dirty || saving} onClick={() => void saveTeam()}>
      {saveLabel}
    </button>
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <button type="button" className="flex items-center gap-1.5 text-sm font-bold text-slate-500 transition hover:text-ink" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
      </button>

      {/* Match hero */}
      <section className="floodlit overflow-hidden rounded-3xl text-white shadow-lift">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-8">
          <p className="eyebrow truncate text-slate-300">{match.match_name}</p>
          <StatusBadge status={match.status} dark />
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-6 sm:px-8">
          <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <TeamCrest name={match.team_a} size="xl" ring />
            <span className="display w-full truncate text-2xl sm:text-4xl">{match.team_a}</span>
          </div>
          <span className="font-display text-xl font-extrabold uppercase text-lime">vs</span>
          <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row-reverse sm:text-right">
            <TeamCrest name={match.team_b} size="xl" ring />
            <span className="display w-full truncate text-2xl sm:text-4xl">{match.team_b}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-5 py-3 text-sm sm:px-8">
          <span className="font-medium text-slate-300">{formatMatchDate(match.match_date)}</span>
          {editable ? (
            <span className="flex items-center gap-1.5 font-bold text-lime">
              <Timer className="h-4 w-4" aria-hidden="true" /> Team edits close in {formatCountdown(startsIn)}
            </span>
          ) : myTotal !== null ? (
            <span className="flex items-center gap-2 font-bold">
              Your score
              <span className="tabular font-display text-2xl font-extrabold text-lime">{formatPoints(myTotal)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-gold">
              <Lock className="h-4 w-4" aria-hidden="true" /> Teams are locked
            </span>
          )}
        </div>
      </section>

      {!editable && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-600">
            {hasTeam
              ? points
                ? 'Points are in. Here is how your squad scored.'
                : 'Your squad is locked in. Points appear here once the organiser scores the match.'
              : 'This match is locked, and you did not enter a squad.'}
          </p>
          <Link to={`/leaderboard?match=${match.id}`} className="btn-secondary shrink-0">
            <Trophy className="h-4 w-4" aria-hidden="true" /> Leaderboard
          </Link>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* Player pool */}
        <section className="card overflow-hidden p-0" aria-label="Player pool">
          <div className="space-y-3 border-b border-slate-100 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="display text-2xl">{editable ? 'Pick your 7' : 'Players'}</h2>
              <span className="text-xs font-semibold text-slate-500">{visiblePlayers.length} shown</span>
            </div>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Filter by team">
              {['ALL', match.team_a, match.team_b].map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={teamFilter === t}
                  onClick={() => setTeamFilter(t)}
                  className={`flex-1 truncate rounded-lg px-3 py-2 text-xs font-bold transition ${
                    teamFilter === t ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'
                  }`}
                >
                  {t === 'ALL' ? 'Both teams' : t}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={roleFilter === r}
                    onClick={() => setRoleFilter(r)}
                    className={`chip shrink-0 py-1.5 transition ${
                      roleFilter === r ? 'bg-ink text-white' : 'bg-white text-slate-500 ring-1 ring-inset ring-slate-200 hover:text-ink'
                    }`}
                  >
                    {r === 'ALL' ? 'All roles' : r}
                  </button>
                ))}
              </div>
              <label className="relative flex-1">
                <span className="sr-only">Search players</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input className="input !py-2 pl-9" placeholder="Search players" value={query} onChange={(e) => setQuery(e.target.value)} />
              </label>
            </div>
          </div>

          {visiblePlayers.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Users className="h-6 w-6" />} title="No players match" body="Try a different team, role, or search." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiblePlayers.map((player) => (
                <PlayerRow
                  key={player.id}
                  player={player}
                  selected={selected.includes(player.id)}
                  disabled={
                    !selected.includes(player.id) &&
                    (selected.length >= SQUAD_SIZE || (perTeam[player.team_name] ?? 0) >= MAX_PER_TEAM)
                  }
                  readOnly={!editable}
                  points={points ? (points[player.id] ?? 0) : undefined}
                  badge={player.id === captain ? 'C' : player.id === vice ? 'VC' : null}
                  onToggle={() => toggle(player.id)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Squad panel (desktop) */}
        <aside className="card sticky top-24 hidden lg:block" aria-label="Your squad">
          <h2 className="display mb-4 text-2xl">Your squad</h2>
          {panel}
          {editable && <div className="mt-5">{saveButton}</div>}
        </aside>
      </div>

      {/* Mobile squad bar + sheet */}
      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 lg:hidden">
        <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink p-2.5 pl-4 text-white shadow-lift">
          <div className="min-w-0 flex-1">
            <p className="tabular font-display text-xl font-extrabold leading-none">
              {selected.length}
              <span className="text-slate-500">/{SQUAD_SIZE}</span>
              {myTotal !== null && <span className="ml-3 text-lime">{formatPoints(myTotal)} pts</span>}
            </p>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
              {!editable ? 'Squad locked' : complete ? (dirty ? 'Ready to save' : 'Saved') : captain === null || vice === null ? 'Pick players, C and VC' : 'Pick players'}
            </p>
          </div>
          <button type="button" className="btn-lime shrink-0" onClick={() => setSheetOpen(true)}>
            {editable ? 'Review squad' : 'View squad'}
          </button>
        </div>
      </div>

      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title="Your squad" footer={editable ? saveButton : undefined}>
        {panel}
      </Modal>
    </div>
  );
}
