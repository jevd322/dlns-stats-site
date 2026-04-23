import React from 'react'
import ReactDOM from 'react-dom/client'
import { VoHub } from '../pages/vo.jsx'
import { ErrorBoundary } from '../components/ErrorBoundary.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <VoHub />
    </ErrorBoundary>
  </React.StrictMode>,
);
