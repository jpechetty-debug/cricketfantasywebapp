import { CalendarDays, LogOut, Phone, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';
import type { UserProfile } from '../types';

export default function ProfilePage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    authApi.me().then(setProfile).catch(() => undefined);
  }, []);

  const name = profile?.name || auth?.name || '';
  const role = profile?.role || auth?.role || 'user';

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <section className="floodlit flex flex-col items-center rounded-3xl px-6 py-10 text-center text-white shadow-lift">
        <Avatar name={name || 'U'} className="h-24 w-24 text-3xl ring-4 ring-white/10" />
        <h1 className="display mt-4 text-4xl">{name}</h1>
        <span className="chip mt-2 bg-lime/15 text-lime ring-1 ring-inset ring-lime/30">{role === 'admin' ? 'League admin' : 'Player'}</span>
      </section>

      <dl className="card divide-y divide-slate-100 p-0">
        <Row icon={<Phone className="h-4 w-4" />} label="Mobile" value={profile?.mobile ?? '—'} />
        <Row icon={<ShieldCheck className="h-4 w-4" />} label="Account" value={role === 'admin' ? 'Administrator' : 'Player'} />
        <Row
          icon={<CalendarDays className="h-4 w-4" />}
          label="Member since"
          value={profile ? new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : '—'}
        />
      </dl>

      <button
        type="button"
        className="btn-ghost w-full !py-3 text-ball hover:!border-ball/40 hover:!bg-ball-soft"
        onClick={() => {
          logout();
          navigate('/login');
        }}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
      </button>
    </div>
  );
}

function Row({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">{icon}</span>
      <dt className="flex-1 text-sm font-semibold text-slate-500">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}
