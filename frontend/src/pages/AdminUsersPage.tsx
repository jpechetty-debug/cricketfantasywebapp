import { Search, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/Modal';
import { RowSkeleton } from '../components/Skeleton';
import { Avatar, EmptyState, PageHeader } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatMatchDate } from '../lib/format';
import { adminApi, apiError } from '../services/api';
import type { Member } from '../types';

export default function AdminUsersPage() {
  const { notify } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => setMembers(await adminApi.users()), []);

  useEffect(() => {
    refresh()
      .catch((err) => notify(apiError(err, 'Could not load members'), 'error'))
      .finally(() => setLoading(false));
  }, [refresh, notify]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => !q || m.name.toLowerCase().includes(q) || m.mobile.includes(q));
  }, [members, query]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.deleteUser(toDelete.id);
      await refresh();
      notify(`${toDelete.name} deleted`, 'success');
    } catch (err) {
      notify(apiError(err, 'Could not delete member'), 'error');
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <div>
      <PageHeader eyebrow="Admin console" title="Members" subtitle={`${members.length} ${members.length === 1 ? 'person has' : 'people have'} signed up`} />

      <section className="card overflow-hidden p-0" aria-label="Registered members">
        <div className="border-b border-slate-100 p-4">
          <label className="relative block">
            <span className="sr-only">Search members</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input className="input !py-2 pl-9" placeholder="Search by name or mobile" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>

        {loading ? (
          <RowSkeleton rows={6} />
        ) : visible.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UserRound className="h-6 w-6" />}
              title={members.length ? 'No members match' : 'No one has signed up yet'}
              body={members.length ? 'Try another name or number.' : 'Members appear here once they register.'}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={member.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">{member.name}</p>
                  <p className="truncate text-xs font-medium text-slate-500">
                    {member.mobile} · {member.squads} {member.squads === 1 ? 'squad' : 'squads'} · joined {formatMatchDate(member.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-ball-soft hover:text-ball"
                  onClick={() => setToDelete(member)}
                  aria-label={`Delete ${member.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete member?"
        body={
          <>
            <strong className="text-ink">{toDelete?.name}</strong> ({toDelete?.mobile}) and their {toDelete?.squads ?? 0}{' '}
            {toDelete?.squads === 1 ? 'squad' : 'squads'} will be removed permanently, including from every leaderboard. They are logged out and
            would need to sign up again.
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
