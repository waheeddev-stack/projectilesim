import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  usePageTitle(
    isRegister ? 'Register' : 'Login',
    isRegister ? 'Create an account to save your experiments.' : 'Log in to save and review experiments.',
  );

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (isRegister && form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate(location.state?.from || '/simulator', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel auth-card" aria-labelledby="auth-title">
      <h1 id="auth-title">{isRegister ? 'Create account' : 'Access terminal'}</h1>
      <form onSubmit={submit} noValidate>
        {isRegister && (
          <div className="field">
            <label className="label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="input"
              value={form.name}
              onChange={set('name')}
              autoComplete="name"
              required
            />
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
            required
          />
        </div>
        <div className="field">
          <label className="label" htmlFor="password">
            Password {isRegister && '(min 8 characters)'}
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={form.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
          />
        </div>
        {error && (
          <p className="field__error" role="alert">
            {error}
          </p>
        )}
        <button className="button button--primary" disabled={busy} type="submit">
          {busy ? 'Working...' : isRegister ? 'Register' : 'Login'}
        </button>
      </form>
      <p style={{ marginTop: '1rem' }} className="text-dim">
        {isRegister ? (
          <>
            Already registered? <Link to="/login">Login</Link>
          </>
        ) : (
          <>
            New here? <Link to="/register">Create an account</Link>
          </>
        )}
      </p>
    </section>
  );
}

export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
