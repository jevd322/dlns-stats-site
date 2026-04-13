import React, { useState, useEffect } from 'react';

export function MatchSubmission() {
  const [formData, setFormData] = useState({
    title: 'User Submission',
    week: new Date().getWeek(),
    team_a: '',
    team_b: '',
    game: '1',
    match_id: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Check current user and authorization
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/match/submit/check-auth');
        const data = await response.json();
        if (data.authorized) {
          setUser(data.user);
          setIsAuthorized(true);
        } else {
          setMessage({
            type: 'error',
            text: 'You do not have permission to submit matches. Please login or check your access.',
          });
        }
      } catch (err) {
        setMessage({
          type: 'error',
          text: 'Error checking authorization. Please try again.',
        });
      }
    };
    checkAuth();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // Validation
    if (!formData.week || !formData.team_a || !formData.team_b || !formData.match_id) {
      setMessage({
        type: 'error',
        text: 'Please fill all required fields (Week, Team A, Team B, Match ID).',
      });
      return;
    }

    setLoading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('week', formData.week);
      formDataObj.append('team_a', formData.team_a);
      formDataObj.append('team_b', formData.team_b);
      formDataObj.append('game', formData.game);
      formDataObj.append('match_id', formData.match_id);

      const response = await fetch('/match/submit', {
        method: 'POST',
        body: formDataObj,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Match ${formData.match_id} submitted and processing! Check back shortly for it to appear.`,
        });
        // Reset form
        setFormData({
          title: 'User Submission',
          week: new Date().getWeek(),
          team_a: '',
          team_b: '',
          game: '1',
          match_id: '',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Error submitting match. Please try again.',
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: `Error: ${err.message || 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You do not have permission to access this feature. Please ensure you are logged in with an authorized account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Submit a Match</h1>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {user && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800">
          Logged in as <strong>{user.username}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Series Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Fight Night, Night Shift"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">The series or event name for this match</p>
        </div>

        {/* Week */}
        <div>
          <label htmlFor="week" className="block text-sm font-medium text-gray-700 mb-2">
            Week <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="week"
            name="week"
            value={formData.week}
            onChange={handleInputChange}
            placeholder="e.g., 30"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <p className="mt-1 text-sm text-gray-500">Week number</p>
        </div>

        {/* Teams */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="team_a" className="block text-sm font-medium text-gray-700 mb-2">
              Team A <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="team_a"
              name="team_a"
              value={formData.team_a}
              onChange={handleInputChange}
              placeholder="e.g., Virtus.pro"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="team_b" className="block text-sm font-medium text-gray-700 mb-2">
              Team B <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="team_b"
              name="team_b"
              value={formData.team_b}
              onChange={handleInputChange}
              placeholder="e.g., 1win Team"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Game & Match ID */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="game" className="block text-sm font-medium text-gray-700 mb-2">
              Game Number
            </label>
            <input
              type="text"
              id="game"
              name="game"
              value={formData.game}
              onChange={handleInputChange}
              placeholder="e.g., 1, Game 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">Optional (default: 1)</p>
          </div>
          <div>
            <label htmlFor="match_id" className="block text-sm font-medium text-gray-700 mb-2">
              Match ID <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="match_id"
              name="match_id"
              value={formData.match_id}
              onChange={handleInputChange}
              placeholder="e.g., 70457488"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">Deadlock match ID</p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? 'Processing...' : 'Submit Match'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How it works:</h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start">
            <span className="mr-3">•</span>
            <span>Fill in the match details above</span>
          </li>
          <li className="flex items-start">
            <span className="mr-3">•</span>
            <span>The system will format your submission and process it</span>
          </li>
          <li className="flex items-start">
            <span className="mr-3">•</span>
            <span>Hero data, player stats, and rankings will be automatically fetched</span>
          </li>
          <li className="flex items-start">
            <span className="mr-3">•</span>
            <span>Check the site shortly after for your match to appear</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// Helper to get current ISO week
Date.prototype.getWeek = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};
