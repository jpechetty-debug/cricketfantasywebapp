import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell, { Field, PasswordField } from '../components/AuthShell';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { apiError, authApi } from '../services/api';

export default function RegisterPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.register({ name: name.trim(), mobile: mobile.trim(), password });
      login(data);
      notify('You’re in! Pick your first squad.', 'success');
      navigate('/matches');
    } catch (err) {
      notify(apiError(err, 'Registration failed'), 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Join the league"
      title="Sign up"
      subtitle="Takes 20 seconds. No payments, ever."
      aside={{
        headline: (
          <>
            Your squad.
            <br />
            Your <span className="text-lime">call.</span>
          </>
        ),
        body: 'Seven players, one captain, one vice-captain. Everyone in the league sees the table update live.',
      }}
      footer={
        <>
          Already playing?{' '}
          <Link to="/login" className="font-bold text-pitch-700 hover:text-pitch-900">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Your name" autoComplete="name" placeholder="As your friends know you" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
        <Field
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="10-digit number"
          pattern="\+?[0-9]{10,14}"
          title="10 to 14 digits"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters."
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="btn-primary w-full !py-3.5 text-base" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthShell>
  );
}
