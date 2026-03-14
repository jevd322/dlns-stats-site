import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function HeroesList() {
  const [heroes, setHeroes] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
        <div className="text-center text-xl">Loading heroes...</div>
      </div>
    );
  }

  // Convert heroes object to array and filter by search term
  const heroesArray = Object.entries(heroes).map(([id, name]) => ({ id, name }));
  const filteredHeroes = heroesArray.filter(hero =>
    hero.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full p-8">
      <h1 className="text-3xl font-bold mb-6">Heroes</h1>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search heroes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Hero Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredHeroes.length} of {heroesArray.length} heroes
        </p>
      </div>

      {/* Heroes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-12 gap-4">
        {filteredHeroes.map((hero) => (
          <Link
            key={hero.id}
            to={`/hero/${hero.id}`}
            className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Portrait Placeholder */}
            <div className="h-24 bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
              <div className="text-white text-4xl font-bold opacity-50">
                {hero.name.charAt(0)}
              </div>
            </div>
            
            {/* Hero Name */}
            <div className="p-4">
              <h3 className="text-lg font-bold text-center">{hero.name}</h3>
              <p className="text-sm text-gray-500 text-center">ID: {hero.id}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* No Results */}
      {filteredHeroes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-xl">No heroes found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}

export default HeroesList;
