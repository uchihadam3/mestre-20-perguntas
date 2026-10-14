import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './ui/App';
import './ui/style.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const register = () =>
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}
