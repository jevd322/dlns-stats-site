import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";

const formatDuration = (s) => {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function PlayerCard({ player, isCurrent }) {
  return (
    <Link
      to={`/player/${player.account_id}`}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all hover:border-purple-500/50 hover:bg-gray-700/50 ${
        isCurrent
          ? "border-gray-600 bg-gray-800/60"
          : "border-gray-700/50 bg-gray-800/30"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
        {(player.persona_name || "?")[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-100 truncate">
          {player.persona_name || `Player ${player.account_id}`}
        </p>
        <p className="text-xs text-gray-500">
          {player.appearances} match{player.appearances !== 1 ? "es" : ""}
          {player.first_week != null && player.last_week != null && (
            <span>
              {" "}
              · Wk {player.first_week}
              {player.first_week !== player.last_week && `–${player.last_week}`}
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}

function TeamDetail() {
  const { teamName } = useParams();
  const decodedName = decodeURIComponent(teamName);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    fetch(`/db/team/${encodeURIComponent(decodedName)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Team not found");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [decodedName]);

  if (loading)
    return <div className="p-8 text-center text-gray-300">Loading team...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const { team_name, max_week, total_matches, players, matches } = data;

  // Split current roster (appeared in latest week) vs alumni
  const currentPlayers = players.filter((p) => p.last_week === max_week);
  const historicPlayers = players.filter(
    (p) => max_week == null || p.last_week < max_week
  );

  // Compute win/loss where side data is available
  let wins = 0,
    losses = 0;
  for (const m of matches) {
    const side = m.event_team_a_ingame_side;
    if (side == null) continue;
    const isTeamA = m.event_team_a === team_name;
    const teamWon = isTeamA
      ? m.winning_team === side
      : m.winning_team !== side;
    if (teamWon) wins++;
    else losses++;
  }
  const hasRecord = wins + losses > 0;

  return (
    <div className="w-full px-4 py-8">
      {/* Back */}
      <Link
        to="/teams"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        ← All Teams
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">{team_name}</h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
          <span>{total_matches} match{total_matches !== 1 ? "es" : ""}</span>
          {max_week != null && <span>Latest: Week {max_week}</span>}
          {hasRecord && (
            <span>
              <span className="text-green-400 font-semibold">{wins}W</span>
              {" – "}
              <span className="text-red-400 font-semibold">{losses}L</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Rosters column */}
        <div className="space-y-8">
          {/* Active Roster */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Active Roster
              {max_week != null && (
                <span className="ml-2 text-gray-600 normal-case font-normal">
                  · Week {max_week}
                </span>
              )}
            </h2>
            {currentPlayers.length === 0 ? (
              <p className="text-gray-600 text-sm">No roster data available.</p>
            ) : (
              <div className="space-y-2">
                {currentPlayers.map((p) => (
                  <PlayerCard key={p.account_id} player={p} isCurrent />
                ))}
              </div>
            )}
          </section>

          {/* Former Players */}
          {historicPlayers.length > 0 && (
            <section className="">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Former Players
              </h2>
              <div className="space-y-2">
                {historicPlayers.map((p) => (
                  <PlayerCard key={p.account_id} player={p} isCurrent={false} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Match history */}
        <div className="lg:col-span-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Match History
          </h2>
          <div className="space-y-2">
            {matches.length === 0 && (
              <p className="text-gray-600 text-sm">No matches recorded.</p>
            )}
            {matches.map((m) => {
              const opponent =
                m.event_team_a === team_name ? m.event_team_b : m.event_team_a;
              const side = m.event_team_a_ingame_side;
              let result = null;
              if (side != null && m.winning_team != null) {
                const isTeamA = m.event_team_a === team_name;
                result = isTeamA
                  ? m.winning_team === side
                  : m.winning_team !== side;
              }
              return (
                <Link
                  key={m.match_id}
                  to={`/match/${m.match_id}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-700 bg-gray-800/40 hover:bg-gray-700/50 hover:border-gray-600 transition-all"
                >
                  {/* W/L colour bar */}
                  <div
                    className={`w-1 h-10 rounded-full shrink-0 ${
                      result === true
                        ? "bg-green-500"
                        : result === false
                        ? "bg-red-500"
                        : "bg-gray-600"
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-200">
                        vs {opponent || "Unknown"}
                      </span>
                      {m.event_game && (
                        <span className="text-xs text-gray-500">
                          {m.event_game}
                        </span>
                      )}
                      {result != null && (
                        <span
                          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            result
                              ? "bg-green-700/40 text-green-400"
                              : "bg-red-700/40 text-red-400"
                          }`}
                        >
                          {result ? "W" : "L"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {m.event_title && <span>{m.event_title} · </span>}
                      {m.event_week != null && (
                        <span>Week {m.event_week} · </span>
                      )}
                      {formatDate(m.start_time)} · {formatDuration(m.duration_s)}
                    </p>
                  </div>

                  <span className="text-xs text-gray-600 shrink-0">
                    #{m.match_id}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamDetail;
