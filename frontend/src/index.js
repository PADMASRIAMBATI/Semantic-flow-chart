import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

/* =========================================================
   GLOBAL ERROR SUPPRESSION (CRITICAL FIX)
   This catches and hides the ResizeObserver loop error 
   before it can reach the React Error Overlay.
   ========================================================= */
if (typeof window !== "undefined") {
  // 1. Suppress Console Errors
  const originalError = console.error;
  console.error = (...args) => {
    if (args[0]?.toString().includes("ResizeObserver loop")) return;
    originalError(...args);
  };

  // 2. Suppress Window Error Events
  window.addEventListener("error", (e) => {
    if (e.message.includes("ResizeObserver loop") || e.message.includes("loop limit exceeded")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });

  // 3. Suppress Promise Rejections (for some browser versions)
  window.addEventListener("unhandledrejection", (e) => {
    if (e.reason?.message?.includes("ResizeObserver loop")) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

reportWebVitals();