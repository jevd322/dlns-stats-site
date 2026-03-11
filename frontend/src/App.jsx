import React from 'react';
import MatchList from './pages/MatchList';

function App() {
  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>DLNS Stats - React Edition</h1>
          <p>Deadlock Night Shift Match Tracker</p>
        </div>
      </header>
      
      <main className="main">
        <MatchList />
      </main>
      
      <footer className="footer">
        <div className="container">
          <p>Built with React + Flask</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
