import React from 'react';
import ReactDOM from 'react-dom/client';
import { MatchAdmin } from '../pages/MatchAdmin.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <MatchAdmin />
    </ErrorBoundary>
  </React.StrictMode>,
);
