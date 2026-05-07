import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getKBHistory } from '../api';

const TOKEN_KEY = 'surgical_token';
const PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

const SORT_OPTIONS = {
  version: ['version-desc', 'version-asc'],
  filename: ['filename-asc', 'filename-desc'],
  createdAt: ['date-desc', 'date-asc']
};

const formatDateTime = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export default function KBHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('version-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getKBHistory();
        setHistory(Array.isArray(data) ? data : []);
        setCurrentPage(1);
      } catch (err) {
        setError(err.message || 'Unable to fetch KB history');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate('/login', { replace: true });
  };

  const sorted = useMemo(() => {
    const items = history.slice();

    switch (sortBy) {
      case 'version-asc':
        return items.sort((a, b) => Number(a.version || 0) - Number(b.version || 0));
      case 'date-desc':
        return items.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case 'date-asc':
        return items.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      case 'filename-asc':
        return items.sort((a, b) => String(a.filename || '').localeCompare(String(b.filename || '')));
      case 'filename-desc':
        return items.sort((a, b) => String(b.filename || '').localeCompare(String(a.filename || '')));
      case 'version-desc':
      default:
        return items.sort((a, b) => Number(b.version || 0) - Number(a.version || 0));
    }
  }, [history, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [pageSize, safeCurrentPage, sorted]);

  const pageNumbers = useMemo(() => {
    const pages = [];
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page);
    }
    return pages;
  }, [totalPages]);

  const onSortChange = (event) => {
    setSortBy(event.target.value);
    setCurrentPage(1);
  };

  const onPageSizeChange = (event) => {
    setPageSize(Number(event.target.value));
    setCurrentPage(1);
  };

  const onHeaderSort = (column) => {
    const options = SORT_OPTIONS[column];
    if (!options) {
      return;
    }

    setSortBy((current) => {
      if (current === options[0]) {
        return options[1];
      }

      if (current === options[1]) {
        return options[0];
      }

      return options[0];
    });
    setCurrentPage(1);
  };

  const getSortIndicator = (column) => {
    const options = SORT_OPTIONS[column];
    if (!options || !options.includes(sortBy)) {
      return ' <>';
    }

    return sortBy === options[0] ? ' ↓' : ' ↑';
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Knowledge Operations</p>
          <h1>KB Upload History</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link to="/upload" className="btn btn-secondary">← Upload</Link>
          <Link to="/settings" className="btn btn-secondary">Settings</Link>
          <Link to="/profile" className="btn btn-secondary">Profile</Link>
          <button type="button" className="btn btn-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="content-wrap">
        <section className="card form-card">
          <div className="row-between" style={{ marginBottom: '0.5rem' }}>
            <div>
              <h2 className="section-title">All KB Versions</h2>
              <p className="subtle-text">Complete history of all knowledge base uploads.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <div className="form-stack" style={{ minWidth: '220px', gap: '0.4rem' }}>
                <label htmlFor="history-sort" className="field-label">
                  Sort By
                </label>
                <select
                  id="history-sort"
                  className="text-input"
                  value={sortBy}
                  onChange={onSortChange}
                >
                  <option value="version-desc">Version: Newest first</option>
                  <option value="version-asc">Version: Oldest first</option>
                  <option value="date-desc">Date: Newest first</option>
                  <option value="date-asc">Date: Oldest first</option>
                  <option value="filename-asc">Filename: A to Z</option>
                  <option value="filename-desc">Filename: Z to A</option>
                </select>
              </div>
              <div className="form-stack" style={{ minWidth: '140px', gap: '0.4rem' }}>
                <label htmlFor="history-page-size" className="field-label">
                  Rows Per Page
                </label>
                <select
                  id="history-page-size"
                  className="text-input"
                  value={pageSize}
                  onChange={onPageSizeChange}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <p className="subtle-text">Loading history...</p>
          ) : error ? (
            <p className="message message-error">{error}</p>
          ) : sorted.length === 0 ? (
            <p className="subtle-text">No KB versions uploaded yet.</p>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border, #e2e8f0)' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-subtle, #64748b)' }}>
                      <button
                        type="button"
                        onClick={() => onHeaderSort('version')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Version{getSortIndicator('version')}
                      </button>
                    </th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-subtle, #64748b)' }}>
                      <button
                        type="button"
                        onClick={() => onHeaderSort('filename')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Filename{getSortIndicator('filename')}
                      </button>
                    </th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-subtle, #64748b)' }}>Agent</th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-subtle, #64748b)' }}>
                      <button
                        type="button"
                        onClick={() => onHeaderSort('createdAt')}
                        style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Uploaded At{getSortIndicator('createdAt')}
                      </button>
                    </th>
                    <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: 'var(--text-subtle, #64748b)' }}>Retell Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((item) => (
                    <tr
                      key={`${item.version}-${item.id}`}
                      style={{ borderBottom: '1px solid var(--border, #e2e8f0)' }}
                    >
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>v{item.version}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>{item.filename}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-subtle, #64748b)' }}>
                        {item.agentName || '—'}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-subtle, #64748b)' }}>
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '0.25rem',
                            background: item.retellSyncStatus === 'synced' ? '#dcfce7' : item.retellSyncStatus === 'local-only' ? '#fef9c3' : '#fee2e2',
                            color: item.retellSyncStatus === 'synced' ? '#166534' : item.retellSyncStatus === 'local-only' ? '#854d0e' : '#991b1b'
                          }}
                        >
                          {item.retellSyncStatus || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="row-between" style={{ marginTop: '1rem', alignItems: 'center' }}>
                <p className="subtle-text" style={{ margin: 0 }}>
                  Showing {(safeCurrentPage - 1) * pageSize + 1} to {Math.min(safeCurrentPage * pageSize, sorted.length)} of {sorted.length} items
                </p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    Prev
                  </button>
                  {pageNumbers.map((page) => (
                    <button
                      key={page}
                      type="button"
                      className={page === safeCurrentPage ? 'btn btn-primary' : 'btn btn-secondary'}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
