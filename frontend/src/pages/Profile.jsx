import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { changePassword, getProfile, updatePhone } from '../api';

const TOKEN_KEY = 'surgical_token';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Phone edit state
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState('');
  const [passError, setPassError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoadingProfile(true);
      try {
        const data = await getProfile();
        setProfile(data);
        setPhoneValue(data.phone || '');
      } catch (err) {
        // profile load error — will show empty state
      } finally {
        setLoadingProfile(false);
      }
    };
    load();
  }, []);

  const onLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/login', { replace: true });
  };

  const onSavePhone = async () => {
    setPhoneMsg('');
    setPhoneError('');
    if (!phoneValue.trim()) {
      setPhoneError('Phone number cannot be empty');
      return;
    }
    setPhoneLoading(true);
    try {
      const updated = await updatePhone(phoneValue.trim());
      setProfile((prev) => ({ ...prev, phone: updated.phone }));
      setPhoneMsg('Phone number updated successfully');
      setEditingPhone(false);
    } catch (err) {
      setPhoneError(err.message || 'Failed to update phone number');
    } finally {
      setPhoneLoading(false);
    }
  };

  const onChangePassword = async (e) => {
    e.preventDefault();
    setPassMsg('');
    setPassError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPassError('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    setPassLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPassMsg('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassError(err.message || 'Failed to change password');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Profile</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/upload" className="btn btn-secondary">← Upload</Link>
          <Link to="/kb-history" className="btn btn-secondary">History</Link>
          <Link to="/settings" className="btn btn-secondary">Settings</Link>
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="content-wrap">
        <section className="card form-card">

          {/* Profile Info */}
          <h2 className="section-title">Account Details</h2>

          {loadingProfile ? (
            <p className="subtle-text">Loading profile...</p>
          ) : (
            <div className="status-box" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '10px 16px', fontSize: '0.94rem' }}>
                <span className="subtle-text" style={{ fontWeight: 700 }}>Email</span>
                <span>{profile?.email || '—'}</span>

                <span className="subtle-text" style={{ fontWeight: 700 }}>Phone</span>
                <span>{profile?.phone || '—'}</span>

                <span className="subtle-text" style={{ fontWeight: 700 }}>Member Since</span>
                <span>{formatDate(profile?.createdAt)}</span>
              </div>
            </div>
          )}

          <hr className="divider" />

          {/* Edit Phone */}
          <h2 className="section-title">Update Phone Number</h2>
          <div className="form-stack" style={{ maxWidth: '420px' }}>
            <label className="field-label" htmlFor="phone-input">Phone Number</label>
            {editingPhone ? (
              <>
                <input
                  id="phone-input"
                  className="text-input"
                  type="tel"
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                  placeholder="Enter new phone number"
                  disabled={phoneLoading}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onSavePhone}
                    disabled={phoneLoading}
                  >
                    {phoneLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingPhone(false);
                      setPhoneValue(profile?.phone || '');
                      setPhoneError('');
                      setPhoneMsg('');
                    }}
                    disabled={phoneLoading}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => {
                  setEditingPhone(true);
                  setPhoneMsg('');
                  setPhoneError('');
                }}
              >
                Edit Phone Number
              </button>
            )}
            {phoneMsg ? <p className="message message-success">{phoneMsg}</p> : null}
            {phoneError ? <p className="message message-error">{phoneError}</p> : null}
          </div>

          <hr className="divider" />

          {/* Change Password */}
          <h2 className="section-title">Change Password</h2>
          <form className="form-stack" style={{ maxWidth: '420px' }} onSubmit={onChangePassword}>
            <label className="field-label" htmlFor="current-pass">Current Password</label>
            <input
              id="current-pass"
              className="text-input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              disabled={passLoading}
              autoComplete="current-password"
            />

            <label className="field-label" htmlFor="new-pass">New Password</label>
            <input
              id="new-pass"
              className="text-input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 6 characters"
              disabled={passLoading}
              autoComplete="new-password"
            />

            <label className="field-label" htmlFor="confirm-pass">Confirm New Password</label>
            <input
              id="confirm-pass"
              className="text-input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              disabled={passLoading}
              autoComplete="new-password"
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={passLoading}
            >
              {passLoading ? 'Changing...' : 'Change Password'}
            </button>

            {passMsg ? <p className="message message-success">{passMsg}</p> : null}
            {passError ? <p className="message message-error">{passError}</p> : null}
          </form>

        </section>
      </main>
    </div>
  );
}
