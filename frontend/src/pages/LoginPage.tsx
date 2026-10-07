import { useEffect, useState, type FormEvent } from 'react';
import { Phone } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell, { Field, PasswordField } from '../components/AuthShell';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { toMobile } from '../lib/format';
import { apiError, authApi } from '../services/api';

export default function LoginPage() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(isAdmin ? '/admin/dashboard' : from ?? '/dashboard', { replace: true });
  }, [isAuthenticated, isAdmin, navigate, from]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login({ mobile: mobile.trim(), password });
      login(data);
      notify(`Welcome back, ${data.name.split(' ')[0]}`, 'success');
      navigate(data.role === 'admin' ? '/admin/dashboard' : from ?? '/dashboard', { replace: true });
    } catch (err) {
      notify(apiError(err, 'Login failed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in"
      subtitle="Use the mobile number you registered with."
      footer={
        <>
          New to the league?{' '}
          <Link to="/register" state={location.state} className="font-bold text-pitch-700 hover:text-pitch-900">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="10-digit number"
          icon={<Phone aria-hidden="true" />}
          prefix="+91"
          value={mobile}
          onChange={(e) => setMobile(toMobile(e.target.value))}
          required
        />
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary w-full !py-3.5 text-base" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
        <p className="text-center text-xs font-medium text-slate-400">Forgot your password? Message the league organiser.</p>
      </form>
    </AuthShell>
  );
}
