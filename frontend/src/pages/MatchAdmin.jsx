import React, { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.DEV ? "http://localhost:5050" : "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDuration = (s) => {
  if (!s) return "—";
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const formatDate = (val) => {
  if (!val) return "—";
  const d = new Date(typeof val === "number" ? val * 1000 : val);
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlayerList({ players, teamLabel, color }) {
  if (!players || players.length === 0)
    return <p className="text-xs text-gray-500 italic">No players found</p>;
  return (
    <ul className="space-y-1">
      {players.map((p, i) => (
        <li key={i} className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              color === "amber" ? "bg-amber-400" : "bg-blue-400"
            }`}
          />
          <span className={color === "amber" ? "text-amber-200" : "text-blue-200"}>
            {p.persona_name || `Player ${p.account_id ?? "?"}`}
          </span>
          {p.hero_name && (
            <span className="text-xs text-gray-500">— {p.hero_name}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-gray-700 text-gray-300",
    running: "bg-blue-900/60 text-blue-300",
    done: "bg-green-900/60 text-green-300",
    error: "bg-red-900/60 text-red-300",
  };
  return (
    <span
      className={`inline-block text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
        map[status] ?? map.pending
      }`}
    >
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SERIES_OPTIONS = ["Night Shift", "Fight Night"];

export function MatchAdmin() {
  // Step 1 — Preview
  const [matchIdInput, setMatchIdInput] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [preview, setPreview] = useState(null); // null = not yet fetched

  // Step 2 — Metadata form
  const [amberTeam, setAmberTeam] = useState("");
  const [sapphireTeam, setSapphireTeam] = useState("");
  const [week, setWeek] = useState("");
  const [seriesTitle, setSeriesTitle] = useState(SERIES_OPTIONS[0]);
  const [gameLabel, setGameLabel] = useState("Game 1");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [jobState, setJobState] = useState(null); // {status, message, match_id}
  const pollRef = useRef(null);

  // Stop polling when unmounted
  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handlePreview(e) {
    e.preventDefault();
    setPreviewError(null);
    setPreview(null);
    setSubmitError(null);
    setJobId(null);
    setJobState(null);

    const id = matchIdInput.trim();
    if (!id || isNaN(Number(id))) {
      setPreviewError("Enter a valid numeric match ID.");
      return;
    }

    setPreviewing(true);
    try {
      const res = await fetch(`${API_BASE}/admin/match/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: parseInt(id, 10) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error || `Error ${res.status}`);
        return;
      }
      setPreview(data);
      // Pre-fill game label counter based on match_id already submitted for this week
      // (simple default — user can edit)
      setGameLabel("Game 1");
    } catch (err) {
      setPreviewError("Network error: " + err.message);
    } finally {
      setPreviewing(false);
    }
  }

  function startPolling(id) {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/match/job/${id}`);
        const data = await res.json();
        setJobState(data);
        if (data.status === "done" || data.status === "error") {
          clearInterval(pollRef.current);
        }
      } catch (_) {
        // silently ignore transient network failures during polling
      }
    }, 2000);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setJobId(null);
    setJobState(null);

    if (!amberTeam.trim() || !sapphireTeam.trim()) {
      setSubmitError("Both team names are required.");
      return;
    }
    if (!week || isNaN(Number(week))) {
      setSubmitError("Enter a valid week number.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/match/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: preview.match_id,
          amber_team: amberTeam.trim(),
          sapphire_team: sapphireTeam.trim(),
          week: parseInt(week, 10),
          series_title: seriesTitle,
          game_label: gameLabel.trim() || "Game 1",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || `Error ${res.status}`);
        return;
      }
      setJobId(data.job_id);
      setJobState({ status: "pending", message: "Queued…" });
      startPolling(data.job_id);
    } catch (err) {
      setSubmitError("Network error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    clearInterval(pollRef.current);
    setMatchIdInput("");
    setPreview(null);
    setPreviewError(null);
    setAmberTeam("");
    setSapphireTeam("");
    setWeek("");
    setSeriesTitle(SERIES_OPTIONS[0]);
    setGameLabel("Game 1");
    setSubmitting(false);
    setSubmitError(null);
    setJobId(null);
    setJobState(null);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const submitted = !!jobId;
  const done = jobState?.status === "done";
  const hasError = jobState?.status === "error";

  return (
    <div className="w-full max-w-2xl mx-auto p-8 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Admin
        </p>
        <h1 className="text-2xl font-bold text-white">Add Match</h1>
        <p className="text-sm text-gray-400 mt-1">
          Preview a match from the API, assign team names, then ingest it.
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Step 1 — Match ID + Preview                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="rounded-xl border border-gray-700/60 bg-gray-800/20 overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700/60">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Step 1 — Preview Match
          </h2>
        </div>
        <div className="p-4 space-y-4">
          <form onSubmit={handlePreview} className="flex gap-3">
            <input
              type="text"
              value={matchIdInput}
              onChange={(e) => setMatchIdInput(e.target.value)}
              placeholder="Match ID (e.g. 75968492)"
              disabled={previewing || submitted}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={previewing || submitted}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {previewing ? "Loading…" : "Preview"}
            </button>
          </form>

          {previewError && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
              {previewError}
            </p>
          )}

          {preview && (
            <div className="space-y-3">
              {/* Match meta */}
              <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                <span>
                  Match ID:{" "}
                  <span className="text-white font-mono">{preview.match_id}</span>
                </span>
                <span>
                  Duration:{" "}
                  <span className="text-white">{formatDuration(preview.duration_s)}</span>
                </span>
                <span>
                  Date:{" "}
                  <span className="text-white">{formatDate(preview.start_time)}</span>
                </span>
                <span>
                  Winner:{" "}
                  <span
                    className={
                      preview.winning_team === 0
                        ? "text-amber-300 font-semibold"
                        : preview.winning_team === 1
                        ? "text-blue-300 font-semibold"
                        : "text-gray-400"
                    }
                  >
                    {preview.winning_team === 0
                      ? "🟠 Amber"
                      : preview.winning_team === 1
                      ? "🔵 Sapphire"
                      : "Unknown"}
                  </span>
                </span>
              </div>

              {/* Side-by-side player lists */}
              <div className="grid grid-cols-2 gap-px bg-gray-700/30 rounded-lg overflow-hidden border border-gray-700/40">
                <div className="bg-gray-800/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                    🟠 Amber (Team A)
                  </p>
                  <PlayerList players={preview.amber_players} color="amber" />
                </div>
                <div className="bg-gray-800/50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                    🔵 Sapphire (Team B)
                  </p>
                  <PlayerList players={preview.sapphire_players} color="sapphire" />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Step 2 — Metadata form (only shown after preview)                   */}
      {/* ------------------------------------------------------------------ */}
      {preview && (
        <section className="rounded-xl border border-gray-700/60 bg-gray-800/20 overflow-hidden">
          <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700/60">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              Step 2 — Assign Teams &amp; Metadata
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Team names */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
                  🟠 Amber team name
                </label>
                <input
                  type="text"
                  value={amberTeam}
                  onChange={(e) => setAmberTeam(e.target.value)}
                  placeholder="e.g. Abrahams"
                  disabled={submitted}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                  🔵 Sapphire team name
                </label>
                <input
                  type="text"
                  value={sapphireTeam}
                  onChange={(e) => setSapphireTeam(e.target.value)}
                  placeholder="e.g. Leviathan"
                  disabled={submitted}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>

            {/* Week / Series / Game label */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Week
                </label>
                <input
                  type="number"
                  min="1"
                  value={week}
                  onChange={(e) => setWeek(e.target.value)}
                  placeholder="e.g. 34"
                  disabled={submitted}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Series
                </label>
                <select
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  disabled={submitted}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500 disabled:opacity-50"
                >
                  {SERIES_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Game label
                </label>
                <input
                  type="text"
                  value={gameLabel}
                  onChange={(e) => setGameLabel(e.target.value)}
                  placeholder="Game 1"
                  disabled={submitted}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 disabled:opacity-50"
                />
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-red-400 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                {submitError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting || submitted}
                className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Ingest Match"}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors"
              >
                Reset
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Job status                                                            */}
      {/* ------------------------------------------------------------------ */}
      {jobState && (
        <section className="rounded-xl border border-gray-700/60 bg-gray-800/20 p-4 space-y-2">
          <div className="flex items-center gap-3">
            <StatusBadge status={jobState.status} />
            {jobState.status === "running" && (
              <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <p className="text-sm text-gray-300">{jobState.message}</p>
          {done && (
            <div className="flex gap-3 pt-1">
              <a
                href={`/match/${preview?.match_id}`}
                className="text-sm text-blue-400 hover:underline"
              >
                View match →
              </a>
              <button
                onClick={handleReset}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Add another match
              </button>
            </div>
          )}
          {hasError && (
            <button
              onClick={() => {
                setJobId(null);
                setJobState(null);
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Dismiss and retry
            </button>
          )}
        </section>
      )}
    </div>
  );
}
