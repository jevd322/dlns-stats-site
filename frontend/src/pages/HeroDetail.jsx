import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

function HeroDetail() {
  const { heroId } = useParams();
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeroes();
  }, []);

  const fetchHeroes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/db/heroes');
      if (response.ok) {
        const data = await response.json();
        setHeroes(data);
      }
    } catch (err) {
      console.error('Failed to fetch heroes:', err);
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
  const heroName = hero?.name || hero || 'Unknown Hero';

  return (
    <div className="w-full p-8">
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Back to Match List
      </Link>

      {/* Hero Header */}
      <div className="mb-8">
        <h1 className="text-white text-4xl font-bold mb-2">{heroName}</h1>
      </div>

      {/* Hero Stats Placeholder */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Health</p>
            <p className="text-xl font-semibold">-</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Damage</p>
            <p className="text-xl font-semibold">-</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Speed</p>
            <p className="text-xl font-semibold">-</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Range</p>
            <p className="text-xl font-semibold">-</p>
          </div>
        </div>
      </div>

      {/* Abilities Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Abilities</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ability 1 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                1
              </div>
              <div>
                <h3 className="font-bold text-lg">Ability 1</h3>
                <p className="text-sm text-gray-500">Placeholder</p>
              </div>
            </div>
            <p className="text-gray-600">
              Ability description will go here. This is a placeholder for the first ability.
            </p>
          </div>

          {/* Ability 2 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                2
              </div>
              <div>
                <h3 className="font-bold text-lg">Ability 2</h3>
                <p className="text-sm text-gray-500">Placeholder</p>
              </div>
            </div>
            <p className="text-gray-600">
              Ability description will go here. This is a placeholder for the second ability.
            </p>
          </div>

          {/* Ability 3 */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold">
                3
              </div>
              <div>
                <h3 className="font-bold text-lg">Ability 3</h3>
                <p className="text-sm text-gray-500">Placeholder</p>
              </div>
            </div>
            <p className="text-gray-600">
              Ability description will go here. This is a placeholder for the third ability.
            </p>
          </div>

          {/* Ultimate Ability */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">
                4
              </div>
              <div>
                <h3 className="font-bold text-lg">Ultimate</h3>
                <p className="text-sm text-gray-500">Placeholder</p>
              </div>
            </div>
            <p className="text-gray-600">
              Ultimate ability description will go here. This is a placeholder for the ultimate ability.
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Additional Information</h2>
        <p className="text-gray-600">
          Detailed hero information, lore, and strategies will be displayed here.
        </p>
      </div>
    </div>
  );
}

export default HeroDetail;
