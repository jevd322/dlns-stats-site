import React, { useState, useEffect } from 'react';

function Stats() {
  const [matches, setMatches] = useState([]);
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all matches to compute stats
      const matchesResponse = await fetch('/db/matches/latest');
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData.matches || []);
      }

      // Fetch heroes
      const heroesResponse = await fetch('/db/heroes');
      if (heroesResponse.ok) {
        const heroesData = await heroesResponse.json();
        setHeroes(heroesData);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-8">
        <div className="text-center text-xl">Loading statistics...</div>
      </div>
    );
  }

  // Calculate stats
  const totalMatches = matches.length;
  const amberWins = matches.filter(m => m.winning_team === 0).length;
  const sapphireWins = matches.filter(m => m.winning_team === 1).length;
  const avgDuration = matches.length > 0 
    ? Math.round(matches.reduce((sum, m) => sum + (m.duration_s || 0), 0) / matches.length)
    : 0;

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full p-8">
      <h1 className="text-3xl text-white font-bold mb-6">Statistics</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Total Matches</p>
          <p className="text-4xl font-bold">{totalMatches}</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Amber Wins</p>
          <p className="text-4xl font-bold text-amber-600">{amberWins}</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalMatches > 0 ? ((amberWins / totalMatches) * 100).toFixed(1) : 0}% win rate
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Sapphire Wins</p>
          <p className="text-4xl font-bold text-blue-600">{sapphireWins}</p>
          <p className="text-sm text-gray-500 mt-1">
            {totalMatches > 0 ? ((sapphireWins / totalMatches) * 100).toFixed(1) : 0}% win rate
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-600 text-sm mb-2">Avg Match Duration</p>
          <p className="text-4xl font-bold">{formatDuration(avgDuration)}</p>
        </div>
      </div>

      {/* Recent Matches Summary */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Longest Match</span>
            <span className="font-semibold">
              {matches.length > 0 
                ? formatDuration(Math.max(...matches.map(m => m.duration_s || 0)))
                : '0:00'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-gray-600">Shortest Match</span>
            <span className="font-semibold">
              {matches.length > 0 
                ? formatDuration(Math.min(...matches.filter(m => m.duration_s > 0).map(m => m.duration_s)))
                : '0:00'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-600">Total Heroes Available</span>
            <span className="font-semibold">{Object.keys(heroes).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Stats;
