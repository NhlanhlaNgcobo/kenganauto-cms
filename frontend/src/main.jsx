import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import './theme-light.css'
import App from './App.jsx'
import { API_URL } from './utils/api'
import { applyStoredTheme } from './utils/theme'

applyStoredTheme()

// Attach the session token to every request to OUR API (never to third-party URLs).
// Several pages (Service, Parts, Support, Trade-ins, Customers) call axios without headers;
// without this they get 401s and render empty.
axios.interceptors.request.use((config) => {
  const url = config.url || ''
  const isOwnApi = url.startsWith(API_URL) || url.startsWith('/')
  const token = localStorage.getItem('ka_token') || localStorage.getItem('token')
  if (isOwnApi && token && !config.headers?.Authorization) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
