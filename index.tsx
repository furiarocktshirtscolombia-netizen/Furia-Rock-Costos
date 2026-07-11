import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import DesignerApp from './src/designer/components/DesignerApp';

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
const isDesigner = window.location.hash.startsWith('#/disenador');
root.render(isDesigner ? <DesignerApp /> : <App />);
