import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Self-heal stale sessions after a deploy. With code-splitting, a tab that was
// loaded before a deploy will try to lazy-import a chunk hash that the new build
// deleted → it 404s (rewritten to index.html) and Vite fires `vite:preloadError`.
// Reload once to pick up the fresh index.html + current chunks. The 10s guard
// prevents a reload loop if a reload somehow doesn't resolve it.
window.addEventListener("vite:preloadError", () => {
  const KEY = "vite-preload-reload-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last < 10_000) return;
  sessionStorage.setItem(KEY, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

