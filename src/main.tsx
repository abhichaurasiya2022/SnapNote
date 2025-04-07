
import 'whatwg-fetch'; // Polyfill for fetch
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Register service worker update handler
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('Service Worker controller has changed, refreshing content');
    window.location.reload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
