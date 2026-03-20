import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'

// Export components so they can be imported from entry points
export { SoundLibrary } from './pages/sounds.jsx'
export { SoundsDev } from './pages/dev.jsx'
export { VoHub } from './pages/vo.jsx'
export { VoAdmin } from './pages/vo_admin.jsx'

// Mount React app if root element exists
const rootElement = document.getElementById('root')
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

