import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Function to hide the loading screen with fade effect
const hideLoader = () => {
  const loader = document.getElementById('loading');
  if (loader) {
    // Add transition for smooth fade out
    loader.style.transition = 'opacity 0.3s ease-out';
    loader.style.opacity = '0';
    
    // Remove from DOM after fade completes
    setTimeout(() => {
      loader.style.display = 'none';
    }, 300);
  }
};

// Create React root and render app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hide loader after React has mounted
// Using requestAnimationFrame to ensure React has rendered
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideLoader();
  });
});
