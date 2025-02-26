// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registro del Service Worker usando PUBLIC_URL para que coincida con el subdirectorio
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = `${process.env.PUBLIC_URL}/sw.js`;
    navigator.serviceWorker.register(swUrl)
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration);
      })
      .catch(error => {
        console.error('Error registrando el Service Worker:', error);
      });
  });
}
