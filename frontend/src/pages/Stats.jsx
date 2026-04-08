import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from "chart.js";

ChartJS.register(
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
);

function Stats() {
  const [activeTab, setActiveTab] = useState("nightshift");
  const [overviewAll, setOverviewAll] = useState(null);
  const [overviewNS, setOverviewNS] = useState(null);
  const [weeklyData, setWeeklyData] = useState([]);
  const [recordsAll, setRecordsAll] = useState(null);
  const [recordsNS, setRecordsNS] = useState(null);
  const [averagesAll, setAveragesAll] = useState(null);
  const [averagesNS, setAveragesNS] = useState(null);
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedRecords, setExpandedRecords] = useState(new Set());
  const [expandedAverages, setExpandedAverages] = useState(new Set());
  const toggleRecord = (key) =>
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const toggleAverage = (key) =>
    setExpandedAverages((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [allRes, nsRes, weeklyRes, recAllRes, recNSRes, avgAllRes, avgNSRes, heroesRes] = await Promise.all([
        fetch("/db/stats/overview"),
        fetch("/db/stats/overview?event_title=Night%20Shift"),
        fetch("/db/stats/weekly"),
        fetch("/db/stats/records"),
        fetch("/db/stats/records?event_title=Night%20Shift"),
        fetch("/db/stats/averages"),
        fetch("/db/stats/averages?event_title=Night%20Shift"),
        fetch("/db/heroes"),
      ]);
      if (allRes.ok) setOverviewAll((await allRes.json()).overview);
      if (nsRes.ok) setOverviewNS((await nsRes.json()).overview);
      if (weeklyRes.ok) setWeeklyData((await weeklyRes.json()).weeks ?? []);
      if (recAllRes.ok) setRecordsAll((await recAllRes.json()).records);
      if (recNSRes.ok) setRecordsNS((await recNSRes.json()).records);
      if (avgAllRes.ok) setAveragesAll((await avgAllRes.json()).averages);
      if (avgNSRes.ok) setAveragesNS((await avgNSRes.json()).averages);
      if (heroesRes.ok) setHeroes(await heroesRes.json());
    } catch (err) {
      console.error("Failed to fetch stats:", err);
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

  const overview = activeTab === "nightshift" ? overviewNS : overviewAll;
  const records = activeTab === "nightshift" ? recordsNS : recordsAll;
  const averages = activeTab === "nightshift" ? averagesNS : averagesAll;

  const totalMatches = overview?.total_matches ?? 0;
  const amberWins = overview?.amber_wins ?? 0;
  const sapphireWins = overview?.sapphire_wins ?? 0;
  const avgDuration = overview?.avg_duration ?? 0;

  const formatDuration = (seconds) => {
    if (!seconds) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const tabs = [
    { id: "nightshift", label: "Night Shift" },
    { id: "overall", label: "Overall" },
  ];

  return (
    <div className="w-full p-8">
      <h1 className="text-3xl text-white font-bold mb-6">Statistics</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b-3 border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? "border-blue-400 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="">
        <h1 className="text-xl text-white font-bold mb-4 uppercase">
          Match Trend
        </h1>

        {/* Hidden King vs Archmother */}
        <div className="bg-panel text-gray-300 shadow rounded-lg p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Labels */}
            <div className="flex md:flex-col items-center gap-3 md:w-36 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <img
                  src="/static/images/teamNames/team1_patron_logo_psd.png"
                  alt="Hidden King"
                  className="h-10"
                  style={{
                    filter:
                      "brightness(0) saturate(100%) invert(64%) sepia(14%) saturate(3308%) hue-rotate(1deg) brightness(106%) contrast(103%)",
                  }}
                />
                <span className="text-2xl font-bold text-amber-400">
                  {amberWins}
                </span>
                <span className="text-xs text-gray-500">
                  {totalMatches > 0
                    ? ((amberWins / totalMatches) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>

            {/* Bar */}
            <div className="flex-1 min-w-0 relative h-12">
              <Bar
                data={{
                  labels: [""],
                  datasets: [
                    {
                      label: "Hidden King",
                      data: [amberWins],
                      backgroundColor: "#f39c12",
                      borderRadius: {
                        topLeft: 4,
                        bottomLeft: 4,
                        topRight: 0,
                        bottomRight: 0,
                      },
                      borderSkipped: false,
                      barPercentage: 1.0,
                      categoryPercentage: 1.0,
                    },
                    {
                      label: "Archmother",
                      data: [sapphireWins],
                      backgroundColor: "#3498db",
                      borderRadius: {
                        topLeft: 0,
                        bottomLeft: 0,
                        topRight: 4,
                        bottomRight: 4,
                      },
                      borderSkipped: false,
                      barPercentage: 1.0,
                      categoryPercentage: 1.0,
                    },
                  ],
                }}
                options={{
                  indexAxis: "y",
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: 0 },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const wins = ctx.raw;
                          const pct =
                            totalMatches > 0
                              ? ((wins / totalMatches) * 100).toFixed(1)
                              : 0;
                          return ` ${wins} wins (${pct}%)`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      stacked: true,
                      display: false,
                      min: 0,
                      max: totalMatches,
                    },
                    y: { stacked: true, display: false },
                  },
                }}
              />
            </div>

            {/* Labels */}
            <div className="flex md:flex-col items-center gap-3 md:w-36 shrink-0">
              <div className="flex flex-col items-center gap-1">
                <img
                  src="/static/images/teamNames/team2_patron_logo_psd.png"
                  alt="Archmother"
                  className="h-10"
                  style={{
                    filter:
                      "brightness(0) saturate(100%) invert(24%) sepia(96%) saturate(1698%) hue-rotate(203deg) brightness(94%) contrast(97%)",
                  }}
                />
                <span className="text-2xl font-bold text-blue-400">
                  {sapphireWins}
                </span>
                <span className="text-xs text-gray-500">
                  {totalMatches > 0
                    ? ((sapphireWins / totalMatches) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Duration Trend — Night Shift only */}
        {activeTab === "nightshift" && weeklyData.length > 0 && (
          <div className="bg-panel text-gray-300 shadow rounded-lg p-6 my-8">
            <h2 className="text-xl font-bold mb-4">
              Avg Match Duration per Week
            </h2>
            <div className="relative h-56">
              <Line
                data={{
                  labels: weeklyData.map((w) => `N.S. #${w.event_week}`),
                  datasets: [
                    {
                      label: "Avg Duration (min)",
                      data: weeklyData.map((w) => w.avg_duration_min),
                      borderColor: "#60a5fa",
                      backgroundColor: "rgba(96,165,250,0.15)",
                      pointBackgroundColor: "#60a5fa",
                      fill: true,
                      tension: 0.3,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` ${ctx.raw} min`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#9ca3af" },
                      grid: { color: "rgba(255,255,255,0.05)" },
                    },
                    y: {
                      ticks: { color: "#9ca3af", callback: (v) => `${v}m` },
                      grid: { color: "rgba(255,255,255,0.05)" },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="">
        <h1 className="text-xl text-white font-bold mb-8 mt-16 uppercase">Player Records</h1>
        <h2 className="text-xl text-white font-bold my-4">Highest</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Most Kills',      key: 'kills',   fmt: (v) => v },
            { label: 'Most Assists',    key: 'assists', fmt: (v) => v },
            { label: 'Most Deaths',     key: 'deaths',  fmt: (v) => v },
            { label: 'Most Obj Damage', key: 'obj_damage', fmt: (v) => v?.toLocaleString() },
            { label: 'Most Healing',    key: 'healing', fmt: (v) => v?.toLocaleString() },
            { label: 'Highest Souls',   key: 'souls',   fmt: (v) => v?.toLocaleString() },
          ].map(({ label, key, fmt }) => {
            const list = records?.[key] ?? [];
            const r = list[0] ?? null;
            const heroName = r?.hero_id ? (heroes[r.hero_id]?.name || heroes[r.hero_id] || `Hero ${r.hero_id}`) : null;
            const durationMin = r?.duration_s ? `${Math.floor(r.duration_s / 60)}:${String(r.duration_s % 60).padStart(2, '0')}` : null;
            const verticalImg = heroName
              ? `/static/images/vertical/${heroName.toLowerCase().replace(/\s+/g, '_')}_vertical_psd.png`
              : null;
            const isExpanded = expandedRecords.has(key);
            return (
              <div key={label} className="relative">
                <div className="bg-panel text-gray-300 shadow rounded-lg overflow-hidden flex flex-col h-full">
                <div className="flex flex-1">
                  {verticalImg && (
                    <img
                      src={verticalImg}
                      alt={heroName}
                      className="h-full w-24 object-cover object-top shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="p-4 flex flex-col justify-between min-w-0 flex-1">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-3xl font-bold text-white">{fmt(r?.value) ?? '—'}</p>
                        {r?.account_id
                          ? <Link to={`/player/${r.account_id}`} className="text-sm text-blue-400 hover:underline mt-2 truncate font-medium block">{r?.persona_name ?? 'Unknown'}</Link>
                          : <p className="text-sm text-gray-200 mt-2 truncate font-medium">{r?.persona_name ?? 'Unknown'}</p>
                        }
                      {heroName && <p className="text-xs text-gray-400 mt-0.5">{heroName}</p>}
                    </div>
                    <div className="flex flex-wrap gap-x-3 mt-3">
                      {r?.match_id && (
                        <a href={`/match/${r.match_id}`} className="text-xs text-blue-400 hover:underline">
                          #{r.match_id}
                        </a>
                      )}
                      {durationMin && <span className="text-xs text-gray-500">{durationMin}</span>}
                      {r?.event_week != null && (
                        <span className="text-xs text-gray-500">Night Shift #{r.event_week}</span>
                      )}
                    </div>
                  </div>
                </div>
                {list.length > 1 && (
                  <div className="border-t border-slate-700">
                    <button
                      onClick={() => toggleRecord(key)}
                      className="w-full text-xs text-blue-400 hover:text-blue-300 py-1.5 px-4 text-left hover:bg-slate-800 transition-colors"
                    >
                      {isExpanded ? 'Hide top 5 ▲' : 'See top 5 ▼'}
                    </button>
                  </div>
                )}
                </div>
                {isExpanded && (
                  <ol className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-600 rounded-b-lg px-4 py-3 space-y-2 shadow-xl">
                    {list.map((entry, i) => {
                      const eName = entry.hero_id ? (heroes[entry.hero_id]?.name || heroes[entry.hero_id] || `Hero ${entry.hero_id}`) : null;
                      return (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                          <span className="text-gray-500 w-4 text-right">{i + 1}.</span>
                          <span className="font-bold text-white">{fmt(entry.value)}</span>
                          {entry.account_id
                            ? <Link to={`/player/${entry.account_id}`} className="truncate flex-1 text-blue-400 hover:underline">{entry.persona_name ?? 'Unknown'}</Link>
                            : <span className="truncate flex-1">{entry.persona_name ?? 'Unknown'}</span>
                          }
                          {eName && <span className="text-gray-500 shrink-0">{eName}</span>}
                          {entry.match_id && (
                            <a href={`/match/${entry.match_id}`} className="text-blue-400 hover:underline shrink-0">
                              #{entry.match_id}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player Averages */}
      <div className="mt-8">
        <h1 className="text-xl text-white font-bold my-4">Averages</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Avg Kills',      key: 'kills',      fmt: (v) => v?.toFixed(1) },
            { label: 'Avg Assists',    key: 'assists',    fmt: (v) => v?.toFixed(1) },
            { label: 'Avg Deaths',     key: 'deaths',     fmt: (v) => v?.toFixed(1) },
            { label: 'Avg Obj Damage', key: 'obj_damage', fmt: (v) => Number(v)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
            { label: 'Avg Healing',    key: 'healing',    fmt: (v) => Number(v)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
            { label: 'Avg Souls',      key: 'souls',      fmt: (v) => Number(v)?.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
          ].map(({ label, key, fmt }) => {
            const list = averages?.[key] ?? [];
            const r = list[0] ?? null;
            const heroName = r?.top_hero_id ? (heroes[r.top_hero_id]?.name || heroes[r.top_hero_id] || null) : null;
            const verticalImg = heroName
              ? `/static/images/vertical/${heroName.toLowerCase().replace(/\s+/g, '_')}_vertical_psd.png`
              : null;
            const isExpanded = expandedAverages.has(key);
            return (
              <div key={label} className="relative">
                <div className="bg-panel text-gray-300 shadow rounded-lg overflow-hidden flex flex-col h-full">
                  <div className="flex flex-1">
                    {verticalImg && (
                      <img
                        src={verticalImg}
                        alt={heroName}
                        className="h-full w-24 object-cover object-top shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div className="p-4 flex flex-col justify-between min-w-0 flex-1">
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-3xl font-bold text-white">{fmt(r?.value) ?? '—'}</p>
                        {r?.account_id
                          ? <Link to={`/player/${r.account_id}`} className="text-sm text-blue-400 hover:underline mt-2 truncate font-medium block">{r?.persona_name ?? 'Unknown'}</Link>
                          : <p className="text-sm text-gray-200 mt-2 truncate font-medium">{r?.persona_name ?? 'Unknown'}</p>
                        }
                        {r?.games_played != null && (
                          <p className="text-xs text-gray-500 mt-0.5">{r.games_played} games</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {list.length > 1 && (
                    <div className="border-t border-slate-700">
                      <button
                        onClick={() => toggleAverage(key)}
                        className="w-full text-xs text-blue-400 hover:text-blue-300 py-1.5 px-4 text-left hover:bg-slate-800 transition-colors"
                      >
                        {isExpanded ? 'Hide top 5 ▲' : 'See top 5 ▼'}
                      </button>
                    </div>
                  )}
                </div>
                {isExpanded && (
                  <ol className="absolute top-full left-0 right-0 z-20 bg-slate-800 border border-slate-600 rounded-b-lg px-4 py-3 space-y-2 shadow-xl">
                    {list.map((entry, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="text-gray-500 w-4 text-right">{i + 1}.</span>
                        <span className="font-bold text-white">{fmt(entry.value)}</span>
                        {entry.account_id
                          ? <Link to={`/player/${entry.account_id}`} className="truncate flex-1 text-blue-400 hover:underline">{entry.persona_name ?? 'Unknown'}</Link>
                          : <span className="truncate flex-1">{entry.persona_name ?? 'Unknown'}</span>
                        }
                        <span className="text-gray-500 shrink-0">{entry.games_played}g</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Stats;
