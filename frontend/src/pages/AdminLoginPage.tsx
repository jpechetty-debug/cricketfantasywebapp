import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { Field, PasswordField } from '../components/AuthShell';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiError, authApi } from '../services/api';

export default function AdminLoginPage() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(isAdmin ? '/admin/dashboard' : '/dashboard', { replace: true });
  }, [isAuthenticated, isAdmin, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login({ mobile: mobile.trim(), password });
      if (data.role !== 'admin') {
        notify('This login is for league organisers only', 'error');
        return;
      }
      login(data);
      notify('Admin console unlocked', 'success');
      navigate('/admin/dashboard');
    } catch (err) {
      notify(apiError(err, 'Admin login failed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Organisers"
      title="Admin login"
      subtitle="Manage fixtures, players and scoring."
      teaser={false}
      aside={{
        headline: (
          <>
            Run the
            <br />
            <span className="text-lime">league.</span>
          </>
        ),
        body: 'Schedule matches, maintain the player list and import points from the CricHeroes scorecard.',
      }}
      footer={
        <Link to="/login" className="font-bold text-slate-500 hover:text-ink">
          Player login instead
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Admin mobile" type="tel" inputMode="numeric" autoComplete="username" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-secondary w-full !py-3.5 text-base" disabled={loading}>
          {loading ? 'Checking…' : 'Enter admin console'}
        </button>
      </form>
    </AuthShell>
  );
}
