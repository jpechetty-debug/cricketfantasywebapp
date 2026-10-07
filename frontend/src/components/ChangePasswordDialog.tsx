import { useState, type FormEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiError, authApi } from '../services/api';
import { PasswordField } from './AuthShell';
import Modal from './Modal';

/** Change the signed-in account's own password. Admins need 12+ characters, matching the server rule. */
export default function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin } = useAuth();
  const { notify } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const min = isAdmin ? 12 : 8;
  const mismatch = confirm.length > 0 && confirm !== next;

  function close() {
    setCurrent('');
    setNext('');
    setConfirm('');
    onClose();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      notify('New passwords do not match', 'error');
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({ current_password: current, new_password: next });
      notify('Password changed. Use the new one next time you log in.', 'success');
      close();
    } catch (err) {
      notify(apiError(err, 'Could not change password'), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Change password">
      <form className="space-y-4" onSubmit={onSubmit}>
        <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint={`At least ${min} characters.`}
          minLength={min}
          maxLength={72}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          hint={mismatch ? 'Passwords do not match.' : undefined}
          aria-invalid={mismatch}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {isAdmin && (
          <p className="rounded-xl bg-gold-soft px-3 py-2 text-xs font-medium text-amber-900">
            Forgot it later? Changing ADMIN_PASSWORD in Render resets it.
          </p>
        )}
        <button className="btn-primary w-full !py-3" disabled={saving || next.length < min || mismatch || !current}>
          {saving ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </Modal>
  );
}
