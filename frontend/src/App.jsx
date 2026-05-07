import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { hasActiveToken, validateSession } from './api';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import UploadKB from './pages/UploadKB';
import KBHistory from './pages/KBHistory';
import Profile from './pages/Profile';

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let mounted = true;

    const runCheck = async () => {
      if (!hasActiveToken()) {
        if (mounted) {
          setStatus('unauthorized');
        }
        return;
      }

      const ok = await validateSession();
      if (mounted) {
        setStatus(ok ? 'authorized' : 'unauthorized');
      }
    };

    runCheck();

    return () => {
      mounted = false;
    };
  }, []);

  if (status === 'checking') {
    return <div className="page-shell" />;
  }

  if (status !== 'authorized') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function RootRedirect() {
  return <Navigate to={hasActiveToken() ? '/upload' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadKB />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kb-history"
        element={
          <ProtectedRoute>
            <KBHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
