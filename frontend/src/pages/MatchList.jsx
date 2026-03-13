import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function MatchList() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 20;

  useEffect(() => {
    fetchMatches();
  }, [page]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/db/matches/latest/paged?page=${page}&per_page=${perPage}`);
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      } 
      const data = await response.json();
      setMatches(data.matches || []);
      setTotalPages(data.total_pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message);
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
        <div className="text-center text-xl">Loading matches...</div>
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
      <h1 className="text-3xl font-bold mb-6">Match List</h1>
      
      {/* Filters Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        {/* Filter controls will go here */}
      </div>

      {/* Match Table */}
      <div className="bg-white shadow rounded-lg p-6">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4">Match ID</th>
              <th className="text-left p-4">Duration</th>
              <th className="text-left p-4">Date</th>
              <th className="text-left p-4">Winner</th>
            </tr>
          </thead>
          <tbody>
            {matches.length === 0 ? (
              <tr>
                <td colSpan="4" className="p-4 text-center text-gray-500">
                  No matches found
                </td>
              </tr>
            ) : (
              matches.map((match) => (
                <tr key={match.match_id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <Link 
                      to={`/match/${match.match_id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {match.match_id}
                    </Link>
                  </td>
                  <td className="p-4">{formatDuration(match.duration_s)}</td>
                  <td className="p-4">{formatDate(match.start_time)}</td>
                  <td className="p-4">{teamName(match.winning_team)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <div className="text-sm text-gray-600">
            Showing {matches.length > 0 ? ((page - 1) * perPage) + 1 : 0} to {Math.min(page * perPage, total)} of {total} matches
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MatchList;
