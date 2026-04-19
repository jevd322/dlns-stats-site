import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

function MatchDetail() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [adjacentMatches, setAdjacentMatches] = useState({
    previous_match_id: null,
    next_match_id: null,
  });
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
      switch (d % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };
    const month = date.toLocaleString("en-GB", { month: "long" });
    const year = date.getFullYear();
    const time = date.toLocaleString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
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
  const maxKills = maxOf("kills");
  const maxAssists = maxOf("assists");
  const maxNetWorth = maxOf("net_worth");
  const maxPlayerDmg = maxOf("player_damage");
  const maxObjDmg = maxOf("obj_damage");
  const maxHealing = maxOf("player_healing");

  const isMax = (val, max) => max > 0 && (val || 0) === max;

  return (
    <div className="w-full p-8">
      <div className="flex items-center justify-between mb-6 hidden">
        <Link to="/" className="text-blue-600 hover:underline">
          ← Back to Match List
        </Link>

        {/* Match Navigation */}
        <div className="flex gap-2 hidden">
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

      <div className="flex gap-4 justify-between items-start bg-gray-800 rounded-lg p-4 mb-2">
        <div>
          <h1 className="text-gray-300 text-2xl font-bold mb-4">
            Match {matchId}
          </h1>
          <div className="flex flex-col ">
            {(adjacentMatches.event_team_a || adjacentMatches.event_team_b) && (
              <p className="text-gray-300 text-xl font-semibold">
                {adjacentMatches.event_team_a ? (
                  <Link to={`/team/${encodeURIComponent(adjacentMatches.event_team_a)}`} className="hover:underline">{adjacentMatches.event_team_a}</Link>
                ) : "—"}
                <span className="text-gray-500 mx-2 font-normal">vs</span>
                {adjacentMatches.event_team_b ? (
                  <Link to={`/team/${encodeURIComponent(adjacentMatches.event_team_b)}`} className="hover:underline">{adjacentMatches.event_team_b}</Link>
                ) : "—"}
                {adjacentMatches.event_game && (
                  <p className="text-gray-500 text-base font-normal">
                    {adjacentMatches.event_game}
                  </p>
                )}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-end">
          {adjacentMatches.event_title && (
            <p className="text-gray-300 text-lg font-semibold mb-1">
              {adjacentMatches.event_week != null ? (
                <Link
                  to={`/week/${adjacentMatches.event_week}`}
                  className="hover:underline"
                >
                  {adjacentMatches.event_title} #{adjacentMatches.event_week}
                </Link>
              ) : (
                adjacentMatches.event_title
              )}
            </p>
          )}

          {adjacentMatches.start_time && (
            <p className="text-gray-500 mb-2">
              {formatDate(adjacentMatches.start_time)}
            </p>
          )}

          {adjacentMatches.event_team_a && (
            <Link
              to={`/series/${matchId}`}
              className="text-sm text-blue-400 hover:underline"
            >
              View full series →
            </Link>
          )}
        </div>
      </div>

      {/* Team Amber */}
      <div className="mb-6">
        <div className="text-gray-300 shadow py-6 ">
          <table className="w-full table-auto rounded-lg ">
            <thead className="">
              <tr className="border-b h-10">
                <th className="text-left py-3 w-50 relative overflow-visible align-bottom">
                  <div className="absolute bottom-0 left-2 flex items-end gap-3 pb-1 pointer-events-none">
                    {adjacentMatches.event_team_a && (
                      <Link to={`/team/${encodeURIComponent(adjacentMatches.event_team_a)}`} className="pointer-events-auto">
                        <h2 className="text-amber-300 text-2xl font-bold mb-2 uppercase hover:underline">
                          {adjacentMatches.event_team_a}
                        </h2>
                      </Link>
                    )}
                    {winningTeam === 0 && (
                      <span className="pointer-events-none mb-2.5 text-xs font-semibold px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-wider">
                        WIN
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-center p-3 w-30 align-bottom">K/D/A</th>
                <th className="text-center p-3 w-25 align-bottom">Souls</th>
                <th className="text-center p-3 w-30 align-bottom">
                  Player DMG
                </th>
                <th className="text-center p-3 w-25 align-bottom">Obj DMG</th>
                <th className="text-center p-3 w-25 align-bottom">Healing</th>
                <th className="text-left p-3 align-bottom hidden lg:table-cell">
                  Items
                </th>
              </tr>
            </thead>
            <tbody>
              {amberPlayers.map((player, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-amber-900/30 truncate ${idx % 2 === 0 ? "bg-yellow-700/20 hover:bg-yellow-700/60" : "bg-orange-950/20 hover:bg-orange-900/30"}`}
                >
                  <td className="p-3 text-lg font-bold flex flex-row gap-4 w-40 max-w-40 overflow-hidden">
                    {player.hero_id ? (
                      <Link
                        to={`/hero/${player.hero_id}`}
                        className="block flex items-center gap-2 object-cover"
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
                    <div className="flex flex-col">
                      {player.account_id ? (
                        <Link
                          to={`/player/${player.account_id}`}
                          className=" hover:underline min-w-0 truncate"
                          title={player.persona_name || "Anonymous"}
                        >
                          {player.persona_name || "Anonymous"}
                        </Link>
                      ) : (
                        <span
                          className="min-w-0 truncate"
                          title={player.persona_name || "Anonymous"}
                        >
                          {player.persona_name || "Anonymous"}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-normal">
                        {getHeroName(player.hero_id)}
                      </span>
                    </div>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={`font-semibold ${isMax(player.kills, maxKills) ? "text-yellow-300" : "text-green-400"}`}
                    >
                      {player.kills || 0}
                    </span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-red-400">{player.deaths || 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span
                      className={`${isMax(player.assists, maxAssists) ? "text-yellow-300 font-semibold" : "text-orange-400"}`}
                    >
                      {player.assists || 0}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.net_worth, maxNetWorth)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={(player.net_worth || 0).toLocaleString()}
                    >
                      {formatK(player.net_worth)}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.player_damage, maxPlayerDmg)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={(player.player_damage || 0).toLocaleString()}
                    >
                      {formatK(player.player_damage)}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.obj_damage, maxObjDmg)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={(player.obj_damage || 0).toLocaleString()}
                    >
                      {formatK(player.obj_damage)}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.player_healing, maxHealing)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={`Total: ${(player.player_healing || 0).toLocaleString()}${player.self_healing != null ? ` | Self: ${(player.self_healing || 0).toLocaleString()}` : ""}${player.teammate_healing != null ? ` | Teammate: ${(player.teammate_healing || 0).toLocaleString()}` : ""}`}
                    >
                      {formatK(player.player_healing)}
                    </span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
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
        <div className="text-gray-300 shadow rounded-lg py-6">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b h-10">
                <th className="text-left py-3 w-50 relative overflow-visible align-bottom">
                  <div className="absolute bottom-0 left-2 flex items-end gap-3 pb-1 pointer-events-none">
                    {adjacentMatches.event_team_b && (
                      <Link to={`/team/${encodeURIComponent(adjacentMatches.event_team_b)}`} className="pointer-events-auto">
                        <h2 className="text-team-sapphire text-2xl font-bold mb-2 uppercase hover:underline">
                          {adjacentMatches.event_team_b}
                        </h2>
                      </Link>
                    )}
                    {winningTeam === 1 && (
                      <span className="pointer-events-none mb-2.5 text-xs font-semibold px-2 py-0.5 rounded bg-blue-400/20 text-blue-300 border border-blue-400/40 uppercase tracking-wider">
                        WIN
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-center p-3 w-30 align-bottom">K/D/A</th>
                <th className="text-center p-3 w-25 align-bottom">Souls</th>
                <th className="text-center p-3 w-30 align-bottom">
                  Player DMG
                </th>
                <th className="text-center p-3 w-25 align-bottom">Obj DMG</th>
                <th className="text-center p-3 w-25 align-bottom">Healing</th>
                <th className="text-left p-3 align-bottom">Items</th>
              </tr>
            </thead>
            <tbody>
              {sapphirePlayers.map((player, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-blue-900/30 truncate ${idx % 2 === 0 ? "bg-blue-950/30 hover:bg-blue-900/40" : "bg-indigo-950/20 hover:bg-indigo-900/30"}`}
                >
                  <td className="p-3 text-lg font-bold flex flex-row gap-4 w-40 max-w-40 overflow-hidden">
                    {player.hero_id ? (
                      <Link
                        to={`/hero/${player.hero_id}`}
                        className="block flex items-center gap-2 object-cover"
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
                    <div className="flex flex-col">
                      {player.account_id ? (
                        <Link
                          to={`/player/${player.account_id}`}
                          className="hover:underline min-w-0 truncate"
                          title={player.persona_name || "Anonymous"}
                        >
                          {player.persona_name || "Anonymous"}
                        </Link>
                      ) : (
                        <span
                          className="min-w-0 truncate"
                          title={player.persona_name || "Anonymous"}
                        >
                          {player.persona_name || "Anonymous"}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 font-normal">
                        {getHeroName(player.hero_id)}
                      </span>
                    </div>
                  </td>

                  <td className="text-center p-3">
                    <span
                      className={`font-semibold ${isMax(player.kills, maxKills) ? "text-yellow-300" : "text-green-400"}`}
                    >
                      {player.kills || 0}
                    </span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-red-400">{player.deaths || 0}</span>
                    <span className="text-gray-400"> / </span>
                    <span
                      className={`${isMax(player.assists, maxAssists) ? "text-yellow-300 font-semibold" : "text-orange-400"}`}
                    >
                      {player.assists || 0}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.net_worth, maxNetWorth)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={(player.net_worth || 0).toLocaleString()}
                    >
                      {formatK(player.net_worth)}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.player_damage, maxPlayerDmg)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={(player.player_damage || 0).toLocaleString()}
                    >
                      {formatK(player.player_damage)}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.obj_damage, maxObjDmg)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={(player.obj_damage || 0).toLocaleString()}
                    >
                      {formatK(player.obj_damage)}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className={
                        isMax(player.player_healing, maxHealing)
                          ? "text-yellow-300 font-semibold"
                          : ""
                      }
                      title={`Total: ${(player.player_healing || 0).toLocaleString()}${player.self_healing != null ? ` | Self: ${(player.self_healing || 0).toLocaleString()}` : ""}${player.teammate_healing != null ? ` | Teammate: ${(player.teammate_healing || 0).toLocaleString()}` : ""}`}
                    >
                      {formatK(player.player_healing)}
                    </span>
                  </td>
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
