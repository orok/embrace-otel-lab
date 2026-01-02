import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { startEmbrace } from "./embrace";

import App from './App.tsx'

startEmbrace();


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
