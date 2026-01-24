import React, { useEffect, useMemo, useState } from 'react';
import { rankListPlayers, rankAssignTeam, rankClearAll, rankRemovePlayer } from '../utils/api';

const RANK_ORDER = [
  'Initiate', 'Seeker', 'Alchemist', 'Arcanist', 'Ritualist', 'Emissary',
  'Archon', 'Oracle', 'Phantom', 'Ascendant', 'Eternus', 'Obscurus'
];

const getRankIndex = (rank) => {
  if (!rank) return 999;
  // Extract rank name without badge number (e.g., "Phantom 5" -> "Phantom")
  const rankName = rank.split(/\s+/)[0];
  const idx = RANK_ORDER.indexOf(rankName);
  return idx === -1 ? 999 : idx;
};

const formatTime = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleString();
};

function PlayerRow({ p, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {p.avatar && (
          <img src={`https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png`} alt="avatar" width={24} height={24} style={{ borderRadius: '50%' }} />
        )}
        <div>
          <div style={{ fontWeight: 600 }}>{p.username || p.id}</div>
          <div style={{ color: '#b3b3b3', fontSize: 12 }}>{p.rank} • {formatTime(p.submitted_at)}</div>
          <div style={{ color: '#7a7a82', fontSize: 11 }}>ID: {p.id}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>{actions}</div>
    </div>
  );
}

function TeamColumn({ title, color, players, onUnassign }) {
  return (
    <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
      <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
        <strong style={{ color }}>{title}</strong>
        <span style={{ color: '#b3b3b3' }}>{players.length} player(s)</span>
      </div>
      <div style={{ padding: 12, display: 'grid', gap: 8 }}>
        {players.map(p => (
          <PlayerRow key={p.id} p={p} actions={
            <button onClick={() => onUnassign(p)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '6px 10px' }}>Unassign</button>
          } />
        ))}
        {players.length === 0 && <div style={{ color: '#7a7a82' }}>No players</div>}
      </div>
    </div>
  );
}

export function RankAdmin() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sortBy, setSortBy] = useState('time');

  const load = async () => {
    setError('');
    try {
      const data = await rankListPlayers();
      setPlayers(data.players || []);
    } catch (e) {
      setError(e.message || 'Failed to load players');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh every 5s for live updates
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const f = (filter || '').toLowerCase();
    let list = players.filter(p => {
      if (!f) return true;
      return (p.rank || '').toLowerCase().includes(f) || (p.username || '').toLowerCase().includes(f) || String(p.id).includes(f);
    });
    if (sortBy === 'time') list.sort((a, b) => (b.submitted_at || 0) - (a.submitted_at || 0));
    if (sortBy === 'rank') list.sort((a, b) => getRankIndex(a.rank) - getRankIndex(b.rank));
    if (sortBy === 'name') list.sort((a, b) => String(a.username).localeCompare(String(b.username)));
    return list;
  }, [players, filter, sortBy]);

  const amber = filtered.filter(p => p.team === 0);
  const sapphire = filtered.filter(p => p.team === 1);
  const unassigned = filtered.filter(p => p.team !== 0 && p.team !== 1);

  const assign = async (p, team) => {
    try {
      await rankAssignTeam(p.id, team);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to assign');
    }
  };

  const clearAll = async () => {
    if (!confirm('Clear all players and assignments?')) return;
    try {
      await rankClearAll();
      await load();
    } catch (e) {
      alert(e.message || 'Failed to clear');
    }
  };

  const removePlayer = async (p) => {
    if (!confirm(`Remove ${p.username || p.id} from the list?`)) return;
    try {
      await rankRemovePlayer(p.id);
      await load();
    } catch (e) {
      alert(e.message || 'Failed to remove player');
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#ffffff' }}>
      <header style={{
        background: 'linear-gradient(180deg, #1e1e1e 0%, transparent 100%)',
        borderBottom: '1px solid #282828',
        padding: '20px 24px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d8ff', animation: 'pulse 2s infinite' }} />
            <strong>Ranker Admin Panel</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="Filter by name or rank"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ background: '#181818', border: '1px solid #333', color: '#fff', borderRadius: 6, padding: '8px 10px' }}
            />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: '#181818', border: '1px solid #333', color: '#fff', borderRadius: 6, padding: '8px 10px' }}>
              <option value="time">Sort by submit time</option>
              <option value="rank">Sort by rank</option>
              <option value="name">Sort by name</option>
            </select>
            <button onClick={clearAll} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '8px 12px' }}>Clear Players</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '24px auto', padding: '0 24px' }}>
        {loading && <p>Loading…</p>}
        {error && <p style={{ color: '#ff6b6b' }}>{error}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <TeamColumn title="Amber" color="#f3b53f" players={amber} onUnassign={(p) => assign(p, undefined)} />
          <TeamColumn title="Sapphire" color="#4fb5ff" players={sapphire} onUnassign={(p) => assign(p, undefined)} />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
          <div style={{ padding: 12, borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between' }}>
            <strong>Unassigned</strong>
            <span style={{ color: '#b3b3b3' }}>{unassigned.length} player(s)</span>
          </div>
          <div style={{ padding: 12, display: 'grid', gap: 8 }}>
            {unassigned.map(p => (
              <PlayerRow key={p.id} p={p} actions={
                <>
                  <button onClick={() => assign(p, 0)} style={{ background: '#f3b53f', border: 'none', color: '#000', borderRadius: 6, padding: '6px 10px', fontWeight: 700 }}>Amber</button>
                  <button onClick={() => assign(p, 1)} style={{ background: '#4fb5ff', border: 'none', color: '#000', borderRadius: 6, padding: '6px 10px', fontWeight: 700 }}>Sapphire</button>
                  <button
                    onClick={() => removePlayer(p)}
                    title="Remove player"
                    aria-label={`Remove ${p.username || p.id}`}
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '6px 10px', fontWeight: 700 }}
                  >
                    X
                  </button>
                </>
              } />
            ))}
            {unassigned.length === 0 && <div style={{ color: '#7a7a82' }}>No unassigned players</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
