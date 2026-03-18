import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeroes();
    fetchMatchPlayers();
    fetchMatchList();
  }, [matchId]);

  const fetchHeroes = async () => {
    try {
      const response = await fetch('/db/heroes');
      if (response.ok) {
        const data = await response.json();
        setHeroes(data);
      }
    } catch (err) {
      console.error('Failed to fetch heroes:', err);
    }
  };

  const fetchMatchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/db/matches/${matchId}/players`);
      if (!response.ok) {
        throw new Error('Failed to fetch match details');
      }
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchList = async () => {
    try {
      const response = await fetch('/db/matches/latest');
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error('Failed to fetch match list:', err);
    }
  };

  const getHeroName = (heroId) => {
    const hero = heroes[heroId];
    return hero?.name || hero || `Hero ${heroId}`;
  };

  const getHeroIcon = (heroId) => {
    const heroName = getHeroName(heroId);
    // Convert hero name to lowercase and replace spaces with underscores
    const formattedName = heroName.toLowerCase().replace(/\s+/g, '_');
    return `/static/images/hero icons/${formattedName}_sm_psd.png`;
  };

  const currentIndex = matches.findIndex(m => m.match_id === parseInt(matchId));
  const currentMatch = currentIndex >= 0 ? matches[currentIndex] : null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < matches.length - 1;
  const previousMatchId = hasPrevious ? matches[currentIndex - 1].match_id : null;
  const nextMatchId = hasNext ? matches[currentIndex + 1].match_id : null;

  const teamName = (team) => {
    return team === 0 ? 'Amber' : team === 1 ? 'Sapphire' : 'Unknown';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="w-full p-8">
        <div className="text-center text-xl">Loading match details...</div>
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

  // Separate players by team
  const amberPlayers = players.filter(p => p.team === 0);
  const sapphirePlayers = players.filter(p => p.team === 1);

  return (
    <div className="w-full p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="text-blue-600 hover:underline">
          ← Back to Match List
        </Link>
        
        {/* Match Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => previousMatchId && navigate(`/match/${previousMatchId}`)}
            disabled={!hasPrevious}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ← Previous Match
          </button>
          <button
            onClick={() => nextMatchId && navigate(`/match/${nextMatchId}`)}
            disabled={!hasNext}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next Match →
          </button>
        </div>
      </div>
      
      <h1 className="text-gray-300 text-3xl font-bold mb-2">Match {matchId}</h1>
      {currentMatch && currentMatch.start_time && (
        <p className="text-gray-500 mb-6">
          {formatDate(currentMatch.start_time)}
        </p>
      )}

      {/* Team Amber */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-amber-600">Team Amber</h2>
        <div className="bg-panel text-gray-300 shadow rounded-lg p-6 ">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 w-[20%]">Player</th>
                <th className="text-left p-3 w-[13%]">K/D/A</th>
                <th className="text-left p-3 w-[13%]">Souls</th>
                <th className="text-left p-3 w-[13%]">Player DMG</th>
                <th className="text-left p-3 w-[13%]">Obj DMG</th>
                <th className="text-left p-3 w-[28%]">Items</th>
              </tr>
            </thead>
            <tbody>
              {amberPlayers.map((player, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-800/90">
                  <td className="p-3 flex flex-row gap-4">
                     {player.hero_id ? (
                      <Link 
                        to={`/hero/${player.hero_id}`}
                        className="block"
                        title={getHeroName(player.hero_id)}
                      >
                        <img 
                          src={getHeroIcon(player.hero_id)} 
                          alt={getHeroName(player.hero_id)}
                          className="w-8 h-8 rounded-md object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = getHeroName(player.hero_id);
                          }}
                        />
                      </Link>
                    ) : '-'}
                    {player.account_id ? (
                      <Link 
                        to={`/player/${player.account_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {player.persona_name || 'Anonymous'}
                      </Link>
                    ) : (
                      player.persona_name || 'Anonymous'
                    )}
                  </td>
                  <td className="p-3">
                    {player.kills || 0} / {player.deaths || 0} / {player.assists || 0}
                  </td>
                  <td className="p-3">{player.net_worth || 0}</td>
                  <td className="p-3">{(player.player_damage || 0).toLocaleString()}</td>
                  <td className="p-3">{(player.obj_damage || 0).toLocaleString()}</td>
                  <td className="p-3">
                    {/* Items placeholder */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team Sapphire */}
      <div>
        <h2 className="text-2xl font-bold mb-4 text-blue-600">Team Sapphire</h2>
        <div className="bg-panel text-gray-300 shadow rounded-lg p-6">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 w-[20%]">Player</th>
                <th className="text-left p-3 w-[13%]">K/D/A</th>
                <th className="text-left p-3 w-[13%]">Souls</th>
                <th className="text-left p-3 w-[13%]">Player DMG</th>
                <th className="text-left p-3 w-[13%]">Obj DMG</th>
                <th className="text-left p-3 w-[28%]">Items</th>
              </tr>
            </thead>
            <tbody>
              {sapphirePlayers.map((player, idx) => (
                <tr key={idx} className="border-b hover:bg-slate-800/90">
                   <td className="p-3 flex flex-row gap-4">
                     {player.hero_id ? (
                      <Link 
                        to={`/hero/${player.hero_id}`}
                        className="block"
                        title={getHeroName(player.hero_id)}
                      >
                        <img 
                          src={getHeroIcon(player.hero_id)} 
                          alt={getHeroName(player.hero_id)}
                          className="w-8 h-8 rounded-md object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = getHeroName(player.hero_id);
                          }}
                        />
                      </Link>
                    ) : '-'}
                    {player.account_id ? (
                      <Link 
                        to={`/player/${player.account_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {player.persona_name || 'Anonymous'}
                      </Link>
                    ) : (
                      player.persona_name || 'Anonymous'
                    )}
                  </td>

                  <td className="p-3">
                    {player.kills || 0} / {player.deaths || 0} / {player.assists || 0}
                  </td>
                  <td className="p-3">{player.net_worth || 0}</td>
                  <td className="p-3">{(player.player_damage || 0).toLocaleString()}</td>
                  <td className="p-3">{(player.obj_damage || 0).toLocaleString()}</td>
                  <td className="p-3">
                    {/* Items placeholder */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MatchDetail;
