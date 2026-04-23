import React from 'react'
import ReactDOM from 'react-dom/client'
import { SoundLibrary } from '../pages/sounds.jsx'
import { ErrorBoundary } from '../components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <SoundLibrary />
    </ErrorBoundary>
  </React.StrictMode>,
);
