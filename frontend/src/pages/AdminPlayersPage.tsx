import { Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../components/Modal';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyState, PageHeader, TeamCrest } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { ROLE_LABELS, byPlayerName } from '../lib/format';
import { apiError, playerApi } from '../services/api';
import type { Player } from '../types';

const ROLES = ['WK', 'BAT', 'AR', 'BOWL'];

export default function AdminPlayersPage() {
  const { notify } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [role, setRole] = useState('BAT');
  const [editing, setEditing] = useState<Player | null>(null);
  const [toDelete, setToDelete] = useState<Player | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');

  const refresh = useCallback(async () => setPlayers((await playerApi.list()).sort((a, b) => a.team_name.localeCompare(b.team_name) || byPlayerName(a, b))), []);

  useEffect(() => {
    refresh()
      .catch((err) => notify(apiError(err, 'Could not load players'), 'error'))
      .finally(() => setLoading(false));
  }, [refresh, notify]);

  const teamNames = useMemo(() => [...new Set(players.map((p) => p.team_name))].sort(), [players]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter((p) => (teamFilter === 'ALL' || p.team_name === teamFilter) && (!q || p.player_name.toLowerCase().includes(q)));
  }, [players, query, teamFilter]);

  function resetForm() {
    setEditing(null);
    setPlayerName('');
    setTeamName('');
    setRole('BAT');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { player_name: playerName.trim(), team_name: teamName.trim(), role };
      if (editing) {
        await playerApi.update(editing.id, payload);
        notify(`${payload.player_name} updated`, 'success');
      } else {
        await playerApi.create({ ...payload, active: true });
        notify(`${payload.player_name} added to ${payload.team_name}`, 'success');
      }
      resetForm();
      await refresh();
    } catch (err) {
      notify(apiError(err, 'Could not save player'), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(player: Player) {
    try {
      await playerApi.update(player.id, { active: !player.active });
      await refresh();
      notify(`${player.player_name} is now ${player.active ? 'inactive' : 'active'}`, 'success');
    } catch (err) {
      notify(apiError(err, 'Could not update player'), 'error');
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await playerApi.remove(toDelete.id);
      await refresh();
      notify(`${toDelete.player_name} deleted`, 'success');
      if (editing?.id === toDelete.id) resetForm();
    } catch (err) {
      notify(apiError(err, 'Could not delete player'), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  function startEdit(player: Player) {
    setEditing(player);
    setPlayerName(player.player_name);
    setTeamName(player.team_name);
    setRole(player.role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Players" subtitle={`${players.length} players across ${teamNames.length} teams`} />

      <div className="grid items-start gap-8 lg:grid-cols-[360px_1fr]">
        <form className="card space-y-4 lg:sticky lg:top-24" onSubmit={onSubmit}>
          <h2 className="display flex items-center gap-2 text-2xl">
            {editing ? <Pencil className="h-5 w-5 text-pitch-600" aria-hidden="true" /> : <UserPlus className="h-5 w-5 text-pitch-600" aria-hidden="true" />}
            {editing ? 'Edit player' : 'Add player'}
          </h2>
          <label className="block">
            <span className="label">Player name</span>
            <input className="input" placeholder="Full name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} required />
          </label>
          <label className="block">
            <span className="label">Team</span>
            <input className="input" placeholder="Team name" list="team-names" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
            <datalist id="team-names">
              {teamNames.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <fieldset>
            <legend className="label">Role</legend>
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  title={ROLE_LABELS[r]}
                  className={`rounded-lg py-2 text-xs font-bold transition ${role === r ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex gap-2">
            {editing && (
              <button type="button" className="btn-ghost flex-1" onClick={resetForm}>
                Cancel
              </button>
            )}
            <button className="btn-primary flex-1 !py-3" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add player'}
            </button>
          </div>
        </form>

        <section className="card overflow-hidden p-0" aria-label="Player roster">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row">
            <label className="relative flex-1">
              <span className="sr-only">Search players</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input className="input !py-2 pl-9" placeholder="Search players" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <select className="input !py-2 sm:w-48" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} aria-label="Filter by team">
              <option value="ALL">All teams</option>
              {teamNames.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <RowSkeleton rows={6} />
          ) : visible.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={<Users className="h-6 w-6" />} title={players.length ? 'No players match' : 'No players yet'} body={players.length ? 'Try another search or team.' : 'Add players with the form.'} />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((player) => (
                <li key={player.id} className={`flex items-center gap-3 px-4 py-3 ${editing?.id === player.id ? 'bg-pitch-50/70' : ''}`}>
                  <TeamCrest name={player.team_name} size="sm" />
                  <div className={`min-w-0 flex-1 ${player.active ? '' : 'opacity-50'}`}>
                    <p className="truncate font-bold text-ink">{player.player_name}</p>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {ROLE_LABELS[player.role] ?? player.role} · {player.team_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={player.active}
                    aria-label={`${player.player_name} active`}
                    onClick={() => void toggleActive(player)}
                    title={player.active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    className={`relative h-6 w-10 shrink-0 rounded-full transition ${player.active ? 'bg-pitch-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${player.active ? 'left-[18px]' : 'left-0.5'}`} />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink" onClick={() => startEdit(player)} aria-label={`Edit ${player.player_name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" className="rounded-lg p-2 text-slate-400 transition hover:bg-ball-soft hover:text-ball" onClick={() => setToDelete(player)} aria-label={`Delete ${player.player_name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete player?"
        body={
          <>
            <strong className="text-ink">{toDelete?.player_name}</strong> will be removed permanently. Players who already appear in squads or
            scores can't be deleted. Switch them to inactive instead.
          </>
        }
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
