import React, { useEffect, useState } from 'react';
import { rankGetMe, rankSubmit } from '../utils/api';

function Badge({ children, color = '#1db954' }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: 600,
      letterSpacing: '0.3px',
      background: 'rgba(255,255,255,0.08)',
      border: `1px solid ${color}`,
      color: color,
    }}>{children}</span>
  );
}

export function RankApp() {
  const [me, setMe] = useState(null);
  const [rank, setRank] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await rankGetMe();
      setMe(data);
      setRank(data.rank || '');
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await rankSubmit(rank.trim());
      setSuccess('Rank submitted');
      await load();
    } catch (e) {
      setError(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const teamName = (t) => t === 0 ? 'Amber' : t === 1 ? 'Sapphire' : 'Unassigned';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#ffffff' }}>
      <header style={{
        background: 'linear-gradient(180deg, #1e1e1e 0%, transparent 100%)',
        borderBottom: '1px solid #282828',
        padding: '20px 24px',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1db954', animation: 'pulse 2s infinite' }} />
            <strong>Rank Submission</strong>
          </div>
          {me && <Badge color="#1ed760">Logged in as {me.username}</Badge>}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '24px auto', padding: '0 24px' }}>
        {loading && <p>Loading…</p>}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}
        {success && <p style={{ color: '#1ed760' }}>{success}</p>}

        {me && (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 16 }}>
            <p style={{ marginBottom: 12, color: '#b3b3b3' }}>Submit your current rank. Admins will sort players into teams.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="e.g. Gold 3, Diamond, 2200 MMR"
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                style={{
                  flex: 1,
                  background: '#181818',
                  border: '1px solid #333',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '10px 12px',
                }}
              />
              <button
                type="submit"
                disabled={submitting || !rank.trim()}
                style={{
                  background: rank.trim() ? 'linear-gradient(90deg, #1db954, #1ed760)' : 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: rank.trim() ? '#000' : '#b3b3b3',
                  padding: '10px 18px',
                  borderRadius: 6,
                  fontWeight: 600,
                  cursor: rank.trim() ? 'pointer' : 'not-allowed',
                }}
              >Submit</button>
            </form>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <Badge>Current Rank: {me.rank || '—'}</Badge>
              <Badge color="#00d8ff">Team: {teamName(me.team)}</Badge>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
