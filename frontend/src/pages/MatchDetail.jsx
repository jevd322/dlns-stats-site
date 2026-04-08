import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [adjacentMatches, setAdjacentMatches] = useState({ previous_match_id: null, next_match_id: null });
  const [heroes, setHeroes] = useState({});
  const [itemsByPlayer, setItemsByPlayer] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHeroes();
    fetchMatchPlayers();
    fetchAdjacentMatches();
    fetchMatchItems();
  }, [matchId]);

  const fetchHeroes = async () => {
    try {
      const response = await fetch("/db/heroes");
      if (response.ok) {
        const data = await response.json();
        setHeroes(data);
      }
    } catch (err) {
      console.error("Failed to fetch heroes:", err);
    }
  };

  const fetchMatchPlayers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/db/matches/${matchId}/players`);
      if (!response.ok) {
        throw new Error("Failed to fetch match details");
      }
      const data = await response.json();
      setPlayers(data.players || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdjacentMatches = async () => {
    try {
      const response = await fetch(`/db/matches/${matchId}/adjacent`);
      if (response.ok) {
        const data = await response.json();
        setAdjacentMatches(data);
      }
    } catch (err) {
      console.error("Failed to fetch adjacent matches:", err);
    }
  };

  const fetchMatchItems = async () => {
    try {
      const response = await fetch(`/db/matches/${matchId}/items`);
      if (response.ok) {
        const data = await response.json();
        setItemsByPlayer(data);
      }
    } catch (err) {
      console.error("Failed to fetch match items:", err);
    }
  };

  const getLocalItemImage = (item) => {
    if (!item.name) return null;
    const filename = item.name.toLowerCase().replace(/ /g, "_") + "_psd.png";
    const folder = item.item_tier === 5 ? "legendaries" : item.item_slot_type;
    return folder ? `/static/images/items/${folder}/${filename}` : null;
  };

  const getHeroName = (heroId) => {
    const hero = heroes[heroId];
    return hero?.name || hero || `Hero ${heroId}`;
  };

  const getHeroIcon = (heroId) => {
    const heroName = getHeroName(heroId);
    // Convert hero name to lowercase and replace spaces with underscores
    const formattedName = heroName.toLowerCase().replace(/\s+/g, "_");
    return `/static/images/hero icons/${formattedName}_sm_psd.png`;
  };

  const previousMatchId = adjacentMatches.previous_match_id;
  const nextMatchId = adjacentMatches.next_match_id;

  const teamName = (team) => {
    return team === 0 ? "Amber" : team === 1 ? "Sapphire" : "Unknown";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate();
    const ordinal = (d) => {
      if (d >= 11 && d <= 13) return "th";
      switch (d % 10) { case 1: return "st"; case 2: return "nd"; case 3: return "rd"; default: return "th"; }
    };
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.getFullYear();
    const time = date.toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${month} ${day}${ordinal(day)} ${year} | ${time}`;
  };

  const formatK = (value) => {
    const n = Number(value) || 0;
    if (n >= 1000) {
      return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return n.toString();
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
  const amberPlayers = players.filter((p) => p.team === 0);
  const sapphirePlayers = players.filter((p) => p.team === 1);

  // Derive winning team from player results (each player has result: "Win"|"Loss" and team: 0|1)
  const winnerPlayer = players.find((p) => p.result === "Win");
  const winningTeam = winnerPlayer != null ? winnerPlayer.team : null;

  // Per-column maximums across all players (for highlight)
  const maxOf = (field) => Math.max(0, ...players.map((p) => p[field] || 0));
  const maxKills    = maxOf("kills");
  const maxAssists  = maxOf("assists");
  const maxNetWorth = maxOf("net_worth");
  const maxPlayerDmg = maxOf("player_damage");
  const maxObjDmg   = maxOf("obj_damage");
  const maxHealing  = maxOf("player_healing");

  const isMax = (val, max) => max > 0 && (val || 0) === max;

  return (
    <div className="w-full p-8">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="text-blue-600 hover:underline">
          ← Back to Match List
        </Link>

        {/* Match Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() =>
              previousMatchId && navigate(`/match/${previousMatchId}`)
            }
            disabled={!previousMatchId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            ← Previous Match
          </button>
          <button
            onClick={() => nextMatchId && navigate(`/match/${nextMatchId}`)}
            disabled={!nextMatchId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next Match →
          </button>
        </div>
      </div>

      <h1 className="text-gray-300 text-3xl font-bold mb-2">Match {matchId}</h1>
      {adjacentMatches.event_title && (
        <p className="text-gray-300 text-lg font-semibold mb-1">
          {adjacentMatches.event_title}
          {adjacentMatches.event_week != null && ` #${adjacentMatches.event_week}`}
        </p>
      )}
      {adjacentMatches.start_time && (
        <p className="text-gray-500 mb-6">
          {formatDate(adjacentMatches.start_time)}
        </p>
      )}

      {/* Team Amber */}
      <div className="mb-6">
        <div className="bg-panel text-gray-300 shadow p-6 ">
          <div className="flex items-center mb-2">
            <img
              src="/static/images/teamNames/team1_patron_logo_psd.png"
              alt="Team Amber"
              className="h-12 m-2"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(64%) sepia(14%) saturate(3308%) hue-rotate(1deg) brightness(106%) contrast(103%)",
              }}
            />
            {winningTeam === 0 && (
              <span className="ml-3 px-2 py-1 text-xs font-bold bg-amber-500 text-black rounded-full uppercase tracking-wide">
                Winner
              </span>
            )}
          </div>
          <table className="w-full table-auto rounded-lg ">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 w-50">Player</th>
                <th className="text-left p-3 w-30">K/D/A</th>
                <th className="text-left p-3 w-25">Souls</th>
                <th className="text-left p-3 w-30">Player DMG</th>
                <th className="text-left p-3 w-25">Obj DMG</th>
                <th className="text-left p-3 w-25">Healing</th>
                <th className="text-left p-3">Items</th>
              </tr>
            </thead>
            <tbody>
              {amberPlayers.map((player, idx) => (
                <tr key={idx} className="border-b border-gray-700/50 hover:bg-slate-800/90 truncate">
                  <td className="p-3 flex flex-row gap-4 w-40 max-w-40 overflow-hidden">
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
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = getHeroName(
                              player.hero_id,
                            );
                          }}
                        />
                      </Link>
                    ) : (
                      "-"
                    )}
                    {player.account_id ? (
                      <Link
                        to={`/player/${player.account_id}`}
                        className="text-blue-600 hover:underline min-w-0 truncate"
                        title={player.persona_name || "Anonymous"}
                      >
                        {player.persona_name || "Anonymous"}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate" title={player.persona_name || "Anonymous"}>{player.persona_name || "Anonymous"}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className={`font-semibold ${isMax(player.kills, maxKills) ? "text-yellow-300" : "text-green-400"}`}>{player.kills || 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-red-400">{player.deaths || 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span className={`${isMax(player.assists, maxAssists) ? "text-yellow-300 font-semibold" : "text-orange-400"}`}>{player.assists || 0}</span>
                  </td>
                  <td className="p-3"><span className={isMax(player.net_worth, maxNetWorth) ? "text-yellow-300 font-semibold" : ""} title={(player.net_worth || 0).toLocaleString()}>{formatK(player.net_worth)}</span></td>
                  <td className="p-3"><span className={isMax(player.player_damage, maxPlayerDmg) ? "text-yellow-300 font-semibold" : ""} title={(player.player_damage || 0).toLocaleString()}>{formatK(player.player_damage)}</span></td>
                  <td className="p-3"><span className={isMax(player.obj_damage, maxObjDmg) ? "text-yellow-300 font-semibold" : ""} title={(player.obj_damage || 0).toLocaleString()}>{formatK(player.obj_damage)}</span></td>
                  <td className="p-3"><span
                    className={isMax(player.player_healing, maxHealing) ? "text-yellow-300 font-semibold" : ""}
                    title={`Total: ${(player.player_healing || 0).toLocaleString()}${player.self_healing != null ? ` | Self: ${(player.self_healing || 0).toLocaleString()}` : ""}${player.teammate_healing != null ? ` | Teammate: ${(player.teammate_healing || 0).toLocaleString()}` : ""}`}
                  >{formatK(player.player_healing)}</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(itemsByPlayer[String(player.account_id)] || []).map(
                        (item, i) => {
                          const src = getLocalItemImage(item);
                          return src ? (
                            <img
                              key={i}
                              src={src}
                              alt={item.name}
                              title={item.name}
                              width={28}
                              height={28}
                              loading="lazy"
                              decoding="async"
                              className="w-7 h-7 rounded object-contain bg-slate-700/50"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : null;
                        },
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>


      {/* Team Sapphire */}
        <div className="bg-panel text-gray-300 shadow rounded-lg p-6">
          <div className="flex items-center mb-2">
            <img
              src="/static/images/teamNames/team2_patron_logo_psd.png"
              alt="Team Sapphire"
              className="h-12"
              style={{
                filter:
                  "brightness(0) saturate(100%) invert(24%) sepia(96%) saturate(1698%) hue-rotate(203deg) brightness(94%) contrast(115%)",
              }}
            />
            {winningTeam === 1 && (
              <span className="ml-3 px-2 py-1 text-xs font-bold bg-blue-500 text-white rounded-full uppercase tracking-wide">
                Winner
              </span>
            )}
          </div>
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 w-50">Player</th>
                <th className="text-left p-3 w-30">K/D/A</th>
                <th className="text-left p-3 w-25">Souls</th>
                <th className="text-left p-3 w-30">Player DMG</th>
                <th className="text-left p-3 w-25">Obj DMG</th>
                <th className="text-left p-3 w-25">Healing</th>
                <th className="text-left p-3">Items</th>
              </tr>
            </thead>
            <tbody>
              {sapphirePlayers.map((player, idx) => (
                <tr key={idx} className="border-b border-gray-700/50 hover:bg-slate-800/90 truncate">
                  <td className="text-md p-3 flex flex-row gap-4 w-40 max-w-40 overflow-hidden">
                    {player.hero_id ? (
                      <Link
                        to={`/hero/${player.hero_id}`}
                        className="block"
                        title={getHeroName(player.hero_id)}
                      >
                        <img
                          src={getHeroIcon(player.hero_id)}
                          alt={getHeroName(player.hero_id)}
                          className="max-w-8 max-h-8 rounded-md object-cover"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = getHeroName(
                              player.hero_id,
                            );
                          }}
                        />
                      </Link>
                    ) : (
                      "-"
                    )}
                    {player.account_id ? (
                      <Link
                        to={`/player/${player.account_id}`}
                        className="text-blue-600 hover:underline min-w-0 truncate"
                        title={player.persona_name || "Anonymous"}
                      >
                        {player.persona_name || "Anonymous"}
                      </Link>
                    ) : (
                      <span className="min-w-0 truncate" title={player.persona_name || "Anonymous"}>{player.persona_name || "Anonymous"}</span>
                    )}
                  </td>

                  <td className="p-3">
                    <span className={`font-semibold ${isMax(player.kills, maxKills) ? "text-yellow-300" : "text-green-400"}`}>{player.kills || 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-red-400">{player.deaths || 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span className={`${isMax(player.assists, maxAssists) ? "text-yellow-300 font-semibold" : "text-orange-400"}`}>{player.assists || 0}</span>
                  </td>
                  <td className="p-3"><span className={isMax(player.net_worth, maxNetWorth) ? "text-yellow-300 font-semibold" : ""} title={(player.net_worth || 0).toLocaleString()}>{formatK(player.net_worth)}</span></td>
                  <td className="p-3"><span className={isMax(player.player_damage, maxPlayerDmg) ? "text-yellow-300 font-semibold" : ""} title={(player.player_damage || 0).toLocaleString()}>{formatK(player.player_damage)}</span></td>
                  <td className="p-3"><span className={isMax(player.obj_damage, maxObjDmg) ? "text-yellow-300 font-semibold" : ""} title={(player.obj_damage || 0).toLocaleString()}>{formatK(player.obj_damage)}</span></td>
                  <td className="p-3"><span
                    className={isMax(player.player_healing, maxHealing) ? "text-yellow-300 font-semibold" : ""}
                    title={`Total: ${(player.player_healing || 0).toLocaleString()}${player.self_healing != null ? ` | Self: ${(player.self_healing || 0).toLocaleString()}` : ""}${player.teammate_healing != null ? ` | Teammate: ${(player.teammate_healing || 0).toLocaleString()}` : ""}`}
                  >{formatK(player.player_healing)}</span></td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {(itemsByPlayer[String(player.account_id)] || []).map(
                        (item, i) => {
                          const src = getLocalItemImage(item);
                          return src ? (
                            <img
                              key={i}
                              src={src}
                              alt={item.name}
                              title={item.name}
                              width={28}
                              height={28}
                              loading="lazy"
                              decoding="async"
                              className="w-7 h-7 rounded object-contain bg-slate-700/50"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : null;
                        },
                      )}
                    </div>
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
