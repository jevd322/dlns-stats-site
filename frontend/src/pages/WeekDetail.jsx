import React, { useState, useEffect, useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";

const formatDuration = (s) => {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

function StatPill({ label, value, accent }) {
  return (
    <div className="flex flex-col items-center bg-gray-800 rounded-lg px-5 py-3 min-w-[90px]">
      <span className={`text-xl font-bold ${accent ?? "text-white"}`}>{value}</span>
      <span className="text-xs text-gray-400 mt-0.5">{label}</span>
    </div>
  );
}

function MatchRow({ match }) {
  const teamAName = match.event_team_a || "Team A";
  const teamBName = match.event_team_b || "Team B";
  const winnerSide =
    match.winning_team === 0 ? "amber" : match.winning_team === 1 ? "sapphire" : null;

  return (
    <Link
      to={`/match/${match.match_id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-lg border border-gray-700/60 bg-gray-800/30 hover:bg-gray-700/50 hover:border-gray-600 transition-all"
    >
      {/* coloured win indicator */}
      <div
        className={`w-1 self-stretch rounded-full shrink-0 ${
          winnerSide === "amber"
            ? "bg-amber-400"
            : winnerSide === "sapphire"
            ? "bg-blue-400"
            : "bg-gray-600"
        }`}
      />

      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Team A */}
        <span className="text-sm font-semibold truncate text-right text-gray-200">
          {teamAName}
        </span>

        {/* Game label / score centre */}
        <div className="flex flex-col items-center shrink-0">
          {match.event_game && (
            <span className="text-xs text-gray-500">{match.event_game}</span>
          )}
          <span className="text-xs text-gray-600">{formatDuration(match.duration_s)}</span>
        </div>

        {/* Team B */}
        <span className="text-sm font-semibold truncate text-gray-200">
          {teamBName}
        </span>
      </div>

      <span className="text-xs text-gray-600 shrink-0">#{match.match_id}</span>
    </Link>
  );
}

function SeriesBlock({ teamA, teamB, matches }) {
  const [showPlayers, setShowPlayers] = useState(false);

  // Tally series wins per team
  const { teamAWins, teamBWins, seriesWinner } = useMemo(() => {
    let aWins = 0;
    let bWins = 0;
    for (const m of matches) {
      if (m.winning_team == null) continue;
      const teamAIngameSide = m.event_team_a_ingame_side;
      if (teamAIngameSide != null) {
        if (m.winning_team === teamAIngameSide) aWins++;
        else bWins++;
      } else {
        // Fallback: assume team_a = amber (side 0)
        if (m.winning_team === 0) aWins++;
        else bWins++;
      }
    }
    const winner = aWins > bWins ? "a" : bWins > aWins ? "b" : null;
    return { teamAWins: aWins, teamBWins: bWins, seriesWinner: winner };
  }, [matches]);

  // Deduplicate players per team across all games in the series
  const { teamAPlayers, teamBPlayers } = useMemo(() => {
    const aMap = new Map();
    const bMap = new Map();
    for (const m of matches) {
      const side = m.event_team_a_ingame_side;
      for (const p of m.players || []) {
        if (!p.account_id) continue;
        const isTeamA = side != null ? p.team === side : p.team === 0;
        const map = isTeamA ? aMap : bMap;
        if (!map.has(p.account_id)) map.set(p.account_id, p);
      }
    }
    return {
      teamAPlayers: [...aMap.values()],
      teamBPlayers: [...bMap.values()],
    };
  }, [matches]);

  const hasPlayers = teamAPlayers.length > 0 || teamBPlayers.length > 0;

  return (
    <div className="rounded-xl border border-gray-700/60 bg-gray-800/20 overflow-hidden">
      {/* Series header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/60 border-b border-gray-700/60">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            to={`/team/${encodeURIComponent(teamA)}`}
            className="text-sm font-semibold text-amber-300 hover:underline truncate"
          >
            {teamA}
          </Link>
          {seriesWinner === "a" && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 rounded">
              Winner
            </span>
          )}
        </div>
        <div className="flex flex-col items-center shrink-0 mx-3">
          <span className="text-xs text-gray-500 uppercase tracking-wider">vs</span>
          {(teamAWins > 0 || teamBWins > 0) && (
            <span className="text-xs font-bold text-gray-300 tabular-nums mt-0.5">
              {teamAWins} – {teamBWins}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 justify-end min-w-0">
          {seriesWinner === "b" && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-blue-400/20 text-blue-300 border border-blue-400/40 px-1.5 py-0.5 rounded">
              Winner
            </span>
          )}
          <Link
            to={`/team/${encodeURIComponent(teamB)}`}
            className="text-sm font-semibold text-blue-300 hover:underline truncate"
          >
            {teamB}
          </Link>
        </div>
      </div>

      {/* Matches */}
      <div className="divide-y divide-gray-700/40">
        {matches.map((m) => (
          <MatchRow key={m.match_id} match={m} />
        ))}
      </div>

      {/* Players accordion toggle */}
      {hasPlayers && (
        <div className="border-t border-gray-700/60">
          <button
            onClick={() => setShowPlayers((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-700/40 hover:text-gray-200 transition-all"
          >
            <span className="font-semibold uppercase tracking-wider">Players</span>
            <span>{showPlayers ? "▲" : "▼"}</span>
          </button>

          {showPlayers && (
            <div className="grid grid-cols-2 gap-px bg-gray-700/30 border-t border-gray-700/60">
              {/* Team A */}
              <div className="bg-gray-800/40 p-3 space-y-1">
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                  {teamA}
                </p>
                {teamAPlayers.map((p) => (
                  <Link
                    key={p.account_id}
                    to={`/player/${p.account_id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                      {(p.persona_name || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-200 truncate hover:underline">
                      {p.persona_name || `Player ${p.account_id}`}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Team B */}
              <div className="bg-gray-800/40 p-3 space-y-1">
                <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2">
                  {teamB}
                </p>
                {teamBPlayers.map((p) => (
                  <Link
                    key={p.account_id}
                    to={`/player/${p.account_id}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-700/50 transition-all"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                      {(p.persona_name || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-gray-200 truncate hover:underline">
                      {p.persona_name || `Player ${p.account_id}`}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WeekDetail() {
  const { week } = useParams();
  const navigate = useNavigate();
  const weekNum = week != null ? parseInt(week, 10) : null;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // No week param — fetch available weeks and redirect to the latest
    if (weekNum == null) {
      fetch("/db/stats/weekly")
        .then((r) => r.json())
        .then((d) => {
          const weeks = d.weeks;
          if (weeks && weeks.length > 0) {
            navigate(`/week/${weeks[weeks.length - 1].event_week}`, { replace: true });
          }
        })
        .catch(() => {});
      return;
    }
    if (isNaN(weekNum)) return;
    setLoading(true);
    setData(null);
    setError(null);
    fetch(`/db/nightshift/${weekNum}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Week ${weekNum} not found`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [weekNum]);

  // Group matches into series blocks by team pairing
  const series = useMemo(() => {
    if (!data?.matches) return [];
    const map = new Map();
    for (const m of data.matches) {
      const key = `${m.event_team_a ?? ""}__${m.event_team_b ?? ""}`;
      if (!map.has(key)) map.set(key, { teamA: m.event_team_a, teamB: m.event_team_b, matches: [] });
      map.get(key).matches.push(m);
    }
    return [...map.values()];
  }, [data]);

  if (weekNum == null) return <div className="p-8 text-center text-gray-400">Redirecting...</div>;
  if (isNaN(weekNum)) return <div className="p-8 text-red-400">Invalid week.</div>;
  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (error) return <div className="p-8 text-red-400">Error: {error}</div>;
  if (!data) return null;

  const { stats, all_weeks, event_title } = data;
  const prevWeek = all_weeks ? all_weeks[all_weeks.indexOf(weekNum) - 1] ?? null : null;
  const nextWeek = all_weeks ? all_weeks[all_weeks.indexOf(weekNum) + 1] ?? null : null;

  return (
    <div className="w-full p-8">
      {/* Breadcrumb / back */}
      <Link
        to="/matchlist"
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
      >
        ← All Matches
      </Link>

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          {event_title}
        </p>
        <h1 className="text-3xl font-bold text-white mb-2">Week {weekNum}</h1>
        {stats.first_match_time && (
          <p className="text-sm text-gray-400">{formatDate(stats.first_match_time)}</p>
        )}
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-3 mb-8">
        <StatPill label="Matches" value={stats.total_matches ?? 0} />
        <StatPill label="Amber wins" value={stats.amber_wins ?? 0} accent="text-amber-300" />
        <StatPill label="Sapphire wins" value={stats.sapphire_wins ?? 0} accent="text-blue-300" />
        <StatPill
          label="Avg duration"
          value={formatDuration(stats.avg_duration_s)}
        />
      </div>

      {/* Series */}
      <div className="space-y-4">
        {series.length === 0 && (
          <p className="text-gray-600 text-sm">No matches recorded for this week.</p>
        )}
        {series.map((s, i) => (
          <SeriesBlock
            key={i}
            teamA={s.teamA}
            teamB={s.teamB}
            matches={s.matches}
          />
        ))}
      </div>

      {/* Week navigation */}
      {(prevWeek != null || nextWeek != null) && (
        <div className="flex justify-between mt-10 pt-6 border-t border-gray-700/50 text-sm">
          {prevWeek != null ? (
            <Link
              to={`/week/${prevWeek}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Week {prevWeek}
            </Link>
          ) : (
            <span />
          )}
          {nextWeek != null && (
            <Link
              to={`/week/${nextWeek}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Week {nextWeek} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
