import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
      throw new Error("Could not find root element to mount to");
}

// El antiguo modulo Disenador fue eliminado. Si alguien entra directamente a
// #/disenador, lo redirigimos de forma segura al Cotizador (pantalla principal).
if (window.location.hash.startsWith('#/disenador')) { window.location.hash = ''; }

const root = ReactDOM.createRoot(rootElement);
root.render(<App />);
