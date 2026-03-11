import React, { useState, useEffect } from 'react';
import { matchesApi } from '../api/matchesApi';

function MatchList() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    team: '',
    game_mode: '',
    order: 'desc'
  });

  useEffect(() => {
    loadMatches();
  }, [page, filters]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await matchesApi.getMatches({
        page,
        per_page: 20,
        ...filters
      });
      setMatches(data.matches || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      setError(err.message);
      console.error('Error loading matches:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` 
                 : `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString();
  };

  const teamName = (team) => {
    return team === 0 ? 'Amber' : team === 1 ? 'Sapphire' : 'Unknown';
  };

  if (loading && matches.length === 0) {
    return <div className="container loading">Loading matches...</div>;
  }

  if (error) {
    return (
      <div className="container error">
        <p>Error: {error}</p>
        <button onClick={loadMatches}>Retry</button>
      </div>
    );
  }

  return (
    <div className="container match-list">
      <h2>Recent Matches</h2>
      
      {/* Filters */}
      <div className="filters">
        <label>
          Team:
          <select 
            value={filters.team} 
            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
          >
            <option value="">All Teams</option>
            <option value="0">Amber</option>
            <option value="1">Sapphire</option>
          </select>
        </label>
        
        <label>
          Order:
          <select 
            value={filters.order} 
            onChange={(e) => setFilters({ ...filters, order: e.target.value })}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </label>
        
        <button onClick={() => { setPage(1); loadMatches(); }}>
          Apply Filters
        </button>
      </div>

      {/* Match Table */}
      {matches.length === 0 ? (
        <p className="no-matches">No matches found. Try adding match data with <code>python main.py -matchfile matches.txt</code></p>
      ) : (
        <>
          <table className="match-table">
            <thead>
              <tr>
                <th>Match ID</th>
                <th>Duration</th>
                <th>Winner</th>
                <th>Mode</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.match_id}>
                  <td>
                    <a href={`/matches/${match.match_id}`}>{match.match_id}</a>
                  </td>
                  <td>{formatDuration(match.duration_s)}</td>
                  <td className={`team-${match.winning_team}`}>
                    {teamName(match.winning_team)}
                  </td>
                  <td>{match.game_mode || '-'}</td>
                  <td>{formatDate(match.start_time || match.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="pagination">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              disabled={page === 1}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MatchList;
