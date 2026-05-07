import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { connectRetell, disconnectRetell, getAgents, getRetellStatus } from '../api';

const TOKEN_KEY = 'surgical_token';

export default function Settings() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [savingAgent, setSavingAgent] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const showDropdown = useMemo(() => agents.length > 1, [agents.length]);

  const onLogout = async () => {
    try {
      await disconnectRetell();
    } catch (err) {
      // Ignore disconnect failures during logout to keep exit path simple.
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      navigate('/login', { replace: true });
    }
  };

  const loadStatusAndAgents = async () => {
    setLoadingStatus(true);
    setError('');

    try {
      const status = await getRetellStatus();
      setConnected(Boolean(status.connected));
      setAgentName(status.agentName || '');

      if (status.connected) {
        const list = await getAgents();
        setAgents(Array.isArray(list) ? list : []);

        if (Array.isArray(list) && list.length === 1) {
          setSelectedAgentId(list[0].id);
        } else if (status.agentId) {
          setSelectedAgentId(status.agentId);
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to load settings');
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatusAndAgents();
  }, []);

  const onConnect = async () => {
    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await connectRetell(apiKey, null, null);
      setSuccess('Connected successfully');
      if (Array.isArray(response?.agents)) {
        setAgents(response.agents);
      }
      await loadStatusAndAgents();
    } catch (err) {
      setError(err.message || 'Failed to connect Retell');
    } finally {
      setConnecting(false);
    }
  };

  const onSaveAgent = async () => {
    if (!selectedAgentId) {
      setError('Please select an agent first');
      return;
    }

    setSavingAgent(true);
    setError('');
    setSuccess('');

    try {
      const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);
      await connectRetell(null, selectedAgentId, selectedAgent?.name || null);
      setSuccess('Agent selection saved');
      await loadStatusAndAgents();
    } catch (err) {
      setError(err.message || 'Failed to save agent selection');
    } finally {
      setSavingAgent(false);
    }
  };

  const onDisconnect = async () => {
    setDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      await disconnectRetell();
      setConnected(false);
      setApiKey('');
      setAgents([]);
      setSelectedAgentId('');
      setAgentName('');
      setSuccess('Disconnected successfully');
    } catch (err) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Configuration</p>
          <h1>Retell Connection Settings</h1>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onLogout}>
          Logout
        </button>
      </header>

      <main className="content-wrap">
        <section className="card form-card">
          <div className="row-between">
            <h2 className="section-title">Connection Health</h2>
            <span className={connected ? 'status-chip status-chip-success' : 'status-chip status-chip-error'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {loadingStatus ? <p>Loading settings...</p> : null}

          <p className="subtle-text">Add or update your Retell key to keep voice-agent sync active.</p>

          <div className={connected ? 'key-panel key-panel-faded' : 'key-panel'}>
            <label htmlFor="apiKey" className="field-label">
              Retell API Key
            </label>
            <input
              id="apiKey"
              type="password"
              className="text-input"
              placeholder="sk-ret-..."
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              disabled={connected}
            />

            {!connected ? (
              <button type="button" className="btn btn-primary" onClick={onConnect} disabled={connecting}>
                {connecting ? 'Connecting...' : 'Save & Connect'}
              </button>
            ) : (
              <div className="row-between">
                <p className="subtle-text">API key locked while connected.</p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            )}
          </div>

          <p className={connected ? 'message message-success' : 'message message-error'}>
            {connected ? 'Connected' : 'Not connected'}
          </p>

          {connected ? <hr className="divider" /> : null}

          {connected && showDropdown ? (
            <>
              <p className="subtle-text">Choose which live agent should receive the refreshed knowledge base.</p>
              <label htmlFor="agentSelect" className="field-label">
                Select Agent
              </label>
              <select
                id="agentSelect"
                className="text-input"
                value={selectedAgentId}
                onChange={(event) => setSelectedAgentId(event.target.value)}
              >
                <option value="">Select an agent</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onSaveAgent}
                disabled={savingAgent}
              >
                {savingAgent ? 'Saving...' : 'Save Agent Selection'}
              </button>
            </>
          ) : null}

          {connected && agents.length === 1 ? (
            <p className="message message-success">Agent selected: {agents[0].name}</p>
          ) : null}

          {connected && agentName ? (
            <p className="message message-success">Agent selected: {agentName}</p>
          ) : null}

          {success ? <p className="message message-success">{success}</p> : null}
          {error ? <p className="message message-error">{error}</p> : null}

          <div className="row-end">
            <Link className="btn btn-primary" to="/upload">
              Go to Upload KB
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
