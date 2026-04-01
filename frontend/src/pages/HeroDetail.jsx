import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

function HeroDetail() {
  const { heroId } = useParams();
  const [heroes, setHeroes] = useState({});
  const [heroStats, setHeroStats] = useState(null);
  const [heroMeta, setHeroMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeroes();
  }, [heroId]);

  const fetchHeroes = async () => {
    try {
      setLoading(true);
      const [heroesRes, statsRes, metaRes] = await Promise.all([
        fetch("/db/heroes"),
        fetch(`/db/heroes/${heroId}/stats`),
        fetch(`/db/heroes/${heroId}/meta`),
      ]);
      if (heroesRes.ok) {
        const data = await heroesRes.json();
        setHeroes(data);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setHeroStats(data.stats);
      }
      if (metaRes.ok) {
        const data = await metaRes.json();
        setHeroMeta(data);
      }
    } catch (err) {
      console.error("Failed to fetch heroes:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full p-8">
        <div className="text-center text-xl">Loading hero details...</div>
      </div>
    );
  }

  const hero = heroes[heroId];
  const heroName = hero?.name || hero || "Unknown Hero";

  return (
    <div className="grid grid-cols-10 grid-rows-[auto_auto] p-8">
      {/* Hero Header */}
      <div className="mb-8 col-span-10 flex items-center gap-4">
        <img
          src={`/static/images/cardicons/${heroName.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "_")}_card_psd.png`}
          alt={heroName}
          className="w-16 h-24 object-cover rounded shadow"
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
        <div>
          <h1 className="text-white text-4xl font-bold">{heroName}</h1>
          <div className="flex gap-2 mt-1">
            <span className="inline-flex items-center px-2 py-1 text-sm font-medium bg-slate-700 text-gray-200 rotate-[4deg]">
              {heroMeta?.tagline?.[0] ?? "—"}
            </span>
            <span className="inline-flex items-center px-3 py-1 mt-1 text-sm font-medium bg-slate-700 text-gray-200 rotate-[-4deg]">
              {heroMeta?.tagline?.[1] ?? "—"}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-sm font-medium bg-slate-700 text-gray-200 rotate-[4deg]">
              {heroMeta?.tagline?.[2] ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Abilities Section */}
      <div className="mb-8 col-span-4">
        <h2 className="text-white text-center text-2xl font-bold">Abilities</h2>
        <div className="flex justify-center gap-2">
          {(heroMeta?.abilities ?? Array(4).fill(null)).map((ability, i) => (
            <div key={i} className="shadow rounded-lg p-2 flex flex-col items-center text-center">
              <div className="relative w-24 h-24">
                <img
                  src="/static/images/abilities/ability_frame_standard.svg"
                  alt=""
                  className="absolute inset-0 w-full h-full"
                />
                {ability?.image ? (
                  <img
                    src={ability.image.startsWith("/") ? ability.image : `/${ability.image}`}
                    alt={ability.name ?? ""}
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/5 h-2/5 object-contain opacity-75 ${ability.invert ? " invert" : ""}`}
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xl">
                    {i + 1}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg text-gray-200">{ability?.name ?? `Ability ${i + 1}`}</h3>
              <p className="text-sm text-gray-400 mt-1">{ability?.description ?? ""}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Hero Stats */}
      <div className="bg-panel text-gray-300 shadow rounded-lg p-6 col-span-6 row-span-2">
        <h2 className="text-xl font-bold mb-4">Stats</h2>

        {/* Row 1 — Averages */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Averages
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Kills</p>
              <p className="text-lg font-bold">{heroStats?.avg_kills ?? "-"}</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Deaths</p>
              <p className="text-lg font-bold">
                {heroStats?.avg_deaths ?? "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Assists</p>
              <p className="text-lg font-bold">
                {heroStats?.avg_assists ?? "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">KDA</p>
              <p className="text-lg font-bold">{heroStats?.avg_kda ?? "-"}</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Damage</p>
              <p className="text-lg font-bold">
                {heroStats?.avg_damage?.toLocaleString() ?? "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Souls</p>
              <p className="text-lg font-bold">
                {heroStats?.avg_souls?.toLocaleString() ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Row 2 — Highest */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Highest
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Kills</p>
              <p className="text-lg font-bold">{heroStats?.max_kills ?? "-"}</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Damage</p>
              <p className="text-lg font-bold">
                {heroStats?.max_damage?.toLocaleString() ?? "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Healing</p>
              <p className="text-lg font-bold">
                {heroStats?.max_healing?.toLocaleString() ?? "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Obj Damage</p>
              <p className="text-lg font-bold">
                {heroStats?.max_obj_damage?.toLocaleString() ?? "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Row 3 — Rates */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
            Rates
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Win Rate</p>
              <p className="text-lg font-bold">
                {heroStats?.win_rate != null
                  ? (heroStats.win_rate * 100).toFixed(1) + "%"
                  : "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Pick Rate</p>
              <p className="text-lg font-bold">
                {heroStats?.pick_rate != null
                  ? (heroStats.pick_rate * 100).toFixed(2) + "%"
                  : "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Games Played</p>
              <p className="text-lg font-bold">
                {heroStats?.games_played ?? "-"}
              </p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-gray-500 text-xs">Wins</p>
              <p className="text-lg font-bold text-green-400">
                {heroStats?.wins ?? "-"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white shadow rounded-lg p-6 col-span-4">
        <h2 className="text-2xl font-bold mb-4">Additional Information</h2>
        <p className="text-gray-600">
          Detailed hero information, lore, and strategies will be displayed
          here.
        </p>
      </div>
    </div>
  );
}

export default HeroDetail;
