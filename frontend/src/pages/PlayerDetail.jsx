import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function PlayerDetail() {
  const { accountId } = useParams();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlayerData();
  }, [accountId]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      
      // Fetch user info
      const userResponse = await fetch(`/db/users/${accountId}`);
      if (!userResponse.ok) {
        throw new Error('Player not found');
      }
      const userData = await userResponse.json();
      setUser(userData.user);

      // Fetch user stats
      const statsResponse = await fetch(`/db/users/${accountId}/stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      // Fetch recent matches
      const matchesResponse = await fetch(`/db/users/${accountId}/matches`);
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData.matches || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const teamName = (team) => {
    return team === 0 ? 'Amber' : team === 1 ? 'Sapphire' : 'Unknown';
  };

  if (loading) {
    return (
      <div className="w-full p-8">
        <div className="text-center text-xl">Loading player details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-8">
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Match List
      </Link>

      {/* Player Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{user?.persona_name || 'Unknown Player'}</h1>
        <p className="text-gray-600">Account ID: {accountId}</p>
      </div>

      {/* Player Stats */}
      {stats && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Total Matches</p>
              <p className="text-2xl font-bold">{stats.total_matches || 0}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Wins</p>
              <p className="text-2xl font-bold text-green-600">{stats.total_wins || 0}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Losses</p>
              <p className="text-2xl font-bold text-red-600">{stats.total_losses || 0}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Win Rate</p>
              <p className="text-2xl font-bold">
                {stats.total_matches > 0 
                  ? ((stats.total_wins / stats.total_matches) * 100).toFixed(1) + '%'
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Matches */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Matches</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Match</th>
              <th className="text-left p-3">Hero</th>
              <th className="text-left p-3">Result</th>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">K/D/A</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No matches found
                </td>
              </tr>
            ) : (
              matches.slice(0, 20).map((match) => (
                <tr key={match.match_id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Link 
                      to={`/match/${match.match_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {match.match_id}
                    </Link>
                  </td>
                  <td className="p-3">{match.hero_name || match.hero_id || '-'}</td>
                  <td className="p-3">
                    <span className={`font-semibold ${
                      match.result === 'Win' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {match.result || '-'}
                    </span>
                  </td>
                  <td className="p-3">{teamName(match.team)}</td>
                  <td className="p-3">
                    {match.kills || 0} / {match.deaths || 0} / {match.assists || 0}
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {formatDate(match.start_time || match.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PlayerDetail;
