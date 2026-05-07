import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../api';

const TOKEN_KEY = 'surgical_token';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      navigate('/upload', { replace: true });
    }
  }, [navigate]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signup({ email, password, phoneNumber });
      localStorage.removeItem(TOKEN_KEY);
      navigate('/login', { replace: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Clinical Workspace</p>
        <h1 className="auth-title">Create Your Account</h1>
        <p className="auth-subtitle">
          Register your clinic access with email, password, and phone number to enter the knowledge base workspace.
        </p>
        <form onSubmit={onSubmit} className="form-stack">
          <label htmlFor="signup-email" className="field-label">
            Email ID
          </label>
          <input
            id="signup-email"
            type="email"
            className="text-input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="doctor@clinic.com"
            autoComplete="email"
            required
          />

          <label htmlFor="signup-phone" className="field-label">
            Phone No.
          </label>
          <input
            id="signup-phone"
            type="tel"
            className="text-input"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="9876543210"
            autoComplete="tel"
            required
          />

          <label htmlFor="signup-password" className="field-label">
            Password
          </label>
          <input
            id="signup-password"
            type="password"
            className="text-input"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Create password"
            autoComplete="new-password"
            required
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
          {error && <p className="message message-error">{error}</p>}
        </form>
        <div className="auth-switch-row">
          <span className="auth-note">Already registered?</span>
          <Link className="inline-link" to="/login">
            Sign in
          </Link>
        </div>
        <div className="auth-meta">Protected internal access for authorized staff only.</div>
      </div>
    </div>
  );
}