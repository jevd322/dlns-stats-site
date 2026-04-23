import React from 'react';
import ReactDOM from 'react-dom/client';
import { RankApp } from '../pages/rank.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RankApp />
    </ErrorBoundary>
  </React.StrictMode>,
);
