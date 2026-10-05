import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { Field, PasswordField } from '../components/AuthShell';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiError, authApi } from '../services/api';

export default function LoginPage() {
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
      login(data);
      notify(`Welcome back, ${data.name.split(' ')[0]}`, 'success');
      navigate(data.role === 'admin' ? '/admin/dashboard' : '/dashboard');
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
          <Link to="/register" className="font-bold text-pitch-700 hover:text-pitch-900">
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
          autoComplete="tel"
          placeholder="10-digit number"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />
        <PasswordField label="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="btn-primary w-full !py-3.5 text-base" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
