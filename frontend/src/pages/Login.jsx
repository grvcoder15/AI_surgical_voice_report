import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearSession, hasActiveToken, login, validateSession, TOKEN_KEY } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (!hasActiveToken()) {
        return;
      }

      const ok = await validateSession();
      if (ok && mounted) {
        navigate('/upload', { replace: true });
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login({ email, password });

      if (!response?.token) {
        throw new Error('Login failed: token missing in response');
      }

      clearSession();
      localStorage.setItem(TOKEN_KEY, response.token);
      navigate('/upload', { replace: true });
    } catch (error) {
      setError(error.message || 'Unable to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Clinical Workspace</p>
        <h1 className="auth-title">Surgical KB Manager</h1>
        <p className="auth-subtitle">
          Centralize surgical knowledge updates with a clean workflow designed for busy clinical teams.
        </p>
        <form onSubmit={onSubmit} className="form-stack">
          <label htmlFor="email" className="field-label">
            Email ID
          </label>
          <input
            id="email"
            type="email"
            className="text-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="doctor@clinic.com"
            autoComplete="email"
            required
          />
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="text-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter password"
            autoComplete="current-password"
            required
          />
          <div className="row-between" style={{ marginTop: '-2px' }}>
            <span />
            <Link className="inline-link" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <p className="message message-error">{error}</p>}
        </form>
        <div className="auth-switch-row">
          <span className="auth-note">New user?</span>
          <Link className="inline-link" to="/signup">
            Create account
          </Link>
        </div>
        <div className="auth-meta">Protected internal access for authorized staff only.</div>
      </div>
    </div>
  );
}
