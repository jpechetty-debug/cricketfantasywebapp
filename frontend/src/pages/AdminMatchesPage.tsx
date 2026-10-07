import { CalendarPlus, Clock, Swords, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Modal, { ConfirmDialog } from '../components/Modal';
import { RowSkeleton } from '../components/Skeleton';
import StatusBadge from '../components/StatusBadge';
import { EmptyState, PageHeader, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatMatchDate } from '../lib/format';
import { apiError, matchApi } from '../services/api';
import type { Match, MatchStatus } from '../types';

const STATUSES: { id: MatchStatus; label: string; active: string }[] = [
  { id: 'open', label: 'Open', active: 'bg-pitch-600 text-white' },
  { id: 'locked', label: 'Locked', active: 'bg-gold text-ink' },
  { id: 'closed', label: 'Completed', active: 'bg-ink text-white' },
];

/** ISO timestamp -> "YYYY-MM-DDTHH:mm" in the browser's time zone, as datetime-local expects. */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminMatchesPage() {
  const { notify } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [matchName, setMatchName] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [toDelete, setToDelete] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toRetime, setToRetime] = useState<Match | null>(null);
  const [newTime, setNewTime] = useState('');
  const [retiming, setRetiming] = useState(false);

  const refresh = useCallback(async () => setMatches(await matchApi.list()), []);

  useEffect(() => {
    refresh()
      .catch((err) => notify(apiError(err, 'Could not load matches'), 'error'))
      .finally(() => setLoading(false));
  }, [refresh, notify]);

  async function createMatch(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await matchApi.create({
        match_name: matchName.trim(),
        team_a: teamA.trim(),
        team_b: teamB.trim(),
        match_date: new Date(matchDate).toISOString(),
      });
      setMatchName('');
      setTeamA('');
      setTeamB('');
      setMatchDate('');
      await refresh();
      notify('Match scheduled and open for squads', 'success');
    } catch (err) {
      notify(apiError(err, 'Could not create match'), 'error');
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(match: Match, status: MatchStatus) {
    if (match.status === status) return;
    setBusyId(match.id);
    try {
      await matchApi.setStatus(match.id, status);
      await refresh();
      notify(`${match.match_name} is now ${STATUSES.find((s) => s.id === status)?.label.toLowerCase()}`, 'success');
    } catch (err) {
      notify(apiError(err, 'Could not update match'), 'error');
    } finally {
      setBusyId(null);
    }
  }

  function openRetime(match: Match) {
    setToRetime(match);
    setNewTime(toLocalInput(match.match_date));
  }

  async function saveRetime(e: FormEvent) {
    e.preventDefault();
    if (!toRetime || !newTime) return;
    setRetiming(true);
    try {
      const updated = await matchApi.setTime(toRetime.id, new Date(newTime).toISOString());
      await refresh();
      notify(`${toRetime.match_name} now starts ${formatMatchDate(updated.match_date)}`, 'success');
      setToRetime(null);
    } catch (err) {
      notify(apiError(err, 'Could not change start time'), 'error');
    } finally {
      setRetiming(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await matchApi.remove(toDelete.id);
      await refresh();
      notify(`${toDelete.match_name} deleted`, 'success');
    } catch (err) {
      notify(apiError(err, 'Could not delete match'), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Matches" subtitle="Schedule fixtures and control when squads lock." />

      <div className="grid items-start gap-8 lg:grid-cols-[380px_1fr]">
        <form className="card min-w-0 space-y-4 lg:sticky lg:top-24" onSubmit={createMatch}>
          <h2 className="display flex items-center gap-2 text-2xl">
            <CalendarPlus className="h-5 w-5 text-pitch-600" aria-hidden="true" /> New match
          </h2>
          <label className="block">
            <span className="label">Match name</span>
            <input className="input" placeholder="e.g. Sunday Derby, Final" value={matchName} onChange={(e) => setMatchName(e.target.value)} required minLength={2} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">Team A</span>
              <input className="input" placeholder="Home side" value={teamA} onChange={(e) => setTeamA(e.target.value)} required />
            </label>
            <label className="block">
              <span className="label">Team B</span>
              <input className="input" placeholder="Away side" value={teamB} onChange={(e) => setTeamB(e.target.value)} required />
            </label>
          </div>
          {(teamA.trim() || teamB.trim()) && (
            <div className="flex items-center justify-center gap-3 rounded-xl bg-slate-50 py-3" aria-hidden="true">
              <TeamCrest name={teamA.trim() || '?'} size="sm" />
              <span className="font-display text-xs font-extrabold text-slate-400">VS</span>
              <TeamCrest name={teamB.trim() || '?'} size="sm" />
            </div>
          )}
          <label className="block">
            <span className="label">Start time</span>
            <input className="input" type="datetime-local" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} required />
            <span className="mt-1.5 block text-xs text-slate-500">Squads lock automatically at this time.</span>
          </label>
          <p className="rounded-xl bg-gold-soft px-3 py-2 text-xs font-medium text-amber-900">
            Players are matched to fixtures by team name, so use exactly the same team names as in the player list.
          </p>
          <button className="btn-primary w-full !py-3" disabled={creating}>
            {creating ? 'Scheduling…' : 'Schedule match'}
          </button>
        </form>

        <section className="min-w-0" aria-label="All matches">
          {loading ? (
            <RowSkeleton rows={4} />
          ) : matches.length === 0 ? (
            <EmptyState icon={<Swords className="h-6 w-6" />} title="No matches yet" body="Use the form to schedule your first fixture." />
          ) : (
            <ul className="space-y-4">
              {matches.map((match) => (
                <li key={match.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex -space-x-2">
                        <TeamCrest name={match.team_a} size="md" />
                        <TeamCrest name={match.team_b} size="md" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-ink">{match.match_name}</p>
                        <p className="truncate text-xs font-medium text-slate-500">
                          {match.team_a} vs {match.team_b}
                        </p>
                        <p className="text-xs font-medium text-slate-400">{formatMatchDate(match.match_date)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge status={match.status} />
                      <button
                        type="button"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                        onClick={() => openRetime(match)}
                        aria-label={`Change start time of ${match.match_name}`}
                        title="Change start time"
                      >
                        <Clock className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-ball-soft hover:text-ball"
                        onClick={() => setToDelete(match)}
                        aria-label={`Delete ${match.match_name}`}
                        title="Delete match"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label={`Status for ${match.match_name}`}>
                    {STATUSES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        role="radio"
                        aria-checked={match.status === s.id}
                        disabled={busyId === match.id}
                        onClick={() => void setStatus(match, s.id)}
                        className={`rounded-lg py-2 text-xs font-bold transition disabled:opacity-60 ${
                          match.status === s.id ? `${s.active} shadow-sm` : 'text-slate-500 hover:bg-white hover:text-ink'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Modal open={toRetime !== null} onClose={() => setToRetime(null)} title="Change start time">
        <form className="space-y-4" onSubmit={saveRetime}>
          <p className="text-sm text-slate-600">
            <strong className="text-ink">{toRetime?.match_name}</strong> ({toRetime?.team_a} vs {toRetime?.team_b})
          </p>
          <label className="block">
            <span className="label">Start time</span>
            <input className="input" type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
            <span className="mt-1.5 block text-xs text-slate-500">Last chance to save squads. They lock automatically at this time.</span>
          </label>
          {toRetime && toRetime.status !== 'open' && (
            <p className="rounded-xl bg-gold-soft px-3 py-2 text-xs font-medium text-amber-900">
              This match is {toRetime.status === 'locked' ? 'locked' : 'completed'}. Set it back to Open if members should still pick squads.
            </p>
          )}
          <button className="btn-primary w-full !py-3" disabled={retiming || !newTime}>
            {retiming ? 'Saving…' : 'Save start time'}
          </button>
        </form>
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete match?"
        body={
          <>
            <strong className="text-ink">{toDelete?.match_name}</strong> ({toDelete?.team_a} vs {toDelete?.team_b}) will be removed permanently, along with
            every squad picked for it, its points and its leaderboard. Players stay in the pool.
          </>
        }
        confirmLabel="Delete match"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
