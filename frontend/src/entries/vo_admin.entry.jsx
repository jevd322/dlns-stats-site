import React from 'react'
import ReactDOM from 'react-dom/client'
import { VoAdmin } from '../pages/vo_admin.jsx'
import { ErrorBoundary } from '../components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <VoAdmin />
    </ErrorBoundary>
  </React.StrictMode>,
);
