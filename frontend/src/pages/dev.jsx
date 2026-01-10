import React, { useState, useEffect, useRef, useMemo } from 'react';
import { acceptRecording, rejectRecording, downloadAccepted, downloadAll, acceptAllPending } from '../utils/api';
import { showSuccess, showError, showInfo } from '../utils/toast';

export function SoundsDev() {
  const [uploads, setUploads] = useState({});
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [textFilter, setTextFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');
  const audioRef = useRef(null);
  const [previewing, setPreviewing] = useState(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const res = await fetch('/sounds/api/uploads');
      if (!res.ok) {
        if (res.status === 403) {
          window.location.href = '/sounds';
          return;
        }
        throw new Error('Failed to load uploads');
      }
      const data = await res.json();
      setUploads(data.uploads || {});
      setAcceptedCount(data.accepted_count || 0);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      showError('Failed to load uploads: ' + err.message);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptRecording(id);
      showSuccess('Recording accepted');
      loadUploads();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleReject = async (id) => {
    if (!confirm('Are you sure you want to reject and delete this recording?')) return;
    try {
      await rejectRecording(id);
      showSuccess('Recording rejected and deleted');
      loadUploads();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleAcceptAll = async () => {
    if (!confirm('Accept all pending recordings?')) return;
    try {
      const res = await acceptAllPending();
      showSuccess(`Accepted ${res.accepted || 0} recording(s)`);
      loadUploads();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDownloadAccepted = async () => {
    try {
      const blob = await downloadAccepted();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accepted_${Date.now()}.zip`;
      a.click();
      showSuccess('Download started');
      setShowDownloadModal(false);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDownloadAll = async () => {
    try {
      const blob = await downloadAll();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_recordings_${Date.now()}.zip`;
      a.click();
      showSuccess('Download started');
      setShowDownloadModal(false);
    } catch (err) {
      showError(err.message);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getStatusBadge = (status) => {
    const colors = {
      accepted: { bg: 'rgba(29, 185, 84, 0.2)', color: '#1ed760', border: 'rgba(29, 185, 84, 0.4)' },
      pending: { bg: 'rgba(255, 255, 255, 0.1)', color: '#b3b3b3', border: 'rgba(255, 255, 255, 0.2)' },
      rejected: { bg: 'rgba(176, 0, 32, 0.2)', color: '#ff6b6b', border: 'rgba(176, 0, 32, 0.4)' },
    };
    const style = colors[status] || colors.pending;
    return (
      <span style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}>
        {status}
      </span>
    );
  };

  const uploadEntries = Object.entries(uploads);
  const totalUploads = uploadEntries.length;

  const filteredEntries = useMemo(() => {
    return uploadEntries.filter(([_, entry]) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (textFilter) {
        const t = textFilter.toLowerCase();
        if (!entry.filename.toLowerCase().includes(t) && !(entry.path || '').toLowerCase().includes(t)) return false;
      }
      if (pathFilter) {
        const p = pathFilter.toLowerCase();
        if (!(entry.path || '').toLowerCase().startsWith(p)) return false;
      }
      return true;
    });
  }, [uploadEntries, statusFilter, textFilter, pathFilter]);

  const handlePreview = (entry) => {
    const url = `/sounds/recorded/${entry.saved_to}`;
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play().catch(() => {});
      setPreviewing(entry);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#ffffff' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(180deg, #1e1e1e 0%, transparent 100%)',
        borderBottom: '1px solid #282828',
        padding: '20px 24px',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '18px',
            fontWeight: 600,
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#1db954',
              animation: 'pulse 2s infinite',
            }}></div>
            <span>Wavebox Dev Panel</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              onClick={handleAcceptAll}
              disabled={pendingCount === 0}
              style={{
                background: pendingCount > 0 ? 'linear-gradient(90deg, #1db954, #1ed760)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: pendingCount > 0 ? '#000' : '#b3b3b3',
                padding: '10px 18px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: pendingCount > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
            >
              ✓ Accept All Pending
            </button>
            <button
              onClick={() => setShowDownloadModal(true)}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              📥 Download
            </button>
            <a href="/sounds" style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '10px 18px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-block',
            }}>
              🏠 Home
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '8px' }}>Uploaded Recordings</h2>
        <div style={{ color: '#b3b3b3', marginBottom: '28px', fontSize: '14px' }}>
          Review and manage user-submitted audio files
        </div>

        {/* Stats Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(29, 185, 84, 0.1), rgba(29, 185, 84, 0.05))',
          border: '1px solid rgba(29, 185, 84, 0.3)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '28px',
          display: 'flex',
          gap: '32px',
          flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: '12px', color: '#b3b3b3', marginBottom: '4px' }}>Total</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff' }}>{totalUploads}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#b3b3b3', marginBottom: '4px' }}>Accepted</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#1ed760' }}>{acceptedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#b3b3b3', marginBottom: '4px' }}>Pending</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: '#ffa500' }}>{pendingCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <input
            placeholder="Filter by filename or path"
            value={textFilter}
            onChange={(e) => setTextFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #282828', background: '#1b1b1b', color: '#fff' }}
          />
          <input
            placeholder="Path prefix (e.g. vo/astro)"
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #282828', background: '#1b1b1b', color: '#fff' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #282828', background: '#1b1b1b', color: '#fff' }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Preview player */}
        <div style={{ background: '#1e1e1e', border: '1px solid #282828', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: '#b3b3b3', fontSize: '13px' }}>
            {previewing ? `Previewing: ${previewing.filename} (${previewing.path})` : 'Select a row to preview'}
          </div>
          <audio ref={audioRef} controls style={{ width: '320px' }} />
        </div>

        {/* Table */}
        {totalUploads === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#b3b3b3' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📁</div>
            <p>No uploads yet</p>
          </div>
        ) : (
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #282828',
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #282828',
                    color: '#b3b3b3',
                  }}>Filename</th>
                  <th style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #282828',
                    color: '#b3b3b3',
                  }}>Path</th>
                  <th style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #282828',
                    color: '#b3b3b3',
                  }}>Status</th>
                  <th style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #282828',
                    color: '#b3b3b3',
                  }}>Uploader</th>
                  <th style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #282828',
                    color: '#b3b3b3',
                  }}>Date</th>
                  <th style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #282828',
                    color: '#b3b3b3',
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(([id, entry]) => (
                  <tr
                    key={id}
                    style={{
                      background: entry.status === 'accepted' ? 'rgba(29, 185, 84, 0.05)' : entry.status === 'rejected' ? 'rgba(176, 0, 32, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (entry.status === 'accepted') e.currentTarget.style.background = 'rgba(29, 185, 84, 0.1)';
                      else if (entry.status === 'rejected') e.currentTarget.style.background = 'rgba(176, 0, 32, 0.12)';
                      else e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (entry.status === 'accepted') e.currentTarget.style.background = 'rgba(29, 185, 84, 0.05)';
                      else if (entry.status === 'rejected') e.currentTarget.style.background = 'rgba(176, 0, 32, 0.08)';
                      else e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                  >
                    <td style={{ padding: '16px', borderBottom: '1px solid #282828' }}>
                      <div style={{ fontWeight: 600 }}>{entry.filename}</div>
                      <button
                        onClick={() => handlePreview(entry)}
                        style={{ marginTop: '8px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid #282828', color: '#fff', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ▶ Preview
                      </button>
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #282828' }}>
                      <div style={{ fontSize: '12px', color: '#b3b3b3' }}>{entry.path}</div>
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #282828' }}>
                      {getStatusBadge(entry.status)}
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #282828' }}>
                      <div style={{ fontSize: '14px' }}>{entry.user?.name || entry.user?.username || 'Unknown'}</div>
                      <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '4px' }}>ID: {entry.user?.id}</div>
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #282828' }}>
                      <div style={{ fontSize: '12px', color: '#b3b3b3' }}>{formatDate(entry.timestamp)}</div>
                    </td>
                    <td style={{ padding: '16px', borderBottom: '1px solid #282828' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleAccept(id)}
                          disabled={entry.status === 'accepted'}
                          style={{
                            background: entry.status === 'accepted' ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(90deg, #1db954, #1ed760)',
                            border: 'none',
                            color: entry.status === 'accepted' ? '#b3b3b3' : '#000',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            cursor: entry.status === 'accepted' ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() => handleReject(id)}
                          style={{
                            background: 'linear-gradient(90deg, #b00020, #cf3c3c)',
                            border: 'none',
                            color: '#ffffff',
                            padding: '8px 14px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Download Modal */}
      {showDownloadModal && (
        <>
          <div
            onClick={() => setShowDownloadModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 999,
            }}
          ></div>
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#1e1e1e',
            border: '1px solid #282828',
            borderRadius: '12px',
            padding: '32px',
            zIndex: 1000,
            minWidth: '400px',
          }}>
            <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>Download Recordings</h3>
            <p style={{ marginBottom: '24px', color: '#b3b3b3', fontSize: '14px' }}>
              Choose which recordings to download as a ZIP file:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleDownloadAccepted}
                style={{
                  background: 'linear-gradient(90deg, #1db954, #1ed760)',
                  border: 'none',
                  color: '#000',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📦 Accepted Only</span>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>{acceptedCount} files</span>
                </div>
              </button>
              <button
                onClick={handleDownloadAll}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>📦 All Recordings</span>
                  <span style={{ fontSize: '12px', opacity: 0.8 }}>{totalUploads} files</span>
                </div>
              </button>
              <button
                onClick={() => setShowDownloadModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#b3b3b3',
                  padding: '14px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '100%',
                  marginTop: '8px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
