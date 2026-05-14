import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Remove the static HTML loader once React has painted
// This ensures the loader is never stuck on screen
const removeLoader = () => {
  const loader = document.getElementById('root-loader');
  if (loader) {
    loader.style.transition = 'opacity 0.3s ease';
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }
};

// Use requestIdleCallback for non-blocking removal, fallback to setTimeout
if ('requestIdleCallback' in window) {
  requestIdleCallback(removeLoader);
} else {
  setTimeout(removeLoader, 100);
}