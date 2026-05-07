import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordWithToken } from '../api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = useMemo(() => String(searchParams.get('token') || ''), [searchParams]);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Reset token missing. Please use the link from your email.');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('Please fill all fields');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await resetPasswordWithToken(token, newPassword);
      setMessage(response?.message || 'Password reset successful. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (err) {
      setError(err.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Account Recovery</p>
        <h1 className="auth-title">Set New Password</h1>
        <p className="auth-subtitle">Choose a new password for your account.</p>

        <form onSubmit={onSubmit} className="form-stack">
          <label htmlFor="newPassword" className="field-label">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            className="text-input"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Min 6 characters"
            autoComplete="new-password"
            required
          />

          <label htmlFor="confirmPassword" className="field-label">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="text-input"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
            required
          />

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Updating password...' : 'Reset Password'}
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
