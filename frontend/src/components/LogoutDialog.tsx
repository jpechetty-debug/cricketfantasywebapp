import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ConfirmDialog } from './Modal';

/** Asks before signing out, then sends the user to the matching login page. */
export default function LogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <ConfirmDialog
      open={open}
      title="Log out?"
      body={isAdmin ? 'You will need your admin mobile and password to get back into the console.' : 'Your squads are saved. Log back in any time with your mobile number.'}
      confirmLabel="Log out"
      danger
      onConfirm={() => {
        onClose();
        logout();
        navigate(isAdmin ? '/admin/login' : '/login');
      }}
      onClose={onClose}
    />
  );
}
