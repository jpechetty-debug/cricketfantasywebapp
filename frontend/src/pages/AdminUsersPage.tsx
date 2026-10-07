import { Check, Copy, KeyRound, Search, Trash2, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal, { ConfirmDialog } from '../components/Modal';
import { RowSkeleton } from '../components/Skeleton';
import { Avatar, EmptyState, PageHeader } from '../components/ui';
import { useToast } from '../hooks/useToast';
import { formatMatchDate } from '../lib/format';
import { adminApi, apiError } from '../services/api';
import type { Member } from '../types';

const WORDS = ['Sixer', 'Boundary', 'Yorker', 'Bouncer', 'Googly', 'Century', 'Captain', 'Wicket', 'Spinner', 'Stumps'];

/** Easy to read out or WhatsApp: a cricket word plus four digits, e.g. "Yorker-4821". */
function suggestPassword() {
  const n = new Uint32Array(2);
  crypto.getRandomValues(n);
  return `${WORDS[n[0] % WORDS.length]}-${String(n[1] % 10000).padStart(4, '0')}`;
}

export default function AdminUsersPage() {
  const { notify } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toReset, setToReset] = useState<Member | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetDone, setResetDone] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  function openReset(member: Member) {
    setToReset(member);
    setNewPassword(suggestPassword());
    setResetDone(false);
    setCopied(false);
  }

  async function saveReset() {
    if (!toReset || newPassword.trim().length < 8) return;
    setResetting(true);
    try {
      await adminApi.resetPassword(toReset.id, newPassword.trim());
      setResetDone(true);
    } catch (err) {
      notify(apiError(err, 'Could not reset password'), 'error');
    } finally {
      setResetting(false);
    }
  }

  async function copyMessage() {
    if (!toReset) return;
    const text = `Your new Bachpan Cricket League password is ${newPassword.trim()} (log in with ${toReset.mobile}).`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      notify('Copy failed. Note the password down instead.', 'error');
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
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
                  onClick={() => openReset(member)}
                  aria-label={`Reset password for ${member.name}`}
                  title="Reset password"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
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

      <Modal
        open={toReset !== null}
        onClose={() => setToReset(null)}
        title={resetDone ? 'Password reset' : 'Reset password'}
        footer={
          resetDone ? (
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setToReset(null)}>
                Done
              </button>
              <button type="button" className="btn-primary flex-1" onClick={() => void copyMessage()}>
                {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy message'}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button type="button" className="btn-ghost flex-1" onClick={() => setToReset(null)}>
                Cancel
              </button>
              <button type="button" className="btn-primary flex-1" disabled={resetting || newPassword.trim().length < 8} onClick={() => void saveReset()}>
                {resetting ? 'Saving…' : 'Set password'}
              </button>
            </div>
          )
        }
      >
        {resetDone ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              <strong className="text-ink">{toReset?.name}</strong> can now log in with mobile <strong className="text-ink">{toReset?.mobile}</strong> and this password:
            </p>
            <p className="tabular rounded-xl bg-slate-100 px-4 py-3 text-center font-display text-2xl font-extrabold tracking-wide text-ink">{newPassword.trim()}</p>
            <p className="text-xs text-slate-500">Send it to them privately. Their squads and points are unchanged.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Set a new password for <strong className="text-ink">{toReset?.name}</strong> ({toReset?.mobile}). Their old password stops working straight away.
            </p>
            <label className="block">
              <span className="label">New password</span>
              <span className="flex gap-2">
                <input className="input tabular font-semibold" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="off" />
                <button type="button" className="btn-ghost shrink-0 px-3" onClick={() => setNewPassword(suggestPassword())} title="Suggest another">
                  New
                </button>
              </span>
              <span className="mt-1.5 block text-xs text-slate-500">At least 8 characters. Edit it or tap New for another suggestion.</span>
            </label>
          </div>
        )}
      </Modal>

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
