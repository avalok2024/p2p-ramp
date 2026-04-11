import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

if ('serviceWorker' in navigator) {
  import('workbox-window').then(({ Workbox }) => {
    new Workbox('/sw.js').register();
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-center" toastOptions={{
        style: { background: '#16162a', color: '#f0f0ff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }
      }} />
    </BrowserRouter>
  </React.StrictMode>
);
