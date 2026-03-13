import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import MatchList from './pages/MatchList';
import MatchDetail from './pages/MatchDetail';
import PlayerDetail from './pages/PlayerDetail';
import HeroDetail from './pages/HeroDetail';
import HeroesList from './pages/HeroesList';
import Stats from './pages/Stats';
import { SoundLibrary } from './pages/sounds.jsx';
import { SoundsDev } from './pages/dev.jsx';
import { VoHub } from './pages/vo.jsx';
import { VoAdmin } from './pages/vo_admin.jsx';
import DLNS_Header from './components/DLNS_Header';
import './App.css';

function Navigation() {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Matches' },
    { path: '/heroes', label: 'Heroes' },
    { path: '/stats', label: 'Stats' },
    { path: '/sounds', label: 'Sounds' },
    { path: '/sounds-dev', label: 'Sounds Dev' },
    { path: '/vo', label: 'VO Hub' },
    { path: '/vo-admin', label: 'VO Admin' },
  ];
  
  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center space-x-8 h-14">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-sm font-medium transition-colors hover:text-purple-600 ${
                location.pathname === item.path
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">


        <DLNS_Header/>
        
        
        <main className="w-full flex-1 py-8">
          <Routes>
            <Route path="/" element={<MatchList />} />
            <Route path="/match/:matchId" element={<MatchDetail />} />
            <Route path="/player/:accountId" element={<PlayerDetail />} />
            <Route path="/heroes" element={<HeroesList />} />
            <Route path="/hero/:heroId" element={<HeroDetail />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/sounds" element={<SoundLibrary />} />
            <Route path="/sounds-dev" element={<SoundsDev />} />
            <Route path="/vo" element={<VoHub />} />
            <Route path="/vo-admin" element={<VoAdmin />} />
          </Routes>
        </main>
        
        <footer className="bg-gray-800 text-white mt-16">
          <div className="container mx-auto px-4 py-6 text-center">
            <p className="opacity-80">Built with React + Flask + Tailwind CSS</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
