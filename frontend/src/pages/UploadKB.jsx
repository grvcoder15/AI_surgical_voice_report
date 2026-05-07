import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { disconnectRetell, getKBHistory, getRetellStatus, uploadKB } from '../api';

const TOKEN_KEY = 'surgical_token';
const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const isAllowedFile = (file) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
};

export default function UploadKB() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [history, setHistory] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [targetAgent, setTargetAgent] = useState(null);
  const [processingSteps, setProcessingSteps] = useState([]);

  const currentVersion = useMemo(() => {
    if (!history.length) {
      return null;
    }

    const sorted = [...history].sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
    return sorted[0];
  }, [history]);

  const onLogout = async () => {
    try {
      await disconnectRetell();
    } catch (err) {
      // Ignore disconnect failures on logout.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      navigate('/login', { replace: true });
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    setError('');

    try {
      const data = await getKBHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Unable to fetch KB history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await loadHistory();

      try {
        const status = await getRetellStatus();
        if (status?.connected && status?.agentId) {
          setTargetAgent({ id: status.agentId, name: status.agentName || status.agentId });
        } else {
          setTargetAgent(null);
        }
      } catch (err) {
        setTargetAgent(null);
      }
    };

    loadInitialData();
  }, []);

  const pickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFile = (file) => {
    setMessage('');
    setError('');

    if (!file) {
      return;
    }

    if (!isAllowedFile(file)) {
      setSelectedFile(null);
      setError('Only PDF, DOCX, and TXT files are allowed');
      return;
    }

    setSelectedFile(file);
  };

  const onFileInputChange = (event) => {
    const file = event.target.files?.[0];
    handleFile(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setMessage('');
    setProcessingSteps([
      { step: 'upload_start', status: 'in-progress', message: 'Upload started', timestamp: new Date().toISOString() }
    ]);

    try {
      const result = await uploadKB(selectedFile, setUploadProgress);
      setMessage(
        `Knowledge Base updated to Version ${result.version} for ${result.agentName || result.agentId || 'selected agent'}`
      );
      setProcessingSteps(Array.isArray(result.steps) ? result.steps : []);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Upload failed');
      setProcessingSteps((prev) => [
        ...prev,
        { step: 'upload_failed', status: 'failed', message: err.message || 'Upload failed', timestamp: new Date().toISOString() }
      ]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Knowledge Operations</p>
          <h1>Knowledge Base Manager</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/kb-history" className="btn btn-secondary">History</Link>
          <Link to="/settings" className="btn btn-secondary">Settings</Link>
          <Link to="/profile" className="btn btn-secondary">Profile</Link>
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="content-wrap">
        <section className="card form-card">
          <div className="row-between">
            <h2 className="section-title">Current Version</h2>
            <Link to="/settings" className="inline-link">
              Settings
            </Link>
          </div>

          <div className="status-box">
            {currentVersion ? (
              <>
                <p className="message message-success">
                  Version {currentVersion.version} - {currentVersion.filename}
                </p>
                <p className="subtle-text">Uploaded: {formatDateTime(currentVersion.createdAt)}</p>
              </>
            ) : (
              <p className="subtle-text">No versions uploaded yet.</p>
            )}
          </div>

          <h2 className="section-title">Upload New Knowledge Base</h2>
          <p className="subtle-text">Accepted formats: PDF, DOCX, TXT. Drop file below or browse manually.</p>

          {targetAgent ? (
            <p className="subtle-text">
              Target agent: <strong>{targetAgent.name}</strong>
            </p>
          ) : (
            <p className="message message-error">No agent selected. Please configure agent in Settings first.</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden-input"
            accept=".pdf,.docx,.txt"
            onChange={onFileInputChange}
          />

          <div
            className={`drag-area ${dragActive ? 'drag-area-active' : ''}`}
            onClick={pickFile}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                pickFile();
              }
            }}
          >
            <p>Drop PDF, Word, or TXT here</p>
            <p className="subtle-text">or click to browse</p>
          </div>

          {selectedFile ? <p className="subtle-text">Selected file: {selectedFile.name}</p> : null}

          <button
            type="button"
            className="btn btn-primary"
            onClick={onUpload}
            disabled={uploading || !targetAgent}
          >
            {uploading ? 'Uploading and Updating...' : 'Upload & Update'}
          </button>

          {uploading ? <p className="subtle-text">Upload progress: {uploadProgress}%</p> : null}
          {message ? <p className="message message-success">{message}</p> : null}
          {error ? <p className="message message-error">{error}</p> : null}

          {processingSteps.length ? (
            <div className="steps-box">
              <h3 className="section-title">Processing Steps</h3>
              <ul className="steps-list">
                {processingSteps.map((item, index) => (
                  <li key={`${item.step}-${index}`} className={`step-item step-${item.status}`}>
                    <span className="step-label">{item.step.replace(/_/g, ' ')}</span>
                    <span className="step-message">{item.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <hr className="divider" />
          <h2 className="section-title">Upload History</h2>
          <p className="subtle-text">Recent KB versions available for audit and rollback reference.</p>

          {loadingHistory ? (
            <p className="subtle-text">Loading history...</p>
          ) : (
            <>
              <ul className="history-list">
                {history
                  .slice()
                  .sort((a, b) => Number(b.version || 0) - Number(a.version || 0))
                  .slice(0, 5)
                  .map((item) => (
                    <li key={`${item.version}-${item.filename}-${item.createdAt}`} className="history-item">
                      <span>v{item.version}</span>
                      <span>{item.filename}</span>
                      <span className="subtle-text">{item.agentName || '—'}</span>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </li>
                  ))}
              </ul>
              {history.length > 5 && (
                <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                  <Link to="/kb-history" className="inline-link">
                    More ({history.length - 5} more) →
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
