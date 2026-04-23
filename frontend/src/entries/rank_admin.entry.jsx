import React from 'react';
import ReactDOM from 'react-dom/client';
import { RankAdmin } from '../pages/rank_admin.jsx';
import { ErrorBoundary } from '../components/ErrorBoundary.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RankAdmin />
    </ErrorBoundary>
  </React.StrictMode>,
);
