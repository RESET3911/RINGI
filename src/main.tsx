import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import HubButton from './components/HubButton'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HubButton />
    <App />
  </React.StrictMode>,
)
