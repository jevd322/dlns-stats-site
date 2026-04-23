import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * DLNS Header Component
 * 
 * Reusable header with customizable title and subtitle
 * 
 * Props:
 * @param {string} title - Main heading text (default: "DLNS Stats")
 * @param {string} subtitle - Subheading text (default: "Deadlock Night Shift")
 * @param {boolean} showLogo - Show/hide logo (default: true)
 * @param {string} className - Additional CSS classes
 */
function DLNS_Header({ 
  title = "DLNS Stats", 
  subtitle = "Deadlock Night Shift",
  showLogo = true,
  className = "" 
}) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out

  useEffect(() => {
    fetch('/auth/api/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setUser(data.ok ? data.user : null))
      .catch(() => setUser(null));
  }, []);

  const navItems = [
    { label: 'Home', href: '/matchlist' },
    { label: 'Heroes', href: '/heroes' },
    { label: 'Stats', href: '/stats' },
    { label: 'Community', href: '#' },
  ];

  return (
    <header className={`w-full bg-slate-800/90 text-white shadow-panel ${className}`}>
      <div className="min-h-16">
        <div className="flex items-center max-w-7xl  justify-between container mx-auto p-4 h-16">
          {/* Navigation Items */}
          <nav className="flex items-center gap-6">
            {navItems.map((item, index) => (
              item.href === '#' ? (
                <a
                  key={index}
                  href={item.href}
                  className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-md"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={index}
                  to={item.href}
                  className="text-white/90 hover:text-white font-medium transition-colors px-3 py-2 rounded-md"
                >
                  {item.label}
                </Link>
              )
            ))}
          </nav>
          
          {/* Auth */}
          <div className="flex items-center gap-4">
            {user === undefined ? null : user ? (
              <div className="flex items-center gap-3">
                <span className="text-white/80 text-sm">👤 {user.username}</span>
                <a
                  href="/auth/logout"
                  className="text-white/70 hover:text-white text-sm transition-colors"
                >
                  Logout
                </a>
              </div>
            ) : (
              <a
                href="/auth/login"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-3 py-1.5 rounded-md transition-colors"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default DLNS_Header;
