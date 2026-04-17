import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Apply saved theme before render to avoid flash
const saved = localStorage.getItem('servigo-theme');
if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// Hide splash screen once React has painted
requestAnimationFrame(() => {
  setTimeout(() => {
    if (window.__hideSplash) window.__hideSplash();
  }, 300);
});