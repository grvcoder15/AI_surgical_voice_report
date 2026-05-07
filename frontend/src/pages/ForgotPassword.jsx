import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await requestPasswordReset(email);
      setMessage(
        response?.message ||
          'If an account exists for this email, a password reset link has been sent.'
      );
    } catch (err) {
      setError(err.message || 'Unable to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Account Recovery</p>
        <h1 className="auth-title">Forgot Password</h1>
        <p className="auth-subtitle">
          Enter your registered email. If the account exists, we will send a reset link.
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

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>

          {message ? <p className="message message-success">{message}</p> : null}
          {error ? <p className="message message-error">{error}</p> : null}
        </form>

        <div className="auth-switch-row">
          <Link className="inline-link" to="/login">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
